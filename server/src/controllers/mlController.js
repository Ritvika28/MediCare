import fs from 'fs';
import path from 'path';
import { generatePredictionsForUser } from '../services/RiskPredictionService.js';
import { analyzeSymptoms } from '../services/SymptomMappingService.js';
import { generateForecastForUser } from '../services/HealthForecastService.js';
import { detectAnomaliesForUser } from '../services/HealthAnomalyService.js';
import { generateRecommendationsForUser } from '../services/RecommendationEngineService.js';
import { generateHealthTwinForUser } from '../services/HealthTwinService.js';

import { HealthPrediction } from '../models/HealthPrediction.js';
import { HealthForecast } from '../models/HealthForecast.js';
import { HealthAnomaly } from '../models/HealthAnomaly.js';
import { HospitalRecommendation } from '../models/HospitalRecommendation.js';
import { HealthTwin } from '../models/HealthTwin.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { runPythonInference } from '../ml/inferenceBridge.js';
import { telemetry } from '../ml/telemetry.js';

// GET /api/ml/predict
export const getPredictions = asyncHandler(async (req, res) => {
  const predictions = await generatePredictionsForUser(req.user._id);
  res.json({ success: true, data: predictions });
});

// GET /api/ml/forecast
export const getForecast = asyncHandler(async (req, res) => {
  const forecast = await generateForecastForUser(req.user._id);
  res.json({ success: true, data: forecast });
});

// GET /api/ml/anomalies
export const getAnomalies = asyncHandler(async (req, res) => {
  // Trigger a detection pass to verify any new metrics have anomalies
  await detectAnomaliesForUser(req.user._id);
  
  // Return recent anomalies
  const anomalies = await HealthAnomaly.find({ userId: req.user._id }).sort('-createdAt').limit(20);
  res.json({ success: true, data: anomalies });
});

// GET /api/ml/recommendations or POST /api/ml/recommendations
export const getRecommendations = asyncHandler(async (req, res) => {
  const lat = req.query.lat || req.body.lat || req.query.latitude || req.body.latitude;
  const lng = req.query.lng || req.body.lng || req.query.longitude || req.body.longitude;
  const specialization = req.query.specialization || req.body.specialization;
  const isEmergency = req.query.isEmergency === 'true' || req.body.isEmergency === true;

  const recommendations = await generateRecommendationsForUser(req.user._id, {
    latitude: lat,
    longitude: lng,
    specialization,
    isEmergency
  });

  res.json({ success: true, data: recommendations });
});

// GET /api/ml/health-twin
export const getHealthTwin = asyncHandler(async (req, res) => {
  const healthTwin = await generateHealthTwinForUser(req.user._id);
  res.json({ success: true, data: healthTwin });
});

// POST /api/ml/symptom-triage
export const symptomTriage = asyncHandler(async (req, res) => {
  const { symptoms, lat, lng, latitude, longitude } = req.body;
  if (!symptoms) throw new AppError('Symptom text description is required', 400);

  const result = await analyzeSymptoms(symptoms, {
    latitude: lat || latitude,
    longitude: lng || longitude
  });

  res.json({ success: true, data: result });
});

// POST /api/ml/predict-disease
export const predictDisease = asyncHandler(async (req, res) => {
  const { disease, features } = req.body;
  if (!disease || !features) {
    throw new AppError('Disease name and features payload are required', 400);
  }
  const result = await runPythonInference({ task: 'disease', disease, features });
  res.json({ success: true, data: result });
});

// POST /api/ml/biological-age
export const predictBiologicalAge = asyncHandler(async (req, res) => {
  const { features } = req.body;
  if (!features) {
    throw new AppError('Features payload is required', 400);
  }
  const result = await runPythonInference({ task: 'biological_age', features });
  res.json({ success: true, data: result });
});

// POST /api/ml/health-score
export const predictHealthScore = asyncHandler(async (req, res) => {
  const { features } = req.body;
  if (!features) {
    throw new AppError('Features payload is required', 400);
  }
  const result = await runPythonInference({ task: 'health_score', features });
  res.json({ success: true, data: result });
});

// POST /api/ml/recommend
export const recommend = asyncHandler(async (req, res) => {
  const { latitude, longitude, specialty, user_risks } = req.body;
  if (latitude === undefined || longitude === undefined || !specialty) {
    throw new AppError('latitude, longitude, and specialty are required', 400);
  }
  const result = await runPythonInference({
    task: 'recommend',
    latitude,
    longitude,
    specialty,
    user_risks: user_risks || {}
  });
  res.json({ success: true, data: result });
});

// POST /api/ml/forecast
export const forecast = asyncHandler(async (req, res) => {
  const { features } = req.body;
  if (!features) {
    throw new AppError('Features payload containing vitals lags is required', 400);
  }
  const result = await runPythonInference({ task: 'forecast', features });
  res.json({ success: true, data: result });
});

// GET /api/ml/health
export const getMLHealth = asyncHandler(async (req, res) => {
  const metrics = telemetry.getMetrics();
  const modelsDir = path.resolve(process.cwd(), 'ml', 'models');
  const models = {};

  if (fs.existsSync(modelsDir)) {
    const folders = fs.readdirSync(modelsDir);
    for (const folder of folders) {
      const metaPath = path.join(modelsDir, folder, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        try {
          models[folder] = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch (err) {
          models[folder] = { error: `Failed to load metadata: ${err.message}` };
        }
      }
    }
  }

  res.json({
    success: true,
    data: {
      ...metrics,
      models
    }
  });
});
