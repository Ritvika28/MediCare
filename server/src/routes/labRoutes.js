import { Router } from 'express';
import * as labController from '../controllers/labController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', labController.getLabs);
router.get('/nearby', labController.getNearbyLabs);
router.get('/:id', labController.getLab);

export default router;
