#!/usr/bin/env python3
import os
import sys
import json
import pickle
import numpy as np
from sklearn.calibration import CalibratedClassifierCV

# Ensure root of hospital app is in Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from HealthcareData.config import BASE_DIR

MODELS_DIR = os.path.join(BASE_DIR, "..", "ml", "models")
DISEASES = ["diabetes", "heart", "hypertension", "kidney", "liver", "pcos", "obesity", "mental_health", "sleep"]

def get_risk_label(prob: float, thresholds: dict) -> str:
    if prob < thresholds["low"][1]:
        return "Low"
    elif prob < thresholds["moderate"][1]:
        return "Moderate"
    else:
        return "High"

def test_phase4_calibration():
    print("==============================================================")
    print("RUNNING PHASE 4 DISEASE PROBABILITY ENGINE INTEGRATION CHECKS")
    print("==============================================================")
    
    passed_all = True
    
    for disease in DISEASES:
        model_dir = os.path.join(MODELS_DIR, disease)
        print(f"\nChecking calibrated disease: {disease}...")
        
        # 1. Check metadata.json updates
        meta_path = os.path.join(model_dir, "metadata.json")
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
                
            if not meta.get("calibrated"):
                print("❌ FAIL: metadata does not have 'calibrated': true")
                passed_all = False
                continue
                
            thresholds = meta.get("risk_thresholds")
            if not thresholds or "low" not in thresholds or "moderate" not in thresholds or "high" not in thresholds:
                print("❌ FAIL: metadata does not have valid 'risk_thresholds'")
                passed_all = False
                continue
                
            print(f"  - metadata.json is calibrated (Risk levels: Low < {thresholds['low'][1]}, Moderate < {thresholds['moderate'][1]}, High >= {thresholds['moderate'][1]})")
        except Exception as e:
            print(f"❌ FAIL: Error parsing metadata.json: {str(e)}")
            passed_all = False
            continue
            
        # 2. Check model loading and calibration wrapper
        model_path = os.path.join(model_dir, "model.pkl")
        scaler_path = os.path.join(model_dir, "scaler.pkl")
        feature_path = os.path.join(model_dir, "feature_columns.json")
        
        try:
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            with open(scaler_path, 'rb') as f:
                scaler = pickle.load(f)
            with open(feature_path, 'r', encoding='utf-8') as f:
                features = json.load(f)
                
            # Verify wrapper class
            if not isinstance(model, CalibratedClassifierCV):
                print(f"❌ FAIL: Model is not wrapped in CalibratedClassifierCV (type is {type(model)})")
                passed_all = False
                continue
            
            # Predict probability
            dummy_input = np.zeros((1, len(features)))
            dummy_scaled = scaler.transform(dummy_input)
            probs = model.predict_proba(dummy_scaled)[0]
            
            # Binary or multiclass check
            is_multiclass = len(probs) > 2
            if is_multiclass:
                # For multiclass, verify probability distribution adds to 1
                prob_sum = np.sum(probs)
                print(f"  - Multiclass prediction successful. Class probabilities: {probs}. Sum: {prob_sum:.4f}")
                if not np.isclose(prob_sum, 1.0):
                    print(f"❌ FAIL: Multi-class probabilities do not sum to 1.0 (sum={prob_sum})")
                    passed_all = False
            else:
                # Binary probability of class 1 (positive risk class)
                risk_prob = float(probs[1])
                risk_label = get_risk_label(risk_prob, thresholds)
                print(f"  - Binary prediction successful. Risk Probability: {risk_prob:.4f} -> Category: {risk_label}")
                
            print(f"✅ PASS: {disease.upper()} probability engine is fully integrated.")
            
        except Exception as e:
            print(f"❌ FAIL: Error during dummy inference on calibrated model: {str(e)}")
            passed_all = False
            
    print("\n==============================================================")
    if passed_all:
        print("🎉 SUCCESS: ALL PHASE 4 PROBABILITY ENGINE CHECKS PASSED!")
    else:
        print("❌ FAIL: ONE OR MORE PROBABILITY ENGINE CHECKS FAILED.")
    print("==============================================================")
    
    return passed_all

if __name__ == "__main__":
    test_phase4_calibration()
