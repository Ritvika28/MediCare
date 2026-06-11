import { Router } from 'express';
import * as assessmentController from '../controllers/assessmentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(assessmentController.getAssessments)
  .post(assessmentController.createAssessment);

router.get('/:id', assessmentController.getAssessment);

export default router;
