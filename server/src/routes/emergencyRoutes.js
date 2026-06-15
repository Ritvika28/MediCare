import { Router } from 'express';
import * as emergencyController from '../controllers/emergencyController.js';
import * as emergencyContactController from '../controllers/emergencyContactController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.get('/nearest', protect, emergencyController.getNearestEmergency);
router.post('/request', protect, restrictTo('patient'), emergencyController.postEmergencyRequest);
router.get('/requests', protect, emergencyController.getEmergencyRequests);
router.patch('/requests/:id', protect, restrictTo('admin'), emergencyController.updateEmergencyStatus);

router.get('/contacts', protect, restrictTo('patient'), emergencyContactController.listContacts);
router.post('/contacts', protect, restrictTo('patient'), emergencyContactController.createContact);
router.patch('/contacts/:id', protect, restrictTo('patient'), emergencyContactController.updateContact);
router.delete('/contacts/:id', protect, restrictTo('patient'), emergencyContactController.deleteContact);

export default router;
