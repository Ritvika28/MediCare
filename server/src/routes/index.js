import { Router } from 'express';
import authRoutes from './authRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import patientRoutes from './patientRoutes.js';
import recordRoutes from './recordRoutes.js';
import prescriptionRoutes from './prescriptionRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import chatRoutes from './chatRoutes.js';
import aiRoutes from './aiRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import hospitalRoutes from './hospitalRoutes.js';
import emergencyRoutes from './emergencyRoutes.js';
import recommendationRoutes from './recommendationRoutes.js';
import queueRoutes from './queueRoutes.js';
import bedRoutes from './bedRoutes.js';
import scheduleRoutes from './scheduleRoutes.js';
import reminderRoutes from './reminderRoutes.js';
import bloodBankRoutes from './bloodBankRoutes.js';
import labRoutes from './labRoutes.js';
import assessmentRoutes from './assessmentRoutes.js';
import calculatorRoutes from './calculatorRoutes.js';
import mlRoutes from './mlRoutes.js';
import searchRoutes from './searchRoutes.js';

const router = Router();

router.use('/search', searchRoutes);

router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/patients', patientRoutes);
router.use('/records', recordRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chat', chatRoutes);
router.use('/ai', aiRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/departments', departmentRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/queue', queueRoutes);
router.use('/beds', bedRoutes);
router.use('/reminders', reminderRoutes);
router.use('/blood-banks', bloodBankRoutes);
router.use('/labs', labRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/calculators', calculatorRoutes);
router.use('/ml', mlRoutes);

router.get('/health', (req, res) => res.json({ success: true, message: 'API is running' }));

export default router;
