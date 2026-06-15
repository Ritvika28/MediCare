const STATUS_COLORS = {
  good: 'emerald',
  normal: 'emerald',
  low: 'emerald',
  elevated: 'amber',
  moderate: 'amber',
  prediabetes: 'amber',
  borderline: 'amber',
  overweight: 'amber',
  underweight: 'amber',
  high: 'rose',
  severe: 'rose',
  crisis: 'rose',
  obese: 'rose',
  diabetes: 'rose',
  'stage 1': 'amber',
  'stage 2': 'rose',
  'hypertensive crisis': 'rose',
  intermediate: 'amber',
};

export const CALCULATOR_TYPES = [
  'bmi', 'bmr', 'body_fat', 'calorie', 'ideal_weight', 'water_intake',
  'period_tracker', 'pregnancy_tracker', 'heart_health', 'diabetes_risk',
  'blood_pressure', 'blood_sugar', 'cholesterol', 'kidney_health',
  'liver_health', 'stress_assessment', 'pcos_risk', 'sleep_assessment',
];

export function getStatusColor(status) {
  if (!status) return 'slate';
  const key = String(status).toLowerCase();
  for (const [pattern, color] of Object.entries(STATUS_COLORS)) {
    if (key.includes(pattern)) return color;
  }
  return 'slate';
}

function result(status, recommendations = [], interpretation = '') {
  return {
    status,
    statusColor: getStatusColor(status),
    recommendations: Array.isArray(recommendations) ? recommendations : [recommendations].filter(Boolean),
    interpretation,
  };
}

export function calcBMI(weight, height) {
  if (!weight || !height || weight <= 0 || height <= 0) throw new Error('Valid weight and height required');
  const bmi = weight / Math.pow(height / 100, 2);
  let category;
  let interpretation;
  const recs = [];
  if (bmi < 18.5) {
    category = 'Underweight';
    interpretation = 'Your BMI is below the healthy range. This may indicate insufficient nutrition or underlying health conditions.';
    recs.push('Increase caloric intake with nutrient-dense foods.', 'Consult a dietitian for a personalized meal plan.', 'Rule out thyroid or metabolic disorders if unintentional weight loss.');
  } else if (bmi < 25) {
    category = 'Normal';
    interpretation = 'Your BMI falls within the healthy weight range for your height.';
    recs.push('Maintain balanced nutrition and regular physical activity.', 'Monitor weight periodically to catch early changes.');
  } else if (bmi < 30) {
    category = 'Overweight';
    interpretation = 'Your BMI indicates overweight status, which increases risk for cardiovascular and metabolic conditions.';
    recs.push('Aim for 150 minutes of moderate exercise weekly.', 'Reduce processed foods and added sugars.', 'Consider a structured weight management program.');
  } else {
    category = 'Obese';
    interpretation = 'Your BMI indicates obesity, significantly increasing risk for diabetes, heart disease, and joint problems.';
    recs.push('Consult a physician for comprehensive metabolic screening.', 'Work with a dietitian on sustainable calorie reduction.', 'Begin low-impact exercise gradually.');
  }
  const meta = result(category, recs, interpretation);
  return { bmi: parseFloat(bmi.toFixed(1)), category, healthyRange: '18.5–24.9', ...meta };
}

export function calcBMR(weight, height, age, gender) {
  if (!weight || !height || !age) throw new Error('Weight, height, and age are required');
  let bmr;
  if (gender === 'male') bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  else bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  bmr = Math.round(bmr);
  const meta = result('Normal', [
    'BMR represents calories burned at complete rest.',
    'Multiply BMR by activity factor for daily calorie needs.',
    'Recalculate after significant weight change.',
  ], `Your body burns approximately ${bmr} kcal/day at rest.`);
  return { bmr, unit: 'kcal/day', ...meta };
}

export function calcBodyFat(waist, neck, height, hip, gender) {
  let bodyFat;
  if (gender === 'male') bodyFat = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
  else bodyFat = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;
  bodyFat = Math.max(0, Math.min(bodyFat, 60));
  let category;
  if (gender === 'male') {
    if (bodyFat < 6) category = 'Essential Fat';
    else if (bodyFat < 14) category = 'Athletic';
    else if (bodyFat < 18) category = 'Fitness';
    else if (bodyFat < 25) category = 'Average';
    else category = 'Obese';
  } else {
    if (bodyFat < 14) category = 'Essential Fat';
    else if (bodyFat < 21) category = 'Athletic';
    else if (bodyFat < 25) category = 'Fitness';
    else if (bodyFat < 32) category = 'Average';
    else category = 'Obese';
  }
  const meta = result(category, [
    category === 'Average' || category === 'Obese' ? 'Incorporate strength training 2–3 times per week.' : 'Maintain current fitness routine.',
    'Pair with waist circumference tracking for better body composition insight.',
  ], `Body fat percentage estimated at ${bodyFat.toFixed(1)}% (${category}).`);
  return { bodyFatPercentage: parseFloat(bodyFat.toFixed(1)), category, ...meta };
}

export function calcCalories(weight, height, age, gender, activityLevel) {
  const { bmr } = calcBMR(weight, height, age, gender);
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 };
  const multiplier = multipliers[activityLevel] || 1.55;
  const maintenance = Math.round(bmr * multiplier);
  const meta = result('Normal', [
    'Use maintenance calories to maintain current weight.',
    'For weight loss, reduce by 300–500 kcal/day safely.',
    'Prioritize protein intake during calorie adjustment.',
  ], `Daily maintenance calories based on ${activityLevel || 'moderate'} activity level.`);
  return {
    bmr, maintenance,
    mildWeightLoss: maintenance - 250, weightLoss: maintenance - 500,
    mildWeightGain: maintenance + 250, weightGain: maintenance + 500,
    unit: 'kcal/day', ...meta,
  };
}

export function calcIdealWeight(height, gender) {
  const heightInches = height / 2.54;
  let idealKg = gender === 'male' ? 50 + 2.3 * (heightInches - 60) : 45.5 + 2.3 * (heightInches - 60);
  idealKg = Math.max(idealKg, 30);
  const meta = result('Normal', [
    'Ideal weight is a guideline, not a strict target.',
    'Focus on body composition and waist-to-height ratio alongside weight.',
  ], 'Devine formula estimate for healthy weight range.');
  return {
    idealWeight: parseFloat(idealKg.toFixed(1)),
    range: { min: parseFloat((idealKg * 0.9).toFixed(1)), max: parseFloat((idealKg * 1.1).toFixed(1)) },
    unit: 'kg', ...meta,
  };
}

export function calcWaterIntake(weight, activityLevel) {
  let base = weight * 0.033;
  if (activityLevel === 'active' || activityLevel === 'veryActive') base += 0.5;
  const meta = result('Normal', [
    'Spread water intake throughout the day.',
    'Increase intake during hot weather or intense exercise.',
    'Monitor urine color — pale yellow indicates good hydration.',
  ], `Recommended daily water intake based on ${weight}kg body weight.`);
  return { liters: parseFloat(base.toFixed(1)), glasses: Math.round(base / 0.25), unit: 'liters/day', ...meta };
}

export function calcPeriod(lastPeriodDate, cycleLength = 28, periodLength = 5) {
  const start = new Date(lastPeriodDate);
  if (isNaN(start.getTime())) throw new Error('Invalid start date');
  const nextPeriod = new Date(start);
  nextPeriod.setDate(start.getDate() + cycleLength);
  const ovulation = new Date(nextPeriod);
  ovulation.setDate(nextPeriod.getDate() - 14);
  const fertilityStart = new Date(ovulation);
  fertilityStart.setDate(ovulation.getDate() - 5);
  const fertilityEnd = new Date(ovulation);
  fertilityEnd.setDate(ovulation.getDate() + 1);
  const fmt = (d) => d.toISOString().split('T')[0];
  const meta = result('Normal', [
    'Track symptoms daily for more accurate predictions.',
    'Consult a gynecologist if cycles are irregular (<21 or >35 days).',
    'Ovulation typically occurs 14 days before next period.',
  ], `Cycle length ${cycleLength} days. Next period predicted ${fmt(nextPeriod)}.`);
  return {
    lastPeriodDate: fmt(start), predictedNextPeriod: fmt(nextPeriod),
    ovulationDay: fmt(ovulation), fertilityWindowStart: fmt(fertilityStart),
    fertilityWindowEnd: fmt(fertilityEnd), cycleLength, periodLength, ...meta,
  };
}

export function calcPregnancy(lastPeriodDate) {
  const start = new Date(lastPeriodDate);
  if (isNaN(start.getTime())) throw new Error('Invalid start date');
  const dueDate = new Date(start);
  dueDate.setDate(start.getDate() + 280);
  const today = new Date();
  const diffDays = Math.ceil(Math.abs(today - start) / (1000 * 60 * 60 * 24));
  let currentWeek = Math.min(42, Math.max(0, Math.floor(diffDays / 7)));
  let trimester = currentWeek <= 12 ? 1 : currentWeek <= 26 ? 2 : 3;
  const milestones = {
    0: { size: 'Poppy seed', note: 'Cell division and implantation.' },
    8: { size: 'Blueberry', note: 'Brain and heart tube developing.' },
    12: { size: 'Lime', note: 'Facial features forming.' },
    16: { size: 'Pea pod', note: 'Bones hardening, baby moving.' },
    20: { size: 'Mango', note: 'Nervous system developing rapidly.' },
    24: { size: 'Ear of corn', note: 'Lungs forming.' },
    28: { size: 'Eggplant', note: 'Eyelids opening, brain active.' },
    32: { size: 'Squash', note: 'Rapid fat gain, lungs maturing.' },
    36: { size: 'Honeydew melon', note: 'Immune system developing.' },
    37: { size: 'Watermelon', note: 'Full term — lungs fully developed.' },
  };
  const weekKey = Object.keys(milestones).reverse().find((k) => currentWeek >= +k);
  const m = milestones[weekKey];
  const dietAdvice = [
    'Take prenatal vitamins with folic acid daily.',
    'Eat calcium-rich foods for fetal bone development.',
    'Include iron-rich foods to prevent anemia.',
    'Stay hydrated — 8–10 glasses of water daily.',
    'Avoid raw fish, unpasteurized dairy, and excess caffeine.',
  ];
  const fmt = (d) => d.toISOString().split('T')[0];
  const meta = result('Normal', dietAdvice, `Week ${currentWeek}, Trimester ${trimester}. Due date: ${fmt(dueDate)}.`);
  return {
    dueDate: fmt(dueDate), currentWeek, trimester,
    babySize: m.size, milestone: m.note, dietAdvice, ...meta,
  };
}

export function calcHeartHealth(restingHeartRate, systolicBP, diastolicBP, cholesterol, isSmoker, age, gender) {
  let heartScore = 100;
  const advice = [];
  if (restingHeartRate > 100) { heartScore -= 20; advice.push('High resting heart rate — consult a cardiologist.'); }
  else if (restingHeartRate > 80) { heartScore -= 10; advice.push('Elevated resting heart rate — add 30 min cardio daily.'); }
  if (systolicBP >= 140 || diastolicBP >= 90) { heartScore -= 25; advice.push('Stage 2 Hypertension — seek medical guidance.'); }
  else if (systolicBP >= 130 || diastolicBP >= 80) { heartScore -= 15; advice.push('Stage 1 Hypertension — reduce sodium, manage weight.'); }
  else if (systolicBP >= 120) { heartScore -= 5; advice.push('Elevated BP — limit caffeine and processed foods.'); }
  if (cholesterol >= 240) { heartScore -= 20; advice.push('High cholesterol — reduce saturated fat, increase fiber.'); }
  else if (cholesterol >= 200) { heartScore -= 10; advice.push('Borderline cholesterol — add nuts, olive oil, whole grains.'); }
  if (isSmoker) { heartScore -= 20; advice.push('Smoking elevates cardiovascular risk — seek cessation support.'); }
  heartScore = Math.max(10, heartScore);
  const riskLevel = heartScore < 50 ? 'High Risk' : heartScore < 80 ? 'Moderate Risk' : 'Low Risk';
  if (!advice.length) advice.push('Excellent cardiovascular indicators — maintain current lifestyle.');
  const meta = result(riskLevel, advice, `Heart health score: ${heartScore}/100 based on vitals and lifestyle factors.`);
  return { heartScore, riskLevel, advice, ...meta };
}

export function calcDiabetesRisk(age, bmi, familyHistory, activityLevel, smoking, bloodPressure) {
  let score = 0;
  const advice = [];
  if (age >= 60) score += 3; else if (age >= 50) score += 2; else if (age >= 40) score += 1;
  if (bmi >= 35) { score += 3; advice.push('High BMI — consult endocrinologist.'); }
  else if (bmi >= 30) { score += 2; advice.push('Class 1 obesity — structured nutrition program recommended.'); }
  else if (bmi >= 25) { score += 1; advice.push('Overweight — 5–10% weight loss reduces diabetes risk.'); }
  if (familyHistory) { score += 2; advice.push('Family history present — request annual HbA1c screening.'); }
  if (activityLevel === 'sedentary') { score += 1; advice.push('Sedentary lifestyle — aim for 150 min exercise weekly.'); }
  if (bloodPressure === 'high') { score += 1; advice.push('High BP linked to insulin resistance.'); }
  if (smoking === 'current') advice.push('Smoking increases type 2 diabetes risk by 30–40%.');
  const riskCategory = score >= 5 ? 'High Risk' : score >= 3 ? 'Increased Risk' : 'Low Risk';
  if (!advice.length) advice.push('Low risk factors — maintain balanced diet and activity.');
  const meta = result(riskCategory, advice, `Diabetes risk score: ${score}/10 based on lifestyle and clinical factors.`);
  return { score, maxScore: 10, riskCategory, advice, ...meta };
}

export function calcBloodPressure(systolic, diastolic) {
  if (!systolic || !diastolic) throw new Error('Systolic and diastolic values required');
  let classification;
  let interpretation;
  const recs = [];
  let doctorRecommended = false;
  if (systolic >= 180 || diastolic >= 120) {
    classification = 'Hypertensive Crisis';
    interpretation = 'Blood pressure is critically high. This requires immediate medical attention.';
    recs.push('Call emergency services or go to nearest ER immediately.', 'Do not wait — hypertensive crisis can cause stroke or heart attack.');
    doctorRecommended = true;
  } else if (systolic >= 140 || diastolic >= 90) {
    classification = 'Stage 2 Hypertension';
    interpretation = 'Blood pressure is in Stage 2 Hypertension range.';
    recs.push('Reduce sodium intake to under 2300mg/day.', 'Exercise 30 minutes most days.', 'Limit alcohol and manage stress.', 'Schedule appointment with physician within 1 week.');
    doctorRecommended = true;
  } else if (systolic >= 130 || diastolic >= 80) {
    classification = 'Stage 1 Hypertension';
    interpretation = 'Blood pressure indicates Stage 1 Hypertension.';
    recs.push('Adopt DASH diet rich in fruits and vegetables.', 'Monitor BP at home twice daily.', 'Reduce caffeine and processed food intake.');
    doctorRecommended = true;
  } else if (systolic >= 120 && diastolic < 80) {
    classification = 'Elevated';
    interpretation = 'Systolic pressure is elevated but diastolic is normal.';
    recs.push('Increase physical activity.', 'Maintain healthy body weight.', 'Limit sodium intake.');
  } else {
    classification = 'Normal';
    interpretation = 'Blood pressure is within normal range.';
    recs.push('Continue regular monitoring.', 'Maintain active lifestyle and balanced diet.');
  }
  const meta = result(classification, recs, interpretation);
  return { systolic, diastolic, classification, doctorRecommended, reading: `${systolic}/${diastolic} mmHg`, ...meta };
}

export function calcBloodSugar({ testType, value }) {
  if (!testType || value == null) throw new Error('Test type and value required');
  let classification;
  let interpretation;
  const recs = [];
  const v = parseFloat(value);
  if (testType === 'fasting') {
    if (v >= 126) { classification = 'Diabetes Range'; interpretation = 'Fasting glucose ≥126 mg/dL suggests diabetes.'; recs.push('Consult physician for confirmatory testing.', 'Request HbA1c test.'); }
    else if (v >= 100) { classification = 'Prediabetes'; interpretation = 'Fasting glucose 100–125 mg/dL indicates prediabetes.'; recs.push('Lifestyle changes can prevent progression to diabetes.', 'Repeat test in 3 months.'); }
    else { classification = 'Normal'; interpretation = 'Fasting glucose is within normal range.'; recs.push('Maintain healthy diet and regular exercise.'); }
  } else if (testType === 'random') {
    if (v >= 200) { classification = 'Diabetes Range'; interpretation = 'Random glucose ≥200 mg/dL suggests diabetes.'; recs.push('Seek medical evaluation promptly.'); }
    else if (v >= 140) { classification = 'Prediabetes'; interpretation = 'Random glucose is elevated.'; recs.push('Monitor fasting glucose and HbA1c.'); }
    else { classification = 'Normal'; interpretation = 'Random glucose is within normal range.'; recs.push('Continue healthy eating habits.'); }
  } else if (testType === 'hba1c') {
    if (v >= 6.5) { classification = 'Diabetes Range'; interpretation = 'HbA1c ≥6.5% indicates diabetes.'; recs.push('Work with endocrinologist on management plan.'); }
    else if (v >= 5.7) { classification = 'Prediabetes'; interpretation = 'HbA1c 5.7–6.4% indicates prediabetes.'; recs.push('Weight loss and exercise can reverse prediabetes.'); }
    else { classification = 'Normal'; interpretation = 'HbA1c is within normal range.'; recs.push('Annual screening if over 45 or at risk.'); }
  } else throw new Error('Invalid test type');
  const meta = result(classification, recs, interpretation);
  return { testType, value: v, unit: testType === 'hba1c' ? '%' : 'mg/dL', classification, ...meta };
}

export function calcCholesterol(total, hdl, ldl, triglycerides) {
  let heartRisk = 'Low';
  const recs = [];
  let interpretation = '';
  if (total >= 240) { heartRisk = 'High'; interpretation = 'Total cholesterol is high (≥240 mg/dL).'; recs.push('Reduce saturated and trans fats.', 'Increase soluble fiber (oats, beans).'); }
  else if (total >= 200) { heartRisk = 'Moderate'; interpretation = 'Total cholesterol is borderline high (200–239 mg/dL).'; recs.push('Add omega-3 fatty acids.', 'Increase physical activity.'); }
  else { interpretation = 'Total cholesterol is desirable (<200 mg/dL).'; recs.push('Maintain heart-healthy diet.'); }
  if (hdl < 40) { heartRisk = heartRisk === 'Low' ? 'Moderate' : 'High'; recs.push('Low HDL — increase aerobic exercise and healthy fats.'); }
  if (ldl >= 160) { heartRisk = 'High'; recs.push('LDL is very high — medical evaluation recommended.'); }
  else if (ldl >= 130) { if (heartRisk === 'Low') heartRisk = 'Moderate'; recs.push('LDL elevated — reduce dietary cholesterol.'); }
  if (triglycerides >= 200) { if (heartRisk !== 'High') heartRisk = 'Moderate'; recs.push('High triglycerides — limit sugar and refined carbs.'); }
  const meta = result(heartRisk === 'High' ? 'High Risk' : heartRisk === 'Moderate' ? 'Moderate Risk' : 'Low Risk', recs, interpretation);
  return { total, hdl, ldl, triglycerides, heartRisk, unit: 'mg/dL', ...meta };
}

export function calcKidneyHealth(age, gender, creatinine, weight) {
  if (!age || !gender || !creatinine) throw new Error('Age, gender, and creatinine required');
  const isFemale = gender === 'female';
  let egfr;
  if (weight) {
    egfr = ((140 - age) * weight) / (72 * creatinine);
    if (isFemale) egfr *= 0.85;
  } else {
    const k = isFemale ? 0.7 : 0.9;
    const a = isFemale ? -0.241 : -0.302;
    const minCr = Math.min(creatinine / k, 1);
    const maxCr = Math.max(creatinine / k, 1);
    egfr = 142 * Math.pow(minCr, a) * Math.pow(maxCr, -1.200) * Math.pow(0.9938, age);
    if (isFemale) egfr *= 1.012;
  }
  egfr = parseFloat(egfr.toFixed(1));
  let stage;
  let interpretation;
  const recs = [];
  if (egfr >= 90) { stage = 'Normal'; interpretation = 'Kidney function is normal (eGFR ≥90).'; recs.push('Stay hydrated and monitor BP.'); }
  else if (egfr >= 60) { stage = 'Mild'; interpretation = 'Mildly decreased kidney function (eGFR 60–89).'; recs.push('Control blood pressure and blood sugar.', 'Limit NSAID use.'); }
  else if (egfr >= 30) { stage = 'Moderate'; interpretation = 'Moderately decreased kidney function (eGFR 30–59).'; recs.push('Consult nephrologist.', 'Follow renal diet guidelines.'); }
  else { stage = 'Severe'; interpretation = 'Severely decreased kidney function (eGFR <30).'; recs.push('Immediate nephrology referral required.', 'Avoid nephrotoxic medications.'); }
  const meta = result(stage, recs, interpretation);
  return { egfr, stage, creatinine, unit: 'mL/min/1.73m²', kidneyFailureRisk: stage === 'Severe' ? 'High' : stage === 'Moderate' ? 'Moderate' : 'Low', ...meta };
}

export function calcLiverHealth(age, ast, alt, platelets) {
  if (!age || !ast || !alt || !platelets) throw new Error('Age, AST, ALT, and platelets required');
  const fib4 = (age * ast) / (platelets * Math.sqrt(alt));
  const score = parseFloat(fib4.toFixed(2));
  let risk;
  let interpretation;
  const recs = [];
  if (score < 1.45) { risk = 'Low'; interpretation = 'FIB-4 score suggests low risk of advanced fibrosis.'; recs.push('Maintain healthy weight and limit alcohol.'); }
  else if (score <= 3.25) { risk = 'Intermediate'; interpretation = 'FIB-4 score suggests intermediate fibrosis risk.'; recs.push('Further evaluation with elastography recommended.', 'Avoid hepatotoxic substances.'); }
  else { risk = 'High'; interpretation = 'FIB-4 score suggests high risk of advanced fibrosis.'; recs.push('Consult hepatologist for comprehensive evaluation.', 'Screen for viral hepatitis and fatty liver disease.'); }
  const meta = result(`${risk} Risk`, recs, interpretation);
  return { fib4Score: score, fibrosisRisk: risk, ast, alt, platelets, ...meta };
}

export function calcStressAssessment(answers) {
  const { stressFrequency, sleepQuality, mood, interestLevel, fatigue, concentration } = answers;
  const scores = { never: 0, rarely: 1, sometimes: 2, often: 3, always: 4 };
  const map = (v) => scores[v] ?? (parseInt(v, 10) || 0);
  const total = map(stressFrequency) + map(sleepQuality) + map(mood) + map(interestLevel) + map(fatigue) + map(concentration);
  const maxScore = 24;
  let level;
  let interpretation;
  const recs = [];
  if (total <= 6) { level = 'Low'; interpretation = 'Your responses suggest low stress levels.'; recs.push('Continue current coping strategies.', 'Maintain work-life balance.'); }
  else if (total <= 14) { level = 'Moderate'; interpretation = 'Your responses suggest moderate stress that may benefit from intervention.'; recs.push('Practice mindfulness or meditation 10 min daily.', 'Ensure 7–8 hours of sleep.', 'Consider talking to a counselor.'); }
  else { level = 'High'; interpretation = 'Your responses suggest significant stress affecting daily function.'; recs.push('Consult a mental health professional.', 'Practice deep breathing exercises.', 'Reduce caffeine and screen time before bed.'); }
  const meta = result(level, recs, interpretation);
  return {
    totalScore: total, maxScore, level,
    disclaimer: 'This screening tool is not a diagnosis. Please consult a qualified mental health professional for clinical evaluation.',
    ...meta,
  };
}

export function calcPCOSRisk(answers) {
  const { cycleRegularity, acne, weightGain, hairGrowth, familyHistory } = answers;
  let score = 0;
  const recs = [];
  if (cycleRegularity === 'irregular' || cycleRegularity === 'absent') { score += 2; recs.push('Irregular cycles warrant gynecological evaluation.'); }
  if (acne === 'moderate' || acne === 'severe') score += 1;
  if (weightGain === 'yes') { score += 1; recs.push('Weight management can improve PCOS symptoms.'); }
  if (hairGrowth === 'yes') { score += 2; recs.push('Excess hair growth (hirsutism) is a common PCOS sign.'); }
  if (familyHistory === 'yes') { score += 1; recs.push('Family history increases PCOS likelihood.'); }
  const level = score >= 4 ? 'High Risk' : score >= 2 ? 'Moderate Risk' : 'Low Risk';
  if (score >= 2) recs.push('Consult a gynecologist for hormonal evaluation and ultrasound if indicated.');
  const meta = result(level, recs, `PCOS risk score: ${score}/7 based on symptom profile.`);
  return { score, maxScore: 7, level, ...meta };
}

export function calcSleepAssessment({ duration, quality, wakeups, daytimeTiredness }) {
  let sleepScore = 0;
  const dur = parseFloat(duration);
  if (dur >= 7 && dur <= 9) sleepScore += 30;
  else if (dur >= 6 && dur <= 10) sleepScore += 20;
  else sleepScore += 5;
  const qMap = { excellent: 30, good: 25, fair: 15, poor: 5 };
  sleepScore += qMap[quality] || 15;
  const w = parseInt(wakeups, 10);
  if (w === 0) sleepScore += 20;
  else if (w <= 1) sleepScore += 15;
  else if (w <= 3) sleepScore += 8;
  else sleepScore += 3;
  const tMap = { none: 20, mild: 12, moderate: 6, severe: 2 };
  sleepScore += tMap[daytimeTiredness] || 10;
  sleepScore = Math.min(100, sleepScore);
  const recoveryScore = Math.round(sleepScore * 0.85 + (dur >= 7 ? 15 : 5));
  let level;
  const recs = [];
  if (sleepScore >= 80) { level = 'Excellent'; recs.push('Maintain consistent sleep schedule.'); }
  else if (sleepScore >= 60) { level = 'Good'; recs.push('Try going to bed 30 minutes earlier.', 'Keep bedroom cool and dark.'); }
  else if (sleepScore >= 40) { level = 'Fair'; recs.push('Limit screens 1 hour before bed.', 'Avoid caffeine after 2 PM.'); }
  else { level = 'Poor'; recs.push('Consider sleep study if symptoms persist.', 'Establish fixed wake time daily.'); }
  const meta = result(level, recs, `Sleep score ${sleepScore}/100, recovery score ${recoveryScore}/100.`);
  return { sleepScore, recoveryScore, duration: dur, quality, wakeups: w, level, ...meta };
}

export function logWater(amountMl) {
  const liters = parseFloat((amountMl / 1000).toFixed(2));
  const meta = result('Logged', ['Keep hydrating throughout the day.'], `Logged ${amountMl}ml (${liters}L) water intake.`);
  return { amountMl, liters, ...meta };
}

const CALCULATORS = {
  bmi: (i) => calcBMI(i.weight, i.height),
  bmr: (i) => calcBMR(i.weight, i.height, i.age, i.gender),
  body_fat: (i) => calcBodyFat(i.waist, i.neck, i.height, i.hip, i.gender),
  calorie: (i) => calcCalories(i.weight, i.height, i.age, i.gender, i.activityLevel),
  ideal_weight: (i) => calcIdealWeight(i.height, i.gender),
  water_intake: (i) => calcWaterIntake(i.weight, i.activityLevel),
  period_tracker: (i) => calcPeriod(i.lastPeriodDate, i.cycleLength, i.periodLength),
  pregnancy_tracker: (i) => calcPregnancy(i.lastPeriodDate),
  heart_health: (i) => calcHeartHealth(i.restingHeartRate, i.systolicBP, i.diastolicBP, i.cholesterol, i.isSmoker, i.age, i.gender),
  diabetes_risk: (i) => calcDiabetesRisk(i.age, i.bmi, i.familyHistory, i.activityLevel, i.smoking, i.bloodPressure),
  blood_pressure: (i) => calcBloodPressure(i.systolic, i.diastolic),
  blood_sugar: (i) => calcBloodSugar(i),
  cholesterol: (i) => calcCholesterol(i.total, i.hdl, i.ldl, i.triglycerides),
  kidney_health: (i) => calcKidneyHealth(i.age, i.gender, i.creatinine, i.weight),
  liver_health: (i) => calcLiverHealth(i.age, i.ast, i.alt, i.platelets),
  stress_assessment: (i) => calcStressAssessment(i),
  pcos_risk: (i) => calcPCOSRisk(i),
  sleep_assessment: (i) => calcSleepAssessment(i),
};

export function runCalculator(type, inputs) {
  if (!CALCULATORS[type]) throw new Error(`Invalid calculator type: ${type}`);
  return CALCULATORS[type](inputs);
}

export function buildResultSummary(type, outputs) {
  const summaries = {
    bmi: `BMI: ${outputs.bmi} (${outputs.category})`,
    bmr: `BMR: ${outputs.bmr} kcal/day`,
    body_fat: `Body Fat: ${outputs.bodyFatPercentage}% (${outputs.category})`,
    calorie: `Maintenance: ${outputs.maintenance} kcal/day`,
    ideal_weight: `Ideal Weight: ${outputs.idealWeight} kg`,
    water_intake: `Water: ${outputs.liters}L / ${outputs.glasses} glasses per day`,
    period_tracker: `Next Period: ${outputs.predictedNextPeriod}`,
    pregnancy_tracker: `Week ${outputs.currentWeek} · Due: ${outputs.dueDate}`,
    heart_health: `Heart Score: ${outputs.heartScore}/100 (${outputs.riskLevel})`,
    diabetes_risk: `Diabetes Risk: ${outputs.score}/10 (${outputs.riskCategory})`,
    blood_pressure: `BP: ${outputs.reading} (${outputs.classification})`,
    blood_sugar: `Blood Sugar: ${outputs.value} ${outputs.unit} (${outputs.classification})`,
    cholesterol: `Cholesterol: ${outputs.total} mg/dL (${outputs.heartRisk} heart risk)`,
    kidney_health: `eGFR: ${outputs.egfr} (${outputs.stage})`,
    liver_health: `FIB-4: ${outputs.fib4Score} (${outputs.fibrosisRisk} risk)`,
    stress_assessment: `Stress: ${outputs.level} (${outputs.totalScore}/${outputs.maxScore})`,
    pcos_risk: `PCOS: ${outputs.level} (${outputs.score}/${outputs.maxScore})`,
    sleep_assessment: `Sleep Score: ${outputs.sleepScore}/100 (${outputs.level})`,
  };
  return summaries[type] || `${type} calculated`;
}
