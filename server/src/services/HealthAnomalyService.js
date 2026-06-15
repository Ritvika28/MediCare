import { Patient } from '../models/Patient.js';
import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';
import { HealthAnomaly } from '../models/HealthAnomaly.js';
import { createNotification } from './notificationService.js';

export const detectAnomaliesForUser = async (userId) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) return [];

  // Get last 20 calculator records to detect trends
  const history = await HealthCalculatorHistory.find({ patient: patient._id })
    .sort('-createdAt')
    .limit(50);

  if (history.length < 2) return [];

  const byType = {};
  history.forEach((h) => {
    if (!byType[h.calculatorType]) byType[h.calculatorType] = [];
    byType[h.calculatorType].push(h);
  });

  const anomaliesToCreate = [];

  // Helper to check if anomaly was already raised recently (within 24h)
  const isDuplicateAnomaly = async (metricType, anomalyType) => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await HealthAnomaly.findOne({
      userId,
      metricType,
      anomalyType,
      createdAt: { $gte: oneDayAgo }
    });
    return !!existing;
  };

  // 1. Blood Pressure Jumps
  const bpHistory = byType.blood_pressure || [];
  if (bpHistory.length >= 2) {
    const latest = bpHistory[0];
    const prev = bpHistory[1];
    const sysDiff = latest.outputs?.systolic - prev.outputs?.systolic;
    const diaDiff = latest.outputs?.diastolic - prev.outputs?.diastolic;

    if (sysDiff >= 20 || diaDiff >= 15) {
      const isDup = await isDuplicateAnomaly('blood_pressure', 'sudden_increase');
      if (!isDup) {
        anomaliesToCreate.push({
          metricType: 'blood_pressure',
          anomalyType: 'sudden_increase',
          value: { systolic: latest.outputs?.systolic, diastolic: latest.outputs?.diastolic },
          previousValue: { systolic: prev.outputs?.systolic, diastolic: prev.outputs?.diastolic },
          deviation: sysDiff,
          severity: 'severe',
          message: `🚨 Blood pressure increasing unusually: jumped from ${prev.outputs?.systolic}/${prev.outputs?.diastolic} to ${latest.outputs?.systolic}/${latest.outputs?.diastolic} mmHg.`
        });
      }
    }
  }

  // 2. Blood Sugar Spikes
  const sugarHistory = byType.blood_sugar || [];
  if (sugarHistory.length >= 2) {
    const latest = sugarHistory[0];
    const prev = sugarHistory[1];
    const sugarVal = latest.outputs?.value;
    const prevVal = prev.outputs?.value;

    if (sugarVal > 140 && sugarVal >= prevVal * 1.35) {
      const isDup = await isDuplicateAnomaly('blood_sugar', 'spike');
      if (!isDup) {
        anomaliesToCreate.push({
          metricType: 'blood_sugar',
          anomalyType: 'spike',
          value: sugarVal,
          previousValue: prevVal,
          deviation: sugarVal - prevVal,
          severity: 'severe',
          message: `🚨 Blood sugar spike detected: rose sharply from ${prevVal} to ${sugarVal} mg/dL.`
        });
      }
    }
  }

  // 3. Sleep Collapse
  const sleepHistory = byType.sleep_assessment || [];
  if (sleepHistory.length >= 2) {
    const latest = sleepHistory[0];
    const prev = sleepHistory[1];
    const scoreDiff = prev.outputs?.sleepScore - latest.outputs?.sleepScore;

    if (scoreDiff >= 20) {
      const isDup = await isDuplicateAnomaly('sleep', 'sleep_collapse');
      if (!isDup) {
        anomaliesToCreate.push({
          metricType: 'sleep',
          anomalyType: 'sleep_collapse',
          value: latest.outputs?.sleepScore,
          previousValue: prev.outputs?.sleepScore,
          deviation: scoreDiff,
          severity: 'moderate',
          message: `🚨 Sleep quality declined sharply: score dropped by ${scoreDiff} points to ${latest.outputs?.sleepScore}/100.`
        });
      }
    }
  }

  // 4. Stress Spikes
  const stressHistory = byType.stress_assessment || [];
  if (stressHistory.length >= 2) {
    const latest = stressHistory[0];
    const prev = stressHistory[1];
    const scoreDiff = latest.outputs?.totalScore - prev.outputs?.totalScore;

    if (scoreDiff >= 6 || (prev.outputs?.level !== 'high' && latest.outputs?.level === 'high')) {
      const isDup = await isDuplicateAnomaly('stress', 'stress_spike');
      if (!isDup) {
        anomaliesToCreate.push({
          metricType: 'stress',
          anomalyType: 'stress_spike',
          value: latest.outputs?.level,
          previousValue: prev.outputs?.level,
          deviation: scoreDiff,
          severity: 'moderate',
          message: `🚨 Stress spike detected: perceived stress levels rose sharply to "${latest.outputs?.level}" (Score: ${latest.outputs?.totalScore}).`
        });
      }
    }
  }

  // 5. Low Hydration Streaks
  const waterHistory = byType.water_intake || [];
  if (waterHistory.length >= 3) {
    const recentLogs = waterHistory.slice(0, 3);
    const allLow = recentLogs.every(w => {
      const l = w.inputs?.amountMl ? w.inputs.amountMl / 1000 : (w.outputs?.liters || 0);
      return l < 1.2;
    });

    if (allLow) {
      const isDup = await isDuplicateAnomaly('hydration', 'low_streak');
      if (!isDup) {
        anomaliesToCreate.push({
          metricType: 'hydration',
          anomalyType: 'low_streak',
          value: waterHistory[0].outputs?.liters || (waterHistory[0].inputs?.amountMl / 1000),
          previousValue: null,
          deviation: null,
          severity: 'mild',
          message: '🚨 Hydration streak alert: water intake has been under 1.2L for 3 consecutive logs.'
        });
      }
    }
  }

  // 6. Rapid BMI Changes
  const bmiHistory = byType.bmi || [];
  if (bmiHistory.length >= 2) {
    const latest = bmiHistory[0];
    const oldest = bmiHistory[bmiHistory.length - 1];
    const bmiDiff = Math.abs(latest.outputs?.bmi - oldest.outputs?.bmi);
    
    // Check if difference is > 1.8 units within 30 days
    const timeDiffDays = (new Date(latest.createdAt) - new Date(oldest.createdAt)) / (1000 * 60 * 60 * 24);
    if (bmiDiff >= 1.8 && timeDiffDays <= 30) {
      const isDup = await isDuplicateAnomaly('bmi', 'rapid_change');
      if (!isDup) {
        anomaliesToCreate.push({
          metricType: 'bmi',
          anomalyType: 'rapid_change',
          value: latest.outputs?.bmi,
          previousValue: oldest.outputs?.bmi,
          deviation: bmiDiff,
          severity: 'moderate',
          message: `🚨 Rapid BMI change: shifted by ${bmiDiff.toFixed(1)} units in ${Math.round(timeDiffDays)} days.`
        });
      }
    }
  }

  // 7. Heart Risk Jumps
  const heartHistory = byType.heart_health || [];
  if (heartHistory.length >= 2) {
    const latest = heartHistory[0];
    const prev = heartHistory[1];
    const scoreDiff = prev.outputs?.heartScore - latest.outputs?.heartScore; // drop in heart score is a jump in risk

    if (scoreDiff >= 15) {
      const isDup = await isDuplicateAnomaly('heart_health', 'score_drop');
      if (!isDup) {
        anomaliesToCreate.push({
          metricType: 'heart_health',
          anomalyType: 'score_drop',
          value: latest.outputs?.heartScore,
          previousValue: prev.outputs?.heartScore,
          deviation: scoreDiff,
          severity: 'severe',
          message: `🚨 Cardiovascular fitness decline: heart health score dropped by ${scoreDiff} points to ${latest.outputs?.heartScore}.`
        });
      }
    }
  }

  const createdAnomalies = [];
  for (const anomaly of anomaliesToCreate) {
    const doc = await HealthAnomaly.create({ ...anomaly, userId });
    createdAnomalies.push(doc);

    // Create Notification
    await createNotification({
      userId,
      type: 'healthRisk',
      title: 'Health Anomaly Detected',
      message: anomaly.message,
      priority: anomaly.severity === 'severe' ? 'high' : 'medium',
      actionLink: '/patient/health-analytics'
    });
  }

  return createdAnomalies;
};
