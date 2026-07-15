#!/usr/bin/env python3
import os
import pandas as pd
import numpy as np
from HealthcareData.config import RAW_DIR, CLEANED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger
from HealthcareData.scripts.validation.validate_dataset import validate

def clean_diabetes():
    plog = PipelineLogger("Clean_Diabetes", "clean_diabetes.log")
    plog.info("Starting clean diabetes dataset pipeline...")
    
    input_path = os.path.join(RAW_DIR, "diabetes", "diabetes.csv")
    output_dir = os.path.join(CLEANED_DIR, "diabetes")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "diabetes.csv")
    
    if not os.path.exists(input_path):
        plog.error(f"Input file not found at: {input_path}")
        plog.finalize()
        return

    try:
        # Load
        df = pd.read_csv(input_path)
        plog.records_processed = len(df)
        plog.info(f"Loaded {len(df)} records.")

        # Clean column names
        df.columns = [col.strip() for col in df.columns]

        # Remove duplicate rows
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            df = df.drop_duplicates()
            plog.duplicates_removed = duplicates
            plog.info(f"Removed {duplicates} duplicate rows.")

        # Zeros in columns like Glucose, BloodPressure, SkinThickness, Insulin, BMI are physically impossible.
        # Convert them to NaN and impute with median.
        cols_with_zeros_to_impute = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]
        for col in cols_with_zeros_to_impute:
            if col in df.columns:
                zero_mask = df[col] == 0
                zero_count = zero_mask.sum()
                if zero_count > 0:
                    df.loc[zero_mask, col] = np.nan
                    plog.missing_values_imputed += zero_count
                    plog.info(f"Replaced {zero_count} zero values with NaN in '{col}'.")

        # Fill NaNs with median
        for col in df.columns:
            if df[col].isnull().sum() > 0:
                median_val = df[col].median()
                df[col] = df[col].fillna(median_val)
                plog.info(f"Imputed missing values in '{col}' with median: {median_val}")

        # Correct types
        int_cols = ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness", "Insulin", "Age", "Outcome"]
        for col in int_cols:
            if col in df.columns:
                df[col] = df[col].astype(int)

        # Validate
        validate(df, "diabetes", plog)

        # Save
        df.to_csv(output_path, index=False)
        plog.info(f"Successfully saved cleaned file to: {output_path}")

    except Exception as e:
        plog.error(f"Error during diabetes cleaning: {str(e)}")
        
    plog.finalize()

if __name__ == "__main__":
    clean_diabetes()
