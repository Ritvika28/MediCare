import { Router } from 'express';
import * as reminderController from '../controllers/reminderController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(reminderController.getReminders)
  .post(reminderController.createReminder);

router.route('/:id')
  .put(reminderController.updateReminder)
  .delete(reminderController.deleteReminder);

router.post('/:id/log', reminderController.logCompliance);

export default router;
