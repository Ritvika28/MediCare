import { Router } from 'express';
import * as patientController from '../controllers/patientController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/profile/me', restrictTo('patient'), patientController.getProfile);
router.patch('/profile/me', restrictTo('patient'), patientController.updateProfile);
router.get('/health-score', restrictTo('patient'), patientController.getHealthScore);
router.get('/dashboard/stats', restrictTo('patient'), patientController.getDashboardStats);

router.get('/', restrictTo('admin', 'doctor'), patientController.getPatients);
router.get('/:id', restrictTo('admin', 'doctor'), patientController.getPatientById);
router.patch('/:id/status', restrictTo('admin'), patientController.updatePatientStatus);

export default router;
