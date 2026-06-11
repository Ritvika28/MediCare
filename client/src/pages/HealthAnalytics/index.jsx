import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Activity, Flame, Droplet, HeartPulse, Scale, Calendar, Sparkles, Award, Zap, AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line
} from 'recharts';

export default function HealthAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');

  // Query patient stats from dashboard endpoint
  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['patient-dashboard-stats'],
    queryFn: () => api.get('/patients/dashboard/stats').then(r => r.data),
  });

  // Query assessment history (for Health & Risk trends)
  const { data: assessmentsRes, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.get('/assessments').then(r => r.data),
  });

  // Query calculator history (for BMI, calorie, water logs)
  const { data: calculatorHistoryRes, isLoading: calcHistoryLoading } = useQuery({
    queryKey: ['calculator-history'],
    queryFn: () => api.get('/calculators/history?limit=50').then(r => r.data),
  });

  const stats = statsRes?.data || {};
  const assessments = assessmentsRes?.data || [];
  const calculatorHistory = calculatorHistoryRes?.data || [];

  const isLoading = statsLoading || assessmentsLoading || calcHistoryLoading;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-600 border-t-transparent"></div>
      </div>
    );
  }

  // Format data for Health Trends chart (assessments history)
  // We reverse it to show chronological order
  const trendsData = [...assessments]
    .reverse()
    .map(item => ({
      date: new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      'Health Score': item.healthScore,
      'Risk Score': item.riskScore,
    }));

  // Format BMI history data
  const bmiData = calculatorHistory
    .filter(item => item.calculatorType === 'bmi')
    .reverse()
    .map(item => ({
      date: new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      BMI: parseFloat(item.outputs?.bmi || item.inputs?.weight / Math.pow(item.inputs?.height / 100, 2) || 0),
    }));

  // Format Water Intake history data (grouped by date)
  const waterByDate = {};
  calculatorHistory
    .filter(item => item.calculatorType === 'water_intake')
    .forEach(item => {
      const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const intake = parseFloat(item.inputs?.amount || item.outputs?.liters || 0);
      waterByDate[dateStr] = (waterByDate[dateStr] || 0) + intake;
    });

  const waterData = Object.entries(waterByDate).map(([date, amount]) => ({
    date,
    Intake: amount,
    Target: stats.waterTarget || 3.0,
  })).reverse().slice(-10); // last 10 days

  // Format Calorie Needs history data
  const calorieData = calculatorHistory
    .filter(item => item.calculatorType === 'calorie')
    .reverse()
    .map(item => ({
      date: new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      BMR: item.outputs?.maintenance || 2000,
    }));

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <Activity className="h-80 w-80" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Live Metrics Dashboard
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight font-sans">Health & Wellness Analytics</h1>
          <p className="text-indigo-100/90 text-sm md:text-base leading-relaxed">
            Gain deep insights into your health vitals, active lifestyle indicators, medication adherence, and longitudinal wellness trends.
          </p>
        </div>
      </div>

      {/* Overview Stat Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Health Score */}
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health Score</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.healthScore || 0}/100</p>
              <Badge className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border-0 mt-1">
                {stats.healthScore >= 70 ? 'Excellent' : stats.healthScore >= 40 ? 'Fair' : 'Requires Focus'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Risk Profile */}
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition">
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`rounded-xl p-3 ${
              stats.riskScore >= 70
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                : stats.riskScore >= 40
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Risk Level</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.riskScore !== null ? `${stats.riskScore}%` : 'N/A'}</p>
              <Badge className={`text-[10px] font-bold border-0 mt-1 capitalize ${
                stats.riskLevel === 'high'
                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                  : stats.riskLevel === 'moderate'
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
              }`}>
                {stats.riskLevel || 'Unknown'} Risk
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Med Adherence */}
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meds Taken</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.overallAdherence || 0}%</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1">Adherence Rate</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Water Target */}
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl p-3 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400">
              <Droplet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hydration</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.waterIntake || 0}L</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1">Target: {stats.waterTarget || 3.0}L</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        {[
          { id: 'overview', label: 'Overall Vitals', icon: Activity },
          { id: 'hydration', label: 'Hydration Trends', icon: Droplet },
          { id: 'bmi', label: 'Weight & BMI', icon: Scale },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === t.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              {activeTab === 'overview' && 'Health vs. Risk Score Longitudinal Progression'}
              {activeTab === 'hydration' && 'Hydration Intake vs Daily Target'}
              {activeTab === 'bmi' && 'Body Mass Index (BMI) Historical Log'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'overview' && 'Visualizing overall health gains against potential risks calculated from your routine checkups.'}
              {activeTab === 'hydration' && 'Daily water logs comparing actual intake against standard recommended target.'}
              {activeTab === 'bmi' && 'Tracking structural BMI fluctuations recorded from calculations.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                if (activeTab === 'overview') {
                  return trendsData.length > 0 ? (
                    <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      <Area type="monotone" dataKey="Health Score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHealth)" />
                      <Area type="monotone" dataKey="Risk Score" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
                    </AreaChart>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400">
                      <HeartPulse className="h-12 w-12 text-slate-300 mb-2 animate-bounce" />
                      <p className="text-sm font-bold">No Assessment History Found</p>
                      <p className="text-xs">Take your first Health Risk Assessment to see trends here.</p>
                    </div>
                  );
                } else if (activeTab === 'hydration') {
                  return waterData.length > 0 ? (
                    <BarChart data={waterData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Liters', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="Intake" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400">
                      <Droplet className="h-12 w-12 text-slate-300 mb-2 animate-pulse" />
                      <p className="text-sm font-bold">No Hydration Data Found</p>
                      <p className="text-xs">Log water details via standard health calculators.</p>
                    </div>
                  );
                } else {
                  return bmiData.length > 0 ? (
                    <LineChart data={bmiData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      <Line type="monotone" dataKey="BMI" stroke="#a855f7" strokeWidth={3} activeDot={{ r: 8 }} />
                    </LineChart>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400">
                      <Scale className="h-12 w-12 text-slate-300 mb-2" />
                      <p className="text-sm font-bold">No BMI Calculation History Found</p>
                      <p className="text-xs">Run a calculation on the BMI Calculator to track weight trends.</p>
                    </div>
                  );
                }
              })()}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Side Panel: Health Tips & Recommendations */}
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Personalized Health Tips
            </CardTitle>
            <CardDescription>Dynamically generated for you based on current readings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.healthTips?.map(tip => (
              <div key={tip.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <Badge className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-0 text-[9px] uppercase font-bold mb-1.5">
                  {tip.category}
                </Badge>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                  {tip.tip}
                </p>
              </div>
            )) || <p className="text-sm text-slate-500">No active tips available</p>}
          </CardContent>
        </Card>
      </div>

      {/* Lower Row: Activity Logs and Vital Statistics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Static Health Vitals summary */}
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-rose-500" /> Vitals & Body Indicators
            </CardTitle>
            <CardDescription>Your current health indices extracted from calculators.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 grid-cols-2">
            {[
              { label: 'BMI Index', value: stats.bmi ? `${stats.bmi} kg/m²` : '22.5', icon: Scale, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/20' },
              { label: 'Daily Calories Target', value: stats.calories ? `${stats.calories} kcal` : '2,000 kcal', icon: Flame, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
              { label: 'Completed Visits', value: `${stats.completedAppointmentsCount || 0} Appointments`, icon: Calendar, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
              { label: 'Water Logged Today', value: `${stats.waterIntake || 0} Liters`, icon: Droplet, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/20' },
            ].map((vital, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 items-center">
                <div className={`p-2.5 rounded-lg shrink-0 ${vital.color}`}>
                  <vital.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{vital.label}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{vital.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent timeline of health events */}
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" /> Recent Vitals Timeline
            </CardTitle>
            <CardDescription>Track events from appointments, medical documents, and prescriptions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.activityTimeline?.length > 0 ? (
              stats.activityTimeline.map((item, i) => (
                <div key={item.id} className="flex gap-3 text-xs relative pb-4 last:pb-0">
                  {i < stats.activityTimeline.length - 1 && (
                    <div className="absolute left-2.5 top-5 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />
                  )}
                  <div className={`h-5 w-5 rounded-full shrink-0 mt-0.5 z-10 border-2 border-white dark:border-slate-950 ${
                    item.type === 'appointment' ? 'bg-emerald-500' : item.type === 'prescription' ? 'bg-indigo-500' : 'bg-rose-500'
                  }`} />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white truncate">{item.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · <span className="capitalize">{item.status || 'Active'}</span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No medical timeline entries found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
