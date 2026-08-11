import { Router } from 'express';
import * as labController from '../controllers/labController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, labController.getLabs);
router.get('/nearby', optionalAuth, labController.getNearbyLabs);
router.get('/:id', optionalAuth, labController.getLab);

export default router;

