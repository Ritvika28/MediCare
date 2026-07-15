#!/usr/bin/env python3
import os
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.linear_model import Ridge
import xgboost as xgb

# Set up paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # ml/
OUTPUT_DIR = os.path.join(BASE_DIR, "models", "forecasting")

def simulate_vitals_timeseries(num_patients=500, days=30):
    """
    Simulates longitudinal vital logs over a 30-day period for a cohort of patients.
    Vitals generated: Systolic_BP, Diastolic_BP, Glucose, Weight.
    """
    np.random.seed(42)
    records = []
    
    for p_id in range(num_patients):
        # Establish patient baseline values
        base_sys = np.random.normal(122.0, 10.0)
        base_dia = np.random.normal(81.0, 6.0)
        base_glu = np.random.normal(96.0, 15.0)
        base_wt = np.random.normal(72.0, 12.0)
        
        # Individual trend slopes
        sys_slope = np.random.normal(0.05, 0.1)
        dia_slope = np.random.normal(0.03, 0.05)
        glu_slope = np.random.normal(0.1, 0.2)
        wt_slope = np.random.normal(-0.01, 0.03)
        
        sys_val, dia_val, glu_val, wt_val = base_sys, base_dia, base_glu, base_wt
        
        for day in range(days):
            # Apply autoregressive step + trend + random walk noise
            sys_val = 0.7 * sys_val + 0.3 * base_sys + sys_slope + np.random.normal(0, 2.0)
            dia_val = 0.7 * dia_val + 0.3 * base_dia + dia_slope + np.random.normal(0, 1.5)
            glu_val = 0.6 * glu_val + 0.4 * base_glu + glu_slope + np.random.normal(0, 4.0)
            wt_val = 0.95 * wt_val + 0.05 * base_wt + wt_slope + np.random.normal(0, 0.2)
            
            records.append({
                "patient_id": p_id,
                "day": day,
                "systolic": round(sys_val, 1),
                "diastolic": round(dia_val, 1),
                "glucose": round(glu_val, 1),
                "weight": round(wt_val, 1)
            })
            
    return pd.DataFrame(records)

def create_autoregressive_lags(df, target_col, lags=3):
    """
    Constructs autoregressive lag datasets.
    E.g. Features: lag_1, lag_2, lag_3 to predict target on day t.
    """
    X_list, y_list = [], []
    
    for p_id, group in df.groupby("patient_id"):
        values = group[target_col].values
        for t in range(lags, len(values)):
            X_list.append(values[t-lags:t]) # past lags values
            y_list.append(values[t]) # current value
            
    X = np.array(X_list)
    y = np.array(y_list)
    return X, y

def train_vital_forecasting():
    print("==============================================================")
    print("STARTING MEDICARE TIMESERIES FORECASTING TRAINING ENGINE")
    print("==============================================================")
    
    # 1. Generate Timeseries Vitals
    df = simulate_vitals_timeseries(num_patients=500, days=30)
    print(f"Simulated timeseries records: {len(df)} rows across {df['patient_id'].nunique()} patients.")
    
    vitals_to_forecast = ["systolic", "diastolic", "glucose", "weight"]
    forecast_results = {}
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    for vital in vitals_to_forecast:
        print(f"\n>>> Training forecaster for vital: {vital.upper()}")
        
        # Create lag features (lags=3)
        X, y = create_autoregressive_lags(df, vital, lags=3)
        
        # Split train/test
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Compare Ridge vs XGBoost
        models = {
            "Autoregressive_Ridge": Ridge(alpha=1.0),
            "Autoregressive_XGB": xgb.XGBRegressor(random_state=42, eval_metric='rmse')
        }
        
        best_mae = float('inf')
        best_model_name = ""
        best_model = None
        best_rmse = float('inf')
        
        for name, model in models.items():
            model.fit(X_train, y_train)
            preds = model.predict(X_val)
            
            mae = mean_absolute_error(y_val, preds)
            rmse = np.sqrt(mean_squared_error(y_val, preds))
            
            print(f" - {name:22s} MAE: {mae:.4f} | RMSE: {rmse:.4f}")
            
            if mae < best_mae:
                best_mae = mae
                best_rmse = rmse
                best_model_name = name
                best_model = model
                
        print(f" Winner for {vital.upper()}: {best_model_name} with MAE {best_mae:.4f}")
        
        # Save model pickle
        model_filename = f"{vital}_model.pkl"
        with open(os.path.join(OUTPUT_DIR, model_filename), 'wb') as f:
            pickle.dump(best_model, f)
            
        forecast_results[vital] = {
            "algorithm": best_model_name,
            "mae": round(float(best_mae), 4),
            "rmse": round(float(best_rmse), 4)
        }
        
    # Write metadata.json
    metadata = {
        "dataset_name": "Simulated Vitals 30-Day Longitudinal Tracking Logs",
        "training_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "metrics": forecast_results,
        "lags_used": 3,
        "features_used": ["lag_1", "lag_2", "lag_3"]
    }
    
    with open(os.path.join(OUTPUT_DIR, "metadata.json"), 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\n Successfully saved all forecasting models to: {OUTPUT_DIR}")

if __name__ == "__main__":
    train_vital_forecasting()
