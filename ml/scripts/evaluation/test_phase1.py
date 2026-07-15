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
DISEASES = ["diabetes", "heart", "hypertension", "kidney", "liver", "pcos", "obesity", "mental_health", "sleep"]

def test_phase1_models():
    print("==============================================================")
    print("RUNNING PHASE 1 MODEL INTEGRATION & VALIDATION CHECKS")
    print("==============================================================")
    
    passed_all = True
    
    for disease in DISEASES:
        model_dir = os.path.join(MODELS_DIR, disease)
        print(f"\nChecking disease folder: {disease}...")
        
        # Verify folder exists
        if not os.path.exists(model_dir):
            print(f"❌ FAIL: Folder does not exist at {model_dir}")
            passed_all = False
            continue
            
        # Check required files
        req_files = ["model.pkl", "scaler.pkl", "label_encoder.pkl", "feature_columns.json", "metadata.json"]
        missing_files = [f for f in req_files if not os.path.exists(os.path.join(model_dir, f))]
        
        if missing_files:
            print(f"❌ FAIL: Missing required files: {missing_files}")
            passed_all = False
            continue
            
        # Try loading metadata
        try:
            with open(os.path.join(model_dir, "metadata.json"), 'r', encoding='utf-8') as f:
                meta = json.load(f)
                
            # Verify fields
            req_fields = ["dataset_name", "training_date", "algorithm", "accuracy", "precision", "recall", "f1", "roc_auc", "number_of_samples", "features_used"]
            missing_fields = [f for f in req_fields if f not in meta]
            if missing_fields:
                print(f"❌ FAIL: metadata.json missing fields: {missing_fields}")
                passed_all = False
                continue
            else:
                print(f"  - metadata.json is valid (Algorithm: {meta['algorithm']}, ROC-AUC: {meta['roc_auc']})")
        except Exception as e:
            print(f"❌ FAIL: Error parsing metadata.json: {str(e)}")
            passed_all = False
            continue
            
        # Try loading components and executing dummy prediction
        try:
            with open(os.path.join(model_dir, "model.pkl"), 'rb') as f:
                model = pickle.load(f)
            with open(os.path.join(model_dir, "scaler.pkl"), 'rb') as f:
                scaler = pickle.load(f)
            with open(os.path.join(model_dir, "feature_columns.json"), 'r', encoding='utf-8') as f:
                features = json.load(f)
                
            # Generate valid dummy feature vector matching feature count
            dummy_input = np.zeros((1, len(features)))
            
            # Run scale and predict
            dummy_scaled = scaler.transform(dummy_input)
            
            # predict probabilities
            probs = model.predict_proba(dummy_scaled)
            pred = model.predict(dummy_scaled)
            
            print(f"  - Dummy inference successful. Features: {len(features)}. Pred Class: {pred[0]}. Probs shape: {probs.shape}")
            print(f"✅ PASS: {disease.upper()} is fully integrated.")
            
        except Exception as e:
            print(f"❌ FAIL: Error during model inference testing: {str(e)}")
            passed_all = False
            
    print("\n==============================================================")
    if passed_all:
        print("🎉 SUCCESS: ALL PHASE 1 INTEGRATION TESTS PASSED!")
    else:
        print("❌ FAIL: ONE OR MORE INTEGRATION CHECKS FAILED.")
    print("==============================================================")
    
    return passed_all

if __name__ == "__main__":
    test_phase1_models()
