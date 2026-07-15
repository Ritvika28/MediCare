import { Router } from 'express';
import * as medicalRecordController from '../controllers/medicalRecordController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.post('/upload', upload.single('file'), medicalRecordController.uploadRecord);
router.get('/patient/:patientId', medicalRecordController.getRecords);
router.get('/', medicalRecordController.getRecords);
router.get('/:id', medicalRecordController.getRecord);
router.post('/:id/share', medicalRecordController.shareRecord);
router.delete('/:id', medicalRecordController.deleteRecord);

export default router;
