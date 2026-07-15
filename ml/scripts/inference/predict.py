#!/usr/bin/env python3
import os
import sys
import json
import pickle
import numpy as np

# Resolve models dir
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # ml/
MODELS_DIR = os.path.join(BASE_DIR, "models")

def haversine_distance(lat1, lon1, lat2, lon2):
    r = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    return r * 2 * np.arcsin(np.sqrt(a))

def get_feature_importances(model):
    if hasattr(model, "calibrated_classifiers_") and len(model.calibrated_classifiers_) > 0:
        cc = model.calibrated_classifiers_[0]
        base = None
        if hasattr(cc, "estimator"):
            base = cc.estimator
        elif hasattr(cc, "base_estimator"):
            base = cc.base_estimator
        if base is not None and hasattr(base, "feature_importances_"):
            return base.feature_importances_
    if hasattr(model, "feature_importances_"):
        return model.feature_importances_
    return None

def explain_prediction(model, scaler, feature_cols, X_raw, predicted_prob, baseline_prob=0.2):
    importances = get_feature_importances(model)
    if importances is None:
        importances = np.ones(len(feature_cols)) / len(feature_cols)
        
    X_scaled = scaler.transform(np.array([X_raw]))[0]
    contributions = X_scaled * importances
    
    delta = predicted_prob - baseline_prob
    total_contrib = np.sum(np.abs(contributions))
    
    if total_contrib > 0:
        contributions = (contributions / total_contrib) * delta
        
    pos_contrib = []
    neg_contrib = []
    
    for col, val in zip(feature_cols, contributions):
        percentage = round(float(val) * 100, 1)
        if percentage > 0.0:
            pos_contrib.append({"feature": col, "value": percentage})
        elif percentage < -0.0:
            neg_contrib.append({"feature": col, "value": abs(percentage)})
            
    pos_contrib = sorted(pos_contrib, key=lambda x: x["value"], reverse=True)
    neg_contrib = sorted(neg_contrib, key=lambda x: x["value"], reverse=True)
    
    return pos_contrib, neg_contrib

def run_disease_prediction(disease, features_dict):
    model_dir = os.path.join(MODELS_DIR, disease)
    if not os.path.exists(model_dir):
        raise ValueError(f"Model folder not found for disease: {disease}")
        
    with open(os.path.join(model_dir, "model.pkl"), 'rb') as f:
        model = pickle.load(f)
    with open(os.path.join(model_dir, "scaler.pkl"), 'rb') as f:
        scaler = pickle.load(f)
    with open(os.path.join(model_dir, "feature_columns.json"), 'r', encoding='utf-8') as f:
        feature_cols = json.load(f)
    with open(os.path.join(model_dir, "metadata.json"), 'r', encoding='utf-8') as f:
        meta = json.load(f)
        
    # Align features input
    X_input = []
    for col in feature_cols:
        val = features_dict.get(col, 0.0)
        X_input.append(float(val))
        
    X_arr = np.array([X_input])
    X_scaled = scaler.transform(X_arr)
    
    probs = model.predict_proba(X_scaled)[0]
    
    if len(probs) > 2:
        pred_class = int(np.argmax(probs))
        prob_val = float(probs[pred_class])
        
        pos_list, neg_list = explain_prediction(model, scaler, feature_cols, X_input, prob_val, baseline_prob=1.0/len(probs))
        
        return {
            "prediction_type": disease,
            "predicted_class": pred_class,
            "probability": prob_val,
            "probabilities": probs.tolist(),
            "risk_level": "High" if prob_val > 0.5 else "Low",
            "explanations": {
                "positive": pos_list,
                "negative": neg_list
            }
        }
    else:
        prob_val = float(probs[1])
        
        thresholds = meta.get("risk_thresholds", {"low": [0.0, 0.3], "moderate": [0.3, 0.7], "high": [0.7, 1.0]})
        if prob_val < thresholds["low"][1]:
            risk_level = "Low"
        elif prob_val < thresholds["moderate"][1]:
            risk_level = "Moderate"
        else:
            risk_level = "High"
            
        pos_list, neg_list = explain_prediction(model, scaler, feature_cols, X_input, prob_val, baseline_prob=0.2)
            
        return {
            "prediction_type": disease,
            "probability": prob_val,
            "risk_level": risk_level,
            "explanations": {
                "positive": pos_list,
                "negative": neg_list
            }
        }

def run_biological_age_prediction(features_dict):
    model_dir = os.path.join(MODELS_DIR, "biological_age")
    if not os.path.exists(model_dir):
        raise ValueError("Model folder not found for biological age")
        
    with open(os.path.join(model_dir, "biological_age_model.pkl"), 'rb') as f:
        model = pickle.load(f)
    with open(os.path.join(model_dir, "scaler.pkl"), 'rb') as f:
        scaler = pickle.load(f)
    with open(os.path.join(model_dir, "metadata.json"), 'r', encoding='utf-8') as f:
        meta = json.load(f)
        
    feature_cols = meta["features_used"]
    X_input = []
    for col in feature_cols:
        val = features_dict.get(col, 0.0)
        X_input.append(float(val))
        
    X_arr = np.array([X_input])
    X_scaled = scaler.transform(X_arr)
    pred_val = model.predict(X_scaled)[0]
    
    return {
        "biological_age": round(float(pred_val), 2),
        "chronological_age": float(features_dict.get("RIDAGEYR", 0.0))
    }

def run_health_score_prediction(features_dict):
    model_dir = os.path.join(MODELS_DIR, "health_score")
    if not os.path.exists(model_dir):
        raise ValueError("Model folder not found for health score")
        
    with open(os.path.join(model_dir, "model.pkl"), 'rb') as f:
        model = pickle.load(f)
    with open(os.path.join(model_dir, "scaler.pkl"), 'rb') as f:
        scaler = pickle.load(f)
    with open(os.path.join(model_dir, "metadata.json"), 'r', encoding='utf-8') as f:
        meta = json.load(f)
        
    feature_cols = meta["features_used"]
    X_input = []
    for col in feature_cols:
        val = features_dict.get(col, 0.0)
        X_input.append(float(val))
        
    X_arr = np.array([X_input])
    X_scaled = scaler.transform(X_arr)
    pred_val = model.predict(X_scaled)[0]
    
    return {
        "health_stability_score": round(float(pred_val), 2)
    }

def run_recommendations(user_lat, user_lon, specialty, user_risks):
    model_dir = os.path.join(MODELS_DIR, "recommendation")
    if not os.path.exists(model_dir):
        raise ValueError("Model folder not found for recommendation")
        
    with open(os.path.join(model_dir, "model.pkl"), 'rb') as f:
        model = pickle.load(f)
    with open(os.path.join(model_dir, "scaler.pkl"), 'rb') as f:
        scaler = pickle.load(f)
    with open(os.path.join(model_dir, "candidates.pkl"), 'rb') as f:
        candidates = pickle.load(f)
    with open(os.path.join(model_dir, "metadata.json"), 'r', encoding='utf-8') as f:
        meta = json.load(f)
        
    feature_cols = meta["features_used"]
    
    # Filter matching candidates
    matching_cands = [c for c in candidates if specialty in c["specialties"]]
    if not matching_cands:
        return []
        
    features_list = []
    for cand in matching_cands:
        dist = haversine_distance(user_lat, user_lon, cand["latitude"], cand["longitude"])
        # Columns:
        # ["user_lat", "user_lon", "user_risk_heart", "user_risk_diabetes", "user_risk_kidney", "user_risk_liver", "user_risk_pcos", "user_risk_mental", "user_risk_sleep", "cand_lat", "cand_lon", "cand_rating", "cand_wait_time", "distance"]
        features_list.append([
            float(user_lat), float(user_lon),
            float(user_risks.get("heart", 0.0)),
            float(user_risks.get("diabetes", 0.0)),
            float(user_risks.get("kidney", 0.0)),
            float(user_risks.get("liver", 0.0)),
            float(user_risks.get("pcos", 0.0)),
            float(user_risks.get("mental_health", 0.0)),
            float(user_risks.get("sleep", 0.0)),
            float(cand["latitude"]), float(cand["longitude"]),
            float(cand["rating"]), float(cand["wait_time"]), dist
        ])
        
    features_arr = np.array(features_list)
    features_scaled = scaler.transform(features_arr)
    pred_scores = model.predict(features_scaled)
    
    # Rank candidates
    ranked_candidates = sorted(zip(matching_cands, pred_scores, features_arr[:, -1]), key=lambda x: x[1], reverse=True)
    
    top_recommendations = []
    for cand, score, distance in ranked_candidates[:10]:
        top_recommendations.append({
            "id": cand["id"],
            "name": cand["name"],
            "type": cand["type"],
            "address": cand.get("address", ""),
            "latitude": cand["latitude"],
            "longitude": cand["longitude"],
            "specialties": cand["specialties"],
            "rating": cand["rating"],
            "wait_time": cand["wait_time"],
            "distance_km": round(float(distance), 2),
            "matching_score": round(float(score), 2)
        })
        
    return top_recommendations

def run_timeseries_forecast(vitals_lags):
    model_dir = os.path.join(MODELS_DIR, "forecasting")
    if not os.path.exists(model_dir):
        raise ValueError("Model folder not found for forecasting")
        
    forecasts = {}
    vitals = ["systolic", "diastolic", "glucose", "weight"]
    
    for vital in vitals:
        if vital not in vitals_lags:
            continue
            
        model_path = os.path.join(model_dir, f"{vital}_model.pkl")
        if not os.path.exists(model_path):
            continue
            
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
            
        lags = np.array([vitals_lags[vital]])
        pred = model.predict(lags)[0]
        
        forecasts[vital] = round(float(pred), 2)
        
    return forecasts

def main():
    try:
        # Read JSON query from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"success": False, "error": "Empty input payload"}))
            return
            
        payload = json.loads(input_data)
        task = payload.get("task")
        
        if task == "disease":
            disease = payload.get("disease")
            features = payload.get("features", {})
            result = run_disease_prediction(disease, features)
            print(json.dumps({"success": True, "data": result}))
            
        elif task == "biological_age":
            features = payload.get("features", {})
            result = run_biological_age_prediction(features)
            print(json.dumps({"success": True, "data": result}))
            
        elif task == "health_score":
            features = payload.get("features", {})
            result = run_health_score_prediction(features)
            print(json.dumps({"success": True, "data": result}))
            
        elif task == "recommend":
            lat = payload.get("latitude", 20.0)
            lon = payload.get("longitude", 77.0)
            specialty = payload.get("specialty", "General Medicine")
            risks = payload.get("user_risks", {})
            result = run_recommendations(lat, lon, specialty, risks)
            print(json.dumps({"success": True, "data": result}))
            
        elif task == "forecast":
            features = payload.get("features", {})
            result = run_timeseries_forecast(features)
            print(json.dumps({"success": True, "data": result}))
            
        else:
            print(json.dumps({"success": False, "error": f"Invalid task name: {task}"}))
            
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(json.dumps({"success": False, "error": str(e), "traceback": err_msg}))

if __name__ == "__main__":
    main()
