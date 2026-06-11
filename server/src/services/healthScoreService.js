export const calculateHealthScore = (patient, appointments = [], records = []) => {
  let score = 75;

  if (patient?.medicalHistory?.length) score -= Math.min(patient.medicalHistory.length * 3, 15);
  if (patient?.allergies?.length) score -= Math.min(patient.allergies.length * 2, 10);
  if (records?.length > 0) score += 5;

  const completed = appointments.filter((a) => a.status === 'completed').length;
  score += Math.min(completed * 2, 10);

  const upcoming = appointments.filter((a) => ['pending', 'confirmed'].includes(a.status)).length;
  if (upcoming > 0) score += 5;

  if (patient?.bloodGroup && patient.bloodGroup !== 'unknown') score += 2;
  if (patient?.emergencyContact?.phone) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
};

export const getHealthAlerts = (patient, score) => {
  const alerts = [];
  if (score < 60) alerts.push({ type: 'warning', message: 'Schedule a general checkup soon' });
  if (patient?.allergies?.length) alerts.push({ type: 'info', message: `You have ${patient.allergies.length} recorded allergy(s)` });
  if (!patient?.emergencyContact?.phone) {
    alerts.push({ type: 'warning', message: 'Add an emergency contact in your profile' });
  }
  return alerts;
};
