import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  HeartPulse, ChevronRight, ChevronLeft, Sparkles, History, AlertTriangle,
  CheckCircle2, Activity, Moon, Brain, Cigarette, Wine, Dumbbell,
  Users, ArrowLeft, TrendingUp, ShieldCheck, Gauge, Star, MapPin
} from 'lucide-react';

const STEPS = [
  { key: 'basics', label: 'Basic Info', icon: Activity, desc: 'Age, gender, height, weight' },
  { key: 'habits', label: 'Lifestyle Habits', icon: Cigarette, desc: 'Smoking, alcohol, exercise' },
  { key: 'health', label: 'Health Indicators', icon: HeartPulse, desc: 'BP, diabetes, sleep, stress' },
  { key: 'family', label: 'Family History', icon: Users, desc: 'Genetic risk factors' },
];

const FAMILY_CONDITIONS = [
  { value: 'heart_disease', label: '❤️ Heart Disease' },
  { value: 'diabetes', label: '🩸 Diabetes' },
  { value: 'hypertension', label: '🫀 Hypertension' },
  { value: 'cancer', label: '🎗️ Cancer' },
  { value: 'stroke', label: '🧠 Stroke' },
  { value: 'kidney_disease', label: '🫘 Kidney Disease' },
  { value: 'asthma', label: '🫁 Asthma / COPD' },
  { value: 'obesity', label: '⚖️ Obesity' },
];

function InputField({ label, type = 'number', value, onChange, placeholder, min, max }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
      <input type={type} required value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        min={min} max={max}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none transition" />
    </div>
  );
}

function OptionSelector({ label, options, value, onChange, color = 'rose' }) {
  const activeClasses = {
    rose: 'bg-rose-600 text-white border-rose-600',
    amber: 'bg-amber-600 text-white border-amber-600',
    emerald: 'bg-emerald-600 text-white border-emerald-600',
    violet: 'bg-violet-600 text-white border-violet-600',
  };
  const hoverClasses = {
    rose: 'hover:border-rose-300',
    amber: 'hover:border-amber-300',
    emerald: 'hover:border-emerald-300',
    violet: 'hover:border-violet-300',
  };
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition ${value === opt.value ? activeClasses[color] : `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 ${hoverClasses[color]}`}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RiskGauge({ score, label }) {
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const bg = score >= 70 ? 'from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-900'
    : score >= 40 ? 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-900'
    : 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-900';
  const textColor = score >= 70 ? 'text-emerald-700 dark:text-emerald-400' : score >= 40 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400';

  return (
    <div className={`relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br ${bg} border`}>
      <div className="relative w-[140px] h-[140px] flex items-center justify-center">
        <svg width="140" height="140" viewBox="0 0 140 140" className="absolute inset-0 transform -rotate-90">
          <circle cx="70" cy="70" r="60" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-200 dark:text-slate-800" />
          <circle cx="70" cy="70" r="60" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <p className={`text-4xl font-black ${textColor}`}>{score}</p>
      </div>
      <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">{label}</p>
      <p className={`text-xs font-bold ${textColor}`}>
        {score >= 70 ? 'Good Health' : score >= 40 ? 'Moderate Risk' : 'High Risk'}
      </p>
    </div>
  );
}

export default function HealthRiskAssessment() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(null);
  const [answers, setAnswers] = useState({
    age: '', gender: 'male', height: '', weight: '',
    smoking: 'never', alcohol: 'never',
    exercise: 'active', diabetes: false,
    bloodPressure: 'normal', sleep: '', stress: 'low',
    familyHistory: [],
  });

  const { data: historyRes } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.get('/assessments').then(r => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/assessments', { answers: data }),
    onSuccess: (res) => {
      setShowResults(res.data.data);
      queryClient.invalidateQueries(['assessments']);
    },
  });

  const history = historyRes?.data || [];

  function handleSubmit() {
    submitMutation.mutate({
      ...answers,
      age: +answers.age,
      height: +answers.height,
      weight: +answers.weight,
      sleep: +answers.sleep,
    });
  }

  function toggleFamily(cond) {
    setAnswers(prev => ({
      ...prev,
      familyHistory: prev.familyHistory.includes(cond)
        ? prev.familyHistory.filter(c => c !== cond)
        : [...prev.familyHistory, cond],
    }));
  }

  function resetAssessment() {
    setShowResults(null);
    setStep(0);
    setAnswers({
      age: '', gender: 'male', height: '', weight: '',
      smoking: 'never', alcohol: 'never',
      exercise: 'active', diabetes: false,
      bloodPressure: 'normal', sleep: '', stress: 'low',
      familyHistory: [],
    });
  }

  // Results view
  if (showResults) {
    return (
      <div className="space-y-6">
        <button onClick={resetAssessment}
          className="flex items-center gap-2 text-sm font-bold text-rose-600 dark:text-rose-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Take Another Assessment
        </button>

        <div className="relative rounded-3xl bg-gradient-to-br from-rose-700 via-pink-600 to-red-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
            <ShieldCheck className="h-80 w-80" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-rose-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" /> Assessment Complete
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Your Health Report</h1>
            <p className="text-rose-100/90 text-sm md:text-base leading-relaxed">
              Based on your responses, here's a comprehensive analysis of your health risk profile.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <RiskGauge score={showResults.healthScore} label="Health Score" />
          <RiskGauge score={showResults.riskScore} label="Risk Score" />
        </div>

        {showResults.lifestyleAdvice?.length > 0 && (
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-amber-500" /> Personalized Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {showResults.lifestyleAdvice.map((advice, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{advice}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Summary breakdown */}
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-teal-600" /> Assessment Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Age', value: showResults.answers?.age || answers.age, emoji: '🎂' },
                { label: 'BMI', value: ((+answers.weight) / Math.pow((+answers.height) / 100, 2)).toFixed(1), emoji: '⚖️' },
                { label: 'Smoking', value: answers.smoking, emoji: '🚬' },
                { label: 'Alcohol', value: answers.alcohol, emoji: '🍷' },
                { label: 'Exercise', value: answers.exercise, emoji: '🏃' },
                { label: 'Sleep', value: `${answers.sleep}h/night`, emoji: '😴' },
                { label: 'Stress', value: answers.stress, emoji: '🧘' },
                { label: 'Blood Pressure', value: answers.bloodPressure, emoji: '🫀' },
                { label: 'Diabetes', value: answers.diabetes ? 'Yes' : 'No', emoji: '🩸' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-lg">{item.emoji}</span>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommended Doctors & Hospitals */}
        {showResults.recommendedDoctors?.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-500 animate-pulse" /> Recommended Specialists
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {showResults.recommendedDoctors.map(doc => (
                <Card key={doc._id} className="border border-slate-200/85 dark:border-slate-800 rounded-2xl p-4 flex gap-4 hover:shadow-md transition">
                  <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-850 shrink-0 overflow-hidden flex items-center justify-center">
                    {doc.user?.avatar ? (
                      <img src={doc.user.avatar} alt={doc.user.lastName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-black text-slate-400">Dr</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                      Dr. {doc.user?.firstName} {doc.user?.lastName}
                    </p>
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-450 truncate">{doc.specialization}</p>
                    {doc.hospital?.name && (
                      <p className="text-[11px] font-semibold text-slate-400 truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" /> {doc.hospital.name}
                      </p>
                    )}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">₹{doc.consultationFee}</span>
                      <Link to={`/patient/doctors/${doc._id}`}>
                        <Button className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold px-3 py-1">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {showResults.recommendedHospitals?.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              🏥 Recommended Care Centers
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {showResults.recommendedHospitals.map(hosp => (
                <Card key={hosp._id} className="border border-slate-200/85 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{hosp.name}</p>
                      {hosp.rating > 0 && (
                        <Badge className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-0 flex items-center gap-1 font-bold shrink-0">
                          <Star className="h-3 w-3 fill-current" /> {hosp.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                    {hosp.address && (
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 shrink-0" /> {hosp.address.street}, {hosp.address.city}
                      </p>
                    )}
                  </div>
                  <div className="pt-3 border-t border-slate-55 dark:border-slate-800/80 mt-3 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">Open 24/7</span>
                    <Link to={`/patient/hospitals/${hosp._id}`}>
                      <Button variant="outline" className="rounded-xl text-[10px] font-bold px-3 py-1">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative rounded-3xl bg-gradient-to-br from-rose-700 via-pink-600 to-red-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <HeartPulse className="h-80 w-80" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-rose-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Gauge className="h-3.5 w-3.5" /> Wellness Assessment Tool
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Health Risk Assessment</h1>
          <p className="text-rose-100/90 text-sm md:text-base leading-relaxed">
            Answer a few questions about your lifestyle and medical history to receive a personalized health risk score with actionable recommendations.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <button onClick={() => setStep(i)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl w-full transition text-left ${
                i === step
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-400 dark:border-rose-800'
                  : i < step
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
              }`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                i === step ? 'bg-rose-600 text-white' : i < step ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <div className="hidden md:block min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.label}</p>
                <p className="text-[10px] text-slate-500 truncate">{s.desc}</p>
              </div>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mx-1 hidden lg:block" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => { const StepIcon = STEPS[step].icon; return <StepIcon className="h-5 w-5 text-rose-600" />; })()}
            {STEPS[step].label}
          </CardTitle>
          <CardDescription>{STEPS[step].desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Age (years)" value={answers.age} onChange={v => setAnswers(p => ({ ...p, age: v }))} placeholder="30" min={1} max={120} />
                <OptionSelector label="Gender" value={answers.gender} color="rose"
                  options={[{ value: 'male', label: '♂ Male' }, { value: 'female', label: '♀ Female' }, { value: 'other', label: '⚧ Other' }]}
                  onChange={v => setAnswers(p => ({ ...p, gender: v }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Height (cm)" value={answers.height} onChange={v => setAnswers(p => ({ ...p, height: v }))} placeholder="175" min={50} max={250} />
                <InputField label="Weight (kg)" value={answers.weight} onChange={v => setAnswers(p => ({ ...p, weight: v }))} placeholder="70" min={20} max={300} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <OptionSelector label="Smoking Status" color="amber" value={answers.smoking}
                options={[
                  { value: 'never', label: '🚫 Never' },
                  { value: 'former', label: '🔄 Former' },
                  { value: 'light', label: '🚬 Light' },
                  { value: 'heavy', label: '🔥 Heavy' },
                ]}
                onChange={v => setAnswers(p => ({ ...p, smoking: v }))} />
              <OptionSelector label="Alcohol Consumption" color="violet" value={answers.alcohol}
                options={[
                  { value: 'never', label: '🚫 Never' },
                  { value: 'occasional', label: '🍷 Occasional' },
                  { value: 'regular', label: '🥃 Regular' },
                ]}
                onChange={v => setAnswers(p => ({ ...p, alcohol: v }))} />
              <OptionSelector label="Exercise Level" color="emerald" value={answers.exercise}
                options={[
                  { value: 'none', label: '🪑 None' },
                  { value: 'occasional', label: '🚶 Occasional' },
                  { value: 'active', label: '🏃 Active' },
                ]}
                onChange={v => setAnswers(p => ({ ...p, exercise: v }))} />
            </>
          )}

          {step === 2 && (
            <>
              <OptionSelector label="Blood Pressure" color="rose" value={answers.bloodPressure}
                options={[
                  { value: 'normal', label: '✅ Normal' },
                  { value: 'prehypertension', label: '⚠️ Pre-hypertension' },
                  { value: 'stage1', label: '🟠 Stage 1' },
                  { value: 'stage2', label: '🔴 Stage 2' },
                ]}
                onChange={v => setAnswers(p => ({ ...p, bloodPressure: v }))} />
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Diabetes</label>
                <div className="flex gap-2">
                  {[{ val: false, label: '🚫 No' }, { val: true, label: '🩸 Yes' }].map(opt => (
                    <button key={String(opt.val)} type="button" onClick={() => setAnswers(p => ({ ...p, diabetes: opt.val }))}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${answers.diabetes === opt.val ? 'bg-rose-600 text-white border-rose-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-rose-300'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <InputField label="Sleep (hours per night)" value={answers.sleep} onChange={v => setAnswers(p => ({ ...p, sleep: v }))} placeholder="7" min={1} max={16} />
              <OptionSelector label="Stress Level" color="amber" value={answers.stress}
                options={[
                  { value: 'low', label: '😌 Low' },
                  { value: 'moderate', label: '😐 Moderate' },
                  { value: 'high', label: '😰 High' },
                ]}
                onChange={v => setAnswers(p => ({ ...p, stress: v }))} />
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-slate-500">Select any conditions that run in your immediate family (parents, siblings):</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {FAMILY_CONDITIONS.map(cond => {
                  const isSelected = answers.familyHistory.includes(cond.value);
                  return (
                    <button key={cond.value} type="button" onClick={() => toggleFamily(cond.value)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition text-left ${
                        isSelected
                          ? 'bg-rose-50/50 border-rose-400 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}>
                      <span className="text-sm font-bold">{cond.label}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-rose-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className="rounded-xl gap-2">
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => setStep(s => s + 1)}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold gap-2"
                disabled={submitMutation.isPending || !answers.age || !answers.height || !answers.weight || !answers.sleep}>
                <Sparkles className="h-4 w-4" /> {submitMutation.isPending ? 'Analyzing...' : 'Get My Results'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assessment History */}
      {history.length > 0 && (
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 text-slate-400" /> Past Assessments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.slice(0, 10).map(a => {
              const scoreColor = a.healthScore >= 70 ? 'text-emerald-600 dark:text-emerald-400'
                : a.healthScore >= 40 ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400';
              const scoreBg = a.healthScore >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/30'
                : a.healthScore >= 40 ? 'bg-amber-50 dark:bg-amber-900/30'
                : 'bg-red-50 dark:bg-red-900/30';
              return (
                <div key={a._id}
                  onClick={() => setShowResults(a)}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${scoreBg}`}>
                      <HeartPulse className={`h-5 w-5 ${scoreColor}`} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        Health: {a.healthScore}/100 · Risk: {a.riskScore}/100
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${scoreBg} ${scoreColor} border-0 text-xs font-bold`}>
                      {a.healthScore >= 70 ? 'Good' : a.healthScore >= 40 ? 'Moderate' : 'High Risk'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
