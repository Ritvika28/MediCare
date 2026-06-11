import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Calculator, Activity, Droplets, Scale, Flame, Heart, Baby,
  ChevronRight, BarChart3, History, Sparkles, TrendingUp, ArrowLeft
} from 'lucide-react';

const CALCULATORS = [
  { key: 'bmi', label: 'BMI Calculator', icon: Scale, color: 'from-blue-600 to-cyan-500', desc: 'Body Mass Index — assess weight relative to height', emoji: '⚖️' },
  { key: 'bmr', label: 'BMR Calculator', icon: Flame, color: 'from-orange-600 to-amber-500', desc: 'Basal Metabolic Rate — daily energy expenditure at rest', emoji: '🔥' },
  { key: 'body_fat', label: 'Body Fat %', icon: Activity, color: 'from-rose-600 to-pink-500', desc: 'US Navy method body fat percentage estimation', emoji: '📏' },
  { key: 'calorie', label: 'Calorie Needs', icon: BarChart3, color: 'from-emerald-600 to-teal-500', desc: 'Daily calorie requirements based on activity level', emoji: '🥗' },
  { key: 'ideal_weight', label: 'Ideal Weight', icon: Heart, color: 'from-violet-600 to-purple-500', desc: 'Recommended weight range using Devine formula', emoji: '💪' },
  { key: 'water_intake', label: 'Water Intake', icon: Droplets, color: 'from-sky-600 to-blue-500', desc: 'Recommended daily water consumption', emoji: '💧' },
];

function BMIForm({ onSubmit, loading }) {
  const [d, setD] = useState({ weight: '', height: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ weight: +d.weight, height: +d.height }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Weight (kg)" value={d.weight} onChange={v => setD(p => ({ ...p, weight: v }))} placeholder="70" />
        <InputField label="Height (cm)" value={d.height} onChange={v => setD(p => ({ ...p, height: v }))} placeholder="175" />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

function BMRForm({ onSubmit, loading }) {
  const [d, setD] = useState({ weight: '', height: '', age: '', gender: 'male' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ weight: +d.weight, height: +d.height, age: +d.age, gender: d.gender }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Weight (kg)" value={d.weight} onChange={v => setD(p => ({ ...p, weight: v }))} placeholder="70" />
        <InputField label="Height (cm)" value={d.height} onChange={v => setD(p => ({ ...p, height: v }))} placeholder="175" />
        <InputField label="Age" value={d.age} onChange={v => setD(p => ({ ...p, age: v }))} placeholder="30" />
        <GenderSelect value={d.gender} onChange={v => setD(p => ({ ...p, gender: v }))} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

function BodyFatForm({ onSubmit, loading }) {
  const [d, setD] = useState({ waist: '', neck: '', height: '', hip: '', gender: 'male' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ waist: +d.waist, neck: +d.neck, height: +d.height, hip: +d.hip, gender: d.gender }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Waist (cm)" value={d.waist} onChange={v => setD(p => ({ ...p, waist: v }))} placeholder="85" />
        <InputField label="Neck (cm)" value={d.neck} onChange={v => setD(p => ({ ...p, neck: v }))} placeholder="38" />
        <InputField label="Height (cm)" value={d.height} onChange={v => setD(p => ({ ...p, height: v }))} placeholder="175" />
        {d.gender === 'female' && <InputField label="Hip (cm)" value={d.hip} onChange={v => setD(p => ({ ...p, hip: v }))} placeholder="95" />}
        <GenderSelect value={d.gender} onChange={v => setD(p => ({ ...p, gender: v }))} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

function CalorieForm({ onSubmit, loading }) {
  const [d, setD] = useState({ weight: '', height: '', age: '', gender: 'male', activityLevel: 'moderate' });
  const levels = [
    { value: 'sedentary', label: 'Sedentary' },
    { value: 'light', label: 'Lightly Active' },
    { value: 'moderate', label: 'Moderately Active' },
    { value: 'active', label: 'Very Active' },
    { value: 'veryActive', label: 'Extra Active' },
  ];
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ weight: +d.weight, height: +d.height, age: +d.age, gender: d.gender, activityLevel: d.activityLevel }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Weight (kg)" value={d.weight} onChange={v => setD(p => ({ ...p, weight: v }))} placeholder="70" />
        <InputField label="Height (cm)" value={d.height} onChange={v => setD(p => ({ ...p, height: v }))} placeholder="175" />
        <InputField label="Age" value={d.age} onChange={v => setD(p => ({ ...p, age: v }))} placeholder="30" />
        <GenderSelect value={d.gender} onChange={v => setD(p => ({ ...p, gender: v }))} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Activity Level</label>
        <div className="flex flex-wrap gap-2">
          {levels.map(l => (
            <button key={l.value} type="button" onClick={() => setD(p => ({ ...p, activityLevel: l.value }))}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${d.activityLevel === l.value ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

function IdealWeightForm({ onSubmit, loading }) {
  const [d, setD] = useState({ height: '', gender: 'male' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ height: +d.height, gender: d.gender }); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Height (cm)" value={d.height} onChange={v => setD(p => ({ ...p, height: v }))} placeholder="175" />
        <GenderSelect value={d.gender} onChange={v => setD(p => ({ ...p, gender: v }))} />
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

function WaterForm({ onSubmit, loading }) {
  const [d, setD] = useState({ weight: '', activityLevel: 'moderate' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ weight: +d.weight, activityLevel: d.activityLevel }); }} className="space-y-4">
      <InputField label="Weight (kg)" value={d.weight} onChange={v => setD(p => ({ ...p, weight: v }))} placeholder="70" />
      <div>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Activity Level</label>
        <div className="flex flex-wrap gap-2">
          {['sedentary', 'moderate', 'active'].map(l => (
            <button key={l} type="button" onClick={() => setD(p => ({ ...p, activityLevel: l }))}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition capitalize ${d.activityLevel === l ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-sky-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <SubmitBtn loading={loading} />
    </form>
  );
}

// Shared UI helpers
function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
      <input type="number" required value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition" />
    </div>
  );
}

function GenderSelect({ value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Gender</label>
      <div className="flex gap-2">
        {['male', 'female'].map(g => (
          <button key={g} type="button" onClick={() => onChange(g)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border transition capitalize ${value === g ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-teal-300'}`}>
            {g === 'male' ? '♂' : '♀'} {g}
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
        <Calculator className="h-4 w-4" /> {loading ? 'Calculating...' : 'Calculate'}
      </Button>
    </div>
  );
}

function ResultDisplay({ result, type }) {
  if (!result) return null;
  const outputs = result.outputs || result.data?.outputs;
  const summary = result.resultSummary || result.data?.resultSummary;
  if (!outputs) return null;

  return (
    <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-200 dark:border-teal-900 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-teal-600" />
        <h3 className="font-bold text-teal-800 dark:text-teal-300">Results</h3>
      </div>
      <p className="text-lg font-black text-teal-900 dark:text-teal-200">{summary}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(outputs).filter(([k]) => k !== 'unit' && k !== 'range').map(([key, value]) => (
          <div key={key} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-teal-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
            <p className="text-base font-black text-slate-900 dark:text-white mt-1">
              {typeof value === 'object' ? JSON.stringify(value) : value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HealthCalculators() {
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);

  const calcMutation = useMutation({
    mutationFn: (payload) => api.post('/calculators/calculate', payload).then(r => r.data),
    onSuccess: (data) => setResult(data.data),
  });

  const { data: historyRes } = useQuery({
    queryKey: ['calculator-history'],
    queryFn: () => api.get('/calculators/history').then(r => r.data),
  });

  function handleCalc(inputs) {
    setResult(null);
    calcMutation.mutate({ type: active, inputs });
  }

  const formMap = {
    bmi: <BMIForm onSubmit={handleCalc} loading={calcMutation.isPending} />,
    bmr: <BMRForm onSubmit={handleCalc} loading={calcMutation.isPending} />,
    body_fat: <BodyFatForm onSubmit={handleCalc} loading={calcMutation.isPending} />,
    calorie: <CalorieForm onSubmit={handleCalc} loading={calcMutation.isPending} />,
    ideal_weight: <IdealWeightForm onSubmit={handleCalc} loading={calcMutation.isPending} />,
    water_intake: <WaterForm onSubmit={handleCalc} loading={calcMutation.isPending} />,
  };

  const activeCalc = CALCULATORS.find(c => c.key === active);
  const history = historyRes?.data || [];

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-emerald-600 to-green-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <Calculator className="h-80 w-80" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <TrendingUp className="h-3.5 w-3.5" /> Health Metrics Hub
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Health Calculators</h1>
          <p className="text-emerald-100/90 text-sm md:text-base leading-relaxed">
            Calculate BMI, BMR, body fat, daily calorie needs, ideal weight, and recommended water intake with medical-grade formulas.
          </p>
        </div>
      </div>

      {!active ? (
        <>
          {/* Calculator Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CALCULATORS.map(calc => (
              <Card key={calc.key}
                onClick={() => { setActive(calc.key); setResult(null); }}
                className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg cursor-pointer transition-all hover:-translate-y-1 group">
                <CardContent className="p-6 space-y-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${calc.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <calc.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{calc.label}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{calc.desc}</p>
                  </div>
                  <div className="flex items-center text-teal-600 dark:text-teal-400 text-xs font-bold gap-1">
                    Calculate <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* History */}
          {history.length > 0 && (
            <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-5 w-5 text-slate-400" /> Recent Calculations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.slice(0, 8).map(h => {
                  const calc = CALCULATORS.find(c => c.key === h.calculatorType);
                  return (
                    <div key={h._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{calc?.emoji || '📊'}</span>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{calc?.label || h.calculatorType}</p>
                          <p className="text-[10px] text-slate-400">{new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-0 text-xs font-bold">{h.resultSummary}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* Calculator Detail View */}
          <button onClick={() => { setActive(null); setResult(null); }}
            className="flex items-center gap-2 text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Calculators
          </button>

          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${activeCalc.color} text-white shadow-lg`}>
                  <activeCalc.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>{activeCalc.label}</CardTitle>
                  <CardDescription>{activeCalc.desc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {formMap[active]}
              {result && <ResultDisplay result={result} type={active} />}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
