import { Patient } from '../models/Patient.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { HealthForecast } from '../models/HealthForecast.js';

export const generateForecastForUser = async (userId) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) return null;

  const assessments = await HealthAssessment.find({ patient: patient._id }).sort('createdAt');
  const latestAssessment = assessments[assessments.length - 1];

  let currentScore = latestAssessment?.healthScore || 75;
  let dailyRate = 0.0;
  let hasHistory = assessments.length >= 2;

  if (hasHistory) {
    // Perform simple linear regression on historical scores
    const dataPoints = assessments.map(a => ({
      time: new Date(a.createdAt).getTime(),
      score: a.healthScore
    }));
    
    const startTime = dataPoints[0].time;
    const xValues = dataPoints.map(p => (p.time - startTime) / (1000 * 60 * 60 * 24)); // days
    const yValues = dataPoints.map(p => p.score);

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = dataPoints.length;
    for (let i = 0; i < n; i++) {
      sumX += xValues[i];
      sumY += yValues[i];
      sumXY += xValues[i] * yValues[i];
      sumXX += xValues[i] * xValues[i];
    }

    const denominator = (n * sumXX - sumX * sumX);
    dailyRate = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    
    // Dampen extreme slopes
    dailyRate = Math.max(-0.5, Math.min(0.5, dailyRate));
  } else if (latestAssessment) {
    // Rule-based daily factor from single assessment
    const answers = latestAssessment.answers || {};
    
    // Positive drivers
    if (answers.exercise === 'active') dailyRate += 0.08;
    else if (answers.exercise === 'occasional') dailyRate += 0.03;
    if (answers.sleep >= 7 && answers.sleep <= 9) dailyRate += 0.05;
    if (answers.stress === 'low') dailyRate += 0.04;

    // Negative drivers
    if (answers.smoking === 'heavy') dailyRate -= 0.12;
    else if (answers.smoking === 'light') dailyRate -= 0.06;
    if (answers.alcohol === 'regular') dailyRate -= 0.07;
    if (answers.exercise === 'none') dailyRate -= 0.08;
    if (answers.sleep < 6) dailyRate -= 0.06;
    if (answers.stress === 'high') dailyRate -= 0.08;
    if (answers.diabetes) dailyRate -= 0.05;
    if (answers.bloodPressure === 'stage2') dailyRate -= 0.08;
    else if (answers.bloodPressure === 'stage1') dailyRate -= 0.04;
  }

  const daysProjections = [7, 30, 90];
  const forecasts = daysProjections.map(days => {
    let projectedScore = currentScore + (dailyRate * days);
    projectedScore = Math.max(15, Math.min(99, Math.round(projectedScore)));

    const change = projectedScore - currentScore;
    let description = '';
    const potentialRisks = [];
    const projectedImprovements = [];

    if (change > 0) {
      description = `Your health trajectory shows positive growth. Continuing your current health habits is projected to improve your wellness profile by ${Math.abs(change)} points.`;
      projectedImprovements.push('Increased systemic cardiovascular efficiency');
      projectedImprovements.push('Optimized biological age indicators');
      projectedImprovements.push('Higher physical stability index');
    } else if (change < 0) {
      description = `Your trajectory is indicating a decline of ${Math.abs(change)} points. Addressing critical lifestyle factors (like stress, diet, or sleep) could reverse this trend.`;
      potentialRisks.push('Risk of metabolic syndromic progression');
      potentialRisks.push('Vulnerabilities to elevated blood pressure');
      potentialRisks.push('Declining sleep recovery metrics');
      projectedImprovements.push('Potential to restore baseline metrics with intervention');
    } else {
      description = 'Your health trajectory is stable. Maintaining your current routine will support a consistent health score.';
      projectedImprovements.push('Sustained standard physical stamina');
      projectedImprovements.push('Stable metabolic rate');
    }

    return {
      days,
      score: projectedScore,
      description,
      potentialRisks,
      projectedImprovements
    };
  });

  // Save to database
  await HealthForecast.deleteMany({ userId });
  const savedForecast = await HealthForecast.create({
    userId,
    forecasts
  });

  return savedForecast;
};
