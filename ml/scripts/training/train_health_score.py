#!/usr/bin/env python3
import os
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # ml/
ROOT_DIR = os.path.dirname(BASE_DIR)
NHANES_FEATURES_PATH = os.path.join(ROOT_DIR, "HealthcareData", "feature_engineered", "nhanes_features.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "models", "health_score")

def calculate_health_stability_score(df: pd.DataFrame) -> pd.Series:
    """
    Calculates a clinically driven Health Stability Score between 0 and 100.
    Deductions are based on deviations from normal vital and lab ranges.
    """
    scores = np.ones(len(df)) * 100.0
    
    # 1. Blood Pressure Deductions
    sys = df["Systolic_BP"].fillna(120.0)
    dia = df["Diastolic_BP"].fillna(80.0)
    
    # Systolic deductions
    scores -= np.where(sys >= 140.0, 20.0, 0.0)
    scores -= np.where((sys >= 130.0) & (sys < 140.0), 10.0, 0.0)
    scores -= np.where(sys < 90.0, 10.0, 0.0)
    
    # Diastolic deductions
    scores -= np.where(dia >= 90.0, 20.0, 0.0)
    scores -= np.where((dia >= 80.0) & (dia < 90.0), 10.0, 0.0)
    scores -= np.where(dia < 60.0, 10.0, 0.0)
    
    # 2. BMI Deductions
    bmi = df["BMI"].fillna(22.0)
    scores -= np.where(bmi >= 30.0, 20.0, 0.0)
    scores -= np.where((bmi >= 25.0) & (bmi < 30.0), 10.0, 0.0)
    scores -= np.where(bmi < 18.5, 15.0, 0.0)
    
    # 3. Glucose Deductions
    glu = df["LBXGLU"].fillna(95.0)
    scores -= np.where(glu >= 126.0, 20.0, 0.0)
    scores -= np.where((glu >= 100.0) & (glu < 126.0), 10.0, 0.0)
    scores -= np.where(glu < 60.0, 15.0, 0.0)
    
    # 4. Lipid Deductions (Total Cholesterol / HDL Ratio)
    # Mean HDL ratio is LBXTC / LBDHDD
    hdl = df["LBDHDD"].fillna(50.0)
    tc = df["LBXTC"].fillna(180.0)
    hdl_ratio = tc / hdl
    scores -= np.where(hdl_ratio > 5.0, 15.0, 0.0)
    scores -= np.where((hdl_ratio > 3.5) & (hdl_ratio <= 5.0), 5.0, 0.0)
    
    # 5. Heart Rate Deductions
    pulse = df["BPXPLS"].fillna(72.0)
    scores -= np.where(pulse >= 100.0, 15.0, 0.0)
    scores -= np.where(pulse < 50.0, 15.0, 0.0)
    
    # Clip values to [0.0, 100.0]
    scores = np.clip(scores, 0.0, 100.0)
    
    return pd.Series(scores)

def train_health_score_model():
    print("==============================================================")
    print("STARTING MEDICARE HEALTH STABILITY INDEX TRAINING PIPELINE")
    print("==============================================================")
    
    if not os.path.exists(NHANES_FEATURES_PATH):
        print(f"ERROR: NHANES features not found at {NHANES_FEATURES_PATH}. Please run extract_features.py first.")
        return
        
    try:
        # 1. Load Dataset
        df = pd.read_csv(NHANES_FEATURES_PATH)
        
        # Downsample to keep training times fast and efficient
        if len(df) > 20000:
            print(f"Dataset too large ({len(df)} rows). Downsampling to 20,000 for training efficiency.")
            df = df.sample(n=20000, random_state=42).reset_index(drop=True)
            
        print(f"Loaded NHANES feature dataset: {len(df)} rows.")
        
        # 2. Extract Target Variable (Health Stability Score)
        y = calculate_health_stability_score(df)
        
        # 3. Features Selection (inputs for regression model)
        # Inputs: Blood Pressure, BMI, Sleep, Activity, Glucose, HDL, Cholesterol, Age, Heart Rate
        # We will use: Systolic_BP, Diastolic_BP, BMI, Sleep_Score, LBXGLU, LBDHDD, LBXTC, RIDAGEYR, BPXPLS
        feature_cols = [
            "Systolic_BP", "Diastolic_BP", "BMI", "Sleep_Score", 
            "LBXGLU", "LBDHDD", "LBXTC", "RIDAGEYR", "BPXPLS"
        ]
        
        X = df[feature_cols].copy()
        
        # Impute missing values in inputs
        for col in X.columns:
            if X[col].isnull().sum() > 0:
                X[col] = X[col].fillna(X[col].median())
                
        # Scale Features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # 4. Train/Test Split (80/20)
        X_train, X_val, y_train, y_val = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        
        # Define regressors list
        models = {
            "RandomForestRegressor": RandomForestRegressor(n_estimators=100, random_state=42),
            "XGBRegressor": xgb.XGBRegressor(random_state=42, eval_metric='rmse')
        }
        
        best_mae = float('inf')
        best_model_name = ""
        best_model = None
        best_metrics = {}
        
        # Train and compare
        for name, reg in models.items():
            reg.fit(X_train, y_train)
            y_pred = reg.predict(X_val)
            
            mae = mean_absolute_error(y_val, y_pred)
            rmse = np.sqrt(mean_squared_error(y_val, y_pred))
            r2 = r2_score(y_val, y_pred)
            
            print(f" - {name:22s} MAE: {mae:.4f} | RMSE: {rmse:.4f} | R²: {r2:.4f}")
            
            if mae < best_mae:
                best_mae = mae
                best_model_name = name
                best_model = reg
                best_metrics = {
                    "mae": round(float(mae), 4),
                    "rmse": round(float(rmse), 4),
                    "r2": round(float(r2), 4)
                }
                
        print(f" Winner: {best_model_name} with MAE {best_mae:.4f}")
        
        # 5. Save best model artifacts
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(os.path.join(OUTPUT_DIR, "model.pkl"), 'wb') as f:
            pickle.dump(best_model, f)
        with open(os.path.join(OUTPUT_DIR, "scaler.pkl"), 'wb') as f:
            pickle.dump(scaler, f)
            
        # Write metadata.json
        metadata = {
            "dataset_name": os.path.basename(NHANES_FEATURES_PATH),
            "training_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "algorithm": best_model_name,
            "mae": best_metrics["mae"],
            "rmse": best_metrics["rmse"],
            "r2": best_metrics["r2"],
            "number_of_samples": int(len(df)),
            "features_used": feature_cols
        }
        with open(os.path.join(OUTPUT_DIR, "metadata.json"), 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
            
        print(f" Successfully saved health score artifacts to: {OUTPUT_DIR}")
        
    except Exception as e:
        print(f"CRITICAL ERROR during health score training: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    train_health_score_model()
