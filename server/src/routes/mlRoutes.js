import { Router } from 'express';
import * as mlController from '../controllers/mlController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/predict', mlController.getPredictions);
router.get('/forecast', mlController.getForecast);
router.get('/anomalies', mlController.getAnomalies);
router.get('/recommendations', mlController.getRecommendations);
router.post('/recommendations', mlController.getRecommendations);
router.get('/health-twin', mlController.getHealthTwin);
router.post('/symptom-triage', mlController.symptomTriage);

// New POST endpoints for direct model inference
router.post('/predict-disease', mlController.predictDisease);
router.post('/biological-age', mlController.predictBiologicalAge);
router.post('/health-score', mlController.predictHealthScore);
router.post('/recommend', mlController.recommend);
router.post('/forecast', mlController.forecast);
router.get('/health', mlController.getMLHealth);

export default router;
