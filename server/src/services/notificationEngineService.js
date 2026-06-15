import { Notification } from '../models/Notification.js';
import { Reminder } from '../models/Reminder.js';
import { Patient } from '../models/Patient.js';
import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';
import { getHealthAnalytics } from './healthAnalyticsService.js';
import { getNearbyHealthcareSummary } from './nearbySummaryService.js';

const EMERGENCY_SYMPTOMS = [
  'chest pain', 'heart attack', 'stroke', 'severe bleeding', 'difficulty breathing',
  'shortness of breath', 'unconscious', 'poisoning', 'suicide', 'paralysis',
];

async function upsertNotification({ userId, dedupeKey, type, title, message, priority = 'medium', actionLink, metadata = {} }) {
  if (dedupeKey) {
    const existing = await Notification.findOne({
      user: userId,
      'metadata.dedupeKey': dedupeKey,
    });
    if (existing) return existing;
  }

  return Notification.create({
    user: userId,
    type,
    title,
    message,
    priority,
    actionLink,
    link: actionLink,
    metadata: { ...metadata, dedupeKey },
  });
}

function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export async function generateMedicineNotifications(userId, patientId) {
  const reminders = await Reminder.find({ patient: patientId, isActive: true });
  const date = todayStr();
  const now = nowMinutes();
  const created = [];

  for (const reminder of reminders) {
    const start = new Date(reminder.startDate).toISOString().split('T')[0];
    const end = new Date(reminder.endDate).toISOString().split('T')[0];
    if (date < start || date > end) continue;

    for (const time of reminder.times) {
      const doseMin = parseTimeToMinutes(time);
      const taken = reminder.logs.some((l) => l.date === date && l.time === time && l.status === 'taken');

      if (!taken && doseMin - now <= 15 && doseMin - now > 0) {
        created.push(await upsertNotification({
          userId,
          dedupeKey: `medicine-upcoming-${reminder._id}-${date}-${time}`,
          type: 'medicine',
          title: 'Medicine Reminder',
          message: `Take ${reminder.medicineName} (${reminder.dosage}) at ${time}`,
          priority: 'high',
          actionLink: '/patient/medicine-reminder',
          metadata: { reminderId: reminder._id, time, medicineName: reminder.medicineName },
        }));
      }

      if (!taken && now - doseMin >= 30 && now - doseMin < 180) {
        created.push(await upsertNotification({
          userId,
          dedupeKey: `medicine-missed-${reminder._id}-${date}-${time}`,
          type: 'medicine',
          title: 'Missed Medicine Dose',
          message: `You missed ${reminder.medicineName} scheduled at ${time}`,
          priority: 'high',
          actionLink: '/patient/medicine-reminder',
          metadata: { reminderId: reminder._id, time, status: 'missed' },
        }));
      }

      if (taken) {
        created.push(await upsertNotification({
          userId,
          dedupeKey: `medicine-taken-${reminder._id}-${date}-${time}`,
          type: 'medicine',
          title: 'Medicine Logged',
          message: `${reminder.medicineName} dose at ${time} marked as taken`,
          priority: 'low',
          actionLink: '/patient/medicine-reminder',
          metadata: { reminderId: reminder._id, time, status: 'taken' },
        }));
      }
    }
  }

  return created.filter(Boolean);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function generatePeriodNotifications(userId, patientId) {
  const latest = await HealthCalculatorHistory.findOne({
    patient: patientId,
    calculatorType: 'period_tracker',
  }).sort('-createdAt');

  if (!latest?.inputs?.lastPeriodDate || !latest?.inputs?.cycleLength) return [];

  const lastPeriod = new Date(latest.inputs.lastPeriodDate);
  const cycleLength = parseInt(latest.inputs.cycleLength, 10) || 28;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextPeriod = addDays(lastPeriod, cycleLength);
  const ovulation = addDays(lastPeriod, cycleLength - 14);
  const fertileStart = addDays(ovulation, -2);
  const fertileEnd = addDays(ovulation, 2);

  const daysToPeriod = Math.round((nextPeriod - today) / 86400000);
  const created = [];

  if (daysToPeriod === 0) {
    created.push(await upsertNotification({
      userId,
      dedupeKey: `period-start-${todayStr()}`,
      type: 'period',
      title: 'Period Expected Today',
      message: 'Your cycle indicates your period may start today. Track symptoms in Health Calculators.',
      priority: 'medium',
      actionLink: '/patient/health-calculators',
    }));
  } else if (daysToPeriod > 0 && daysToPeriod <= 3) {
    created.push(await upsertNotification({
      userId,
      dedupeKey: `period-upcoming-${todayStr()}`,
      type: 'period',
      title: 'Period Approaching',
      message: `Your period is expected in ${daysToPeriod} day(s).`,
      priority: 'medium',
      actionLink: '/patient/health-calculators',
    }));
  }

  if (today >= fertileStart && today <= fertileEnd) {
    created.push(await upsertNotification({
      userId,
      dedupeKey: `period-fertile-${todayStr()}`,
      type: 'period',
      title: 'Fertility Window',
      message: 'You are in your estimated ovulation/fertility window based on your cycle data.',
      priority: 'low',
      actionLink: '/patient/health-calculators',
    }));
  }

  return created.filter(Boolean);
}

export async function generatePregnancyNotifications(userId, patientId) {
  const latest = await HealthCalculatorHistory.findOne({
    patient: patientId,
    calculatorType: 'pregnancy_tracker',
  }).sort('-createdAt');

  if (!latest?.outputs?.currentWeek) return [];

  const week = latest.outputs.currentWeek;
  const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  const created = [];

  created.push(await upsertNotification({
    userId,
    dedupeKey: `pregnancy-week-${week}-${todayStr()}`,
    type: 'pregnancy',
    title: `Pregnancy Week ${week}`,
    message: `You are in trimester ${trimester}. Review weekly milestones in the pregnancy tracker.`,
    priority: 'medium',
    actionLink: '/patient/health-calculators',
    metadata: { week, trimester },
  }));

  if ([12, 20, 28, 36].includes(week)) {
    created.push(await upsertNotification({
      userId,
      dedupeKey: `pregnancy-milestone-${week}`,
      type: 'pregnancy',
      title: 'Pregnancy Milestone',
      message: `Week ${week} milestone reached. Consider scheduling a prenatal check-up with your doctor.`,
      priority: 'high',
      actionLink: '/doctors',
      metadata: { week, milestone: true },
    }));
  }

  return created.filter(Boolean);
}

export async function generateAnalyticsNotifications(userId, patientId) {
  const patient = await Patient.findById(patientId);
  if (!patient) return [];

  const analytics = await getHealthAnalytics(patientId, patient, '30d');
  const created = [];

  for (const insight of analytics.insights || []) {
    const icon = insight.direction === 'up' ? 'increased' : insight.direction === 'down' ? 'improved' : 'stable';
    created.push(await upsertNotification({
      userId,
      dedupeKey: `analytics-${insight.metric}-${todayStr()}`,
      type: 'analytics',
      title: `${insight.metric} ${icon}`,
      message: insight.message,
      priority: insight.direction === 'up' && insight.metric?.toLowerCase().includes('risk') ? 'high' : 'medium',
      actionLink: '/patient/health-analytics',
      metadata: { metric: insight.metric, direction: insight.direction },
    }));
  }

  if (analytics.scores?.riskScore >= 70) {
    created.push(await upsertNotification({
      userId,
      dedupeKey: `health-risk-${todayStr()}`,
      type: 'healthRisk',
      title: 'Elevated Health Risk',
      message: `Your risk score is ${analytics.scores.riskScore}. Review your health analytics and take action.`,
      priority: 'high',
      actionLink: '/patient/health-risk-assessment',
    }));
  }

  const waterPct = analytics.latest?.waterIntake && analytics.latest?.waterTarget
    ? (analytics.latest.waterIntake / analytics.latest.waterTarget) * 100
    : 100;

  if (waterPct < 60) {
    created.push(await upsertNotification({
      userId,
      dedupeKey: `hydration-low-${todayStr()}`,
      type: 'analytics',
      title: 'Hydration Below Target',
      message: `Water intake is at ${Math.round(waterPct)}% of your daily target. Log water from your dashboard.`,
      priority: 'medium',
      actionLink: '/patient',
    }));
  }

  return created.filter(Boolean);
}

export async function generateDiscoveryNotifications(userId, latitude, longitude) {
  if (latitude == null || longitude == null) return [];

  const summary = await getNearbyHealthcareSummary(latitude, longitude, 50);
  const created = [];
  const date = todayStr();

  const items = [
    { key: 'hospitals', type: 'hospital', label: 'Hospitals', link: '/patient/hospitals' },
    { key: 'doctors', type: 'system', label: 'Doctors', link: '/doctors' },
    { key: 'labs', type: 'lab', label: 'Labs', link: '/patient/nearby-labs' },
    { key: 'bloodBanks', type: 'bloodBank', label: 'Blood Banks', link: '/patient/blood-banks' },
  ];

  for (const item of items) {
    const data = summary[item.key];
    if (!data?.count) continue;
    created.push(await upsertNotification({
      userId,
      dedupeKey: `discovery-${item.key}-${date}`,
      type: item.type,
      title: `Nearby ${item.label}`,
      message: `${data.count} ${item.label.toLowerCase()} within ${summary.radiusKm}km. Nearest: ${data.nearestName || 'available'} (${data.nearestDistance ?? '—'} km).`,
      priority: 'low',
      actionLink: item.link,
      metadata: { count: data.count, nearestDistance: data.nearestDistance },
    }));
  }

  return created.filter(Boolean);
}

export async function generateAINotification(userId, message, isEmergency = false) {
  if (!isEmergency) return null;

  return upsertNotification({
    userId,
    dedupeKey: `ai-emergency-${todayStr()}-${message.slice(0, 30)}`,
    type: 'aiAssistant',
    title: 'AI Health Alert',
    message: 'Potential emergency symptoms detected. Seek immediate medical help or use Emergency SOS.',
    priority: 'critical',
    actionLink: '/patient/emergency',
    metadata: { symptom: message.slice(0, 200) },
  });
}

export async function generateSOSNotifications(userId, eventType, metadata = {}) {
  const map = {
    sos_activated: {
      title: 'SOS Activated',
      message: 'Your emergency SOS request has been sent.',
      priority: 'critical',
    },
    contact_notified: {
      title: 'Emergency Contact Notified',
      message: metadata.contactName ? `${metadata.contactName} has been notified.` : 'Your emergency contact has been notified.',
      priority: 'critical',
    },
    location_shared: {
      title: 'Location Shared',
      message: 'Your GPS location was shared for emergency response.',
      priority: 'high',
    },
    hospital_found: {
      title: 'Nearest Emergency Hospital Found',
      message: metadata.hospitalName ? `Nearest trauma center: ${metadata.hospitalName}` : 'Nearest emergency hospital located.',
      priority: 'critical',
    },
  };

  const cfg = map[eventType];
  if (!cfg) return null;

  return upsertNotification({
    userId,
    dedupeKey: `sos-${eventType}-${Date.now()}`,
    type: 'emergency',
    title: cfg.title,
    message: cfg.message,
    priority: cfg.priority,
    actionLink: '/patient/emergency',
    metadata: { eventType, ...metadata },
  });
}

export async function syncUserNotifications(userId, patientId, options = {}) {
  const { latitude, longitude } = options;
  const results = await Promise.all([
    generateMedicineNotifications(userId, patientId),
    generatePeriodNotifications(userId, patientId),
    generatePregnancyNotifications(userId, patientId),
    generateAnalyticsNotifications(userId, patientId),
    latitude != null && longitude != null
      ? generateDiscoveryNotifications(userId, latitude, longitude)
      : Promise.resolve([]),
  ]);

  return results.flat().filter(Boolean);
}

export function detectEmergencySymptoms(text) {
  const lower = (text || '').toLowerCase();
  return EMERGENCY_SYMPTOMS.some((kw) => lower.includes(kw));
}

export { upsertNotification };
