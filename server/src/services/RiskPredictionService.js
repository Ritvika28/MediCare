import { Patient } from '../models/Patient.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';
import { HealthPrediction } from '../models/HealthPrediction.js';

export const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const getRiskLevel = (score) => {
  if (score < 30) return 'Low';
  if (score < 60) return 'Moderate';
  if (score < 85) return 'High';
  return 'Critical';
};

export const generatePredictionsForUser = async (userId) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) return [];

  const [latestAssessment, calcHistory] = await Promise.all([
    HealthAssessment.findOne({ patient: patient._id }).sort('-createdAt'),
    HealthCalculatorHistory.find({ patient: patient._id }).sort('-createdAt')
  ]);

  // Group latest calculator readings by type
  const latestCalc = {};
  calcHistory.forEach((h) => {
    if (!latestCalc[h.calculatorType]) {
      latestCalc[h.calculatorType] = h;
    }
  });

  // Extract patient characteristics
  const age = calculateAge(patient.dateOfBirth) || latestAssessment?.answers?.age || 35;
  const gender = patient.gender || latestAssessment?.answers?.gender || 'other';
  const medicalHistory = patient.medicalHistory?.map(h => h.condition?.toLowerCase()) || [];
  const familyHistory = latestAssessment?.answers?.familyHistory?.map(f => f.toLowerCase()) || [];
  const smoking = latestAssessment?.answers?.smoking || 'never';
  const alcohol = latestAssessment?.answers?.alcohol || 'never';
  const exercise = latestAssessment?.answers?.exercise || 'active';

  // Extract metric values
  const bmi = latestCalc.bmi?.outputs?.bmi || 
              (latestAssessment?.answers?.weight && latestAssessment?.answers?.height ? 
                latestAssessment.answers.weight / Math.pow(latestAssessment.answers.height / 100, 2) : 22.0);

  const bpSystolic = latestCalc.blood_pressure?.outputs?.systolic || 
                     (latestAssessment?.answers?.bloodPressure === 'stage2' ? 160 :
                      latestAssessment?.answers?.bloodPressure === 'stage1' ? 140 :
                      latestAssessment?.answers?.bloodPressure === 'prehypertension' ? 130 : 120);

  const bpDiastolic = latestCalc.blood_pressure?.outputs?.diastolic || 80;

  const bloodSugar = latestCalc.blood_sugar?.outputs?.value || 
                     (latestAssessment?.answers?.diabetes ? 145 : 90);

  const cholesterol = latestCalc.cholesterol?.outputs?.total || 180;
  const egfr = latestCalc.kidney_health?.outputs?.egfr || 95;
  const fib4Score = latestCalc.liver_health?.outputs?.fib4Score || 1.0;
  const heartScore = latestCalc.heart_health?.outputs?.heartScore || 85;
  const sleepHours = latestCalc.sleep_assessment?.outputs?.sleepHours || latestAssessment?.answers?.sleep || 7.5;
  const sleepScore = latestCalc.sleep_assessment?.outputs?.sleepScore || 80;
  
  const stressTotalScore = latestCalc.stress_assessment?.outputs?.totalScore || 
                           (latestAssessment?.answers?.stress === 'high' ? 18 :
                            latestAssessment?.answers?.stress === 'moderate' ? 10 : 4);
  const stressLevel = latestCalc.stress_assessment?.outputs?.level || latestAssessment?.answers?.stress || 'low';

  // Calculate generic confidence based on available data
  let dataPointsCount = 0;
  if (latestCalc.bmi || (latestAssessment?.answers?.weight && latestAssessment?.answers?.height)) dataPointsCount += 10;
  if (latestCalc.blood_pressure || latestAssessment?.answers?.bloodPressure) dataPointsCount += 10;
  if (latestCalc.blood_sugar || latestAssessment?.answers?.diabetes) dataPointsCount += 10;
  if (latestCalc.cholesterol) dataPointsCount += 10;
  if (latestCalc.kidney_health) dataPointsCount += 10;
  if (latestCalc.liver_health) dataPointsCount += 10;
  if (latestCalc.heart_health) dataPointsCount += 10;
  if (latestCalc.sleep_assessment || latestAssessment?.answers?.sleep) dataPointsCount += 10;
  if (latestCalc.stress_assessment || latestAssessment?.answers?.stress) dataPointsCount += 10;
  if (latestAssessment) dataPointsCount += 10;
  
  const baseConfidence = Math.min(98, 40 + dataPointsCount);

  const predictionsList = [];

  // 1. Diabetes Risk Prediction
  let diabetesScore = 10;
  const diabetesFactors = [];
  const diabetesRecommendations = [];

  if (bloodSugar > 100) {
    const sugarExcess = (bloodSugar - 100) * 0.7;
    diabetesScore += sugarExcess;
    diabetesFactors.push(`Elevated blood glucose level (${bloodSugar} mg/dL)`);
  }
  if (bloodSugar > 125 || latestAssessment?.answers?.diabetes || medicalHistory.includes('diabetes')) {
    diabetesScore += 25;
    diabetesFactors.push('Existing diabetic profile or clinical markers');
    diabetesRecommendations.push('Maintain strict adherence to diabetic diet and medication');
  }
  if (bmi > 25) {
    diabetesScore += (bmi - 25) * 1.8;
    diabetesFactors.push(`High BMI (${bmi.toFixed(1)})`);
  }
  if (familyHistory.includes('diabetes')) {
    diabetesScore += 15;
    diabetesFactors.push('Family history of diabetes');
  }
  if (exercise === 'none') {
    diabetesScore += 10;
    diabetesFactors.push('Lack of physical exercise');
    diabetesRecommendations.push('Incorporate 150 minutes of moderate aerobic exercise weekly');
  } else if (exercise === 'occasional') {
    diabetesScore += 5;
  }
  if (age > 45) {
    diabetesScore += 10;
    diabetesFactors.push('Age over 45');
  }
  diabetesScore = Math.max(5, Math.min(98, Math.round(diabetesScore)));
  if (diabetesScore > 60) {
    diabetesRecommendations.push('Consult an endocrinologist for an HbA1c test');
    diabetesRecommendations.push('Reduce intake of simple carbohydrates and high-glycemic foods');
  } else {
    diabetesRecommendations.push('Keep a balanced low-sugar diet and stay active');
  }

  predictionsList.push({
    predictionType: 'diabetes',
    score: diabetesScore,
    riskLevel: getRiskLevel(diabetesScore),
    confidence: baseConfidence,
    contributingFactors: diabetesFactors.length ? diabetesFactors : ['Normal glycemic range'],
    recommendations: diabetesRecommendations
  });

  // 2. Hypertension Risk Prediction
  let bpScore = 10;
  const bpFactors = [];
  const bpRecommendations = [];

  if (bpSystolic > 120 || bpDiastolic > 80) {
    const bpExcess = (bpSystolic - 120) * 0.8 + (bpDiastolic - 80) * 1.2;
    bpScore += bpExcess;
    bpFactors.push(`Elevated blood pressure (${bpSystolic}/${bpDiastolic} mmHg)`);
  }
  if (bmi > 25) {
    bpScore += (bmi - 25) * 1.2;
    bpFactors.push(`High BMI (${bmi.toFixed(1)})`);
  }
  if (stressLevel === 'high' || stressTotalScore > 14) {
    bpScore += 12;
    bpFactors.push('High psychological stress levels');
    bpRecommendations.push('Adopt regular stress relaxation techniques like meditation or deep breathing');
  }
  if (alcohol === 'regular') {
    bpScore += 8;
    bpFactors.push('Regular alcohol consumption');
    bpRecommendations.push('Limit daily alcohol intake to reduce systemic vascular resistance');
  }
  if (smoking === 'heavy' || smoking === 'light') {
    bpScore += 8;
    bpFactors.push('Active history of smoking');
  }
  if (familyHistory.includes('hypertension') || familyHistory.includes('high_blood_pressure')) {
    bpScore += 12;
    bpFactors.push('Family history of hypertension');
  }
  if (age > 50) {
    bpScore += 10;
  }
  bpScore = Math.max(5, Math.min(98, Math.round(bpScore)));
  if (bpScore > 60) {
    bpRecommendations.push('Limit daily sodium intake to under 2,000mg');
    bpRecommendations.push('Check blood pressure at least twice a week');
    bpRecommendations.push('Consult a physician to discuss cardiovascular wellness');
  } else {
    bpRecommendations.push('Maintain a low-sodium, potassium-rich diet');
  }

  predictionsList.push({
    predictionType: 'hypertension',
    score: bpScore,
    riskLevel: getRiskLevel(bpScore),
    confidence: baseConfidence,
    contributingFactors: bpFactors.length ? bpFactors : ['Stable normal blood pressure'],
    recommendations: bpRecommendations
  });

  // 3. Heart Disease Risk Prediction
  let heartRisk = 10;
  const heartFactors = [];
  const heartRecommendations = [];

  if (cholesterol > 200) {
    heartRisk += (cholesterol - 200) * 0.4;
    heartFactors.push(`High total cholesterol (${cholesterol} mg/dL)`);
    heartRecommendations.push('Reduce saturated fat intake and request a lipid profile');
  }
  if (bpSystolic > 130 || bpDiastolic > 85) {
    heartRisk += 15;
    heartFactors.push('Hypertension markers');
  }
  if (smoking === 'heavy') {
    heartRisk += 25;
    heartFactors.push('Heavy smoking habit');
    heartRecommendations.push('Consider smoking cessation programs or nicotine replacement therapies');
  } else if (smoking === 'light') {
    heartRisk += 12;
    heartFactors.push('Light smoking habit');
  }
  if (exercise === 'none') {
    heartRisk += 10;
    heartFactors.push('Sedentary lifestyle');
  }
  if (familyHistory.includes('heart_disease')) {
    heartRisk += 15;
    heartFactors.push('Genetic predisposition / family heart disease');
  }
  if (age > 50) {
    heartRisk += 15;
    heartFactors.push('Age over 50 years');
  }
  if (heartScore < 75) {
    heartRisk += (75 - heartScore) * 0.6;
    heartFactors.push(`Low calculated cardiovascular fitness (score: ${heartScore})`);
  }
  heartRisk = Math.max(5, Math.min(98, Math.round(heartRisk)));
  if (heartRisk > 60) {
    heartRecommendations.push('Schedule an ECG or Treadmill Test (TMT) under medical supervision');
    heartRecommendations.push('Emphasize dietary soluble fiber and omega-3 fatty acids');
  } else {
    heartRecommendations.push('Regular cardiovascular exercise (e.g. brisk walking, cycling) 30 min daily');
  }

  predictionsList.push({
    predictionType: 'heart_disease',
    score: heartRisk,
    riskLevel: getRiskLevel(heartRisk),
    confidence: baseConfidence,
    contributingFactors: heartFactors.length ? heartFactors : ['Good cardiovascular fitness'],
    recommendations: heartRecommendations
  });

  // 4. Kidney Disease Risk Prediction
  let kidneyScore = 10;
  const kidneyFactors = [];
  const kidneyRecommendations = [];

  if (egfr < 90) {
    kidneyScore += (90 - egfr) * 1.6;
    kidneyFactors.push(`Reduced eGFR levels (${egfr.toFixed(1)} mL/min/1.73m²)`);
  }
  if (bloodSugar > 125 || latestAssessment?.answers?.diabetes) {
    kidneyScore += 15;
    kidneyFactors.push('Diabetes-induced renal strain');
    kidneyRecommendations.push('Ensure optimal glycemic index to protect nephrons');
  }
  if (bpSystolic > 140) {
    kidneyScore += 15;
    kidneyFactors.push('High blood pressure causing vascular strain');
  }
  if (age > 60) {
    kidneyScore += 10;
  }
  kidneyScore = Math.max(5, Math.min(98, Math.round(kidneyScore)));
  if (kidneyScore > 50) {
    kidneyRecommendations.push('Conduct routine urine albumin-to-creatinine ratio (UACR) tests');
    kidneyRecommendations.push('Avoid over-the-counter NSAIDs (painkillers) which can strain kidneys');
  } else {
    kidneyRecommendations.push('Ensure adequate hydration and regular checkups');
  }

  predictionsList.push({
    predictionType: 'kidney_disease',
    score: kidneyScore,
    riskLevel: getRiskLevel(kidneyScore),
    confidence: baseConfidence,
    contributingFactors: kidneyFactors.length ? kidneyFactors : ['Healthy glomerular filtration rate'],
    recommendations: kidneyRecommendations
  });

  // 5. Liver Disease Risk Prediction
  let liverScore = 10;
  const liverFactors = [];
  const liverRecommendations = [];

  if (fib4Score > 1.3) {
    liverScore += (fib4Score - 1.3) * 16;
    liverFactors.push(`Elevated FIB-4 score (${fib4Score.toFixed(2)})`);
  }
  if (alcohol === 'regular') {
    liverScore += 25;
    liverFactors.push('Regular alcohol intake');
    liverRecommendations.push('Limit or completely avoid alcohol intake to prevent fatty liver');
  } else if (alcohol === 'occasional') {
    liverScore += 10;
  }
  if (bmi > 30) {
    liverScore += 15;
    liverFactors.push('Obesity/Non-alcoholic fatty liver risk');
    liverRecommendations.push('Work on body fat percentage reduction to prevent hepatic steatosis');
  }
  liverScore = Math.max(5, Math.min(98, Math.round(liverScore)));
  if (liverScore > 50) {
    liverRecommendations.push('Consider a liver function panel (AST/ALT) and abdominal ultrasound');
    liverRecommendations.push('Reduce processed sugars and high-fructose corn syrup');
  } else {
    liverRecommendations.push('Incorporate antioxidant-rich foods and leafy greens');
  }

  predictionsList.push({
    predictionType: 'liver_disease',
    score: liverScore,
    riskLevel: getRiskLevel(liverScore),
    confidence: baseConfidence,
    contributingFactors: liverFactors.length ? liverFactors : ['Healthy liver profile markers'],
    recommendations: liverRecommendations
  });

  // 6. Obesity Risk Prediction
  let obesityScore = 10;
  const obesityFactors = [];
  const obesityRecommendations = [];

  if (bmi > 25) {
    obesityScore += (bmi - 25) * 6.5;
    obesityFactors.push(`Elevated BMI (${bmi.toFixed(1)})`);
  }
  if (exercise === 'none') {
    obesityScore += 15;
    obesityFactors.push('Sedentary behavior / no regular workouts');
  }
  if (sleepHours < 6) {
    obesityScore += 10;
    obesityFactors.push('Short sleep duration (< 6 hours)');
    obesityRecommendations.push('Ensure 7-9 hours of sleep to stabilize leptin and ghrelin levels');
  }
  obesityScore = Math.max(5, Math.min(98, Math.round(obesityScore)));
  if (obesityScore > 50) {
    obesityRecommendations.push('Begin structured physical training combining cardio and weight training');
    obesityRecommendations.push('Track daily caloric intake and shift towards whole-food nutrition');
  } else {
    obesityRecommendations.push('Continue maintaining active lifestyle habits');
  }

  predictionsList.push({
    predictionType: 'obesity',
    score: obesityScore,
    riskLevel: getRiskLevel(obesityScore),
    confidence: baseConfidence,
    contributingFactors: obesityFactors.length ? obesityFactors : ['Optimal body composition parameters'],
    recommendations: obesityRecommendations
  });

  // 7. PCOS Risk Prediction
  let pcosScore = 5;
  const pcosFactors = [];
  const pcosRecommendations = [];

  if (gender === 'female' || gender === 'other') {
    pcosScore = 10;
    if (bmi > 25) {
      pcosScore += (bmi - 25) * 2.0;
      pcosFactors.push(`High BMI / insulin resistance marker (BMI: ${bmi.toFixed(1)})`);
    }
    if (age >= 15 && age <= 40) {
      pcosScore += 15;
      pcosFactors.push('Age group inside childbearing window');
    }
    if (stressLevel === 'high') {
      pcosScore += 10;
      pcosFactors.push('Adrenal stress influencing hormones');
    }
    if (latestCalc.pcos_risk && latestCalc.pcos_risk.outputs?.riskLevel !== 'Low') {
      pcosScore += 25;
      pcosFactors.push(`Calculated PCOS assessment indicates ${latestCalc.pcos_risk.outputs?.riskLevel} risk`);
    }
    pcosScore = Math.max(5, Math.min(95, Math.round(pcosScore)));
    if (pcosScore > 45) {
      pcosRecommendations.push('Discuss symptoms with a gynecologist or endocrinologist');
      pcosRecommendations.push('Adopt a low-glycemic index diet to manage insulin sensitivity');
    } else {
      pcosRecommendations.push('Maintain balanced diet and endocrine support');
    }
  } else {
    pcosScore = 0; // Male
  }

  predictionsList.push({
    predictionType: 'pcos',
    score: pcosScore,
    riskLevel: getRiskLevel(pcosScore),
    confidence: gender === 'male' ? 98 : baseConfidence,
    contributingFactors: pcosFactors.length ? pcosFactors : gender === 'male' ? ['Not applicable for male physiology'] : ['Balanced endocrine markers'],
    recommendations: pcosRecommendations
  });

  // 8. Sleep Disorder Risk Prediction
  let sleepDisorderScore = 10;
  const sleepFactors = [];
  const sleepRecommendations = [];

  if (sleepHours < 6) {
    sleepDisorderScore += (6 - sleepHours) * 20;
    sleepFactors.push(`Chronically short sleep duration (${sleepHours} hours)`);
  } else if (sleepHours > 9.5) {
    sleepDisorderScore += (sleepHours - 9.5) * 15;
    sleepFactors.push(`Excessive hypersomnia (${sleepHours} hours)`);
  }
  if (sleepScore < 70) {
    sleepDisorderScore += (70 - sleepScore) * 0.9;
    sleepFactors.push(`Low sleep efficiency score (${sleepScore}/100)`);
  }
  if (stressLevel === 'high') {
    sleepDisorderScore += 15;
    sleepFactors.push('High stress / hyperarousal index');
  }
  if (bmi > 30) {
    sleepDisorderScore += 12;
    sleepFactors.push('High BMI (potential sleep apnea indicator)');
    sleepRecommendations.push('Screen for obstructive sleep apnea if snoring occurs');
  }
  sleepDisorderScore = Math.max(5, Math.min(98, Math.round(sleepDisorderScore)));
  if (sleepDisorderScore > 50) {
    sleepRecommendations.push('Avoid blue light emitting screens 2 hours before bed');
    sleepRecommendations.push('Set a consistent bedtime and waking routine');
    sleepRecommendations.push('Limit caffeine consumption afternoon');
  } else {
    sleepRecommendations.push('Maintain good circadian hygiene');
  }

  predictionsList.push({
    predictionType: 'sleep_disorder',
    score: sleepDisorderScore,
    riskLevel: getRiskLevel(sleepDisorderScore),
    confidence: baseConfidence,
    contributingFactors: sleepFactors.length ? sleepFactors : ['Optimal circadian rest cycles'],
    recommendations: sleepRecommendations
  });

  // 9. Mental Stress Risk Prediction
  let stressScore = 10;
  const stressFactors = [];
  const stressRecommendations = [];

  if (stressLevel === 'high') {
    stressScore += 50;
    stressFactors.push('Self-reported high perceived stress levels');
  } else if (stressLevel === 'moderate') {
    stressScore += 25;
    stressFactors.push('Self-reported moderate stress levels');
  }
  if (sleepScore < 60) {
    stressScore += 15;
    stressFactors.push('Inadequate sleep recovery affecting resilience');
  }
  if (exercise === 'none') {
    stressScore += 10;
    stressFactors.push('Lack of physical activity to release cortisol');
  }
  stressScore = Math.max(5, Math.min(98, Math.round(stressScore)));
  if (stressScore > 50) {
    stressRecommendations.push('Incorporate mindfulness, meditation, or journaling');
    stressRecommendations.push('Discuss stress levels with a wellness counselor or therapist');
  } else {
    stressRecommendations.push('Engage in positive social, hobby, or physical activities');
  }

  predictionsList.push({
    predictionType: 'mental_stress_risk',
    score: stressScore,
    riskLevel: getRiskLevel(stressScore),
    confidence: baseConfidence,
    contributingFactors: stressFactors.length ? stressFactors : ['Low perceived stress levels'],
    recommendations: stressRecommendations
  });

  // Save predictions to database
  await HealthPrediction.deleteMany({ userId });
  const createdPredictions = await HealthPrediction.insertMany(
    predictionsList.map(p => ({ ...p, userId }))
  );

  return createdPredictions;
};
