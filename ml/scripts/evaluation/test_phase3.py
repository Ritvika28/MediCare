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

def test_phase3_health_score():
    print("==============================================================")
    print("RUNNING PHASE 3 HEALTH SCORE REGRESSION INTEGRATION CHECKS")
    print("==============================================================")
    
    passed = True
    model_dir = os.path.join(MODELS_DIR, "health_score")
    
    # Verify folder exists
    if not os.path.exists(model_dir):
        print(f"❌ FAIL: Folder does not exist at {model_dir}")
        return False
        
    # Check files
    req_files = ["model.pkl", "scaler.pkl", "metadata.json"]
    missing_files = [f for f in req_files if not os.path.exists(os.path.join(model_dir, f))]
    
    if missing_files:
        print(f"❌ FAIL: Missing required files: {missing_files}")
        return False
        
    # Check metadata
    try:
        with open(os.path.join(model_dir, "metadata.json"), 'r', encoding='utf-8') as f:
            meta = json.load(f)
            
        req_fields = ["dataset_name", "training_date", "algorithm", "mae", "rmse", "r2", "number_of_samples", "features_used"]
        missing_fields = [f for f in req_fields if f not in meta]
        if missing_fields:
            print(f"❌ FAIL: metadata.json missing fields: {missing_fields}")
            passed = False
        else:
            print(f"  - metadata.json is valid (Algorithm: {meta['algorithm']}, MAE: {meta['mae']}, R²: {meta['r2']})")
    except Exception as e:
        print(f"❌ FAIL: Error parsing metadata.json: {str(e)}")
        return False
        
    # Check prediction capability
    try:
        with open(os.path.join(model_dir, "model.pkl"), 'rb') as f:
            model = pickle.load(f)
        with open(os.path.join(model_dir, "scaler.pkl"), 'rb') as f:
            scaler = pickle.load(f)
            
        # Test normal input: Sys=120, Dia=80, BMI=22, Sleep=8, Glucose=90, HDL=50, Chol=180, Age=30, HeartRate=72
        # Feature order: ["Systolic_BP", "Diastolic_BP", "BMI", "Sleep_Score", "LBXGLU", "LBDHDD", "LBXTC", "RIDAGEYR", "BPXPLS"]
        dummy_input = np.array([[120.0, 80.0, 22.0, 8.0, 90.0, 50.0, 180.0, 30.0, 72.0]])
        
        dummy_scaled = scaler.transform(dummy_input)
        pred = model.predict(dummy_scaled)
        
        print(f"  - Dummy inference successful. Predicted Health Stability Score: {pred[0]:.2f}")
        
        if pred[0] < 0.0 or pred[0] > 100.0:
            print(f"❌ FAIL: Health score prediction value is out of bounds: {pred[0]}")
            passed = False
        else:
            print(f"✅ PASS: Health Stability Model is fully integrated.")
            
    except Exception as e:
        print(f"❌ FAIL: Error during health score model inference: {str(e)}")
        passed = False
        
    print("\n==============================================================")
    if passed:
        print("🎉 SUCCESS: PHASE 3 INTEGRATION CHECKS PASSED!")
    else:
        print("❌ FAIL: INTEGRATION CHECKS FAILED.")
    print("==============================================================")
    
    return passed

if __name__ == "__main__":
    test_phase3_health_score()
