#!/usr/bin/env python3
import os
import numpy as np
import pandas as pd
from HealthcareData.config import MERGED_DIR, CLEANED_DIR, FEATURE_ENGINEERED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger

def extract_nhanes_features(plog):
    input_path = os.path.join(MERGED_DIR, "nhanes_master.csv")
    output_path = os.path.join(FEATURE_ENGINEERED_DIR, "nhanes_features.csv")
    
    if not os.path.exists(input_path):
        plog.warning(f"NHANES master dataset not found at: {input_path}. Skipping NHANES feature extraction.")
        return

    plog.info("Extracting clinical features from NHANES master dataset...")
    df = pd.read_csv(input_path)
    plog.records_processed = len(df)

    # 1. BMI calculation
    if "BMXWT" in df.columns and "BMXHT" in df.columns:
        df["BMI"] = df["BMXBMI"].fillna(df["BMXWT"] / ((df["BMXHT"] / 100.0) ** 2))
    elif "BMXBMI" in df.columns:
        df["BMI"] = df["BMXBMI"]
    else:
        df["BMI"] = np.nan
    plog.info("Calculated BMI.")

    # 2. Waist-to-height ratio
    if "BMXWAIST" in df.columns and "BMXHT" in df.columns:
        df["Waist_to_Height_Ratio"] = df["BMXWAIST"] / df["BMXHT"]
    else:
        df["Waist_to_Height_Ratio"] = np.nan
    plog.info("Calculated Waist-to-height ratio.")

    # 3. Blood Pressure metrics
    sys_cols = [c for c in ["BPXSY1", "BPXSY2", "BPXSY3", "BPXSY4"] if c in df.columns]
    dia_cols = [c for c in ["BPXDI1", "BPXDI2", "BPXDI3", "BPXDI4"] if c in df.columns]

    df["Systolic_BP"] = df[sys_cols].mean(axis=1) if sys_cols else np.nan
    df["Diastolic_BP"] = df[dia_cols].mean(axis=1) if dia_cols else np.nan

    df["Pulse_Pressure"] = df["Systolic_BP"] - df["Diastolic_BP"]
    df["Mean_Arterial_Pressure"] = df["Diastolic_BP"] + (df["Pulse_Pressure"] / 3.0)
    plog.info("Calculated Systolic, Diastolic BP, Pulse Pressure, and MAP.")

    # 4. Blood Pressure category
    bp_categories = []
    for _, row in df.iterrows():
        s = row["Systolic_BP"]
        d = row["Diastolic_BP"]
        if pd.isna(s) or pd.isna(d):
            bp_categories.append("Unknown")
        elif s < 120 and d < 80:
            bp_categories.append("Normal")
        elif (120 <= s <= 129) and d < 80:
            bp_categories.append("Elevated")
        elif (130 <= s <= 139) or (80 <= d <= 89):
            bp_categories.append("Stage 1 Hypertension")
        elif s >= 140 or d >= 90:
            bp_categories.append("Stage 2 Hypertension")
        else:
            bp_categories.append("Normal")
    df["BP_Category"] = bp_categories

    # 5. Age groups
    age_col = next((c for c in ["RIDAGEYR", "Age", "age"] if c in df.columns), None)
    if age_col:
        age_groups = []
        for age in df[age_col]:
            if pd.isna(age):
                age_groups.append("Unknown")
            elif age < 18:
                age_groups.append("Youth")
            elif 18 <= age <= 35:
                age_groups.append("Young Adult")
            elif 36 <= age <= 55:
                age_groups.append("Middle-aged")
            else:
                age_groups.append("Senior")
        df["Age_Group"] = age_groups
    plog.info("Categorized Age groups.")

    # 6. Glucose Category
    glucose_col = next((c for c in ["LBXGLU", "Glucose"] if c in df.columns), None)
    if glucose_col:
        glucose_cats = []
        for g in df[glucose_col]:
            if pd.isna(g):
                glucose_cats.append("Unknown")
            elif g < 100:
                glucose_cats.append("Normal")
            elif 100 <= g <= 125:
                glucose_cats.append("Prediabetic")
            else:
                glucose_cats.append("Diabetic")
        df["Glucose_Category"] = glucose_cats
    plog.info("Categorized Glucose levels.")

    # 7. Smoking category
    smoke_col = next((c for c in ["SMQ020", "SMOKE", "Smoking_Status"] if c in df.columns), None)
    if smoke_col:
        df["Smoking_Category"] = df[smoke_col].astype(str).str.strip().str.lower().replace({
            "1.0": "smoker", "1": "smoker", "yes": "smoker", "yes_smoker": "smoker",
            "2.0": "non-smoker", "2": "non-smoker", "no": "non-smoker", "non-smoker": "non-smoker"
        })
    else:
        df["Smoking_Category"] = "unknown"

    # 8. Sleep score (hours based)
    sleep_col = next((c for c in ["SLD012", "Sleep_Duration", "Sleep Duration"] if c in df.columns), None)
    if sleep_col:
        sleep_scores = []
        for hrs in df[sleep_col]:
            if pd.isna(hrs):
                sleep_scores.append(0)
            elif 7.0 <= hrs <= 8.5:
                sleep_scores.append(10)  # Optimal sleep
            elif 6.0 <= hrs < 7.0 or 8.5 < hrs <= 9.5:
                sleep_scores.append(7)
            else:
                sleep_scores.append(4)  # Suboptimal sleep
        df["Sleep_Score"] = sleep_scores
    plog.info("Calculated Sleep scores.")

    # 9. Alcohol usage score
    alq_col = next((c for c in ["ALQ101", "ALQ130", "CALC", "Alcohol_Status"] if c in df.columns), None)
    if alq_col:
        alc_scores = []
        for val in df[alq_col]:
            if pd.isna(val) or str(val).strip().lower() in ["no", "never", "2", "2.0"]:
                alc_scores.append(10) # No risk
            elif str(val).strip().lower() in ["sometimes", "yes", "1", "1.0"]:
                alc_scores.append(6) # Moderate risk
            else:
                alc_scores.append(3)
        df["Alcohol_Score"] = alc_scores
    else:
        df["Alcohol_Score"] = 10

    # 10. HDL ratios
    if "LBXTC" in df.columns and "LBDHDD" in df.columns:
        df["HDL_Ratio"] = df["LBXTC"] / df["LBDHDD"]
    else:
        df["HDL_Ratio"] = np.nan

    if "LBXTR" in df.columns and "LBDHDD" in df.columns:
        df["Triglyceride_Ratio"] = df["LBXTR"] / df["LBDHDD"]
    else:
        df["Triglyceride_Ratio"] = np.nan

    # 11. Risk flags (Cardiovascular and Diabetic)
    df["Cardiovascular_Risk_Flag"] = ((df["Systolic_BP"] >= 140) | (df["Diastolic_BP"] >= 90) | (df["HDL_Ratio"] > 5.0)).astype(int)
    df["Diabetic_Risk_Flag"] = (df["Glucose_Category"] == "Diabetic").astype(int)

    # Save
    df.to_csv(output_path, index=False)
    plog.info(f"Saved feature engineered NHANES dataset to: {output_path}")

def run_all_feature_engineering():
    plog = PipelineLogger("Feature_Engineering", "feature_engineering.log")
    try:
        extract_nhanes_features(plog)
    except Exception as e:
        plog.error(f"Error during feature engineering: {str(e)}")
    plog.finalize()

if __name__ == "__main__":
    run_all_feature_engineering()
