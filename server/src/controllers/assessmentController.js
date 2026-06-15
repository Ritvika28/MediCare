import { HealthAssessment } from '../models/HealthAssessment.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { Hospital } from '../models/Hospital.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Calculate risk score from assessment answers
function calculateScores(answers) {
  let riskPoints = 0;
  const maxPoints = 100;

  // Age risk
  if (answers.age > 60) riskPoints += 15;
  else if (answers.age > 45) riskPoints += 10;
  else if (answers.age > 35) riskPoints += 5;

  // BMI risk
  const bmi = answers.weight / Math.pow(answers.height / 100, 2);
  if (bmi > 35) riskPoints += 15;
  else if (bmi > 30) riskPoints += 12;
  else if (bmi > 25) riskPoints += 7;
  else if (bmi < 18.5) riskPoints += 5;

  // Smoking
  if (answers.smoking === 'heavy') riskPoints += 15;
  else if (answers.smoking === 'light') riskPoints += 10;
  else if (answers.smoking === 'former') riskPoints += 5;

  // Alcohol
  if (answers.alcohol === 'regular') riskPoints += 10;
  else if (answers.alcohol === 'occasional') riskPoints += 3;

  // Diabetes
  if (answers.diabetes) riskPoints += 12;

  // Blood pressure
  if (answers.bloodPressure === 'stage2') riskPoints += 15;
  else if (answers.bloodPressure === 'stage1') riskPoints += 10;
  else if (answers.bloodPressure === 'prehypertension') riskPoints += 5;

  // Exercise (protective factor — less exercise = more risk)
  if (answers.exercise === 'none') riskPoints += 10;
  else if (answers.exercise === 'occasional') riskPoints += 5;

  // Sleep
  if (answers.sleep < 5 || answers.sleep > 10) riskPoints += 8;
  else if (answers.sleep < 6 || answers.sleep > 9) riskPoints += 4;

  // Stress
  if (answers.stress === 'high') riskPoints += 10;
  else if (answers.stress === 'moderate') riskPoints += 5;

  // Family history
  if (answers.familyHistory?.length > 2) riskPoints += 10;
  else if (answers.familyHistory?.length > 0) riskPoints += 5;

  const riskScore = Math.min(riskPoints, maxPoints);
  const healthScore = Math.max(0, 100 - riskScore);

  return { riskScore, healthScore };
}

// Generate lifestyle advice based on answers
function generateAdvice(answers, riskScore) {
  const advice = [];
  const bmi = answers.weight / Math.pow(answers.height / 100, 2);

  if (bmi > 25) advice.push('Work towards a healthier BMI through balanced nutrition and regular exercise.');
  if (bmi < 18.5) advice.push('Consult a nutritionist to reach a healthy weight range.');
  if (answers.smoking !== 'never') advice.push('Quitting smoking significantly reduces risk of heart disease and cancer.');
  if (answers.alcohol === 'regular') advice.push('Reduce alcohol intake to moderate levels for better liver and heart health.');
  if (answers.exercise === 'none') advice.push('Start with 30 minutes of brisk walking daily and gradually increase activity.');
  if (answers.sleep < 7) advice.push('Aim for 7-9 hours of quality sleep per night for optimal recovery.');
  if (answers.stress === 'high') advice.push('Practice stress management techniques like meditation, yoga, or deep breathing.');
  if (answers.bloodPressure !== 'normal') advice.push('Monitor blood pressure regularly and reduce sodium intake.');
  if (answers.diabetes) advice.push('Maintain strict blood sugar monitoring and follow your prescribed diet plan.');

  if (riskScore < 25) advice.push('Your overall health profile looks good! Continue maintaining your healthy lifestyle.');

  return advice;
}

// Create new health assessment
export const createAssessment = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const { answers } = req.body;
  if (!answers) throw new AppError('Assessment answers are required', 400);

  const { riskScore, healthScore } = calculateScores(answers);
  const lifestyleAdvice = generateAdvice(answers, riskScore);

  // Recommendations based on answers
  const specializations = [];
  const bmi = answers.weight / Math.pow(answers.height / 100, 2);
  
  if (answers.bloodPressure === 'stage1' || answers.bloodPressure === 'stage2' || answers.familyHistory?.includes('heart_disease') || answers.familyHistory?.includes('hypertension')) {
    specializations.push('Cardiology');
  }
  if (answers.diabetes || answers.familyHistory?.includes('diabetes')) {
    specializations.push('General Medicine');
  }
  if (answers.smoking === 'heavy' || answers.smoking === 'light' || answers.familyHistory?.includes('asthma')) {
    specializations.push('General Medicine');
  }
  if (bmi > 30) {
    specializations.push('General Medicine');
  }
  if (answers.stress === 'high') {
    specializations.push('General Medicine');
  }
  
  // Default fallback
  specializations.push('General Medicine');

  // Query doctors matching any of these specializations
  const doctors = await Doctor.find({
    specialization: { $in: specializations.map(s => new RegExp(s, 'i')) },
    isActive: true
  }).limit(4);

  const recommendedDoctorIds = doctors.map(d => d._id);
  const recommendedHospitalIds = [...new Set(doctors.map(d => d.hospital || d.hospitalId).filter(Boolean))];

  const assessment = await HealthAssessment.create({
    patient: patient._id,
    answers,
    riskScore,
    healthScore,
    lifestyleAdvice,
    recommendedDoctors: recommendedDoctorIds,
    recommendedHospitals: recommendedHospitalIds
  });

  const populatedAssessment = await HealthAssessment.findById(assessment._id)
    .populate({
      path: 'recommendedDoctors',
      populate: [
        { path: 'user', select: 'firstName lastName avatar' },
        { path: 'hospital', select: 'name address' }
      ]
    })
    .populate('recommendedHospitals');

  res.status(201).json({ success: true, data: populatedAssessment });
});

// Get assessment history for patient
export const getAssessments = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const assessments = await HealthAssessment.find({ patient: patient._id })
    .populate({
      path: 'recommendedDoctors',
      populate: [
        { path: 'user', select: 'firstName lastName avatar' },
        { path: 'hospital', select: 'name address' }
      ]
    })
    .populate('recommendedHospitals')
    .sort('-createdAt')
    .limit(parseInt(req.query.limit) || 10);

  res.json({ success: true, data: assessments });
});

// Get single assessment by ID
export const getAssessment = asyncHandler(async (req, res) => {
  const assessment = await HealthAssessment.findById(req.params.id)
    .populate({
      path: 'recommendedDoctors',
      populate: [
        { path: 'user', select: 'firstName lastName avatar' },
        { path: 'hospital', select: 'name address' }
      ]
    })
    .populate('recommendedHospitals');

  if (!assessment) throw new AppError('Assessment not found', 404);

  res.json({ success: true, data: assessment });
});
