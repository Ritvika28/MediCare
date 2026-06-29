import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';
import { HealthMetric } from '../models/HealthMetric.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { Prescription } from '../models/Prescription.js';
import { calculateHealthScore } from './healthScoreService.js';

const METRIC_LABELS = {
  bmi: 'BMI',
  bmr: 'BMR',
  body_fat: 'Body Fat',
  calorie: 'Calorie Needs',
  ideal_weight: 'Ideal Weight',
  water_intake: 'Water Intake',
  period_tracker: 'Period Tracker',
  pregnancy_tracker: 'Pregnancy Tracker',
  heart_health: 'Heart Health',
  diabetes_risk: 'Diabetes Risk',
  blood_pressure: 'Blood Pressure',
  blood_sugar: 'Blood Sugar',
  cholesterol: 'Cholesterol',
  kidney_health: 'Kidney Health',
  liver_health: 'Liver Health',
  stress_assessment: 'Stress Assessment',
  pcos_risk: 'PCOS Risk',
  sleep_assessment: 'Sleep Assessment',
};

const SUMMARY_METRICS = [
  'bmi', 'blood_pressure', 'blood_sugar', 'water_intake', 'sleep_assessment',
  'stress_assessment', 'heart_health', 'diabetes_risk', 'kidney_health',
  'liver_health', 'cholesterol', 'pcos_risk',
];

function riskToScore(status) {
  if (!status) return 50;
  const s = String(status).toLowerCase();
  if (s.includes('normal') || s.includes('low') || s.includes('excellent') || s.includes('good')) return 20;
  if (s.includes('elevated') || s.includes('moderate') || s.includes('prediabetes') || s.includes('fair') || s.includes('borderline') || s.includes('intermediate') || s.includes('mild')) return 55;
  if (s.includes('high') || s.includes('severe') || s.includes('poor') || s.includes('crisis') || s.includes('diabetes') || s.includes('obese') || s.includes('stage 2')) return 85;
  if (s.includes('stage 1') || s.includes('overweight') || s.includes('increased')) return 65;
  return 45;
}

function extractNumericTrend(records, extractFn) {
  return records
    .slice()
    .reverse()
    .map((r) => ({
      date: r.createdAt,
      value: extractFn(r),
      status: r.outputs?.status || r.outputs?.category || r.outputs?.classification || r.outputs?.level,
    }))
    .filter((d) => d.value != null && !Number.isNaN(d.value));
}

function pctChange(current, previous) {
  if (previous == null || previous === 0) return null;
  return parseFloat((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

export function buildInsights(history, todayStr) {
  const insights = [];
  const byType = {};
  history.forEach((h) => {
    if (!byType[h.calculatorType]) byType[h.calculatorType] = [];
    byType[h.calculatorType].push(h);
  });

  const bp = byType.blood_pressure || [];
  if (bp.length >= 2) {
    const latest = bp[0].outputs?.systolic;
    const prev = bp[1].outputs?.systolic;
    const change = pctChange(latest, prev);
    if (change != null) {
      if (change < -2) insights.push({ type: 'improvement', metric: 'Blood Pressure', message: `Your blood pressure improved by ${Math.abs(change)}% since last reading.` });
      else if (change > 2) insights.push({ type: 'attention', metric: 'Blood Pressure', message: `Your blood pressure increased by ${change}% since last reading.` });
      else insights.push({ type: 'stable', metric: 'Blood Pressure', message: 'Blood pressure remained stable between readings.' });
    }
  }

  const bmi = byType.bmi || [];
  if (bmi.length >= 2) {
    const change = pctChange(bmi[0].outputs?.bmi, bmi[1].outputs?.bmi);
    if (change != null) {
      if (Math.abs(change) < 2) insights.push({ type: 'stable', metric: 'BMI', message: 'BMI remained stable.' });
      else if (change < 0) insights.push({ type: 'improvement', metric: 'BMI', message: `BMI decreased by ${Math.abs(change)}% — positive trend if intentional.` });
      else insights.push({ type: 'attention', metric: 'BMI', message: `BMI increased by ${change}%. Monitor diet and activity.` });
    }
  }

  const waterToday = (byType.water_intake || []).filter((w) => new Date(w.createdAt).toISOString().split('T')[0] === todayStr);
  const waterYesterday = (byType.water_intake || []).filter((w) => {
    const d = new Date(todayStr);
    d.setDate(d.getDate() - 1);
    return new Date(w.createdAt).toISOString().split('T')[0] === d.toISOString().split('T')[0];
  });
  const todayLiters = waterToday.reduce((a, w) => a + (w.inputs?.amountMl ? w.inputs.amountMl / 1000 : w.outputs?.liters || 0), 0);
  const yesterdayLiters = waterYesterday.reduce((a, w) => a + (w.inputs?.amountMl ? w.inputs.amountMl / 1000 : w.outputs?.liters || 0), 0);
  if (todayLiters > 0 && yesterdayLiters > 0) {
    const change = pctChange(todayLiters, yesterdayLiters);
    if (change != null && change < -10) insights.push({ type: 'attention', metric: 'Hydration', message: `Water intake decreased by ${Math.abs(change)}% compared to yesterday.` });
    else if (change != null && change > 10) insights.push({ type: 'improvement', metric: 'Hydration', message: `Water intake increased by ${change}% compared to yesterday.` });
  }

  const sleep = byType.sleep_assessment || [];
  if (sleep.length >= 2) {
    const change = sleep[0].outputs?.sleepScore - sleep[1].outputs?.sleepScore;
    if (change > 5) insights.push({ type: 'improvement', metric: 'Sleep', message: 'Sleep quality has improved since your last assessment.' });
    else if (change < -5) insights.push({ type: 'attention', metric: 'Sleep', message: 'Sleep score declined — review sleep hygiene habits.' });
  }

  const sugar = byType.blood_sugar || [];
  if (sugar.length >= 2 && sugar[0].outputs?.value != null && sugar[1].outputs?.value != null) {
    const change = pctChange(sugar[0].outputs.value, sugar[1].outputs.value);
    if (change != null && Math.abs(change) > 5) {
      insights.push({
        type: change < 0 ? 'improvement' : 'attention',
        metric: 'Blood Sugar',
        message: `Blood sugar ${change < 0 ? 'decreased' : 'increased'} by ${Math.abs(change)}% since last test.`,
      });
    }
  }

  return insights;
}

export function buildProgress(history) {
  const progress = [];
  const types = ['bmi', 'blood_pressure', 'blood_sugar', 'sleep_assessment', 'heart_health', 'diabetes_risk', 'stress_assessment'];
  types.forEach((type) => {
    const records = history.filter((h) => h.calculatorType === type);
    if (records.length < 2) return;
    const latest = records[0];
    const prev = records[1];
    let trend = 'stable';
    const extract = {
      bmi: (r) => r.outputs?.bmi,
      blood_pressure: (r) => r.outputs?.systolic,
      blood_sugar: (r) => r.outputs?.value,
      sleep_assessment: (r) => r.outputs?.sleepScore,
      heart_health: (r) => r.outputs?.heartScore,
      diabetes_risk: (r) => r.outputs?.score,
      stress_assessment: (r) => r.outputs?.totalScore,
    };
    const curr = extract[type]?.(latest);
    const previous = extract[type]?.(prev);
    if (curr == null || previous == null) return;
    const lowerIsBetter = ['bmi', 'blood_pressure', 'blood_sugar', 'diabetes_risk', 'stress_assessment'].includes(type);
    const diff = curr - previous;
    if (Math.abs(diff) < (type === 'bmi' ? 0.3 : type === 'blood_pressure' ? 3 : 2)) trend = 'stable';
    else if (lowerIsBetter) trend = diff < 0 ? 'improved' : 'declined';
    else trend = diff > 0 ? 'improved' : 'declined';
    progress.push({ metric: METRIC_LABELS[type] || type, trend, latest: curr, previous, updatedAt: latest.createdAt });
  });
  return progress;
}

export function buildMonthlyReport(history, assessments, patient) {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthRecords = history.filter((h) => new Date(h.createdAt) >= monthAgo);
  const improvements = [];
  const attention = [];
  const riskIndicators = [];

  monthRecords.forEach((r) => {
    const status = r.outputs?.status || r.outputs?.classification || r.outputs?.level || r.outputs?.riskLevel || r.outputs?.riskCategory;
    if (status && /high|severe|crisis|diabetes|stage 2|poor/i.test(String(status))) {
      riskIndicators.push({ metric: METRIC_LABELS[r.calculatorType], status, date: r.createdAt });
    }
  });

  const progress = buildProgress(history);
  progress.forEach((p) => {
    if (p.trend === 'improved') improvements.push(`${p.metric} improved (${p.previous} → ${p.latest})`);
    if (p.trend === 'declined') attention.push(`${p.metric} declined (${p.previous} → ${p.latest})`);
  });

  const healthScore = calculateHealthScore(patient, []);
  const assessment = assessments[0];
  const compositeScore = Math.round(
    (healthScore + (assessment ? 100 - (assessment.riskScore || 30) : 70)) / 2
  );

  return {
    healthScore: compositeScore,
    assessmentsThisMonth: monthRecords.length,
    riskIndicators,
    improvements,
    areasNeedingAttention: attention,
    upcomingReminders: [
      monthRecords.find((r) => r.calculatorType === 'blood_pressure') ? null : 'Log blood pressure reading',
      monthRecords.find((r) => r.calculatorType === 'blood_sugar') ? null : 'Check blood sugar levels',
      'Schedule annual health checkup',
    ].filter(Boolean),
  };
}

export function buildRadarData(history) {
  const latest = {};
  history.forEach((h) => {
    if (!latest[h.calculatorType]) latest[h.calculatorType] = h;
  });
  const axes = [
    { key: 'heart_health', label: 'Heart', score: () => latest.heart_health ? 100 - riskToScore(latest.heart_health.outputs?.riskLevel) : null },
    { key: 'diabetes_risk', label: 'Diabetes', score: () => latest.diabetes_risk ? Math.max(0, 100 - (latest.diabetes_risk.outputs?.score || 0) * 10) : null },
    { key: 'kidney_health', label: 'Kidney', score: () => latest.kidney_health ? 100 - riskToScore(latest.kidney_health.outputs?.stage) : null },
    { key: 'liver_health', label: 'Liver', score: () => latest.liver_health ? 100 - riskToScore(latest.liver_health.outputs?.fibrosisRisk) : null },
    { key: 'stress_assessment', label: 'Stress', score: () => latest.stress_assessment ? 100 - riskToScore(latest.stress_assessment.outputs?.level) : null },
    { key: 'sleep_assessment', label: 'Sleep', score: () => latest.sleep_assessment?.outputs?.sleepScore ?? null },
    { key: 'bmi', label: 'BMI', score: () => {
      const b = latest.bmi?.outputs?.bmi;
      if (b == null) return null;
      if (b >= 18.5 && b < 25) return 90;
      if (b >= 17 && b < 30) return 60;
      return 35;
    }},
    { key: 'blood_pressure', label: 'BP', score: () => latest.blood_pressure ? 100 - riskToScore(latest.blood_pressure.outputs?.classification) : null },
  ];
  return axes.map((a) => ({ subject: a.label, score: a.score() ?? 0, fullMark: 100 }));
}

export function buildTrendCharts(history) {
  const byType = (type) => history.filter((h) => h.calculatorType === type);
  return {
    bmi: extractNumericTrend(byType('bmi'), (r) => r.outputs?.bmi),
    bloodPressure: byType('blood_pressure').slice().reverse().map((r) => ({
      date: r.createdAt,
      systolic: r.outputs?.systolic,
      diastolic: r.outputs?.diastolic,
    })),
    bloodSugar: extractNumericTrend(byType('blood_sugar'), (r) => r.outputs?.value),
    waterIntake: byType('water_intake').slice().reverse().map((r) => ({
      date: r.createdAt,
      liters: r.inputs?.amountMl ? r.inputs.amountMl / 1000 : r.outputs?.liters,
    })),
    sleep: extractNumericTrend(byType('sleep_assessment'), (r) => r.outputs?.sleepScore),
    heartRisk: extractNumericTrend(byType('heart_health'), (r) => r.outputs?.heartScore),
    diabetesRisk: extractNumericTrend(byType('diabetes_risk'), (r) => r.outputs?.score),
    stress: extractNumericTrend(byType('stress_assessment'), (r) => r.outputs?.totalScore),
    kidney: extractNumericTrend(byType('kidney_health'), (r) => r.outputs?.egfr),
    liver: extractNumericTrend(byType('liver_health'), (r) => r.outputs?.fib4Score),
    cholesterol: extractNumericTrend(byType('cholesterol'), (r) => r.outputs?.total),
  };
}

export function buildSummaryCards(history) {
  const latest = {};
  history.forEach((h) => {
    if (!latest[h.calculatorType]) latest[h.calculatorType] = h;
  });
  return SUMMARY_METRICS.map((type) => {
    const rec = latest[type];
    if (!rec) return { type, label: METRIC_LABELS[type], status: null, lastUpdated: null, summary: null };
    return {
      type,
      label: METRIC_LABELS[type],
      status: rec.outputs?.status || rec.outputs?.category || rec.outputs?.classification || rec.outputs?.level || rec.outputs?.riskLevel || rec.outputs?.riskCategory || rec.outputs?.stage,
      lastUpdated: rec.createdAt,
      summary: rec.resultSummary,
      outputs: rec.outputs,
    };
  }).filter((c) => c.lastUpdated || SUMMARY_METRICS.includes(c.type));
}

export async function buildHealthTimeline(patientId, limit = 50) {
  const [calcHistory, assessments, records, prescriptions] = await Promise.all([
    HealthCalculatorHistory.find({ patient: patientId }).sort('-createdAt').limit(limit),
    HealthAssessment.find({ patient: patientId }).sort('-createdAt').limit(10),
    MedicalRecord.find({ patient: patientId }).sort('-recordDate').limit(10),
    Prescription.find({ patient: patientId }).sort('-createdAt').limit(10)
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } }),
  ]);

  const timeline = [];

  calcHistory.forEach((c) => {
    timeline.push({
      id: `calc-${c._id}`,
      type: 'calculator',
      calculatorType: c.calculatorType,
      title: `${METRIC_LABELS[c.calculatorType] || c.calculatorType} updated`,
      subtitle: c.resultSummary,
      date: c.createdAt,
      status: c.outputs?.status || c.outputs?.category || c.outputs?.classification || 'logged',
    });
  });

  assessments.forEach((a) => {
    timeline.push({
      id: `assess-${a._id}`,
      type: 'assessment',
      title: 'Health Risk Assessment completed',
      subtitle: `Health Score: ${a.healthScore}/100 · Risk: ${a.riskScore}%`,
      date: a.createdAt,
      status: a.riskScore < 30 ? 'low' : a.riskScore < 70 ? 'moderate' : 'high',
    });
  });

  records.forEach((r) => {
    timeline.push({
      id: `rec-${r._id}`,
      type: 'medical_record',
      title: `Medical record: ${r.title}`,
      subtitle: r.type || 'Document',
      date: r.recordDate || r.createdAt,
      status: 'completed',
    });
  });

  prescriptions.forEach((p) => {
    timeline.push({
      id: `rx-${p._id}`,
      type: 'prescription',
      title: `Prescription from Dr. ${p.doctor?.user?.firstName || ''} ${p.doctor?.user?.lastName || ''}`,
      subtitle: p.medicines?.map((m) => m.name).slice(0, 3).join(', ') || 'Medication',
      date: p.createdAt,
      status: 'active',
    });
  });

  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
  return timeline.slice(0, limit);
}

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: null };

function filterByRange(records, range) {
  const days = RANGE_DAYS[range];
  if (!days) return records;
  const since = new Date();
  since.setDate(since.getDate() - days);
  return records.filter((r) => new Date(r.createdAt) >= since);
}

export async function getHealthAnalytics(patientId, patient, options = {}) {
  const range = options.range || 'all';
  let history = await HealthCalculatorHistory.find({ patient: patientId }).sort('-createdAt').limit(500);
  history = filterByRange(history, range);

  const metrics = await HealthMetric.find({ patientId }).sort('-createdAt').limit(500);
  const filteredMetrics = filterByRange(metrics, range);
  const assessments = await HealthAssessment.find({ patient: patientId }).sort('-createdAt').limit(20);
  const todayStr = new Date().toISOString().split('T')[0];

  const latestByType = {};
  history.forEach((h) => {
    if (!latestByType[h.calculatorType]) latestByType[h.calculatorType] = h;
  });

  const todayWaterLogs = history.filter(
    (c) => c.calculatorType === 'water_intake' && new Date(c.createdAt).toISOString().split('T')[0] === todayStr
  );
  const waterIntake = todayWaterLogs.reduce(
    (acc, log) => acc + (log.inputs?.amountMl ? log.inputs.amountMl / 1000 : parseFloat(log.outputs?.liters || 0)),
    0
  );
  const waterTarget = latestByType.water_intake?.outputs?.liters || 3.0;

  const timeline = await buildHealthTimeline(patientId, 50);
  const progress = buildProgress(history);

  return {
    summaryCards: buildSummaryCards(history),
    trends: buildTrendCharts(history),
    timeline,
    insights: buildInsights(history, todayStr),
    progress,
    radar: buildRadarData(history),
    monthlyReport: buildMonthlyReport(history, assessments, patient),
    calendar: history.map((h) => ({
      date: new Date(h.createdAt).toISOString().split('T')[0],
      type: h.calculatorType,
      label: METRIC_LABELS[h.calculatorType],
      summary: h.resultSummary,
    })),
    range,
    scores: {
      healthScore: calculateHealthScore(patient, [], []),
      riskScore: assessments[0]?.riskScore ?? null,
      improvementScore: Math.min(100, progress.filter((p) => p.trend === 'improved').length * 15),
      trendScore: Math.min(100, history.length * 2),
    },
    metricsCount: filteredMetrics.length,
    latest: {
      bmi: latestByType.bmi?.outputs?.bmi ?? null,
      bloodPressure: latestByType.blood_pressure ? `${latestByType.blood_pressure.outputs.systolic}/${latestByType.blood_pressure.outputs.diastolic}` : null,
      bloodPressureStatus: latestByType.blood_pressure?.outputs?.classification ?? null,
      bloodSugar: latestByType.blood_sugar?.outputs?.value ?? null,
      bloodSugarStatus: latestByType.blood_sugar?.outputs?.classification ?? null,
      sleepScore: latestByType.sleep_assessment?.outputs?.sleepScore ?? null,
      sleepStatus: latestByType.sleep_assessment?.outputs?.level ?? null,
      stressLevel: latestByType.stress_assessment?.outputs?.level ?? null,
      heartScore: latestByType.heart_health?.outputs?.heartScore ?? null,
      waterIntake,
      waterTarget,
      calories: latestByType.calorie?.outputs?.maintenance ?? null,
    },
    historyCount: history.length,
  };
}

export function getLatestMetric(history, type) {
  return history.find((h) => h.calculatorType === type) || null;
}
