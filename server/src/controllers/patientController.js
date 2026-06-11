import { Patient } from '../models/Patient.js';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { Reminder } from '../models/Reminder.js';
import { Prescription } from '../models/Prescription.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';
import { Hospital } from '../models/Hospital.js';
import { Lab } from '../models/Lab.js';
import { BloodBank } from '../models/BloodBank.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import { calculateHealthScore, getHealthAlerts } from '../services/healthScoreService.js';

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

  const [appointments, records] = await Promise.all([
    Appointment.find({ patient: patient._id }),
    MedicalRecord.find({ patient: patient._id }),
  ]);

  const score = calculateHealthScore(patient, appointments, records);
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

  // 3. Appointments
  const appointments = await Appointment.find({ patient: patient._id })
    .sort('scheduledAt')
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName avatar' } })
    .populate('hospital', 'name');

  const upcomingAppointments = appointments.filter(a => ['pending', 'confirmed'].includes(a.status)).slice(0, 3);
  const completedAppointmentsCount = appointments.filter(a => a.status === 'completed').length;

  // 4. Medical Records & Prescriptions
  const [records, prescriptions] = await Promise.all([
    MedicalRecord.find({ patient: patient._id }).sort('-recordDate').limit(3),
    Prescription.find({ patient: patient._id }).sort('-createdAt').limit(3)
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
  ]);

  // 5. Health Risk Assessment
  const assessment = await HealthAssessment.findOne({ patient: patient._id }).sort('-createdAt');
  const riskScore = assessment ? assessment.riskScore : null;
  const riskLevel = assessment ? (assessment.riskScore < 30 ? 'low' : assessment.riskScore < 70 ? 'moderate' : 'high') : 'unknown';

  // 6. Calculator History (BMI, Calorie, Water)
  const calcHistory = await HealthCalculatorHistory.find({ patient: patient._id }).sort('-createdAt').limit(30);

  // Latest BMI
  const latestBmiCalc = calcHistory.find(c => c.calculatorType === 'bmi');
  const bmi = latestBmiCalc ? parseFloat(latestBmiCalc.outputs.bmi) : (assessment ? parseFloat((assessment.answers.weight / Math.pow(assessment.answers.height / 100, 2)).toFixed(1)) : 22.5);

  // Latest Calorie Needs
  const latestCalorie = calcHistory.find(c => c.calculatorType === 'calorie');
  const calories = latestCalorie ? Math.round(latestCalorie.outputs.calorieNeeds || latestCalorie.outputs.bmr * 1.2 || 2000) : 2000;

  // Today's water intake
  const todayWaterLogs = calcHistory.filter(c => c.calculatorType === 'water_intake' && new Date(c.createdAt).toISOString().split('T')[0] === todayStr);
  const waterIntake = todayWaterLogs.reduce((acc, log) => acc + parseFloat(log.inputs.amount || log.outputs.waterIntakeLiters || 0), 0);
  const waterTarget = 3.0; // default 3 Liters

  // 7. Base Health Score
  const healthScore = calculateHealthScore(patient, appointments, records);

  // 8. Health Tips
  const healthTips = [
    { id: 1, category: 'hydration', tip: 'Drink at least 3 liters of water today to support cellular regeneration.' },
    { id: 2, category: 'exercise', tip: 'A quick 15-minute walk after meals helps regulate blood sugar spikes.' },
    { id: 3, category: 'sleep', tip: 'Avoid blue light screens for 1 hour before bedtime to secrete natural melatonin.' },
    { id: 4, category: 'diet', tip: 'Include antioxidant-rich berries and almonds in your breakfast routine.' },
    { id: 5, category: 'stress', tip: 'Practice 4-7-8 breathing exercises for 2 minutes to reduce physical cortisol.' }
  ];

  // 9. Activity Timeline
  const activityTimeline = [];
  appointments.forEach(a => {
    activityTimeline.push({
      id: `apt-${a._id}`,
      type: 'appointment',
      title: `Appointment with Dr. ${a.doctor?.user?.firstName || ''} ${a.doctor?.user?.lastName || ''}`,
      date: a.scheduledAt,
      status: a.status
    });
  });
  records.forEach(r => {
    activityTimeline.push({
      id: `rec-${r._id}`,
      type: 'medical_record',
      title: `Medical Record uploaded: ${r.title}`,
      date: r.recordDate || r.createdAt,
      status: 'completed'
    });
  });
  prescriptions.forEach(p => {
    activityTimeline.push({
      id: `rx-${p._id}`,
      type: 'prescription',
      title: `New prescription issued by Dr. ${p.doctor?.user?.firstName || ''} ${p.doctor?.user?.lastName || ''}`,
      date: p.createdAt,
      status: 'active'
    });
  });
  // Sort timeline newest first
  activityTimeline.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    success: true,
    data: {
      healthScore,
      riskScore,
      riskLevel,
      todayMedicines: todayReminders,
      overallAdherence,
      upcomingAppointments,
      completedAppointmentsCount,
      nearbyHospitalsCount: hospitalsCount,
      nearbyLabsCount: labsCount,
      bloodBanksCount,
      bmi,
      calories,
      waterIntake,
      waterTarget,
      recentPrescriptions: prescriptions,
      recentReports: records,
      activityTimeline: activityTimeline.slice(0, 5),
      healthTips
    }
  });
});

export const updatePatientStatus = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new AppError('Patient not found', 404);
  await User.findByIdAndUpdate(patient.user, { isActive: req.body.isActive });
  res.json({ success: true, message: 'Patient status updated' });
});
