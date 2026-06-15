import { Patient } from '../models/Patient.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';
import { HealthPrediction } from '../models/HealthPrediction.js';
import { HealthTwin } from '../models/HealthTwin.js';
import { calculateAge, generatePredictionsForUser } from './RiskPredictionService.js';
import { generateForecastForUser } from './HealthForecastService.js';
import { detectAnomaliesForUser } from './HealthAnomalyService.js';
import { createNotification } from './notificationService.js';

export const generateHealthTwinForUser = async (userId) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) return null;

  // Fetch or generate predictions
  let predictions = await HealthPrediction.find({ userId });
  if (!predictions.length) {
    predictions = await generatePredictionsForUser(userId);
  }

  const [latestAssessment, calcHistory, previousTwin] = await Promise.all([
    HealthAssessment.findOne({ patient: patient._id }).sort('-createdAt'),
    HealthCalculatorHistory.find({ patient: patient._id }).sort('-createdAt'),
    HealthTwin.findOne({ userId }).sort('-createdAt')
  ]);

  // Group latest calculator readings by type
  const latestCalc = {};
  calcHistory.forEach((h) => {
    if (!latestCalc[h.calculatorType]) {
      latestCalc[h.calculatorType] = h;
    }
  });

  const age = calculateAge(patient.dateOfBirth) || latestAssessment?.answers?.age || 35;
  const gender = patient.gender || latestAssessment?.answers?.gender || 'other';
  const smoking = latestAssessment?.answers?.smoking || 'never';
  const alcohol = latestAssessment?.answers?.alcohol || 'never';
  const exercise = latestAssessment?.answers?.exercise || 'active';
  const medicalHistory = patient.medicalHistory || [];
  
  const bmi = latestCalc.bmi?.outputs?.bmi || 
              (latestAssessment?.answers?.weight && latestAssessment?.answers?.height ? 
                latestAssessment.answers.weight / Math.pow(latestAssessment.answers.height / 100, 2) : 22.0);

  const bpSystolic = latestCalc.blood_pressure?.outputs?.systolic || 
                     (latestAssessment?.answers?.bloodPressure === 'stage2' ? 160 :
                      latestAssessment?.answers?.bloodPressure === 'stage1' ? 140 :
                      latestAssessment?.answers?.bloodPressure === 'prehypertension' ? 130 : 120);

  const bloodSugar = latestCalc.blood_sugar?.outputs?.value || 
                     (latestAssessment?.answers?.diabetes ? 145 : 90);

  const sleepHours = latestCalc.sleep_assessment?.outputs?.sleepHours || latestAssessment?.answers?.sleep || 7.5;
  const sleepScore = latestCalc.sleep_assessment?.outputs?.sleepScore || 80;
  const stressLevel = latestCalc.stress_assessment?.outputs?.level || latestAssessment?.answers?.stress || 'low';

  const waterVol = latestCalc.water_intake ? 
                   (latestCalc.water_intake.inputs?.amountMl ? latestCalc.water_intake.inputs.amountMl / 1000 : latestCalc.water_intake.outputs?.liters || 2.0) : 2.0;

  // 1. Biological Age Estimate
  let bioAge = age;
  
  if (bmi > 25) {
    bioAge += Math.min(5, (bmi - 25) * 0.4);
  }
  if (smoking === 'heavy') bioAge += 6;
  else if (smoking === 'light') bioAge += 3;
  else if (smoking === 'former') bioAge += 1;

  if (alcohol === 'regular') bioAge += 3;

  if (exercise === 'active') bioAge -= 3;
  else if (exercise === 'none') bioAge += 3;

  if (stressLevel === 'high') bioAge += 3;
  if (sleepHours < 6) bioAge += 2;
  if (bloodSugar > 125) bioAge += 4;
  if (bpSystolic > 140) bioAge += 4;

  // Cap biological age changes relative to chronological age
  bioAge = Math.max(age - 5, Math.min(age + 12, bioAge));
  const biologicalAgeEstimate = parseFloat(bioAge.toFixed(1));
  const healthAge = Math.max(18, Math.round(biologicalAgeEstimate));

  // 2. Health Stability Index (0 to 100)
  let stability = 100;
  if (stressLevel === 'high') stability -= 15;
  else if (stressLevel === 'moderate') stability -= 5;

  if (sleepHours < 6) stability -= 15;
  else if (sleepHours < 7) stability -= 5;

  if (waterVol < 1.5) stability -= 10;
  if (bpSystolic > 140) stability -= 15;
  if (bloodSugar > 125) stability -= 15;
  if (medicalHistory.length > 0) stability -= Math.min(20, medicalHistory.length * 4);

  const healthStabilityIndex = Math.max(15, Math.min(98, stability));

  // 3. Radar Data
  const getScoreForType = (type) => {
    const pred = predictions.find(p => p.predictionType === type);
    return pred ? 100 - pred.score : 75;
  };

  const radarData = [
    { subject: 'Metabolic', score: getScoreForType('diabetes') },
    { subject: 'Vascular', score: getScoreForType('hypertension') },
    { subject: 'Cardiac', score: getScoreForType('heart_disease') },
    { subject: 'Renal', score: getScoreForType('kidney_disease') },
    { subject: 'Hepatic', score: getScoreForType('liver_disease') },
    { subject: 'Weight', score: getScoreForType('obesity') },
    { subject: 'Circadian', score: getScoreForType('sleep_disorder') },
    { subject: 'Stress', score: getScoreForType('mental_stress_risk') },
  ];

  // 4. Risk Distribution
  const riskDistribution = predictions.map(p => ({
    risk: p.predictionType.charAt(0).toUpperCase() + p.predictionType.slice(1).replace('_', ' '),
    score: p.score
  }));

  // 5. Strong Areas & Risk Areas
  const strongAreas = [];
  const riskAreas = [];

  predictions.forEach(p => {
    const formattedName = p.predictionType.charAt(0).toUpperCase() + p.predictionType.slice(1).replace('_', ' ');
    if (p.score >= 55) {
      riskAreas.push(formattedName);
    } else if (p.score < 30) {
      strongAreas.push(formattedName);
    }
  });

  // 6. Improvement Opportunities
  const improvementOpportunities = [];
  if (exercise !== 'active') {
    improvementOpportunities.push('Increase physical activity to active levels (e.g. 150 minutes cardio weekly).');
  }
  if (sleepHours < 7.0) {
    improvementOpportunities.push('Optimize sleep duration target to 7-9 hours per night.');
  }
  if (stressLevel !== 'low') {
    improvementOpportunities.push('Integrate stress management practices (deep breathing, daily mindfulness).');
  }
  if (smoking !== 'never') {
    improvementOpportunities.push('Set a target to quit smoking to drop vascular risk factors.');
  }
  if (waterVol < 2.5) {
    improvementOpportunities.push('Increase daily fluid intake to 2.5 - 3.0 liters.');
  }
  if (bmi > 25) {
    improvementOpportunities.push('Focus on balanced caloric distribution to regulate BMI.');
  }

  // 7. Overall Health Twin Score
  const avgRisk = predictions.length ? predictions.reduce((acc, p) => acc + p.score, 0) / predictions.length : 25;
  const healthTwinScore = Math.max(15, Math.min(99, Math.round(100 - avgRisk + (healthStabilityIndex * 0.15))));

  // Save to database
  await HealthTwin.deleteMany({ userId });
  const newTwin = await HealthTwin.create({
    userId,
    healthAge,
    biologicalAgeEstimate,
    healthStabilityIndex,
    radarData,
    riskDistribution,
    strongAreas,
    riskAreas,
    improvementOpportunities,
    healthTwinScore
  });

  // 8. Notifications / Triggers based on updates
  if (previousTwin) {
    if (healthAge < previousTwin.healthAge) {
      await createNotification({
        userId,
        type: 'analytics',
        title: 'Health Age Improved! 🎉',
        message: `Your Personal Health Twin reports a decrease in biological age from ${previousTwin.biologicalAgeEstimate} to ${biologicalAgeEstimate} years.`,
        priority: 'high',
        actionLink: '/patient/health-analytics'
      });
    }

    if (healthTwinScore > previousTwin.healthTwinScore) {
      await createNotification({
        userId,
        type: 'analytics',
        title: 'Health Twin Score Improved 📈',
        message: `Your overall Health Twin stability score rose to ${healthTwinScore}/100. Keep up the healthy habits!`,
        priority: 'medium',
        actionLink: '/patient/health-analytics'
      });
    }

    const previousRisksCount = previousTwin.riskAreas?.length || 0;
    if (riskAreas.length > previousRisksCount) {
      await createNotification({
        userId,
        type: 'healthRisk',
        title: 'Health Twin Risk Escalated ⚠️',
        message: 'New high-risk disease pathways have been identified by your Digital Health Twin. Check analytics.',
        priority: 'high',
        actionLink: '/patient/health-analytics'
      });
    }
  } else {
    // Initial generation alert
    await createNotification({
      userId,
      type: 'analytics',
      title: 'Digital Health Twin Activated! 🧬',
      message: `Your virtual Health Twin is ready. Estimated biological age: ${biologicalAgeEstimate} (Chronological: ${age}).`,
      priority: 'medium',
      actionLink: '/patient/health-analytics'
    });
  }

  return newTwin;
};

export const runMLSuiteForUser = async (userId) => {
  try {
    const predictions = await generatePredictionsForUser(userId);
    await generateForecastForUser(userId);
    await detectAnomaliesForUser(userId);
    await generateHealthTwinForUser(userId);
    return predictions;
  } catch (err) {
    console.error(`Error running background ML suite for user ${userId}:`, err);
    return null;
  }
};
