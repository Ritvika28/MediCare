import { Router } from 'express';
import * as scheduleController from '../controllers/scheduleController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.get('/doctor/:doctorId', scheduleController.getDoctorSchedules);

router.use(protect);
router.post('/', restrictTo('doctor', 'admin'), scheduleController.createSchedule);
router.delete('/:id', restrictTo('doctor', 'admin'), scheduleController.deleteSchedule);

export default router;
