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

def test_phase2_biological_age():
    print("==============================================================")
    print("RUNNING PHASE 2 BIOLOGICAL AGE REGRESSION INTEGRATION CHECKS")
    print("==============================================================")
    
    passed = True
    model_dir = os.path.join(MODELS_DIR, "biological_age")
    
    # Verify folder exists
    if not os.path.exists(model_dir):
        print(f"❌ FAIL: Folder does not exist at {model_dir}")
        return False
        
    # Check files
    req_files = ["biological_age_model.pkl", "scaler.pkl", "metadata.json"]
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
        with open(os.path.join(model_dir, "biological_age_model.pkl"), 'rb') as f:
            model = pickle.load(f)
        with open(os.path.join(model_dir, "scaler.pkl"), 'rb') as f:
            scaler = pickle.load(f)
            
        features = meta["features_used"]
        
        # Test normal input: 50 years old, normal biomarkers
        # features list: ["RIDAGEYR", "LBXSAL", "LBXSCR", "LBXGLU", "LBXLYPCT", "LBXMCVSI", "LBXRDW", "LBXSAPSI", "LBXWBCSI"]
        dummy_input = np.array([[50.0, 4.2, 0.8, 95.0, 30.0, 90.0, 13.0, 70.0, 6.0]])
        
        dummy_scaled = scaler.transform(dummy_input)
        pred = model.predict(dummy_scaled)
        
        print(f"  - Dummy inference successful. Input: 50 years. Predicted Biological Age: {pred[0]:.2f} years.")
        
        if pred[0] < 10.0 or pred[0] > 110.0:
            print(f"❌ FAIL: Biological age prediction value is unrealistic: {pred[0]}")
            passed = False
        else:
            print(f"✅ PASS: Biological Age Model is fully integrated.")
            
    except Exception as e:
        print(f"❌ FAIL: Error during biological age model inference: {str(e)}")
        passed = False
        
    print("\n==============================================================")
    if passed:
        print("🎉 SUCCESS: PHASE 2 INTEGRATION CHECKS PASSED!")
    else:
        print("❌ FAIL: INTEGRATION CHECKS FAILED.")
    print("==============================================================")
    
    return passed

if __name__ == "__main__":
    test_phase2_biological_age()
