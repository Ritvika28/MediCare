import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { usePredictions, useForecast, useAnomalies, useHealthTwin } from '@/hooks/useML';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Activity, Droplet, HeartPulse, Scale, Sparkles, Award, AlertCircle,
  TrendingUp, TrendingDown, Minus, Calendar, Calculator, ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { statusBadgeClass } from '@/constants/healthCalculators';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const TREND_TABS = [
  { id: 'bmi', label: 'BMI', key: 'bmi', dataKey: 'value', color: '#a855f7' },
  { id: 'bp', label: 'Blood Pressure', key: 'bloodPressure', type: 'bp' },
  { id: 'sugar', label: 'Blood Sugar', key: 'bloodSugar', dataKey: 'value', color: '#f59e0b' },
  { id: 'water', label: 'Water', key: 'waterIntake', dataKey: 'liters', color: '#38bdf8' },
  { id: 'sleep', label: 'Sleep', key: 'sleep', dataKey: 'value', color: '#6366f1' },
  { id: 'heart', label: 'Heart', key: 'heartRisk', dataKey: 'value', color: '#ef4444' },
  { id: 'diabetes', label: 'Diabetes', key: 'diabetesRisk', dataKey: 'value', color: '#14b8a6' },
  { id: 'stress', label: 'Stress', key: 'stress', dataKey: 'value', color: '#8b5cf6' },
  { id: 'kidney', label: 'Kidney', key: 'kidney', dataKey: 'value', color: '#22c55e' },
  { id: 'liver', label: 'Liver', key: 'liver', dataKey: 'value', color: '#84cc16' },
];

const TYPE_COLORS = {
  calculator: 'bg-teal-500', assessment: 'bg-indigo-500',
  prescription: 'bg-violet-500', medical_record: 'bg-rose-500',
};

export default function HealthAnalytics() {
  const [activeTrend, setActiveTrend] = useState('bmi');
  const [view, setView] = useState('dashboard');
  const [range, setRange] = useState('all');

  const { data: analyticsRes, isLoading } = useQuery({
    queryKey: ['health-analytics', range],
    queryFn: () => api.get('/calculators/analytics', { params: { range } }).then((r) => r.data),
  });

  const { data: statsRes } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/patients/dashboard/stats').then((r) => r.data.data),
  });

  const { data: predictionsRes } = usePredictions();
  const { data: forecastRes } = useForecast();
  const { data: anomaliesRes } = useAnomalies();
  const { data: twinRes } = useHealthTwin();

  const data = analyticsRes?.data || {};
  const trends = data.trends || {};
  const summaryCards = (data.summaryCards || []).filter((c) => c.lastUpdated);
  const timeline = data.timeline || [];
  const insights = data.insights || [];
  const progress = data.progress || [];
  const radar = data.radar || [];
  const monthly = data.monthlyReport || {};
  const calendar = data.calendar || [];

  const calendarByDate = useMemo(() => {
    const map = {};
    calendar.forEach((c) => {
      if (!map[c.date]) map[c.date] = [];
      map[c.date].push(c);
    });
    return map;
  }, [calendar]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const trendTab = TREND_TABS.find((t) => t.id === activeTrend);
  const trendData = trendTab ? (trends[trendTab.key] || []).map((d) => ({
    ...d,
    date: fmtDate(d.date),
  })) : [];

  function renderTrendChart() {
    if (activeTrend === 'bp') {
      const bpData = (trends.bloodPressure || []).map((d) => ({ date: fmtDate(d.date), Systolic: d.systolic, Diastolic: d.diastolic }));
      if (!bpData.length) return <EmptyChart label="Blood Pressure" />;
      return (
        <LineChart data={bpData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip contentStyle={{ borderRadius: 12 }} />
          <Line type="monotone" dataKey="Systolic" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Diastolic" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      );
    }
    if (!trendData.length) return <EmptyChart label={trendTab?.label} />;
    return (
      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={trendTab.color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={trendTab.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <Tooltip contentStyle={{ borderRadius: 12 }} />
        <Area type="monotone" dataKey={trendTab.dataKey} stroke={trendTab.color} strokeWidth={2} fill="url(#trendGrad)" />
      </AreaChart>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <Activity className="h-80 w-80" />
        </div>
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Health Analytics Dashboard
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Personal Health Analytics</h1>
            <p className="text-indigo-100/90 text-sm md:text-base leading-relaxed">
              Trends, insights, and progress from your saved health data — {data.historyCount || 0} records tracked.
            </p>
          </div>
          <Link to="/patient/health-calculators">
            <Button className="bg-white/15 hover:bg-white/25 text-white border-0 font-bold gap-2">
              <Calculator className="h-4 w-4" /> Log Vitals
            </Button>
          </Link>
        </div>
      </div>

      {/* View tabs + time range */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
        {['dashboard', 'predictions', 'forecasts', 'anomalies', 'timeline', 'calendar'].map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition ${view === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
            {v === 'predictions' ? 'Disease Risks' : v === 'forecasts' ? 'Future Projections' : v === 'anomalies' ? 'Anomaly Alerts' : v}
          </button>
        ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[{ id: '7d', label: '7 Days' }, { id: '30d', label: '30 Days' }, { id: '90d', label: '90 Days' }, { id: '1y', label: '1 Year' }, { id: 'all', label: 'All Time' }].map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${range === r.id ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'dashboard' && (
        <>
          {/* Scores row */}
          {data.scores && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {[
                { label: 'Health Score', value: data.scores.healthScore },
                { label: 'Risk Score', value: data.scores.riskScore ?? '—' },
                { label: 'Improvement', value: data.scores.improvementScore },
                { label: 'Trend Score', value: data.scores.trendScore },
              ].map((s) => (
                <Card key={s.label} className="rounded-2xl border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</p>
                    <p className="text-2xl font-black text-indigo-600 mt-1">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {summaryCards.slice(0, 12).map((card) => (
              <Card key={card.type} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition">
                <CardContent className="p-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{card.label}</p>
                  {card.status ? (
                    <Badge className={`${statusBadgeClass(card.outputs?.statusColor || 'slate')} border-0 text-[10px] font-bold`}>{card.status}</Badge>
                  ) : (
                    <p className="text-lg font-black text-slate-800 dark:text-white">—</p>
                  )}
                  <p className="text-[9px] text-slate-400">{card.lastUpdated ? fmtDate(card.lastUpdated) : 'No data'}</p>
                </CardContent>
              </Card>
            ))}
            {summaryCards.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-400 text-sm">
                No health metrics logged yet. <Link to="/patient/health-calculators" className="text-indigo-600 font-bold hover:underline">Start tracking</Link>
              </div>
            )}
          </div>

          {/* Monthly report + radar */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Award className="h-5 w-5 text-amber-500" /> Monthly Health Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-indigo-600">{monthly.healthScore ?? statsRes?.healthScore ?? '—'}</div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">Composite Health Score</p>
                    <p className="text-[10px] text-slate-400">{monthly.assessmentsThisMonth ?? 0} assessments this month</p>
                  </div>
                </div>
                {monthly.improvements?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Improvements</p>
                    <ul className="space-y-1">{monthly.improvements.map((i, idx) => <li key={idx} className="text-xs text-slate-600 dark:text-slate-400">✓ {i}</li>)}</ul>
                  </div>
                )}
                {monthly.areasNeedingAttention?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Needs Attention</p>
                    <ul className="space-y-1">{monthly.areasNeedingAttention.map((i, idx) => <li key={idx} className="text-xs text-slate-600 dark:text-slate-400">⚠ {i}</li>)}</ul>
                  </div>
                )}
                {monthly.riskIndicators?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Risk Indicators</p>
                    {monthly.riskIndicators.slice(0, 4).map((r, idx) => (
                      <Badge key={idx} className="mr-1 mb-1 bg-rose-50 text-rose-700 dark:bg-rose-950/30 text-[10px]">{r.metric}: {r.status}</Badge>
                    ))}
                  </div>
                )}
                {monthly.upcomingReminders?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Reminders</p>
                    <ul className="space-y-1">{monthly.upcomingReminders.map((r, idx) => <li key={idx} className="text-xs text-slate-500">→ {r}</li>)}</ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Risk Radar</CardTitle>
                <CardDescription>Multi-dimensional health risk profile</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {radar.some((r) => r.score > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radar}>
                      <PolarGrid className="stroke-slate-200 dark:stroke-slate-800" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                      <Radar name="Health" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label="Risk Radar" hint="Log vitals to populate radar chart" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trend charts */}
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Trend Charts</CardTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {TREND_TABS.map((t) => (
                  <button key={t.id} onClick={() => setActiveTrend(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${activeTrend === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">{renderTrendChart()}</ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Insights + Progress */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500" /> Insights Engine</CardTitle>
                <CardDescription>Calculated from your health history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.length > 0 ? insights.map((ins, i) => (
                  <div key={i} className={`p-3 rounded-xl border text-xs font-semibold leading-relaxed ${
                    ins.type === 'improvement' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300' :
                    ins.type === 'attention' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-800 dark:text-amber-300' :
                    'bg-slate-50 dark:bg-slate-900/50 border-slate-200 text-slate-700 dark:text-slate-300'
                  }`}>
                    {ins.message}
                  </div>
                )) : (
                  <p className="text-xs text-slate-400">Log at least 2 readings of the same metric to generate insights.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {progress.length > 0 ? progress.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">{p.metric}</p>
                      <p className="text-[10px] text-slate-400">{p.previous} → {p.latest}</p>
                    </div>
                    <Badge className={`border-0 text-[10px] font-bold gap-1 flex items-center ${
                      p.trend === 'improved' ? 'bg-emerald-100 text-emerald-700' :
                      p.trend === 'declined' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.trend === 'improved' ? <TrendingUp className="h-3 w-3" /> : p.trend === 'declined' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {p.trend}
                    </Badge>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400">Complete multiple assessments to track progress.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {view === 'timeline' && (
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-500" /> Overall Health Timeline</CardTitle>
            <CardDescription>All health activity — newest first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.length > 0 ? timeline.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className={`h-3 w-3 rounded-full shrink-0 mt-1.5 ${TYPE_COLORS[item.type] || 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{item.title}</p>
                  <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(item.date)} · <span className="capitalize">{item.status}</span></p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
              </div>
            )) : (
              <p className="text-sm text-slate-400 text-center py-8">No timeline entries yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {view === 'calendar' && (
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-5 w-5 text-indigo-500" /> Assessment Calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(calendarByDate).sort((a, b) => b.localeCompare(a)).slice(0, 30).map((date) => (
              <div key={date}>
                <p className="text-xs font-bold text-indigo-600 mb-2">{new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <div className="space-y-1.5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-900">
                  {calendarByDate[date].map((c, i) => (
                    <div key={i} className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{c.label}</span>
                      <span className="text-slate-400"> — {c.summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(calendarByDate).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No assessments logged yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {view === 'predictions' && (
        <div className="space-y-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-500" /> Disease Risk Predictions</CardTitle>
              <CardDescription>Bar chart of calculations derived from your biometrics</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {predictionsRes?.data?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={predictionsRes.data.map(p => ({
                    name: p.predictionType.charAt(0).toUpperCase() + p.predictionType.slice(1).replace('_', ' '),
                    score: p.score
                  }))} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="Risk Predictions" hint="Log vital records to generate disease predictions" />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {predictionsRes?.data?.map((p) => (
              <Card key={p.predictionType} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">
                      {p.predictionType.replace(/_/g, ' ')}
                    </h4>
                    <Badge className={`border-0 text-[9px] font-black ${
                      p.score < 30 ? 'bg-emerald-50 text-emerald-700' :
                      p.score < 60 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>{p.riskLevel} Risk</Badge>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{p.score}%</span>
                    <span className="text-[10px] text-slate-400 font-bold">Confidence: {p.confidence}%</span>
                  </div>
                  <div className="space-y-1.5 border-t dark:border-slate-800 pt-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Contributing Factors</p>
                    <ul className="space-y-1">{p.contributingFactors?.map((f, i) => <li key={i} className="text-xs text-slate-500">• {f}</li>)}</ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase">Recommendations</p>
                    <ul className="space-y-1">{p.recommendations?.map((r, i) => <li key={i} className="text-xs text-slate-650 dark:text-slate-400 font-semibold">• {r}</li>)}</ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {view === 'forecasts' && (
        <div className="space-y-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5 text-purple-500" /> Health Score Forecast Trajectory</CardTitle>
              <CardDescription>Estimated wellness index score curve based on regression model</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {forecastRes?.data?.forecasts ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Today', score: twinRes?.data?.healthTwinScore || 75 },
                    ...forecastRes.data.forecasts.map(f => ({ name: `${f.days} Days`, score: f.score }))
                  ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="forecastGradCurve" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#forecastGradCurve)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="Forecasts" hint="Log vital entries to plot future score curves" />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {forecastRes?.data?.forecasts?.map((f) => (
              <Card key={f.days} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{f.days} Days Trajectory</CardTitle>
                  <div className="text-3xl font-black text-indigo-600 mt-2">{f.score} / 100</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl">{f.description}</p>
                  {f.projectedImprovements?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1.5">Projected Improvements</p>
                      <ul className="space-y-1">{f.projectedImprovements.map((imp, i) => <li key={i} className="text-xs text-slate-650 dark:text-slate-400">• {imp}</li>)}</ul>
                    </div>
                  )}
                  {f.potentialRisks?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-rose-500 uppercase mb-1.5">Potential Risks</p>
                      <ul className="space-y-1">{f.potentialRisks.map((risk, i) => <li key={i} className="text-xs text-slate-655 dark:text-slate-400 font-semibold">• {risk}</li>)}</ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {view === 'anomalies' && (
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-5 w-5 text-rose-500" /> Statistical Anomaly Alert Logs</CardTitle>
            <CardDescription>Trend deviations and threshold spikes detected in your vitals records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomaliesRes?.data?.length > 0 ? (
              anomaliesRes.data.map((a, i) => (
                <div key={i} className={`flex gap-3 p-4 rounded-xl border leading-relaxed font-semibold text-xs ${
                  a.severity === 'severe' ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300' :
                  a.severity === 'moderate' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300' :
                  'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-350'
                }`}>
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm">{a.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Detected: {new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge className={`border-0 text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                    a.severity === 'severe' ? 'bg-rose-100 text-rose-800' :
                    a.severity === 'moderate' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {a.severity}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No active anomalies or spikes detected in your recent vitals telemetry.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmptyChart({ label, hint }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-slate-400">
      <HeartPulse className="h-10 w-10 text-slate-300 mb-2" />
      <p className="text-sm font-bold">No {label} Data</p>
      <p className="text-xs">{hint || `Use Health Calculators to log ${label} readings.`}</p>
    </div>
  );
}
