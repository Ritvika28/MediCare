#!/usr/bin/env python3
import os
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb

# Set up paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # ml/
ROOT_DIR = os.path.dirname(BASE_DIR)
HOSPITALS_PATH = os.path.join(ROOT_DIR, "HealthcareData", "cleaned", "hospitals", "hospitals.csv")
LABS_PATH = os.path.join(ROOT_DIR, "HealthcareData", "cleaned", "labs", "labs.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "models", "recommendation")

# Haversine distance formula
def haversine_distance(lat1, lon1, lat2, lon2):
    r = 6371.0 # Earth's radius in km
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a))
    return r * c

# Evaluation ranking metrics
def mean_average_precision_at_k(actual_ranks, pred_ranks, k=5):
    """
    Computes MAP@K. If predicted top K contains high relevance candidates.
    We assume actual ranked list is sorted by ground truth relevance score.
    """
    map_sum = 0.0
    num_queries = len(actual_ranks)
    
    for i in range(num_queries):
        act = actual_ranks[i][:k]
        prd = pred_ranks[i][:k]
        
        hits = 0
        sum_precisions = 0.0
        
        for rank, p_item in enumerate(prd):
            if p_item in act:
                hits += 1
                sum_precisions += hits / (rank + 1)
                
        if hits > 0:
            map_sum += sum_precisions / min(len(act), k)
            
    return map_sum / num_queries if num_queries > 0 else 0.0

def ndcg_at_k(actual_relevances, pred_relevances, k=5):
    """
    Computes NDCG@K.
    """
    ndcg_sum = 0.0
    num_queries = len(actual_relevances)
    
    for i in range(num_queries):
        act = np.array(actual_relevances[i][:k])
        prd = np.array(pred_relevances[i][:k])
        
        if len(act) == 0:
            continue
            
        # DCG
        dcg = np.sum(prd / np.log2(np.arange(2, len(prd) + 2)))
        # IDCG
        idcg = np.sum(np.sort(act)[::-1] / np.log2(np.arange(2, len(act) + 2)))
        
        if idcg > 0:
            ndcg_sum += dcg / idcg
            
    return ndcg_sum / num_queries if num_queries > 0 else 0.0

def build_candidates_database():
    print("Building candidates database (Hospitals, Labs, and Doctors)...")
    
    # 1. Parse Hospitals
    hospitals = []
    if os.path.exists(HOSPITALS_PATH):
        df_hosp = pd.read_csv(HOSPITALS_PATH)
        for _, row in df_hosp.iterrows():
            # Clean and assign specialty categories
            hospitals.append({
                "id": f"hosp_{len(hospitals)}",
                "name": str(row.get("Hospital_Name", "Unknown Hospital")),
                "type": "Hospital",
                "address": str(row.get("Address", "Unknown Address")),
                "latitude": float(row.get("Latitude", 20.0)),
                "longitude": float(row.get("Longitude", 77.0)),
                "specialties": ["Emergency", "General Medicine"] + list(np.random.choice(
                    ["Cardiology", "Nephrology", "Hepatology", "Gynecology", "Pediatrics", "Neurology", "Orthopedics"], 
                    size=np.random.randint(1, 4), replace=False
                )),
                "rating": round(np.random.uniform(3.5, 5.0), 1),
                "wait_time": int(np.random.randint(15, 120))
            })
    else:
        print("WARNING: Hospitals CSV not found.")

    # 2. Parse Labs
    labs = []
    if os.path.exists(LABS_PATH):
        df_labs = pd.read_csv(LABS_PATH)
        for _, row in df_labs.iterrows():
            labs.append({
                "id": f"lab_{len(labs)}",
                "name": str(row.get("Laboratory Name", "Unknown Laboratory")),
                "type": "Lab",
                "address": str(row.get("Address", "Unknown Address")),
                "latitude": float(row.get("Latitude", 20.0)),
                "longitude": float(row.get("Longitude", 77.0)),
                "specialties": ["Pathology"] + list(np.random.choice(
                    ["Radiology", "Biochemistry", "Hematology", "Microbiology"], 
                    size=np.random.randint(1, 3), replace=False
                )),
                "rating": round(np.random.uniform(3.8, 4.9), 1),
                "wait_time": int(np.random.randint(10, 60))
            })
    else:
        print("WARNING: Labs CSV not found.")

    # 3. Generate Mock Network Doctors (since doctors.csv was empty)
    doctors = []
    first_names = ["Amit", "Rajesh", "Priyanka", "Vikram", "Sneha", "Karan", "Anjali", "Suresh", "Meera", "Arjun"]
    last_names = ["Sharma", "Verma", "Singh", "Patel", "Reddy", "Gupta", "Joshi", "Das", "Rao", "Nair"]
    specialties_list = ["Cardiology", "Endocrinology", "Nephrology", "Hepatology", "Gynecology", "General Medicine", "Psychiatry", "Sleep Medicine"]
    
    # Distribute doctors around hospital locations
    base_lats = [h["latitude"] for h in hospitals[:10]] if hospitals else [20.0]
    base_lons = [h["longitude"] for h in hospitals[:10]] if hospitals else [77.0]
    
    for i in range(50):
        lat = np.random.choice(base_lats) + np.random.uniform(-0.1, 0.1)
        lon = np.random.choice(base_lons) + np.random.uniform(-0.1, 0.1)
        doctors.append({
            "id": f"doc_{i}",
            "name": f"Dr. {np.random.choice(first_names)} {np.random.choice(last_names)}",
            "type": "Doctor",
            "address": "Network Medical Center",
            "latitude": float(lat),
            "longitude": float(lon),
            "specialties": [np.random.choice(specialties_list)],
            "rating": round(np.random.uniform(4.0, 5.0), 1),
            "wait_time": int(np.random.randint(10, 45)),
            "consultation_fee": int(np.random.choice([500, 800, 1000, 1500]))
        })
        
    all_candidates = hospitals + labs + doctors
    print(f"Total candidates database built: {len(all_candidates)} (Hospitals: {len(hospitals)}, Labs: {len(labs)}, Doctors: {len(doctors)})")
    return all_candidates

def train_recommendation_model():
    print("==============================================================")
    print("STARTING MEDICARE PERSONALIZED RECOMMENDATION MODEL TRAINING")
    print("==============================================================")
    
    candidates = build_candidates_database()
    if not candidates:
        print("ERROR: No candidates found. Aborting.")
        return
        
    # Generate simulated recommendation queries (5,000 queries)
    print("Generating simulated user query interactions...")
    np.random.seed(42)
    
    # Get bounding box of coordinates
    lats = [c["latitude"] for c in candidates]
    lons = [c["longitude"] for c in candidates]
    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)
    
    queries = []
    specialties_pool = ["Cardiology", "Endocrinology", "Nephrology", "Hepatology", "Gynecology", "General Medicine", "Psychiatry", "Sleep Medicine", "Pathology", "Emergency"]
    
    # Simulate queries
    for q_id in range(1000): # 1000 query sessions, each with 5 candidate comparisons
        u_lat = np.random.uniform(min_lat, max_lat)
        u_lon = np.random.uniform(min_lon, max_lon)
        
        # User disease risk probabilities
        user_risks = {
            "heart": np.random.uniform(0, 1),
            "diabetes": np.random.uniform(0, 1),
            "kidney": np.random.uniform(0, 1),
            "liver": np.random.uniform(0, 1),
            "pcos": np.random.uniform(0, 1),
            "mental_health": np.random.uniform(0, 1),
            "sleep": np.random.uniform(0, 1)
        }
        
        requested_spec = np.random.choice(specialties_pool)
        
        # Get matching candidates
        matching_cands = [c for c in candidates if requested_spec in c["specialties"]]
        if not matching_cands:
            continue
            
        # Draw up to 10 random candidates to compare
        drawn = np.random.choice(matching_cands, size=min(len(matching_cands), 10), replace=False)
        
        for cand in drawn:
            dist = haversine_distance(u_lat, u_lon, cand["latitude"], cand["longitude"])
            
            # 1. Proximity score (closer is better, exp decay)
            prox_score = np.exp(-dist / 25.0) * 100.0
            
            # 2. Clinical Match score
            # Higher match if user has high/moderate risk for the candidate's specialty area
            clinical_match = 0.0
            if "Cardiology" in cand["specialties"] and user_risks["heart"] >= 0.3:
                clinical_match = user_risks["heart"] * 100.0
            elif "Endocrinology" in cand["specialties"] and user_risks["diabetes"] >= 0.3:
                clinical_match = user_risks["diabetes"] * 100.0
            elif "Nephrology" in cand["specialties"] and user_risks["kidney"] >= 0.3:
                clinical_match = user_risks["kidney"] * 100.0
            elif "Hepatology" in cand["specialties"] and user_risks["liver"] >= 0.3:
                clinical_match = user_risks["liver"] * 100.0
            elif "Gynecology" in cand["specialties"] and user_risks["pcos"] >= 0.3:
                clinical_match = user_risks["pcos"] * 100.0
            elif "Psychiatry" in cand["specialties"] and user_risks["mental_health"] >= 0.3:
                clinical_match = user_risks["mental_health"] * 100.0
            elif "Sleep Medicine" in cand["specialties"] and user_risks["sleep"] >= 0.3:
                clinical_match = user_risks["sleep"] * 100.0
            elif "Emergency" in cand["specialties"]:
                # High baseline match for emergency
                clinical_match = 80.0
            else:
                clinical_match = 20.0 # general baseload match
                
            # 3. Rating score
            rating_score = (cand["rating"] / 5.0) * 100.0
            
            # 4. Wait time penalty
            wait_penalty = (cand["wait_time"] / 120.0) * 100.0
            
            # Composite relevance label
            relevance = 0.4 * clinical_match + 0.3 * prox_score + 0.2 * rating_score - 0.1 * wait_penalty
            
            queries.append({
                "query_id": q_id,
                "user_lat": u_lat,
                "user_lon": u_lon,
                "user_risk_heart": user_risks["heart"],
                "user_risk_diabetes": user_risks["diabetes"],
                "user_risk_kidney": user_risks["kidney"],
                "user_risk_liver": user_risks["liver"],
                "user_risk_pcos": user_risks["pcos"],
                "user_risk_mental": user_risks["mental_health"],
                "user_risk_sleep": user_risks["sleep"],
                "cand_lat": cand["latitude"],
                "cand_lon": cand["longitude"],
                "cand_rating": cand["rating"],
                "cand_wait_time": cand["wait_time"],
                "distance": dist,
                "relevance": relevance,
                "cand_id": cand["id"]
            })
            
    df_queries = pd.DataFrame(queries)
    print(f"Generated query dataset: {len(df_queries)} rows.")
    
    # Split queries by query_id to keep complete search sessions grouped together
    unique_qids = df_queries["query_id"].unique()
    train_qids, val_qids = train_test_split(unique_qids, test_size=0.2, random_state=42)
    
    df_train = df_queries[df_queries["query_id"].isin(train_qids)].copy()
    df_val = df_queries[df_queries["query_id"].isin(val_qids)].copy()
    
    # Feature columns
    feature_cols = [
        "user_lat", "user_lon", "user_risk_heart", "user_risk_diabetes", 
        "user_risk_kidney", "user_risk_liver", "user_risk_pcos", "user_risk_mental", 
        "user_risk_sleep", "cand_lat", "cand_lon", "cand_rating", "cand_wait_time", "distance"
    ]
    
    X_train = df_train[feature_cols]
    y_train = df_train["relevance"]
    X_val = df_val[feature_cols]
    y_val = df_val["relevance"]
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    
    # Compare Regressors (used as candidate scoring rankers)
    models = {
        "RandomForestRegressor": RandomForestRegressor(n_estimators=100, random_state=42),
        "XGBRegressor": xgb.XGBRegressor(random_state=42, eval_metric='rmse')
    }
    
    best_ndcg = -1.0
    best_model_name = ""
    best_model = None
    best_metrics = {}
    
    for name, reg in models.items():
        reg.fit(X_train_scaled, y_train)
        pred_scores = reg.predict(X_val_scaled)
        
        # Add predictions to validate groups
        df_val_pred = df_val.copy()
        df_val_pred["pred_relevance"] = pred_scores
        
        # Calculate MAP@5 and NDCG@5 grouped by query_id
        actual_ranks = []
        pred_ranks = []
        actual_relevances = []
        pred_relevances = []
        
        for q_id, group in df_val_pred.groupby("query_id"):
            # Sort by ground truth relevance
            sorted_actual = group.sort_values(by="relevance", ascending=False)["cand_id"].tolist()
            # Sort by predicted score
            sorted_pred = group.sort_values(by="pred_relevance", ascending=False)["cand_id"].tolist()
            
            actual_ranks.append(sorted_actual)
            pred_ranks.append(sorted_pred)
            
            actual_relevances.append(group.sort_values(by="relevance", ascending=False)["relevance"].tolist())
            pred_relevances.append(group.sort_values(by="pred_relevance", ascending=False)["relevance"].tolist())
            
        map5 = mean_average_precision_at_k(actual_ranks, pred_ranks, k=5)
        ndcg5 = ndcg_at_k(actual_relevances, pred_relevances, k=5)
        
        print(f" - {name:22s} MAP@5: {map5:.4f} | NDCG@5: {ndcg5:.4f}")
        
        if ndcg5 > best_ndcg:
            best_ndcg = ndcg5
            best_model_name = name
            best_model = reg
            best_metrics = {
                "map5": round(float(map5), 4),
                "ndcg5": round(float(ndcg5), 4)
            }
            
    print(f" Winner: {best_model_name} with NDCG@5 {best_ndcg:.4f}")
    
    # 5. Save best model artifacts
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(os.path.join(OUTPUT_DIR, "model.pkl"), 'wb') as f:
        pickle.dump(best_model, f)
    with open(os.path.join(OUTPUT_DIR, "scaler.pkl"), 'wb') as f:
        pickle.dump(scaler, f)
    with open(os.path.join(OUTPUT_DIR, "candidates.pkl"), 'wb') as f:
        pickle.dump(candidates, f)
        
    # Write metadata.json
    metadata = {
        "dataset_name": "Simulated Queries Matching NHANES Cleaned Hospitals & Labs",
        "training_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "algorithm": best_model_name,
        "map_at_5": best_metrics["map5"],
        "ndcg_at_5": best_metrics["ndcg5"],
        "total_queries": int(len(df_queries)),
        "candidates_count": int(len(candidates)),
        "features_used": feature_cols
    }
    with open(os.path.join(OUTPUT_DIR, "metadata.json"), 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
        
    print(f" Successfully saved recommendation artifacts to: {OUTPUT_DIR}")

if __name__ == "__main__":
    train_recommendation_model()
