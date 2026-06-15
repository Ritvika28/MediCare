import { Router } from 'express';
import * as doctorController from '../controllers/doctorController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.get('/', doctorController.getDoctors);
router.get('/:id', doctorController.getDoctor);

router.use(protect);
router.patch('/profile/me', restrictTo('doctor'), doctorController.updateDoctorProfile);

router.use(restrictTo('admin'));
router.post('/', doctorController.createDoctor);
router.patch('/:id', doctorController.adminUpdateDoctor);
router.delete('/:id', doctorController.deleteDoctor);
router.patch('/:id/verify', doctorController.verifyDoctor);

export default router;
