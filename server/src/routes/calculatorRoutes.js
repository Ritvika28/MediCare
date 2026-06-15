import { Router } from 'express';
import * as calculatorController from '../controllers/calculatorController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.post('/calculate', calculatorController.calculate);
router.post('/log', calculatorController.logEntry);
router.get('/history', calculatorController.getHistory);
router.get('/analytics', calculatorController.getAnalytics);
router.delete('/history/:id', calculatorController.deleteHistory);

export default router;
