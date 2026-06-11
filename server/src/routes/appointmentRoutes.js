import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAppointmentSchema, updateAppointmentSchema } from '../validators/appointment.validator.js';

const router = Router();

router.use(protect);

router.get('/', appointmentController.getAppointments);
router.get('/:id', appointmentController.getAppointment);
router.get('/:id/pdf', appointmentController.downloadAppointmentPDF);
router.post('/', validate(createAppointmentSchema), appointmentController.createAppointment);
router.patch('/:id', validate(updateAppointmentSchema), appointmentController.updateAppointment);
router.post('/:id/cancel', appointmentController.cancelAppointment);

export default router;
