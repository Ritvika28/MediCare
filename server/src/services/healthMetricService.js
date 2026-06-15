import { HealthMetric } from '../models/HealthMetric.js';

function extractValue(type, outputs) {
  const map = {
    bmi: outputs.bmi,
    bmr: outputs.bmr,
    body_fat: outputs.bodyFatPercentage,
    calorie: outputs.maintenance,
    ideal_weight: outputs.idealWeight,
    water_intake: outputs.liters,
    heart_health: outputs.heartScore,
    diabetes_risk: outputs.score,
    blood_pressure: outputs.systolic,
    blood_sugar: outputs.value,
    cholesterol: outputs.total,
    kidney_health: outputs.egfr,
    liver_health: outputs.fib4Score,
    stress_assessment: outputs.totalScore,
    pcos_risk: outputs.score,
    sleep_assessment: outputs.sleepScore,
    period_tracker: outputs.cycleLength,
    pregnancy_tracker: outputs.currentWeek,
  };
  return map[type] ?? null;
}

function extractScore(type, outputs) {
  if (outputs.sleepScore != null) return outputs.sleepScore;
  if (outputs.heartScore != null) return outputs.heartScore;
  if (outputs.totalScore != null) return outputs.totalScore;
  if (outputs.score != null) return outputs.score;
  if (outputs.bmi != null) return outputs.bmi;
  if (outputs.egfr != null) return outputs.egfr;
  return null;
}

function extractRiskLevel(outputs) {
  return outputs.status || outputs.category || outputs.classification || outputs.level
    || outputs.riskLevel || outputs.riskCategory || outputs.stage || outputs.heartRisk
    || outputs.fibrosisRisk || outputs.kidneyFailureRisk || null;
}

export async function saveHealthMetric({ userId, patientId, metricType, inputs, outputs, resultSummary, historyId }) {
  const metric = await HealthMetric.create({
    userId,
    patientId,
    metricType,
    value: extractValue(metricType, outputs),
    score: extractScore(metricType, outputs),
    riskLevel: extractRiskLevel(outputs),
    metadata: {
      inputs,
      outputs,
      resultSummary,
      recommendations: outputs.recommendations || outputs.advice || [],
      historyId,
    },
  });
  return metric;
}

export async function getLatestMetrics(patientId, types) {
  const metrics = {};
  for (const type of types) {
    const latest = await HealthMetric.findOne({ patientId, metricType: type }).sort('-createdAt');
    if (latest) metrics[type] = latest;
  }
  return metrics;
}

export async function getMetricsInRange(patientId, metricType, days) {
  const filter = { patientId };
  if (metricType) filter.metricType = metricType;
  if (days && days !== 'all') {
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));
    filter.createdAt = { $gte: since };
  }
  return HealthMetric.find(filter).sort('createdAt');
}
