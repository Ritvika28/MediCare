import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.post('/chat', aiController.sendAIMessage);
router.post('/suggest-doctors', aiController.symptomDoctorSuggest);
router.get('/conversations', aiController.getConversations);
router.get('/conversations/:id', aiController.getConversation);
router.delete('/conversations/:id', aiController.deleteConversation);

export default router;
