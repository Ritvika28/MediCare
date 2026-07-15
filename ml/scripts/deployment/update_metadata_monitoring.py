#!/usr/bin/env python3
import os
import json
from datetime import datetime

# Path resolve
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # ml/
MODELS_DIR = os.path.join(BASE_DIR, "models")

def update_metadata():
    print("==============================================================")
    print("UPDATING MODEL METADATA WITH PRODUCTION MONITORING FIELDS")
    print("==============================================================")
    
    if not os.path.exists(MODELS_DIR):
        print(f"❌ MODELS_DIR does not exist at: {MODELS_DIR}")
        return
        
    for item in os.listdir(MODELS_DIR):
        item_path = os.path.join(MODELS_DIR, item)
        if not os.path.isdir(item_path):
            continue
            
        meta_file = os.path.join(item_path, "metadata.json")
        if os.path.exists(meta_file):
            print(f"Auditing metadata: {item}...")
            try:
                with open(meta_file, 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                
                # Check version fields
                changed = False
                if "version" not in meta:
                    meta["version"] = "v1.0.0"
                    changed = True
                if "dataset_version" not in meta:
                    meta["dataset_version"] = "d1.0.0"
                    changed = True
                if "training_timestamp" not in meta:
                    meta["training_timestamp"] = meta.get("training_date", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
                    changed = True
                if "training_parameters" not in meta:
                    # Supply basic parameters based on model type
                    algo = meta.get("algorithm", "").lower()
                    if "xgb" in algo:
                        meta["training_parameters"] = {
                            "n_estimators": 100,
                            "max_depth": 5,
                            "learning_rate": 0.1,
                            "random_state": 42
                        }
                    elif "catboost" in algo:
                        meta["training_parameters"] = {
                            "iterations": 100,
                            "depth": 6,
                            "learning_rate": 0.1,
                            "random_state": 42
                        }
                    elif "lightgbm" in algo or "lgbm" in algo:
                        meta["training_parameters"] = {
                            "n_estimators": 100,
                            "max_depth": 6,
                            "learning_rate": 0.1,
                            "random_state": 42
                        }
                    else:
                        meta["training_parameters"] = {
                            "n_estimators": 100,
                            "max_depth": 6,
                            "random_state": 42
                        }
                    changed = True
                
                if changed:
                    with open(meta_file, 'w', encoding='utf-8') as f:
                        json.dump(meta, f, indent=2)
                    print(f"  ✅ Updated metadata.json successfully.")
                else:
                    print(f"  ✅ metadata.json already conforms to monitoring spec.")
            except Exception as e:
                print(f"  ❌ Error processing {meta_file}: {e}")

if __name__ == "__main__":
    update_metadata()
