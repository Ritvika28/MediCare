import { Router } from 'express';
import * as prescriptionController from '../controllers/prescriptionController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', prescriptionController.getPrescriptions);
router.get('/:id', prescriptionController.getPrescription);
router.post('/', restrictTo('doctor'), prescriptionController.createPrescription);

export default router;
