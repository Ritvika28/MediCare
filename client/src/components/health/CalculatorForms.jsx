import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Calculator } from 'lucide-react';
import { LIKERT } from '@/constants/healthCalculators';

function InputField({ label, type = 'number', value, onChange, placeholder, min, max }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
      <input type={type} required={type !== 'select'} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} min={min} max={max}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition" />
    </div>
  );
}

function GenderSelect({ value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Gender</label>
      <div className="flex gap-2">
        {['male', 'female'].map((g) => (
          <button key={g} type="button" onClick={() => onChange(g)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border transition capitalize ${value === g ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600'}`}>
            {g === 'male' ? '♂' : '♀'} {g}
          </button>
        ))}
      </div>
    </div>
  );
}

function LikertField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {LIKERT.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${value === o.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SubmitBtn({ loading }) {
  return (
    <div className="flex justify-end pt-2">
      <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold gap-2" disabled={loading}>
        <Calculator className="h-4 w-4" /> {loading ? 'Calculating...' : 'Calculate & Save'}
      </Button>
    </div>
  );
}

export function BMIForm({ onSubmit, loading }) {
  const [d, setD] = useState({ weight: '', height: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ weight: +d.weight, height: +d.height }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Weight (kg)" value={d.weight} onChange={(v) => setD((p) => ({ ...p, weight: v }))} placeholder="70" min={20} max={300} />
        <InputField label="Height (cm)" value={d.height} onChange={(v) => setD((p) => ({ ...p, height: v }))} placeholder="175" min={50} max={250} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function BMRForm({ onSubmit, loading }) {
  const [d, setD] = useState({ weight: '', height: '', age: '', gender: 'male' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ weight: +d.weight, height: +d.height, age: +d.age, gender: d.gender }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Weight (kg)" value={d.weight} onChange={(v) => setD((p) => ({ ...p, weight: v }))} placeholder="70" />
        <InputField label="Height (cm)" value={d.height} onChange={(v) => setD((p) => ({ ...p, height: v }))} placeholder="175" />
        <InputField label="Age" value={d.age} onChange={(v) => setD((p) => ({ ...p, age: v }))} placeholder="30" min={1} max={120} />
        <GenderSelect value={d.gender} onChange={(v) => setD((p) => ({ ...p, gender: v }))} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function WaterForm({ onSubmit, loading }) {
  const [d, setD] = useState({ weight: '', activityLevel: 'moderate' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ weight: +d.weight, activityLevel: d.activityLevel }); }} className="space-y-4">
      <InputField label="Weight (kg)" value={d.weight} onChange={(v) => setD((p) => ({ ...p, weight: v }))} placeholder="70" />
      <div>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Activity Level</label>
        <div className="flex flex-wrap gap-2">
          {['sedentary', 'moderate', 'active'].map((l) => (
            <button key={l} type="button" onClick={() => setD((p) => ({ ...p, activityLevel: l }))}
              className={`px-4 py-2 rounded-xl text-xs font-bold border capitalize transition ${d.activityLevel === l ? 'bg-sky-600 text-white' : 'border-slate-200 dark:border-slate-800'}`}>{l}</button>
          ))}
        </div>
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function PeriodTrackerForm({ onSubmit, loading }) {
  const [d, setD] = useState({ lastPeriodDate: '', cycleLength: 28, periodLength: 5 });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...d, cycleLength: +d.cycleLength, periodLength: +d.periodLength }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField label="Last Period Start" type="date" value={d.lastPeriodDate} onChange={(v) => setD((p) => ({ ...p, lastPeriodDate: v }))} />
        <InputField label="Cycle Length (days)" value={d.cycleLength} onChange={(v) => setD((p) => ({ ...p, cycleLength: v }))} min={21} max={45} />
        <InputField label="Period Length (days)" value={d.periodLength} onChange={(v) => setD((p) => ({ ...p, periodLength: v }))} min={2} max={10} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function PregnancyTrackerForm({ onSubmit, loading }) {
  const [d, setD] = useState({ lastPeriodDate: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(d); }} className="space-y-4">
      <InputField label="Last Period Start Date" type="date" value={d.lastPeriodDate} onChange={(v) => setD({ lastPeriodDate: v })} />
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function HeartHealthForm({ onSubmit, loading }) {
  const [d, setD] = useState({ restingHeartRate: '', systolicBP: '', diastolicBP: '', cholesterol: '', isSmoker: false, age: '', gender: 'male' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ restingHeartRate: +d.restingHeartRate, systolicBP: +d.systolicBP, diastolicBP: +d.diastolicBP, cholesterol: +d.cholesterol, isSmoker: d.isSmoker, age: +d.age, gender: d.gender }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Age" value={d.age} onChange={(v) => setD((p) => ({ ...p, age: v }))} min={1} max={120} />
        <GenderSelect value={d.gender} onChange={(v) => setD((p) => ({ ...p, gender: v }))} />
        <InputField label="Resting Heart Rate (BPM)" value={d.restingHeartRate} onChange={(v) => setD((p) => ({ ...p, restingHeartRate: v }))} min={40} max={200} />
        <InputField label="Cholesterol (mg/dL)" value={d.cholesterol} onChange={(v) => setD((p) => ({ ...p, cholesterol: v }))} min={100} max={400} />
        <InputField label="Systolic BP (mmHg)" value={d.systolicBP} onChange={(v) => setD((p) => ({ ...p, systolicBP: v }))} min={70} max={250} />
        <InputField label="Diastolic BP (mmHg)" value={d.diastolicBP} onChange={(v) => setD((p) => ({ ...p, diastolicBP: v }))} min={40} max={150} />
      </div>
      <div className="flex gap-2">
        {[{ val: false, label: '🚭 Non-Smoker' }, { val: true, label: '🚬 Smoker' }].map((opt) => (
          <button key={String(opt.val)} type="button" onClick={() => setD((p) => ({ ...p, isSmoker: opt.val }))}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border ${d.isSmoker === opt.val ? 'bg-red-600 text-white' : 'border-slate-200 dark:border-slate-800'}`}>{opt.label}</button>
        ))}
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function DiabetesRiskForm({ onSubmit, loading }) {
  const [d, setD] = useState({ age: '', weight: '', height: '', familyHistory: false, activityLevel: 'moderate', smoking: 'never', bloodPressure: 'normal' });
  const bmiVal = d.weight && d.height ? (+d.weight / Math.pow(+d.height / 100, 2)).toFixed(1) : null;
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ age: +d.age, bmi: bmiVal ? parseFloat(bmiVal) : 22, familyHistory: d.familyHistory, activityLevel: d.activityLevel, smoking: d.smoking, bloodPressure: d.bloodPressure }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField label="Age" value={d.age} onChange={(v) => setD((p) => ({ ...p, age: v }))} min={18} max={120} />
        <InputField label="Weight (kg)" value={d.weight} onChange={(v) => setD((p) => ({ ...p, weight: v }))} />
        <InputField label="Height (cm)" value={d.height} onChange={(v) => setD((p) => ({ ...p, height: v }))} />
      </div>
      {bmiVal && <p className="text-xs font-bold text-teal-600">Calculated BMI: {bmiVal}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold mb-1.5">Family History</label>
          <div className="flex gap-2">
            {[false, true].map((v) => (
              <button key={String(v)} type="button" onClick={() => setD((p) => ({ ...p, familyHistory: v }))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border ${d.familyHistory === v ? 'bg-teal-600 text-white' : 'border-slate-200'}`}>{v ? 'Yes' : 'No'}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5">Blood Pressure</label>
          <div className="flex gap-2">
            {['normal', 'high'].map((v) => (
              <button key={v} type="button" onClick={() => setD((p) => ({ ...p, bloodPressure: v }))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border capitalize ${d.bloodPressure === v ? 'bg-teal-600 text-white' : 'border-slate-200'}`}>{v}</button>
            ))}
          </div>
        </div>
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function BloodPressureForm({ onSubmit, loading }) {
  const [d, setD] = useState({ systolic: '', diastolic: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ systolic: +d.systolic, diastolic: +d.diastolic }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Systolic (mmHg)" value={d.systolic} onChange={(v) => setD((p) => ({ ...p, systolic: v }))} min={70} max={250} placeholder="120" />
        <InputField label="Diastolic (mmHg)" value={d.diastolic} onChange={(v) => setD((p) => ({ ...p, diastolic: v }))} min={40} max={150} placeholder="80" />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function BloodSugarForm({ onSubmit, loading }) {
  const [d, setD] = useState({ testType: 'fasting', value: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ testType: d.testType, value: +d.value }); }} className="space-y-4">
      <div>
        <label className="block text-xs font-bold mb-1.5">Test Type</label>
        <div className="flex flex-wrap gap-2">
          {[{ v: 'fasting', l: 'Fasting Glucose' }, { v: 'random', l: 'Random Glucose' }, { v: 'hba1c', l: 'HbA1c' }].map((o) => (
            <button key={o.v} type="button" onClick={() => setD((p) => ({ ...p, testType: o.v }))}
              className={`px-3 py-2 rounded-xl text-xs font-bold border ${d.testType === o.v ? 'bg-amber-600 text-white' : 'border-slate-200'}`}>{o.l}</button>
          ))}
        </div>
      </div>
      <InputField label={d.testType === 'hba1c' ? 'HbA1c (%)' : 'Glucose (mg/dL)'} value={d.value} onChange={(v) => setD((p) => ({ ...p, value: v }))} min={50} max={500} />
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function CholesterolForm({ onSubmit, loading }) {
  const [d, setD] = useState({ total: '', hdl: '', ldl: '', triglycerides: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ total: +d.total, hdl: +d.hdl, ldl: +d.ldl, triglycerides: +d.triglycerides }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Total Cholesterol (mg/dL)" value={d.total} onChange={(v) => setD((p) => ({ ...p, total: v }))} min={100} max={400} />
        <InputField label="HDL (mg/dL)" value={d.hdl} onChange={(v) => setD((p) => ({ ...p, hdl: v }))} min={20} max={100} />
        <InputField label="LDL (mg/dL)" value={d.ldl} onChange={(v) => setD((p) => ({ ...p, ldl: v }))} min={50} max={300} />
        <InputField label="Triglycerides (mg/dL)" value={d.triglycerides} onChange={(v) => setD((p) => ({ ...p, triglycerides: v }))} min={50} max={500} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function KidneyForm({ onSubmit, loading }) {
  const [d, setD] = useState({ age: '', gender: 'male', creatinine: '', weight: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ age: +d.age, gender: d.gender, creatinine: +d.creatinine, weight: d.weight ? +d.weight : undefined }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Age" value={d.age} onChange={(v) => setD((p) => ({ ...p, age: v }))} min={18} max={120} />
        <GenderSelect value={d.gender} onChange={(v) => setD((p) => ({ ...p, gender: v }))} />
        <InputField label="Serum Creatinine (mg/dL)" value={d.creatinine} onChange={(v) => setD((p) => ({ ...p, creatinine: v }))} min={0.1} max={15} />
        <InputField label="Weight (kg) — optional" value={d.weight} onChange={(v) => setD((p) => ({ ...p, weight: v }))} min={20} max={300} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function LiverForm({ onSubmit, loading }) {
  const [d, setD] = useState({ age: '', ast: '', alt: '', platelets: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ age: +d.age, ast: +d.ast, alt: +d.alt, platelets: +d.platelets }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Age" value={d.age} onChange={(v) => setD((p) => ({ ...p, age: v }))} min={18} max={120} />
        <InputField label="AST (U/L)" value={d.ast} onChange={(v) => setD((p) => ({ ...p, ast: v }))} min={5} max={500} />
        <InputField label="ALT (U/L)" value={d.alt} onChange={(v) => setD((p) => ({ ...p, alt: v }))} min={5} max={500} />
        <InputField label="Platelets (×10³/µL)" value={d.platelets} onChange={(v) => setD((p) => ({ ...p, platelets: v }))} min={50} max={500} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function StressForm({ onSubmit, loading }) {
  const [d, setD] = useState({ stressFrequency: '', sleepQuality: '', mood: '', interestLevel: '', fatigue: '', concentration: '' });
  const ready = Object.values(d).every(Boolean);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ready) onSubmit(d); }} className="space-y-4">
      <LikertField label="How often do you feel stressed?" value={d.stressFrequency} onChange={(v) => setD((p) => ({ ...p, stressFrequency: v }))} />
      <LikertField label="Sleep quality in the past 2 weeks" value={d.sleepQuality} onChange={(v) => setD((p) => ({ ...p, sleepQuality: v }))} />
      <LikertField label="Mood (sad or down)" value={d.mood} onChange={(v) => setD((p) => ({ ...p, mood: v }))} />
      <LikertField label="Loss of interest in activities" value={d.interestLevel} onChange={(v) => setD((p) => ({ ...p, interestLevel: v }))} />
      <LikertField label="Fatigue or low energy" value={d.fatigue} onChange={(v) => setD((p) => ({ ...p, fatigue: v }))} />
      <LikertField label="Difficulty concentrating" value={d.concentration} onChange={(v) => setD((p) => ({ ...p, concentration: v }))} />
      <p className="text-[10px] text-slate-400 italic">This is a screening tool, not a clinical diagnosis.</p>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function PCOSForm({ onSubmit, loading }) {
  const [d, setD] = useState({ cycleRegularity: '', acne: '', weightGain: '', hairGrowth: '', familyHistory: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(d); }} className="space-y-4">
      <div>
        <label className="block text-xs font-bold mb-1.5">Menstrual Cycle Regularity</label>
        <div className="flex flex-wrap gap-2">
          {['regular', 'irregular', 'absent'].map((v) => (
            <button key={v} type="button" onClick={() => setD((p) => ({ ...p, cycleRegularity: v }))}
              className={`px-3 py-2 rounded-xl text-xs font-bold border capitalize ${d.cycleRegularity === v ? 'bg-fuchsia-600 text-white' : 'border-slate-200'}`}>{v}</button>
          ))}
        </div>
      </div>
      {['acne', 'weightGain', 'hairGrowth', 'familyHistory'].map((field) => (
        <div key={field}>
          <label className="block text-xs font-bold mb-1.5 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
          <div className="flex gap-2">
            {(field === 'acne' ? ['none', 'mild', 'moderate', 'severe'] : ['no', 'yes']).map((v) => (
              <button key={v} type="button" onClick={() => setD((p) => ({ ...p, [field]: v }))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border capitalize ${d[field] === v ? 'bg-fuchsia-600 text-white' : 'border-slate-200'}`}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function SleepForm({ onSubmit, loading }) {
  const [d, setD] = useState({ duration: '', quality: 'good', wakeups: '', daytimeTiredness: 'mild' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ duration: +d.duration, quality: d.quality, wakeups: +d.wakeups, daytimeTiredness: d.daytimeTiredness }); }} className="space-y-4">
      <InputField label="Sleep Duration (hours)" value={d.duration} onChange={(v) => setD((p) => ({ ...p, duration: v }))} min={1} max={16} placeholder="7" />
      <InputField label="Night Wake-ups (count)" value={d.wakeups} onChange={(v) => setD((p) => ({ ...p, wakeups: v }))} min={0} max={10} placeholder="1" />
      <div>
        <label className="block text-xs font-bold mb-1.5">Sleep Quality</label>
        <div className="flex flex-wrap gap-2">
          {['excellent', 'good', 'fair', 'poor'].map((v) => (
            <button key={v} type="button" onClick={() => setD((p) => ({ ...p, quality: v }))}
              className={`px-3 py-2 rounded-xl text-xs font-bold border capitalize ${d.quality === v ? 'bg-indigo-600 text-white' : 'border-slate-200'}`}>{v}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold mb-1.5">Daytime Tiredness</label>
        <div className="flex flex-wrap gap-2">
          {['none', 'mild', 'moderate', 'severe'].map((v) => (
            <button key={v} type="button" onClick={() => setD((p) => ({ ...p, daytimeTiredness: v }))}
              className={`px-3 py-2 rounded-xl text-xs font-bold border capitalize ${d.daytimeTiredness === v ? 'bg-indigo-600 text-white' : 'border-slate-200'}`}>{v}</button>
          ))}
        </div>
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function BodyFatForm({ onSubmit, loading }) {
  const [d, setD] = useState({ waist: '', neck: '', height: '', hip: '', gender: 'male' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ waist: +d.waist, neck: +d.neck, height: +d.height, hip: +d.hip, gender: d.gender }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Waist (cm)" value={d.waist} onChange={(v) => setD((p) => ({ ...p, waist: v }))} />
        <InputField label="Neck (cm)" value={d.neck} onChange={(v) => setD((p) => ({ ...p, neck: v }))} />
        <InputField label="Height (cm)" value={d.height} onChange={(v) => setD((p) => ({ ...p, height: v }))} />
        {d.gender === 'female' && <InputField label="Hip (cm)" value={d.hip} onChange={(v) => setD((p) => ({ ...p, hip: v }))} />}
        <GenderSelect value={d.gender} onChange={(v) => setD((p) => ({ ...p, gender: v }))} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function CalorieForm({ onSubmit, loading }) {
  const [d, setD] = useState({ weight: '', height: '', age: '', gender: 'male', activityLevel: 'moderate' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ weight: +d.weight, height: +d.height, age: +d.age, gender: d.gender, activityLevel: d.activityLevel }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Weight (kg)" value={d.weight} onChange={(v) => setD((p) => ({ ...p, weight: v }))} />
        <InputField label="Height (cm)" value={d.height} onChange={(v) => setD((p) => ({ ...p, height: v }))} />
        <InputField label="Age" value={d.age} onChange={(v) => setD((p) => ({ ...p, age: v }))} />
        <GenderSelect value={d.gender} onChange={(v) => setD((p) => ({ ...p, gender: v }))} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export function IdealWeightForm({ onSubmit, loading }) {
  const [d, setD] = useState({ height: '', gender: 'male' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ height: +d.height, gender: d.gender }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Height (cm)" value={d.height} onChange={(v) => setD((p) => ({ ...p, height: v }))} />
        <GenderSelect value={d.gender} onChange={(v) => setD((p) => ({ ...p, gender: v }))} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

export const FORM_MAP = {
  bmi: BMIForm,
  bmr: BMRForm,
  water_intake: WaterForm,
  period_tracker: PeriodTrackerForm,
  pregnancy_tracker: PregnancyTrackerForm,
  heart_health: HeartHealthForm,
  diabetes_risk: DiabetesRiskForm,
  blood_pressure: BloodPressureForm,
  blood_sugar: BloodSugarForm,
  cholesterol: CholesterolForm,
  kidney_health: KidneyForm,
  liver_health: LiverForm,
  stress_assessment: StressForm,
  pcos_risk: PCOSForm,
  sleep_assessment: SleepForm,
  body_fat: BodyFatForm,
  calorie: CalorieForm,
  ideal_weight: IdealWeightForm,
};
