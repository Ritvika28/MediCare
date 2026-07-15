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

# Haversine distance helper
def haversine_distance(lat1, lon1, lat2, lon2):
    r = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    return r * 2 * np.arcsin(np.sqrt(a))

def test_phase5_recommendation():
    print("==============================================================")
    print("RUNNING PHASE 5 RECOMMENDATION ENGINE INTEGRATION CHECKS")
    print("==============================================================")
    
    passed = True
    model_dir = os.path.join(MODELS_DIR, "recommendation")
    
    # 1. Verify files exist
    if not os.path.exists(model_dir):
        print(f"❌ FAIL: Folder does not exist at {model_dir}")
        return False
        
    req_files = ["model.pkl", "scaler.pkl", "candidates.pkl", "metadata.json"]
    missing_files = [f for f in req_files if not os.path.exists(os.path.join(model_dir, f))]
    if missing_files:
        print(f"❌ FAIL: Missing required files: {missing_files}")
        return False
        
    # 2. Check metadata
    try:
        with open(os.path.join(model_dir, "metadata.json"), 'r', encoding='utf-8') as f:
            meta = json.load(f)
            
        req_fields = ["dataset_name", "training_date", "algorithm", "map_at_5", "ndcg_at_5", "total_queries", "candidates_count", "features_used"]
        missing_fields = [f for f in req_fields if f not in meta]
        if missing_fields:
            print(f"❌ FAIL: metadata.json missing fields: {missing_fields}")
            passed = False
        else:
            print(f"  - metadata.json is valid (Algorithm: {meta['algorithm']}, MAP@5: {meta['map_at_5']}, NDCG@5: {meta['ndcg_at_5']})")
    except Exception as e:
        print(f"❌ FAIL: Error parsing metadata.json: {str(e)}")
        return False
        
    # 3. Load components and execute candidate recommendation ranking
    try:
        with open(os.path.join(model_dir, "model.pkl"), 'rb') as f:
            model = pickle.load(f)
        with open(os.path.join(model_dir, "scaler.pkl"), 'rb') as f:
            scaler = pickle.load(f)
        with open(os.path.join(model_dir, "candidates.pkl"), 'rb') as f:
            candidates = pickle.load(f)
            
        print(f"  - Successfully loaded {len(candidates)} candidates.")
        
        # Test Query Context: User with high heart risk (0.90) and requested specialty is Cardiology
        # User coordinates (e.g. lat 13.08, lon 80.27 - Chennai)
        u_lat, u_lon = 13.08, 80.27
        requested_specialty = "Cardiology"
        
        user_risks = {
            "heart": 0.90, "diabetes": 0.10, "kidney": 0.10, "liver": 0.10, 
            "pcos": 0.10, "mental_health": 0.10, "sleep": 0.10
        }
        
        # Filter matching candidates
        matching_cands = [c for c in candidates if requested_specialty in c["specialties"]]
        print(f"  - Found {len(matching_cands)} matching candidates specializing in {requested_specialty}.")
        
        # Select up to 10 candidates to rank
        test_cands = matching_cands[:10]
        
        features_list = []
        for cand in test_cands:
            dist = haversine_distance(u_lat, u_lon, cand["latitude"], cand["longitude"])
            features_list.append([
                u_lat, u_lon, user_risks["heart"], user_risks["diabetes"], 
                user_risks["kidney"], user_risks["liver"], user_risks["pcos"], 
                user_risks["mental_health"], user_risks["sleep"],
                cand["latitude"], cand["longitude"], cand["rating"], cand["wait_time"], dist
            ])
            
        # Predict ranking relevance scores
        features_arr = np.array(features_list)
        features_scaled = scaler.transform(features_arr)
        pred_scores = model.predict(features_scaled)
        
        # Zip and rank
        ranked_cands = sorted(zip(test_cands, pred_scores), key=lambda x: x[1], reverse=True)
        
        print("\nTop 3 Recommended Matches:")
        for idx, (cand, score) in enumerate(ranked_cands[:3]):
            dist = haversine_distance(u_lat, u_lon, cand["latitude"], cand["longitude"])
            print(f"  [{idx+1}] {cand['name']} ({cand['type']})")
            print(f"      Specialties: {cand['specialties']}")
            print(f"      Distance: {dist:.2f} km | Rating: {cand['rating']} | Wait Time: {cand['wait_time']} mins | Matching Score: {score:.2f}")
            
        if len(ranked_cands) > 0:
            print(f"\n✅ PASS: Recommendation engine runs predictions successfully.")
        else:
            print(f"❌ FAIL: No candidates ranked.")
            passed = False
            
    except Exception as e:
        print(f"❌ FAIL: Error during candidate scoring inference: {str(e)}")
        passed = False
        
    print("\n==============================================================")
    if passed:
        print("🎉 SUCCESS: PHASE 5 INTEGRATION CHECKS PASSED!")
    else:
        print("❌ FAIL: INTEGRATION CHECKS FAILED.")
    print("==============================================================")
    
    return passed

if __name__ == "__main__":
    test_phase5_recommendation()
