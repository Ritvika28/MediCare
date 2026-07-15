#!/usr/bin/env python3
import os
import sys
import json
import pickle
import numpy as np

# Ensure root of hospital app is in Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from HealthcareData.config import BASE_DIR

MODELS_DIR = os.path.join(BASE_DIR, "..", "ml", "models")

def test_phase6_forecasting():
    print("==============================================================")
    print("RUNNING PHASE 6 TIMESERIES FORECASTING INTEGRATION CHECKS")
    print("==============================================================")
    
    passed = True
    model_dir = os.path.join(MODELS_DIR, "forecasting")
    
    # 1. Verify files exist
    if not os.path.exists(model_dir):
        print(f"❌ FAIL: Folder does not exist at {model_dir}")
        return False
        
    vitals = ["systolic", "diastolic", "glucose", "weight"]
    req_files = [f"{v}_model.pkl" for v in vitals] + ["metadata.json"]
    
    missing_files = [f for f in req_files if not os.path.exists(os.path.join(model_dir, f))]
    if missing_files:
        print(f"❌ FAIL: Missing required files: {missing_files}")
        return False
        
    # 2. Check metadata
    try:
        with open(os.path.join(model_dir, "metadata.json"), 'r', encoding='utf-8') as f:
            meta = json.load(f)
            
        req_fields = ["dataset_name", "training_date", "metrics", "lags_used", "features_used"]
        missing_fields = [f for f in req_fields if f not in meta]
        if missing_fields:
            print(f"❌ FAIL: metadata.json missing fields: {missing_fields}")
            passed = False
        else:
            print("  - metadata.json is valid.")
            for v in vitals:
                metric = meta["metrics"][v]
                print(f"    - {v.upper()}: Algorithm: {metric['algorithm']}, MAE: {metric['mae']}")
    except Exception as e:
        print(f"❌ FAIL: Error parsing metadata.json: {str(e)}")
        return False
        
    # 3. Load and test forecasts
    test_lags = {
        "systolic": [120.0, 122.0, 121.0],
        "diastolic": [80.0, 81.0, 80.0],
        "glucose": [95.0, 97.0, 96.0],
        "weight": [70.0, 70.2, 70.1]
    }
    
    try:
        for v in vitals:
            model_path = os.path.join(model_dir, f"{v}_model.pkl")
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
                
            lags = np.array([test_lags[v]])
            pred = model.predict(lags)
            
            print(f"  - Forecast successful. {v.upper()}: input lags {test_lags[v]} -> predicted t+1: {pred[0]:.2f}")
            
            # Simple boundary check
            if pred[0] <= 0:
                print(f"❌ FAIL: Predicted {v} is negative: {pred[0]}")
                passed = False
                
        if passed:
            print("✅ PASS: All vital forecasting models make valid trajectory predictions.")
            
    except Exception as e:
        print(f"❌ FAIL: Error during forecast model inference: {str(e)}")
        passed = False
        
    print("\n==============================================================")
    if passed:
        print("🎉 SUCCESS: PHASE 6 INTEGRATION CHECKS PASSED!")
    else:
        print("❌ FAIL: INTEGRATION CHECKS FAILED.")
    print("==============================================================")
    
    return passed

if __name__ == "__main__":
    test_phase6_forecasting()
