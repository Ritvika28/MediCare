export const CALCULATORS = [
  { key: 'bmi', label: 'BMI Calculator', emoji: '⚖️', color: 'from-blue-600 to-cyan-500', desc: 'Body Mass Index — assess weight relative to height' },
  { key: 'bmr', label: 'BMR Calculator', emoji: '🔥', color: 'from-orange-600 to-amber-500', desc: 'Basal Metabolic Rate — daily energy at rest' },
  { key: 'water_intake', label: 'Water Intake', emoji: '💧', color: 'from-sky-600 to-blue-500', desc: 'Recommended daily water consumption' },
  { key: 'period_tracker', label: 'Period Tracker', emoji: '📅', color: 'from-pink-600 to-rose-500', desc: 'Track cycles, ovulation, and fertility window' },
  { key: 'pregnancy_tracker', label: 'Pregnancy Tracker', emoji: '👶', color: 'from-purple-600 to-indigo-500', desc: 'Due date, week, and milestones' },
  { key: 'heart_health', label: 'Heart Risk', emoji: '❤️', color: 'from-red-600 to-orange-500', desc: 'Cardiovascular risk from vitals and lifestyle' },
  { key: 'diabetes_risk', label: 'Diabetes Risk', emoji: '🩸', color: 'from-teal-600 to-emerald-500', desc: 'Type 2 diabetes risk assessment' },
  { key: 'blood_pressure', label: 'Blood Pressure', emoji: '🫀', color: 'from-rose-600 to-red-500', desc: 'BP classification and recommendations' },
  { key: 'blood_sugar', label: 'Blood Sugar', emoji: '🍬', color: 'from-amber-600 to-yellow-500', desc: 'Glucose/HbA1c tracking and classification' },
  { key: 'cholesterol', label: 'Cholesterol', emoji: '🧬', color: 'from-violet-600 to-purple-500', desc: 'Lipid panel heart risk interpretation' },
  { key: 'kidney_health', label: 'Kidney Health', emoji: '🫘', color: 'from-emerald-600 to-green-500', desc: 'eGFR estimation and kidney stage' },
  { key: 'liver_health', label: 'Liver Health', emoji: '🫁', color: 'from-lime-600 to-green-500', desc: 'FIB-4 fibrosis risk score' },
  { key: 'stress_assessment', label: 'Stress Assessment', emoji: '🧠', color: 'from-indigo-600 to-blue-500', desc: 'Mental health screening questionnaire' },
  { key: 'pcos_risk', label: 'PCOS Risk', emoji: '🌸', color: 'from-fuchsia-600 to-pink-500', desc: 'Polycystic ovary syndrome risk screening' },
  { key: 'sleep_assessment', label: 'Sleep Assessment', emoji: '😴', color: 'from-slate-600 to-indigo-500', desc: 'Sleep and recovery score' },
  { key: 'body_fat', label: 'Body Fat %', emoji: '📏', color: 'from-rose-600 to-pink-500', desc: 'US Navy body fat estimation' },
  { key: 'calorie', label: 'Calorie Needs', emoji: '🥗', color: 'from-emerald-600 to-teal-500', desc: 'Daily calories by activity level' },
  { key: 'ideal_weight', label: 'Ideal Weight', emoji: '💪', color: 'from-violet-600 to-purple-500', desc: 'Healthy weight range (Devine formula)' },
];

export const STATUS_BADGE = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function statusBadgeClass(color) {
  return STATUS_BADGE[color] || STATUS_BADGE.slate;
}

export const LIKERT = [
  { value: 'never', label: 'Never' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'often', label: 'Often' },
  { value: 'always', label: 'Always' },
];
