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
import lightgbm as lgb
from catboost import CatBoostRegressor

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # ml/
ROOT_DIR = os.path.dirname(BASE_DIR)
NHANES_FEATURES_PATH = os.path.join(ROOT_DIR, "HealthcareData", "feature_engineered", "nhanes_features.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "models", "biological_age")

def calculate_phenoage_target(df: pd.DataFrame) -> pd.Series:
    """
    Calculates Levine's PhenoAge (biological age target) using chronological age
    and 8 available blood biomarkers from NHANES with default CRP.
    """
    # Required columns in NHANES format
    # Albumin (LBXSAL in g/dL -> convert to g/L by multiplying by 10)
    # Creatinine (LBXSCR in mg/dL)
    # Glucose (LBXGLU in mg/dL)
    # Lymphocytes percent (LBXLYPCT in %)
    # MCV (LBXMCVSI in fL)
    # RDW (LBXRDW in %)
    # ALP (LBXSAPSI in U/L)
    # WBC (LBXWBCSI in 1000 cells/uL)
    # Age (RIDAGEYR in years)
    
    age = df["RIDAGEYR"].fillna(df["RIDAGEYR"].median())
    albumin = df["LBXSAL"].fillna(df["LBXSAL"].median()) * 10.0
    creatinine = df["LBXSCR"].fillna(df["LBXSCR"].median()) * 88.4  # Convert mg/dL to µmol/L
    glucose = df["LBXGLU"].fillna(df["LBXGLU"].median()) / 18.0182  # Convert mg/dL to mmol/L
    lymph = df["LBXLYPCT"].fillna(df["LBXLYPCT"].median())
    mcv = df["LBXMCVSI"].fillna(df["LBXMCVSI"].median())
    rdw = df["LBXRDW"].fillna(df["LBXRDW"].median())
    alp = df["LBXSAPSI"].fillna(df["LBXSAPSI"].median())
    wbc = df["LBXWBCSI"].fillna(df["LBXWBCSI"].median())
    
    # CRP is missing in this clean dataset, so we assume a default normal CRP of 1.0 mg/L
    crp = 1.0
    
    # 1. Linear Predictor (xb)
    xb = (-19.907 
          - 0.0336 * albumin 
          + 0.0095 * creatinine 
          + 0.1953 * glucose 
          + 0.0954 * np.log(crp) 
          - 0.0120 * lymph 
          + 0.0268 * mcv 
          + 0.3306 * rdw 
          + 0.00188 * alp 
          + 0.0554 * wbc 
          + 0.0804 * age)
          
    # 2. Mortality Risk (M)
    M = 1.0 - np.exp(-np.exp(xb) * (np.exp(120 * 0.0076927) - 1.0) / 0.0076927)
    
    # Clip risk probability to prevent log of negative values/zeros
    M = np.clip(M, 1e-15, 1.0 - 1e-15)
    
    # 3. PhenoAge
    phenoage = 141.50225 + np.log(-0.00553 * np.log(1.0 - M)) / 0.090165
    
    # Handle any potential edge cases or infinites
    phenoage = np.clip(phenoage, 1.0, 120.0)
    
    return pd.Series(phenoage)

def train_biological_age():
    print("==============================================================")
    print("STARTING MEDICARE BIOLOGICAL AGE PREDICTION TRAINING PIPELINE")
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
        
        # 2. Extract Target Variable (Biological Age)
        y = calculate_phenoage_target(df)
        
        # 3. Features Selection (inputs for regression model)
        feature_cols = [
            "RIDAGEYR", "LBXSAL", "LBXSCR", "LBXGLU", "LBXLYPCT", 
            "LBXMCVSI", "LBXRDW", "LBXSAPSI", "LBXWBCSI"
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
            "XGBRegressor": xgb.XGBRegressor(random_state=42, eval_metric='rmse'),
            "LightGBMRegressor": lgb.LGBMRegressor(random_state=42, verbose=-1),
            "CatBoostRegressor": CatBoostRegressor(random_seed=42, verbose=0)
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
        with open(os.path.join(OUTPUT_DIR, "biological_age_model.pkl"), 'wb') as f:
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
            
        print(f" Successfully saved biological age artifacts to: {OUTPUT_DIR}")
        
    except Exception as e:
        print(f"CRITICAL ERROR during biological age training: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    train_biological_age()
