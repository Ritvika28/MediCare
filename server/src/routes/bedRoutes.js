import { Router } from 'express';
import * as bedController from '../controllers/bedController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.get('/:hospitalId', protect, bedController.getBeds);
router.put('/update/:hospitalId', protect, restrictTo('admin'), bedController.updateBeds);

export default router;
