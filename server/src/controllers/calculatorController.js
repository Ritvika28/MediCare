import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';
import { Patient } from '../models/Patient.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  runCalculator,
  buildResultSummary,
  logWater,
  CALCULATOR_TYPES,
} from '../services/healthCalculatorService.js';
import { getHealthAnalytics } from '../services/healthAnalyticsService.js';
import { saveHealthMetric } from '../services/healthMetricService.js';
import { generateAnalyticsNotifications } from '../services/notificationEngineService.js';
import { runMLSuiteForUser } from '../services/HealthTwinService.js';

export const calculate = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const { type, inputs } = req.body;
  if (!type || !inputs) throw new AppError('Calculator type and inputs are required', 400);
  if (!CALCULATOR_TYPES.includes(type)) throw new AppError(`Invalid calculator type: ${type}`, 400);

  let outputs;
  try {
    outputs = runCalculator(type, inputs);
  } catch (err) {
    throw new AppError(err.message || 'Calculation failed', 400);
  }

  const resultSummary = buildResultSummary(type, outputs);
  const record = await HealthCalculatorHistory.create({
    patient: patient._id,
    calculatorType: type,
    inputs,
    outputs,
    resultSummary,
    status: outputs.status || outputs.category || outputs.classification || outputs.level || outputs.riskLevel || outputs.riskCategory,
    recommendations: outputs.recommendations || outputs.advice || [],
  });

  await saveHealthMetric({
    userId: req.user._id,
    patientId: patient._id,
    metricType: type,
    inputs,
    outputs,
    resultSummary,
    historyId: record._id,
  });

  await generateAnalyticsNotifications(req.user._id, patient._id);
  runMLSuiteForUser(req.user._id).catch(err => console.error('Error running ML suite in calculatorController.calculate:', err));

  res.status(201).json({ success: true, data: { ...record.toObject(), outputs, resultSummary } });
});

export const logEntry = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const { calculatorType, inputs } = req.body;
  if (calculatorType !== 'water_intake') throw new AppError('Direct logging only supported for water_intake', 400);

  const amountMl = parseFloat(inputs?.amountMl || inputs?.amount || 0);
  if (!amountMl || amountMl <= 0) throw new AppError('Valid amount in ml is required', 400);

  const outputs = logWater(amountMl);
  const resultSummary = `Logged ${amountMl}ml water (${outputs.liters}L)`;

  const record = await HealthCalculatorHistory.create({
    patient: patient._id,
    calculatorType: 'water_intake',
    inputs: { amountMl },
    outputs,
    resultSummary,
    status: 'Logged',
    recommendations: outputs.recommendations,
  });

  await saveHealthMetric({
    userId: req.user._id,
    patientId: patient._id,
    metricType: 'water_intake',
    inputs: { amountMl },
    outputs,
    resultSummary,
    historyId: record._id,
  });

  runMLSuiteForUser(req.user._id).catch(err => console.error('Error running ML suite in calculatorController.logEntry:', err));

  res.status(201).json({ success: true, data: record });
});

export const getHistory = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const filter = { patient: patient._id };
  if (req.query.type) filter.calculatorType = req.query.type;

  const history = await HealthCalculatorHistory.find(filter)
    .sort('-createdAt')
    .limit(parseInt(req.query.limit, 10) || 50);

  res.json({ success: true, data: history });
});

export const deleteHistory = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const record = await HealthCalculatorHistory.findOneAndDelete({
    _id: req.params.id,
    patient: patient._id,
  });
  if (!record) throw new AppError('Record not found', 404);

  res.json({ success: true, message: 'Record deleted' });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const analytics = await getHealthAnalytics(patient._id, patient, {
    range: req.query.range || 'all',
  });
  res.json({ success: true, data: analytics });
});
