import { Router } from 'express';
import * as hospitalController from '../controllers/hospitalController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.get('/', hospitalController.getHospitals);
router.get('/nearby', hospitalController.getNearbyHospitals);
router.get('/compare', hospitalController.compareHospitals);
router.get('/:id', hospitalController.getHospital);
router.get('/:id/doctors', hospitalController.getHospitalDoctors);

router.use(protect, restrictTo('admin'));
router.post('/', hospitalController.createHospital);
router.patch('/:id', hospitalController.updateHospital);
router.post('/:id/rooms', hospitalController.manageRooms);

export default router;
