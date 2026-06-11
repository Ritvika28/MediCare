import { Router } from 'express';
import * as queueController from '../controllers/queueController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/:doctorId', protect, queueController.getDoctorQueue);
router.put('/update/:doctorId', protect, queueController.updateQueue);

export default router;
