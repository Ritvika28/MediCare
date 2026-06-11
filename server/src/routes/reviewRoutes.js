import { Router } from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.get('/doctor/:doctorId', reviewController.getDoctorReviews);
router.post('/', protect, restrictTo('patient'), reviewController.createReview);

export default router;
