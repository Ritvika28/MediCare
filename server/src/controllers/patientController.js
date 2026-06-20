import { Patient } from '../models/Patient.js';
import { User } from '../models/User.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { Reminder } from '../models/Reminder.js';
import { Prescription } from '../models/Prescription.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { Hospital } from '../models/Hospital.js';
import { Lab } from '../models/Lab.js';
import { BloodBank } from '../models/BloodBank.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import { calculateHealthScore, getHealthAlerts } from '../services/healthScoreService.js';
import { getHealthAnalytics, buildHealthTimeline } from '../services/healthAnalyticsService.js';
import { getLatestMetrics } from '../services/healthMetricService.js';
import { getNearbyHealthcareSummary } from '../services/nearbySummaryService.js';

export const getProfile = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).populate('user', '-password');
  if (!patient) throw new AppError('Patient profile not found', 404);
  res.json({ success: true, data: patient });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const patient = await Patient.findOneAndUpdate({ user: req.user._id }, req.body, { new: true, runValidators: true });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const userFields = ['firstName', 'lastName', 'phone', 'avatar'];
  const userUpdate = {};
  userFields.forEach((f) => { if (req.body[f]) userUpdate[f] = req.body[f]; });
  if (Object.keys(userUpdate).length) {
    await User.findByIdAndUpdate(req.user._id, userUpdate);
  }

  res.json({ success: true, data: patient });
});

export const getPatients = asyncHandler(async (req, res) => {
  const features = new APIFeatures(
    Patient.find().populate('user', 'firstName lastName email phone avatar isActive'),
    req.query
  ).paginate();
  const patients = await features.query;
  const total = await Patient.countDocuments();
  res.json({ success: true, data: patients, pagination: { page: features.page, limit: features.limit, total } });
});

export const getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id).populate('user', 'firstName lastName email phone avatar');
  if (!patient) throw new AppError('Patient not found', 404);
  res.json({ success: true, data: patient });
});

export const getHealthScore = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const [records] = await Promise.all([
    MedicalRecord.find({ patient: patient._id }),
  ]);

  const score = calculateHealthScore(patient, records);
  const alerts = getHealthAlerts(patient, score);

  res.json({ success: true, data: { score, alerts } });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  // 1. Core counters
  const [hospitalsCount, labsCount, bloodBanksCount] = await Promise.all([
    Hospital.countDocuments({ isActive: true }),
    Lab.countDocuments(),
    BloodBank.countDocuments()
  ]);

  // 2. Active Reminders for Today
  const reminders = await Reminder.find({ patient: patient._id, isActive: true });
  // Calculate compliance stats from reminders
  let totalLogs = 0;
  let takenLogs = 0;
  reminders.forEach(r => {
    r.logs.forEach(log => {
      totalLogs++;
      if (log.status === 'taken') takenLogs++;
    });
  });
  const overallAdherence = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 0;

  // Find reminders due today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReminders = reminders.filter(r => {
    const start = new Date(r.startDate).toISOString().split('T')[0];
    const end = new Date(r.endDate).toISOString().split('T')[0];
    return todayStr >= start && todayStr <= end;
  }).map(r => ({
    _id: r._id,
    medicineName: r.medicineName,
    dosage: r.dosage,
    times: r.times,
    instructions: r.instructions,
    takenToday: r.logs.filter(l => l.date === todayStr && l.status === 'taken').map(l => l.time)
  }));

  // 3. Medical Records & Prescriptions
  const [records, prescriptions] = await Promise.all([
    MedicalRecord.find({ patient: patient._id }).sort('-recordDate').limit(3),
    Prescription.find({ patient: patient._id }).sort('-createdAt').limit(3)
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
  ]);

  // 4. Health Risk Assessment
  const assessment = await HealthAssessment.findOne({ patient: patient._id }).sort('-createdAt');
  const riskScore = assessment ? assessment.riskScore : null;
  const riskLevel = assessment ? (assessment.riskScore < 30 ? 'low' : assessment.riskScore < 70 ? 'moderate' : 'high') : 'unknown';

  // 5. Health analytics (calculators, vitals, timeline)
  const analytics = await getHealthAnalytics(patient._id, patient, { range: '30d' });
  const { latest, scores, insights } = analytics;

  const bmi = latest.bmi ?? (assessment ? parseFloat((assessment.answers.weight / Math.pow(assessment.answers.height / 100, 2)).toFixed(1)) : null);
  const calories = latest.calories ?? null;
  const waterIntake = latest.waterIntake ?? 0;
  const waterTarget = latest.waterTarget ?? 3.0;

  // 6. Base Health Score
  const healthScore = calculateHealthScore(patient, records);

  // 7. Dynamic health tips from insights
  const healthTips = insights?.length > 0
    ? insights.slice(0, 5).map((ins, i) => ({
        id: i + 1,
        category: ins.metric?.toLowerCase() || 'general',
        tip: ins.message,
      }))
    : [
        { id: 1, category: 'hydration', tip: `Daily water target: ${waterTarget}L. Log intake from your dashboard.` },
        { id: 2, category: 'vitals', tip: 'Track blood pressure and blood sugar regularly for better health insights.' },
      ];

  // 8. Activity Timeline (includes calculator events)
  const activityTimeline = (await buildHealthTimeline(patient._id, 8)).map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    date: item.date,
    status: item.status,
  }));

  res.json({
    success: true,
    data: {
      healthScore,
      riskScore,
      riskLevel,
      todayMedicines: todayReminders,
      overallAdherence,
      nearbyHospitalsCount: hospitalsCount,
      nearbyLabsCount: labsCount,
      bloodBanksCount,
      analyticsScores: scores,
      analyticsInsights: insights?.slice(0, 4) || [],
      bmi,
      calories,
      waterIntake,
      waterTarget,
      bloodPressure: latest.bloodPressure,
      bloodPressureStatus: latest.bloodPressureStatus,
      bloodSugar: latest.bloodSugar,
      bloodSugarStatus: latest.bloodSugarStatus,
      sleepScore: latest.sleepScore,
      sleepStatus: latest.sleepStatus,
      stressLevel: latest.stressLevel,
      heartScore: latest.heartScore,
      recentPrescriptions: prescriptions,
      recentReports: records,
      activityTimeline,
      healthTips,
      recentAssessment: assessment ? {
        healthScore: assessment.healthScore,
        riskScore: assessment.riskScore,
        date: assessment.createdAt,
      } : null,
    }
  });
});

export const getNearbySummary = asyncHandler(async (req, res) => {
  const latitude = req.query.latitude ?? req.query.lat;
  const longitude = req.query.longitude ?? req.query.lng;
  const radius = parseFloat(req.query.radius) || 50;

  const summary = await getNearbyHealthcareSummary(latitude, longitude, radius);
  res.json({ success: true, data: summary });
});

export const getHealthMetrics = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const types = ['bmi', 'blood_pressure', 'blood_sugar', 'sleep_assessment', 'stress_assessment', 'kidney_health', 'liver_health', 'heart_health', 'diabetes_risk'];
  const latest = await getLatestMetrics(patient._id, types);
  const records = await MedicalRecord.find({ patient: patient._id });
  const healthScore = calculateHealthScore(patient, records);

  res.json({
    success: true,
    data: {
      latest,
      healthScore,
      assessments: await HealthAssessment.find({ patient: patient._id }).sort('-createdAt').limit(10),
    },
  });
});

export const updatePatientStatus = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new AppError('Patient not found', 404);
  await User.findByIdAndUpdate(patient.user, { isActive: req.body.isActive });
  res.json({ success: true, message: 'Patient status updated' });
});
