import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';
import { Patient } from '../models/Patient.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// BMI Calculator
function calcBMI(weight, height) {
  const bmi = weight / Math.pow(height / 100, 2);
  let category;
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  return { bmi: parseFloat(bmi.toFixed(1)), category };
}

// BMR Calculator (Mifflin-St Jeor)
function calcBMR(weight, height, age, gender) {
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return { bmr: Math.round(bmr), unit: 'kcal/day' };
}

// Body Fat Percentage (US Navy Method)
function calcBodyFat(waist, neck, height, hip, gender) {
  let bodyFat;
  if (gender === 'male') {
    bodyFat = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
  } else {
    bodyFat = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;
  }
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
  return { bodyFatPercentage: parseFloat(bodyFat.toFixed(1)), category };
}

// Calorie Needs
function calcCalories(weight, height, age, gender, activityLevel) {
  const bmrResult = calcBMR(weight, height, age, gender);
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 };
  const multiplier = multipliers[activityLevel] || 1.55;
  const maintenance = Math.round(bmrResult.bmr * multiplier);
  return {
    maintenance,
    mildWeightLoss: maintenance - 250,
    weightLoss: maintenance - 500,
    mildWeightGain: maintenance + 250,
    weightGain: maintenance + 500,
    unit: 'kcal/day',
  };
}

// Ideal Weight (Devine Formula)
function calcIdealWeight(height, gender) {
  const heightInches = height / 2.54;
  let idealKg;
  if (gender === 'male') {
    idealKg = 50 + 2.3 * (heightInches - 60);
  } else {
    idealKg = 45.5 + 2.3 * (heightInches - 60);
  }
  idealKg = Math.max(idealKg, 30);
  return {
    idealWeight: parseFloat(idealKg.toFixed(1)),
    range: { min: parseFloat((idealKg * 0.9).toFixed(1)), max: parseFloat((idealKg * 1.1).toFixed(1)) },
    unit: 'kg',
  };
}

// Water Intake
function calcWaterIntake(weight, activityLevel) {
  let base = weight * 0.033; // liters
  if (activityLevel === 'active' || activityLevel === 'veryActive') base += 0.5;
  return { liters: parseFloat(base.toFixed(1)), glasses: Math.round(base / 0.25) };
}

// Period Tracker calculation
function calcPeriod(lastPeriodDate, cycleLength = 28, periodLength = 5) {
  const start = new Date(lastPeriodDate);
  if (isNaN(start.getTime())) {
    return { error: 'Invalid start date' };
  }

  const nextPeriod = new Date(start);
  nextPeriod.setDate(start.getDate() + cycleLength);

  const ovulation = new Date(nextPeriod);
  ovulation.setDate(nextPeriod.getDate() - 14);

  const fertilityStart = new Date(ovulation);
  fertilityStart.setDate(ovulation.getDate() - 5);

  const fertilityEnd = new Date(ovulation);
  fertilityEnd.setDate(ovulation.getDate() + 1);

  const formatDate = (d) => d.toISOString().split('T')[0];

  return {
    lastPeriodDate: formatDate(start),
    predictedNextPeriod: formatDate(nextPeriod),
    ovulationDay: formatDate(ovulation),
    fertilityWindowStart: formatDate(fertilityStart),
    fertilityWindowEnd: formatDate(fertilityEnd),
    cycleLength,
    periodLength
  };
}

// Pregnancy Tracker calculation
function calcPregnancy(lastPeriodDate) {
  const start = new Date(lastPeriodDate);
  if (isNaN(start.getTime())) {
    return { error: 'Invalid start date' };
  }

  const dueDate = new Date(start);
  dueDate.setDate(start.getDate() + 280); // Naegele's rule

  const today = new Date();
  const diffTime = Math.abs(today - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let currentWeek = Math.floor(diffDays / 7);
  if (currentWeek < 0) currentWeek = 0;
  if (currentWeek > 42) currentWeek = 42;

  let trimester = 1;
  if (currentWeek > 12 && currentWeek <= 26) trimester = 2;
  else if (currentWeek > 26) trimester = 3;

  let babySize = 'Poppy seed';
  let milestone = 'Cell division and initial implantation in the uterine wall.';

  if (currentWeek >= 5 && currentWeek <= 8) {
    babySize = 'Blueberry';
    milestone = 'Brain and heart tube are developing. The heart starts beating around week 6.';
  } else if (currentWeek >= 9 && currentWeek <= 12) {
    babySize = 'Lime';
    milestone = 'Facial features are forming, and tiny fingers and toes begin to show.';
  } else if (currentWeek >= 13 && currentWeek <= 16) {
    babySize = 'Pea pod';
    milestone = 'Joints and bones are hardening. The baby starts moving, though you may not feel it yet.';
  } else if (currentWeek >= 17 && currentWeek <= 20) {
    babySize = 'Mango';
    milestone = 'The nervous system is developing. Baby starts to hear internal sounds.';
  } else if (currentWeek >= 21 && currentWeek <= 24) {
    babySize = 'Ear of corn';
    milestone = 'Lungs are forming, and the baby can swallow small amounts of amniotic fluid.';
  } else if (currentWeek >= 25 && currentWeek <= 28) {
    babySize = 'Eggplant';
    milestone = 'Eyelids begin to open and close. Brain activity shows response to light and sound.';
  } else if (currentWeek >= 29 && currentWeek <= 32) {
    babySize = 'Squash';
    milestone = 'The baby starts putting on body fat rapidly. Lungs are maturing.';
  } else if (currentWeek >= 33 && currentWeek <= 36) {
    babySize = 'Honeydew melon';
    milestone = 'Immune system is developing. Most organs are now functional.';
  } else if (currentWeek >= 37) {
    babySize = 'Watermelon';
    milestone = 'Baby is full term and ready to be born. Lungs are fully developed.';
  }

  const dietAdvice = [
    'Ensure daily intake of Prenatal Vitamins including Folic Acid.',
    'Consume calcium-rich foods like yogurt, milk, and cheese.',
    'Eat iron-rich foods (lean meat, spinach, beans) to prevent anemia.',
    'Stay well-hydrated by drinking at least 8-10 glasses of water daily.',
    'Include fiber-rich foods to prevent common digestive discomforts.'
  ];

  const formatDate = (d) => d.toISOString().split('T')[0];

  return {
    dueDate: formatDate(dueDate),
    currentWeek,
    trimester,
    babySize,
    milestone,
    dietAdvice
  };
}

// Heart Health calculation
function calcHeartHealth(restingHeartRate, systolicBP, diastolicBP, cholesterol, isSmoker, age, gender) {
  let heartScore = 100;
  const advice = [];

  if (restingHeartRate > 80) {
    heartScore -= 10;
    advice.push('Resting heart rate is slightly elevated. Consider adding 30 mins of moderate cardio daily.');
  } else if (restingHeartRate > 100) {
    heartScore -= 20;
    advice.push('High resting heart rate (tachycardia). Please consult a doctor for a thorough evaluation.');
  }

  if (systolicBP >= 140 || diastolicBP >= 90) {
    heartScore -= 25;
    advice.push('Blood pressure is in Stage 2 Hypertension. Reduce sodium intake and seek medical guidance.');
  } else if (systolicBP >= 130 || diastolicBP >= 80) {
    heartScore -= 15;
    advice.push('Blood pressure shows Stage 1 Hypertension. Focus on weight management and healthy diet.');
  } else if (systolicBP >= 120) {
    heartScore -= 5;
    advice.push('Blood pressure is elevated. Limit caffeine and processed food.');
  }

  if (cholesterol >= 240) {
    heartScore -= 20;
    advice.push('High total cholesterol. Reduce saturated fat and increase soluble fiber intake.');
  } else if (cholesterol >= 200) {
    heartScore -= 10;
    advice.push('Borderline high cholesterol. Incorporate olive oil, nuts, and whole grains into your meals.');
  }

  if (isSmoker) {
    heartScore -= 20;
    advice.push('Smoking significantly elevates cardiovascular risk. Contact a smoking cessation program.');
  }

  heartScore = Math.max(10, heartScore);

  let riskLevel = 'Low Risk';
  if (heartScore < 50) riskLevel = 'High Risk';
  else if (heartScore < 80) riskLevel = 'Moderate Risk';

  if (advice.length === 0) {
    advice.push('Keep up the excellent lifestyle! Your stats indicate top-notch cardiovascular health.');
  }

  return {
    heartScore,
    riskLevel,
    advice
  };
}

// Diabetes Risk calculation
function calcDiabetesRisk(age, bmi, familyHistory, activityLevel, smoking, bloodPressure) {
  let score = 0;
  const advice = [];

  if (age >= 40 && age < 50) score += 1;
  else if (age >= 50 && age < 60) score += 2;
  else if (age >= 60) score += 3;

  if (bmi >= 25 && bmi < 30) {
    score += 1;
    advice.push('Your BMI is in the overweight range. Standard weight reduction of 5-10% lowers risk significantly.');
  } else if (bmi >= 30 && bmi < 35) {
    score += 2;
    advice.push('BMI indicates Class 1 obesity. Consider joining a structured nutrition and weight loss program.');
  } else if (bmi >= 35) {
    score += 3;
    advice.push('High BMI range. Consulting an endocrinologist or certified dietitian is highly recommended.');
  }

  if (familyHistory) {
    score += 2;
    advice.push('A first-degree relative has diabetes. You have a genetic predisposition; request annual HbA1c tests.');
  }

  if (activityLevel === 'sedentary') {
    score += 1;
    advice.push('Sedentary lifestyle increases insulin resistance. Strive for 150 minutes of active exercise weekly.');
  }

  if (bloodPressure === 'high') {
    score += 1;
    advice.push('High blood pressure is linked to insulin resistance. Practice stress relief and monitor BP.');
  }

  if (smoking === 'current') {
    advice.push('Active smokers are 30–40% more likely to develop type 2 diabetes than non-smokers. Strive to quit.');
  }

  let riskCategory = 'Low Risk';
  if (score >= 5) riskCategory = 'High Risk';
  else if (score >= 3) riskCategory = 'Increased Risk';

  if (advice.length === 0) {
    advice.push('Your risk factors are low. Keep up the balanced diet and active lifestyle!');
  }

  return {
    score,
    maxScore: 10,
    riskCategory,
    advice
  };
}

const calculators = {
  bmi: calcBMI,
  bmr: calcBMR,
  body_fat: calcBodyFat,
  calorie: calcCalories,
  ideal_weight: calcIdealWeight,
  water_intake: calcWaterIntake,
  period_tracker: calcPeriod,
  pregnancy_tracker: calcPregnancy,
  heart_health: calcHeartHealth,
  diabetes_risk: calcDiabetesRisk
};

// Run a calculation and save to history
export const calculate = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const { type, inputs } = req.body;
  if (!type || !inputs) throw new AppError('Calculator type and inputs are required', 400);
  if (!calculators[type]) throw new AppError(`Invalid calculator type: ${type}`, 400);

  let outputs, resultSummary;

  switch (type) {
    case 'bmi': {
      outputs = calcBMI(inputs.weight, inputs.height);
      resultSummary = `BMI: ${outputs.bmi} (${outputs.category})`;
      break;
    }
    case 'bmr': {
      outputs = calcBMR(inputs.weight, inputs.height, inputs.age, inputs.gender);
      resultSummary = `BMR: ${outputs.bmr} ${outputs.unit}`;
      break;
    }
    case 'body_fat': {
      outputs = calcBodyFat(inputs.waist, inputs.neck, inputs.height, inputs.hip, inputs.gender);
      resultSummary = `Body Fat: ${outputs.bodyFatPercentage}% (${outputs.category})`;
      break;
    }
    case 'calorie': {
      outputs = calcCalories(inputs.weight, inputs.height, inputs.age, inputs.gender, inputs.activityLevel);
      resultSummary = `Maintenance: ${outputs.maintenance} kcal/day`;
      break;
    }
    case 'ideal_weight': {
      outputs = calcIdealWeight(inputs.height, inputs.gender);
      resultSummary = `Ideal Weight: ${outputs.idealWeight} kg (${outputs.range.min}-${outputs.range.max} kg)`;
      break;
    }
    case 'water_intake': {
      outputs = calcWaterIntake(inputs.weight, inputs.activityLevel);
      resultSummary = `Water Intake: ${outputs.liters}L / ${outputs.glasses} glasses per day`;
      break;
    }
    case 'period_tracker': {
      outputs = calcPeriod(inputs.lastPeriodDate, inputs.cycleLength, inputs.periodLength);
      resultSummary = `Predicted Next Period: ${outputs.predictedNextPeriod}`;
      break;
    }
    case 'pregnancy_tracker': {
      outputs = calcPregnancy(inputs.lastPeriodDate);
      resultSummary = `Week ${outputs.currentWeek} (${outputs.trimester} Trimester) · Due: ${outputs.dueDate}`;
      break;
    }
    case 'heart_health': {
      outputs = calcHeartHealth(inputs.restingHeartRate, inputs.systolicBP, inputs.diastolicBP, inputs.cholesterol, inputs.isSmoker, inputs.age, inputs.gender);
      resultSummary = `Heart Score: ${outputs.heartScore}/100 (${outputs.riskLevel})`;
      break;
    }
    case 'diabetes_risk': {
      outputs = calcDiabetesRisk(inputs.age, inputs.bmi, inputs.familyHistory, inputs.activityLevel, inputs.smoking, inputs.bloodPressure);
      resultSummary = `Diabetes Risk: ${outputs.score}/10 (${outputs.riskCategory})`;
      break;
    }
  }

  const record = await HealthCalculatorHistory.create({
    patient: patient._id,
    calculatorType: type,
    inputs,
    outputs,
    resultSummary,
  });

  res.status(201).json({ success: true, data: { ...record.toObject(), outputs, resultSummary } });
});

// Get calculator history
export const getHistory = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const filter = { patient: patient._id };
  if (req.query.type) filter.calculatorType = req.query.type;

  const history = await HealthCalculatorHistory.find(filter).sort('-createdAt').limit(parseInt(req.query.limit) || 20);

  res.json({ success: true, data: history });
});
