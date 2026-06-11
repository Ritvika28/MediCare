import { Router } from 'express';
import * as emergencyController from '../controllers/emergencyController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.get('/nearest', protect, emergencyController.getNearestEmergency);
router.post('/request', protect, restrictTo('patient'), emergencyController.postEmergencyRequest);
router.get('/requests', protect, emergencyController.getEmergencyRequests);
router.patch('/requests/:id', protect, restrictTo('admin'), emergencyController.updateEmergencyStatus);

export default router;
