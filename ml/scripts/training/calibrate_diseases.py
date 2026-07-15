#!/usr/bin/env python3
import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.calibration import CalibratedClassifierCV

# Ensure root of hospital app is in Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from HealthcareData.config import BASE_DIR

RAW_DIR = os.path.join(BASE_DIR, "raw")
MODELS_DIR = os.path.join(BASE_DIR, "..", "ml", "models")

DISEASE_CONFIGS = {
    "diabetes": {
        "file": os.path.join(RAW_DIR, "diabetes", "diabetes.csv"),
        "target": "Outcome",
        "exclude_cols": []
    },
    "heart": {
        "file": os.path.join(RAW_DIR, "heart", "heart_cleveland_upload.csv"),
        "target": "condition",
        "exclude_cols": []
    },
    "hypertension": {
        "file": os.path.join(RAW_DIR, "hypertension", "hypertension_dataset.csv"),
        "target": "Has_Hypertension",
        "exclude_cols": []
    },
    "kidney": {
        "file": os.path.join(RAW_DIR, "kidney", "kidney_disease.csv"),
        "target": "classification",
        "exclude_cols": ["id"]
    },
    "liver": {
        "file": os.path.join(RAW_DIR, "liver", "indian_liver_patient.csv"),
        "target": "Dataset",
        "exclude_cols": []
    },
    "pcos": {
        "file": os.path.join(RAW_DIR, "pcos", "PCOS_extended_dataset.csv"),
        "target": "PCOS (Y/N)",
        "exclude_cols": ["Sl. No", "Patient File No."]
    },
    "obesity": {
        "file": os.path.join(RAW_DIR, "obesity", "ObesityDataSet_raw_and_data_sinthetic.csv"),
        "target": "NObeyesdad",
        "exclude_cols": []
    },
    "mental_health": {
        "file": os.path.join(RAW_DIR, "mental_health", "Mental Health Dataset.csv"),
        "target": "treatment",
        "exclude_cols": ["Timestamp"]
    },
    "sleep": {
        "file": os.path.join(RAW_DIR, "sleep", "Sleep_health_and_lifestyle_dataset.csv"),
        "target": "Sleep Disorder",
        "exclude_cols": ["Person ID"]
    }
}

def clean_and_prepare_target(df: pd.DataFrame, disease: str, target_col: str) -> pd.Series:
    series = df[target_col].astype(str).str.strip()
    if disease == "hypertension":
        return series.str.lower().map({"yes": 1, "no": 0}).fillna(0).astype(int)
    elif disease == "kidney":
        return series.str.lower().str.replace(r'\t', '', regex=True).map({"ckd": 1, "notckd": 0}).fillna(0).astype(int)
    elif disease == "liver":
        return df[target_col].map({1: 1, 2: 0}).fillna(0).astype(int)
    elif disease == "mental_health":
        return series.str.lower().map({"yes": 1, "no": 0}).fillna(0).astype(int)
    elif disease == "sleep":
        le = LabelEncoder()
        return pd.Series(le.fit_transform(series.fillna("None")))
    elif disease == "obesity":
        le = LabelEncoder()
        return pd.Series(le.fit_transform(series))
    else:
        return pd.to_numeric(df[target_col], errors='coerce').fillna(0).astype(int)

def calibrate_disease_models():
    print("==============================================================")
    print("STARTING MEDICARE DISEASE PROBABILITY CALIBRATION")
    print("==============================================================")
    
    for disease, config in DISEASE_CONFIGS.items():
        print(f"\n>>> Calibrating Disease: {disease.upper()}")
        model_dir = os.path.join(MODELS_DIR, disease)
        
        if not os.path.exists(model_dir):
            print(f"  Skipping: Model folder not found at {model_dir}")
            continue
            
        # Load winner model & metadata
        try:
            with open(os.path.join(model_dir, "model.pkl"), 'rb') as f:
                model = pickle.load(f)
            with open(os.path.join(model_dir, "metadata.json"), 'r', encoding='utf-8') as f:
                meta = json.load(f)
        except Exception as e:
            print(f"  ERROR loading files: {str(e)}")
            continue
            
        # Load and preprocess dataset to get validation split
        file_path = config["file"]
        target_col = config["target"]
        exclude_cols = config["exclude_cols"]
        
        try:
            df = pd.read_csv(file_path)
            df.columns = [col.strip() for col in df.columns]
            
            # Downsample if needed
            if len(df) > 10000:
                df = df.sample(n=10000, random_state=42).reset_index(drop=True)
                
            y = clean_and_prepare_target(df, disease, target_col)
            exclude = [target_col] + exclude_cols
            X = df.drop(columns=[c for c in exclude if c in df.columns])
            
            # Preprocess
            for col in X.columns:
                if X[col].isnull().sum() > 0:
                    if X[col].dtype == 'object':
                        fill_val = X[col].mode()[0] if not X[col].mode().empty else "unknown"
                    else:
                        fill_val = X[col].median()
                    X[col] = X[col].fillna(fill_val)
                if X[col].dtype == 'object':
                    le = LabelEncoder()
                    X[col] = le.fit_transform(X[col].astype(str))
                    
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Get validation split
            _, X_val, _, y_val = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
            
            # Calibrate model using Platt scaling (sigmoid) prefit
            # For multi-class (sleep, obesity), CalibratedClassifierCV handles one-vs-rest calibration
            calibrated_clf = CalibratedClassifierCV(estimator=model, method='sigmoid', cv='prefit')
            calibrated_clf.fit(X_val, y_val)
            
            # Overwrite original model file
            with open(os.path.join(model_dir, "model.pkl"), 'wb') as f:
                pickle.dump(calibrated_clf, f)
                
            # Add risk threshold mapping
            meta["calibrated"] = True
            meta["risk_thresholds"] = {
                "low": [0.0, 0.30],
                "moderate": [0.30, 0.70],
                "high": [0.70, 1.00]
            }
            
            # Save updated metadata
            with open(os.path.join(model_dir, "metadata.json"), 'w', encoding='utf-8') as f:
                json.dump(meta, f, indent=2)
                
            print(f"  Successfully calibrated and updated {disease.upper()}")
            
        except Exception as e:
            print(f"  ERROR calibrating {disease.upper()}: {str(e)}")
            
    print("\n==============================================================")
    print("PROBABILITY CALIBRATION RUN COMPLETED!")
    print("==============================================================")

if __name__ == "__main__":
    calibrate_disease_models()
