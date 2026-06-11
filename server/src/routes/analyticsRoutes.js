import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/admin/dashboard', restrictTo('admin'), analyticsController.getAdminDashboard);
router.get('/doctor', restrictTo('doctor'), analyticsController.getDoctorAnalytics);
router.get('/doctors/performance', restrictTo('admin'), analyticsController.getDoctorPerformance);
router.get('/logs/activity', restrictTo('admin'), analyticsController.getActivityLogs);
router.get('/logs/errors', restrictTo('admin'), analyticsController.getErrorLogs);

export default router;
