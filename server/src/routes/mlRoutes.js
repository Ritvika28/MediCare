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

export default router;
