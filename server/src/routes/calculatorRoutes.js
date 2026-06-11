import { Router } from 'express';
import * as calculatorController from '../controllers/calculatorController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.post('/calculate', calculatorController.calculate);
router.get('/history', calculatorController.getHistory);

export default router;
