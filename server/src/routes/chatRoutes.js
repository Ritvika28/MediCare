import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', chatController.getChats);
router.post('/', chatController.getOrCreateChat);
router.get('/:chatId/messages', chatController.getMessages);
router.post('/:chatId/messages', chatController.sendMessage);

export default router;
