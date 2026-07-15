#!/usr/bin/env python3
import os
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.ensemble import RandomForestClassifier

import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostClassifier

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # ml/
ROOT_DIR = os.path.dirname(BASE_DIR) # project root
RAW_DIR = os.path.join(ROOT_DIR, "HealthcareData", "raw")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Define target columns and files
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
    """
    Cleans target columns and maps them to standard label arrays.
    """
    series = df[target_col].astype(str).str.strip()
    
    if disease == "hypertension":
        # Map Yes/No to 1/0
        return series.str.lower().map({"yes": 1, "no": 0}).fillna(0).astype(int)
    elif disease == "kidney":
        # Map ckd/notckd to 1/0 (ckd\t is common in the raw file)
        return series.str.lower().str.replace(r'\t', '', regex=True).map({"ckd": 1, "notckd": 0}).fillna(0).astype(int)
    elif disease == "liver":
        # Map 1 to 1 (liver disease) and 2 to 0 (healthy)
        return df[target_col].map({1: 1, 2: 0}).fillna(0).astype(int)
    elif disease == "mental_health":
        # Map Yes/No to 1/0
        return series.str.lower().map({"yes": 1, "no": 0}).fillna(0).astype(int)
    elif disease == "sleep":
        # Map None to 0, Insomnia/Sleep Apnea to 1 or multi-class. We will keep it multi-class but encode it.
        le = LabelEncoder()
        return pd.Series(le.fit_transform(series.fillna("None")))
    elif disease == "obesity":
        # Multi-class category encoding
        le = LabelEncoder()
        return pd.Series(le.fit_transform(series))
    else:
        # Binary integers already
        return pd.to_numeric(df[target_col], errors='coerce').fillna(0).astype(int)

def train_disease_models():
    print("==============================================================")
    print("STARTING MEDICARE DISEASE PREDICTION TRAINING ENGINE")
    print("==============================================================")
    
    for disease, config in DISEASE_CONFIGS.items():
        print(f"\n>>> Processing Disease: {disease.upper()}")
        file_path = config["file"]
        target_col = config["target"]
        exclude_cols = config["exclude_cols"]
        
        if not os.path.exists(file_path):
            print(f"ERROR: Dataset not found for {disease} at {file_path}. Skipping.")
            continue
            
        try:
            # 1. Load Dataset
            df = pd.read_csv(file_path)
            # Strip column names
            df.columns = [col.strip() for col in df.columns]
            
            # Downsample very large datasets to keep training time reasonable (e.g. 10k rows max)
            if len(df) > 10000:
                print(f"Dataset too large ({len(df)} rows). Downsampling to 10,000 for training efficiency.")
                df = df.sample(n=10000, random_state=42).reset_index(drop=True)
                
            print(f"Loaded {len(df)} samples with {len(df.columns)} columns.")
            
            # 2. Extract and clean target
            y = clean_and_prepare_target(df, disease, target_col)
            
            # Drop target and exclude columns from features
            exclude = [target_col] + exclude_cols
            X = df.drop(columns=[c for c in exclude if c in df.columns])
            
            # 3. Preprocess Categorical Columns & Missing Values
            cat_encoders = {}
            for col in X.columns:
                # Fill missing
                if X[col].isnull().sum() > 0:
                    if X[col].dtype == 'object':
                        fill_val = X[col].mode()[0] if not X[col].mode().empty else "unknown"
                    else:
                        fill_val = X[col].median()
                    X[col] = X[col].fillna(fill_val)
                
                # Categorical Encoding
                if X[col].dtype == 'object':
                    le = LabelEncoder()
                    X[col] = le.fit_transform(X[col].astype(str))
                    # Save encoder classes for backend mapping
                    cat_encoders[col] = le.classes_.tolist()
                    
            # 4. Feature Scaling
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # 5. Split train/test
            X_train, X_val, y_train, y_val = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
            
            # Setup classifiers list
            # We determine multi-class status
            is_multiclass = len(np.unique(y)) > 2
            
            models = {
                "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42),
                "XGBoost": xgb.XGBClassifier(random_state=42, eval_metric='logloss'),
                "LightGBM": lgb.LGBMClassifier(random_state=42, verbose=-1),
                "CatBoost": CatBoostClassifier(random_seed=42, verbose=0)
            }
            
            best_roc = -1.0
            best_model_name = ""
            best_model_metrics = {}
            best_model = None
            
            # Train and evaluate all models
            for name, clf in models.items():
                # Cross Validation metrics aggregation
                skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
                cv_rocs = []
                for train_idx, val_idx in skf.split(X_scaled, y):
                    X_cv_train, y_cv_train = X_scaled[train_idx], y.iloc[train_idx]
                    X_cv_val, y_cv_val = X_scaled[val_idx], y.iloc[val_idx]
                    
                    clf.fit(X_cv_train, y_cv_train)
                    if is_multiclass:
                        y_cv_prob = clf.predict_proba(X_cv_val)
                        cv_rocs.append(roc_auc_score(y_cv_val, y_cv_prob, multi_class='ovr'))
                    else:
                        y_cv_prob = clf.predict_proba(X_cv_val)[:, 1]
                        cv_rocs.append(roc_auc_score(y_cv_val, y_cv_prob))
                
                mean_cv_roc = np.mean(cv_rocs)
                
                # Fit final model on main training set
                clf.fit(X_train, y_train)
                y_pred = clf.predict(X_val)
                
                if is_multiclass:
                    y_prob = clf.predict_proba(X_val)
                    roc_auc = roc_auc_score(y_val, y_prob, multi_class='ovr')
                else:
                    y_prob = clf.predict_proba(X_val)[:, 1]
                    roc_auc = roc_auc_score(y_val, y_prob)
                    
                acc = accuracy_score(y_val, y_pred)
                prec = precision_score(y_val, y_pred, average='weighted', zero_division=0)
                rec = recall_score(y_val, y_pred, average='weighted', zero_division=0)
                f1 = f1_score(y_val, y_pred, average='weighted', zero_division=0)
                
                print(f" - {name:12s} CV ROC-AUC: {mean_cv_roc:.4f} | Val ROC-AUC: {roc_auc:.4f} | F1: {f1:.4f}")
                
                if roc_auc > best_roc:
                    best_roc = roc_auc
                    best_model_name = name
                    best_model = clf
                    best_model_metrics = {
                        "accuracy": round(float(acc), 4),
                        "precision": round(float(prec), 4),
                        "recall": round(float(rec), 4),
                        "f1": round(float(f1), 4),
                        "roc_auc": round(float(roc_auc), 4),
                        "cv_mean_roc_auc": round(float(mean_cv_roc), 4)
                    }
            
            print(f" Winner: {best_model_name} with ROC-AUC {best_roc:.4f}")
            
            # 6. Save Best Model, Scaler, and Encoders
            output_dir = os.path.join(MODELS_DIR, disease)
            os.makedirs(output_dir, exist_ok=True)
            
            with open(os.path.join(output_dir, "model.pkl"), 'wb') as f:
                pickle.dump(best_model, f)
            with open(os.path.join(output_dir, "scaler.pkl"), 'wb') as f:
                pickle.dump(scaler, f)
            with open(os.path.join(output_dir, "label_encoder.pkl"), 'wb') as f:
                pickle.dump(cat_encoders, f)
                
            # Write feature list
            with open(os.path.join(output_dir, "feature_columns.json"), 'w', encoding='utf-8') as f:
                json.dump(X.columns.tolist(), f, indent=2)
                
            # Create metadata.json
            metadata = {
                "dataset_name": os.path.basename(file_path),
                "training_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                "algorithm": best_model_name,
                "accuracy": best_model_metrics["accuracy"],
                "precision": best_model_metrics["precision"],
                "recall": best_model_metrics["recall"],
                "f1": best_model_metrics["f1"],
                "roc_auc": best_model_metrics["roc_auc"],
                "cv_mean_roc_auc": best_model_metrics["cv_mean_roc_auc"],
                "number_of_samples": int(len(df)),
                "features_used": X.columns.tolist(),
                "categorical_columns_classes": cat_encoders
            }
            with open(os.path.join(output_dir, "metadata.json"), 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
                
            print(f" Successfully saved model artifacts to: {output_dir}")
            
        except Exception as e:
            print(f"CRITICAL ERROR training {disease}: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    train_disease_models()
