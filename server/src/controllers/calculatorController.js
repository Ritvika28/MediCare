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

const calculators = { bmi: calcBMI, bmr: calcBMR, body_fat: calcBodyFat, calorie: calcCalories, ideal_weight: calcIdealWeight, water_intake: calcWaterIntake };

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
