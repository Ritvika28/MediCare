import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const [totalDoctors, totalPatients, recentLogs] = await Promise.all([
    Doctor.countDocuments(),
    Patient.countDocuments(),
    ActivityLog.find().sort('-createdAt').limit(20).populate('user', 'firstName lastName email'),
  ]);

  res.json({
    success: true,
    data: {
      totals: { doctors: totalDoctors, patients: totalPatients, appointments: 0 },
      appointmentStats: [],
      monthlyAppointments: [],
      estimatedRevenue: 0,
      recentLogs,
    },
  });
});

export const getDoctorAnalytics = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { byStatus: [], monthly: [], totalPatients: 0 },
  });
});

export const getDoctorPerformance = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find()
    .populate('user', 'firstName lastName')
    .select('rating reviewCount specialization')
    .sort('-rating')
    .limit(10);

  res.json({ success: true, data: doctors });
});

export const getActivityLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find()
    .populate('user', 'firstName lastName email role')
    .sort('-createdAt')
    .limit(parseInt(req.query.limit, 10) || 50);
  res.json({ success: true, data: logs });
});

export const getErrorLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find({ level: 'error' }).sort('-createdAt').limit(50);
  res.json({ success: true, data: logs });
});
