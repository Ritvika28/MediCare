import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calculator, ChevronRight, History, TrendingUp, ArrowLeft, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CALCULATORS, statusBadgeClass } from '@/constants/healthCalculators';
import { FORM_MAP } from '@/components/health/CalculatorForms';
import { CalculatorResult } from '@/components/health/CalculatorResult';

const ICON_MAP = {
  bmi: Calculator, bmr: TrendingUp, water_intake: Calculator, period_tracker: Calculator,
  pregnancy_tracker: Calculator, heart_health: Calculator, diabetes_risk: Calculator,
  blood_pressure: Calculator, blood_sugar: Calculator, cholesterol: Calculator,
  kidney_health: Calculator, liver_health: Calculator, stress_assessment: Calculator,
  pcos_risk: Calculator, sleep_assessment: Calculator, body_fat: Calculator, calorie: BarChart3, ideal_weight: Calculator,
};

export default function HealthCalculators() {
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  const calcMutation = useMutation({
    mutationFn: (payload) => api.post('/calculators/calculate', payload).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data.data);
      queryClient.invalidateQueries({ queryKey: ['calculator-history'] });
      queryClient.invalidateQueries({ queryKey: ['health-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const { data: historyRes } = useQuery({
    queryKey: ['calculator-history'],
    queryFn: () => api.get('/calculators/history?limit=30').then((r) => r.data),
  });

  const history = historyRes?.data || [];
  const activeCalc = CALCULATORS.find((c) => c.key === active);
  const ActiveForm = active ? FORM_MAP[active] : null;
  const filteredHistory = showHistory && active ? history.filter((h) => h.calculatorType === active) : history;

  function handleCalc(inputs) {
    setResult(null);
    calcMutation.mutate({ type: active, inputs });
  }

  return (
    <div className="space-y-6">
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-emerald-600 to-green-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <Calculator className="h-80 w-80" />
        </div>
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              <TrendingUp className="h-3.5 w-3.5" /> Personal Health Tracking
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Health Calculators</h1>
            <p className="text-emerald-100/90 text-sm md:text-base leading-relaxed">
              Calculate, save, and track vitals — BMI, blood pressure, blood sugar, kidney, liver, stress, sleep, and more.
            </p>
          </div>
          <Link to="/patient/health-analytics" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-bold backdrop-blur-sm transition">
            <BarChart3 className="h-4 w-4" /> View Analytics
          </Link>
        </div>
      </div>

      {!active ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {CALCULATORS.map((calc) => {
              const Icon = ICON_MAP[calc.key] || Calculator;
              return (
                <Card key={calc.key} onClick={() => { setActive(calc.key); setResult(null); setShowHistory(false); }}
                  className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg cursor-pointer transition-all hover:-translate-y-1 group">
                  <CardContent className="p-5 space-y-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${calc.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{calc.label}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">{calc.desc}</p>
                    </div>
                    <div className="flex items-center text-teal-600 dark:text-teal-400 text-[10px] font-bold gap-1">
                      Calculate <ChevronRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {history.length > 0 && (
            <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-5 w-5 text-slate-400" /> Recent Calculations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.slice(0, 10).map((h) => {
                  const calc = CALCULATORS.find((c) => c.key === h.calculatorType);
                  const status = h.outputs?.status || h.outputs?.category || h.outputs?.classification || h.status;
                  const color = h.outputs?.statusColor || 'slate';
                  return (
                    <div key={h._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">{calc?.emoji || '📊'}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{calc?.label || h.calculatorType}</p>
                          <p className="text-[10px] text-slate-400">{new Date(h.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {status && <Badge className={`${statusBadgeClass(color)} border-0 text-[10px] font-bold hidden sm:inline-flex`}>{status}</Badge>}
                        <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-0 text-[10px] font-bold max-w-[140px] truncate">{h.resultSummary}</Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => { setActive(null); setResult(null); }}
              className="flex items-center gap-2 text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600">
              <History className="h-4 w-4" /> {showHistory ? 'Hide History' : 'View History'}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${activeCalc.color} text-white shadow-lg`}>
                    <span className="text-xl">{activeCalc.emoji}</span>
                  </div>
                  <div>
                    <CardTitle>{activeCalc.label}</CardTitle>
                    <CardDescription>{activeCalc.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ActiveForm && <ActiveForm onSubmit={handleCalc} loading={calcMutation.isPending} />}
                {result && <CalculatorResult result={result} />}
              </CardContent>
            </Card>

            {showHistory && (
              <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">History — {activeCalc.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredHistory.filter((h) => h.calculatorType === active).length === 0 ? (
                    <p className="text-xs text-slate-400">No history yet for this calculator.</p>
                  ) : (
                    filteredHistory.filter((h) => h.calculatorType === active).map((h) => (
                      <div key={h._id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border text-xs">
                        <p className="font-bold text-slate-800 dark:text-white">{h.resultSummary}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(h.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
