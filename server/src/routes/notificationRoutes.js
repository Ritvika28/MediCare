import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', notificationController.getNotifications);
router.get('/summary', notificationController.getNotificationSummary);
router.patch('/read-all', notificationController.markAllRead);
router.delete('/read-all', notificationController.deleteAllRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
