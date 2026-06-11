import { Router } from 'express';
import * as recommendationController from '../controllers/recommendationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.post('/', recommendationController.getRecommendation);

export default router;
