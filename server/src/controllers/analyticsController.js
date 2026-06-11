import { Appointment } from '../models/Appointment.js';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const [totalDoctors, totalPatients, totalAppointments, appointmentStats, recentLogs] = await Promise.all([
    Doctor.countDocuments(),
    Patient.countDocuments(),
    Appointment.countDocuments(),
    Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ActivityLog.find().sort('-createdAt').limit(20).populate('user', 'firstName lastName email'),
  ]);

  const monthlyAppointments = await Appointment.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const revenueEstimate = await Appointment.aggregate([
    { $match: { status: 'completed' } },
    {
      $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'doctorInfo' },
    },
    { $unwind: '$doctorInfo' },
    { $group: { _id: null, total: { $sum: '$doctorInfo.consultationFee' } } },
  ]);

  res.json({
    success: true,
    data: {
      totals: { doctors: totalDoctors, patients: totalPatients, appointments: totalAppointments },
      appointmentStats,
      monthlyAppointments,
      estimatedRevenue: revenueEstimate[0]?.total || 0,
      recentLogs,
    },
  });
});

export const getDoctorAnalytics = asyncHandler(async (req, res) => {
  const { Doctor: DoctorModel } = await import('../models/Doctor.js');
  const doctor = await DoctorModel.findOne({ user: req.user._id });
  if (!doctor) return res.json({ success: true, data: {} });

  const [byStatus, monthly, uniquePatients] = await Promise.all([
    Appointment.aggregate([
      { $match: { doctor: doctor._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Appointment.aggregate([
      { $match: { doctor: doctor._id, createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } } },
      { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
    ]),
    Appointment.distinct('patient', { doctor: doctor._id }),
  ]);

  res.json({
    success: true,
    data: { byStatus, monthly, totalPatients: uniquePatients.length },
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
