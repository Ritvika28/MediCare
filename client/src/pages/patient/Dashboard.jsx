import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, AlertTriangle, FileText, Bot, Building2, Activity,
  Clock, Calculator, HeartPulse, Droplet, Check, FileHeart,
  TrendingUp, Pill, Award, ShieldAlert, ArrowRight, Stethoscope, Sparkles,
  Syringe, Heart, Archive
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/axios';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { StatCard } from '@/components/shared/StatCard';
import { EmergencyButton } from '@/components/EmergencyButton';
import { DashboardNotificationPanels } from '@/components/dashboard/DashboardNotificationPanels';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { useHealthTwin } from '@/hooks/useML';

const colorClasses = {
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400',
  pink: 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400',
};

const quickActions = [
  { to: '/doctors', icon: Stethoscope, label: 'Find Doctors', color: 'blue' },
  { to: '/patient/hospitals', icon: Building2, label: 'Find Hospitals', color: 'teal' },
  { to: '/patient/nearby-labs', icon: MapPin, label: 'Nearby Labs', color: 'emerald' },
  { to: '/patient/blood-banks', icon: Droplet, label: 'Blood Banks', color: 'red' },
  { to: '/patient/records', icon: FileText, label: 'Medical Records', color: 'purple' },
  { to: '/patient/prescriptions', icon: Archive, label: 'Prescription Vault', color: 'indigo' },
  { to: '/patient/ai-assistant', icon: Bot, label: 'AI Assistant', color: 'cyan' },
  { to: '/patient/emergency-hub', icon: AlertTriangle, label: 'Emergency SOS', color: 'rose' },
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { latitude, longitude, loading: locLoading, refetch: refetchLocation } = useCurrentLocation();
  const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/patients/dashboard/stats').then((r) => r.data.data),
  });

  const { data: twinData } = useHealthTwin();

  const logWaterMutation = useMutation({
    mutationFn: (amountMl) => api.post('/calculators/log', {
      calculatorType: 'water_intake',
      inputs: { amountMl },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['health-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['calculator-history'] });
      queryClient.invalidateQueries({ queryKey: ['notification-summary'] });
      toast('Water logged successfully!', 'success');
    },
  });

  const logMedicineMutation = useMutation({
    mutationFn: ({ reminderId, time }) => api.post(`/reminders/${reminderId}/log`, {
      date: new Date().toISOString().split('T')[0],
      time,
      status: 'taken',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notification-summary'] });
      toast('Medication logged as taken!', 'success');
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  const tip = stats?.healthTips?.[0] || {
    tip: 'Keep tracking your daily medicines and hydration levels for a detailed health report.',
  };

  const insight = stats?.analyticsInsights?.[0];

  return (
    <div className="space-y-8">
      <EmergencyButton />

      {/* Top Banner */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-6 md:p-8 text-white shadow-xl overflow-hidden border border-slate-800">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 h-64 w-64 bg-teal-400 rounded-full blur-3xl translate-x-20 -translate-y-20" />
          <div className="absolute bottom-0 left-0 h-48 w-48 bg-indigo-400 rounded-full blur-3xl -translate-x-16 translate-y-16" />
        </div>
        <div className="relative space-y-1.5 z-10">
          <p className="text-teal-300 text-xs font-bold uppercase tracking-widest">Welcome back</p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Good Day, {user?.firstName}! 👋</h1>
          <p className="text-slate-400 text-sm max-w-md">Your personal health dashboard — track vitals, medications, and wellness all in one place.</p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-2">
          <Link to="/patient/emergency">
            <Button className="bg-rose-500 hover:bg-rose-600 font-bold text-white border-0 shadow-lg animate-pulse rounded-xl">
              <AlertTriangle className="h-4 w-4 mr-1.5" /> Emergency SOS
            </Button>
          </Link>
          <Link to="/patient/health-calculators">
            <Button variant="outline" className="bg-white/10 border-slate-700 text-white hover:bg-white/20 font-bold rounded-xl">
              <Calculator className="h-4 w-4 mr-1.5" /> Log Health Data
            </Button>
          </Link>
        </div>
      </div>

      {/* — SECTION 1: Score Cards (4-up) — */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Wellness Score */}
        <Card className="flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-500">Wellness Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <div className="relative flex items-center justify-center">
              <svg className="h-28 w-28 transform -rotate-90">
                <circle cx="56" cy="56" r="45" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
                <circle cx="56" cy="56" r="45" className="stroke-teal-500" strokeWidth="8" fill="transparent"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - (stats?.healthScore || 75) / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats?.healthScore || 75}</span>
                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">/ 100</span>
              </div>
            </div>
          </CardContent>
          <div className="bg-slate-50 p-2.5 text-center dark:bg-slate-900/80 border-t dark:border-slate-800">
            <Link to="/patient/health-analytics" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
              View Analytics <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Risk Assessment */}
        <Card className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-500">Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4 text-center">
            {stats?.riskLevel && stats.riskLevel !== 'unknown' ? (
              <div className="space-y-2">
                <div className={cn(
                  'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black border-2',
                  stats.riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' :
                  stats.riskLevel === 'moderate' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' :
                  'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                )}>
                  {stats.riskScore}%
                </div>
                <p className="text-sm font-black capitalize text-slate-700 dark:text-slate-200">{stats.riskLevel} Risk</p>
              </div>
            ) : (
              <div className="space-y-2">
                <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 font-semibold">No assessment yet</p>
              </div>
            )}
          </CardContent>
          <div className="bg-slate-50 p-2.5 text-center dark:bg-slate-900/80 border-t dark:border-slate-800">
            <Link to="/patient/health-risk-assessment" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
              Take Assessment <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Hydration Logger */}
        <Card className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-slate-500">Daily Hydration</CardTitle>
            <CardDescription className="text-xs font-semibold">{(stats?.waterIntake ?? 0).toFixed(1)}L / {stats?.waterTarget ?? 3}L target</CardDescription>
          </CardHeader>
          <CardContent className="py-2 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>Progress</span>
                <span>{Math.min(100, Math.round(((stats?.waterIntake ?? 0) / (stats?.waterTarget ?? 3)) * 100))}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 dark:bg-slate-800 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-400 to-cyan-500 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, ((stats?.waterIntake ?? 0) / (stats?.waterTarget ?? 3)) * 100)}%` }} />
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" className="text-xs h-7 py-0 px-2.5 rounded-lg" onClick={() => logWaterMutation.mutate(250)} disabled={logWaterMutation.isPending}>+ 250ml</Button>
              <Button size="sm" variant="outline" className="text-xs h-7 py-0 px-2.5 rounded-lg" onClick={() => logWaterMutation.mutate(500)} disabled={logWaterMutation.isPending}>+ 500ml</Button>
            </div>
          </CardContent>
        </Card>

        {/* BMI */}
        <Card className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-500">Body Mass Index</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <div className="text-4xl font-black text-teal-600 dark:text-teal-400">{stats?.bmi ?? '—'}</div>
            <div className="mt-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              {stats?.bmi != null ? (stats.bmi < 18.5 ? 'Underweight' : stats.bmi < 25 ? '✓ Normal' : stats.bmi < 30 ? 'Overweight' : 'Obese') : 'Not logged'}
            </div>
          </CardContent>
          <div className="bg-slate-50 p-2.5 text-center dark:bg-slate-900/80 border-t dark:border-slate-800">
            <Link to="/patient/health-calculators" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
              Log BMI <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* — SECTION 2: Quick Actions — */}
      <section>
        <h2 className="mb-4 text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <span className="block h-1 w-4 rounded-full bg-teal-500" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to}>
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-teal-500/40 duration-200 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <CardContent className="flex flex-col items-center gap-2.5 p-4 text-center">
                  <div className={cn('rounded-xl p-2.5', colorClasses[action.color] || 'bg-teal-50 text-teal-600')}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* — SECTION 3: Vitals Row — */}
      <section>
        <h2 className="mb-4 text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <span className="block h-1 w-4 rounded-full bg-rose-500" /> Key Vitals
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <StatCard title="Blood Pressure" value={stats?.bloodPressure || '—'} trend={stats?.bloodPressureStatus} icon={HeartPulse} color="orange" />
          <StatCard title="Blood Sugar" value={stats?.bloodSugar != null ? `${stats.bloodSugar} mg/dL` : '—'} trend={stats?.bloodSugarStatus} icon={Activity} color="blue" />
          <StatCard title="Sleep Score" value={stats?.sleepScore != null ? `${stats.sleepScore}/100` : '—'} trend={stats?.sleepStatus} icon={Clock} color="purple" />
          <StatCard title="Stress Level" value={stats?.stressLevel || '—'} trend="Latest assessment" icon={ShieldAlert} color="teal" />
          <StatCard title="Heart Score" value={stats?.heartScore != null ? `${stats.heartScore}/100` : '—'} trend="Cardiovascular" icon={Heart} color="orange" />
        </div>
      </section>

      {/* — SECTION 4: Health Progress + Health Twin — */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Health Progress */}
        <Card className="flex flex-col justify-between rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" /> Health Progress Snapshot
            </CardTitle>
            <CardDescription>From your saved health metrics and assessments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-center border dark:border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Health Score</p>
                <p className="text-xl font-black text-teal-600">{stats?.analyticsScores?.healthScore ?? stats?.healthScore ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-center border dark:border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Risk Score</p>
                <p className="text-xl font-black text-rose-600">{stats?.analyticsScores?.riskScore ?? stats?.riskScore ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-center border dark:border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Improvement</p>
                <p className="text-xl font-black text-emerald-600">{stats?.analyticsScores?.improvementScore ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-center border dark:border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Last Assessment</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">
                  {stats?.recentAssessment?.date
                    ? new Date(stats.recentAssessment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : '—'}
                </p>
              </div>
            </div>
            {insight ? (
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-3">
                <p className="text-xs font-black text-indigo-800 dark:text-indigo-300">Recent Insight</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{insight.message}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">Use calculators to generate insights</p>
            )}
          </CardContent>
          <div className="bg-slate-50 p-3 text-center dark:bg-slate-900/80 border-t dark:border-slate-800">
            <Link to="/patient/health-analytics" className="text-xs font-bold text-indigo-600 hover:underline">Open Health Analytics</Link>
          </div>
        </Card>

        {/* Health Twin */}
        <Card className="flex flex-col justify-between rounded-2xl shadow-sm border border-indigo-100/60 dark:border-indigo-950 bg-gradient-to-br from-white to-indigo-50/20 dark:from-slate-900/50 dark:to-indigo-950/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" /> Personal Health Twin
              </CardTitle>
              {twinData?.data && (
                <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 text-[9px] font-black border-0">
                  Score: {twinData.data.healthTwinScore}
                </Badge>
              )}
            </div>
            <CardDescription>Virtual model of your health &amp; biological age</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {twinData?.data ? (
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2 dark:border-slate-800 items-baseline">
                  <div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{twinData.data.healthAge} yrs</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Biological Health Age</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{twinData.data.healthStabilityIndex}%</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Stability Index</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Primary Risk Areas</p>
                  <div className="flex flex-wrap gap-1">
                    {twinData.data.riskAreas?.length > 0 ? (
                      twinData.data.riskAreas.slice(0, 3).map(r => (
                        <Badge key={r} className="bg-rose-50 text-rose-700 border-rose-100 text-[9px] font-bold dark:bg-rose-950/30 dark:text-rose-400">
                          ⚠️ {r}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold">✓ All systems stable</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2 border-2 border-dashed dark:border-slate-800 rounded-2xl">
                <Sparkles className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs text-slate-400 font-semibold">Your health twin is not initialized yet. Log health assessments to activate it.</p>
              </div>
            )}
          </CardContent>
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 text-center border-t border-indigo-100 dark:border-indigo-950">
            <Link to="/patient/health-twin" className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
              Open Health Twin <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* — SECTION 5: Notification Widgets — */}
      <DashboardNotificationPanels latitude={latitude} longitude={longitude} hasLocation={hasLocation} />

      {/* — SECTION 6: Medicines + Daily Tip — */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col justify-between rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-black">Today's Medicines</CardTitle>
              <Pill className="h-5 w-5 text-indigo-500" />
            </div>
            <CardDescription>Click to mark doses as taken</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
            {stats?.todayMedicines?.length ? stats.todayMedicines.map((m) => (
              <div key={m._id} className="rounded-xl border border-slate-100 p-3 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col justify-between gap-2">
                <div>
                  <h4 className="font-black text-sm text-slate-800 dark:text-slate-100">{m.medicineName}</h4>
                  <p className="text-xs text-slate-400 font-semibold capitalize">{m.dosage} · {m.instructions.replace('_', ' ')}</p>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {m.times.map((t) => {
                    const isTaken = m.takenToday.includes(t);
                    return (
                      <Button key={t} size="sm" variant={isTaken ? 'success' : 'outline'} className={cn(
                        'text-[10px] h-6 py-0 px-2 flex items-center gap-1 rounded-lg',
                        isTaken && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      )} onClick={() => !isTaken && logMedicineMutation.mutate({ reminderId: m._id, time: t })} disabled={isTaken || logMedicineMutation.isPending}>
                        {isTaken ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {t}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed dark:border-slate-800 rounded-xl">No medication reminders scheduled for today</div>
            )}
          </CardContent>
          <div className="bg-slate-50 p-3 text-center dark:bg-slate-900/80 border-t dark:border-slate-800">
            <Link to="/patient/medicine-reminder" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              Manage Medication Reminders
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col justify-between bg-gradient-to-br from-teal-50/50 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-100 dark:border-teal-900 rounded-2xl shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <CardTitle className="text-base font-black text-teal-900 dark:text-teal-300">Daily Health Tip</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed italic flex-1">
            &ldquo;{tip.tip}&rdquo;
          </CardContent>
          <div className="bg-teal-600/5 p-3 text-center border-t border-teal-100 dark:border-teal-900">
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold tracking-wider uppercase">Preventive Care Advice</span>
          </div>
        </Card>
      </div>

      {/* — SECTION 7: Records Row — */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-black">Prescription Vault</CardTitle>
              <Link to="/patient/prescriptions"><Button variant="ghost" size="sm" className="text-xs font-bold">View Vault</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recentPrescriptions?.length ? stats.recentPrescriptions.map((p) => (
              <div key={p._id} className="flex justify-between border-b py-2 last:border-0 dark:border-slate-800 items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">Dr. {p.doctor?.user?.firstName} {p.doctor?.user?.lastName}</p>
                  <p className="text-xs text-slate-400 truncate font-semibold">{p.diagnosis || 'General Diagnosis'} · {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={p.status === 'active' ? 'success' : 'outline'} className="text-[10px] font-bold">{p.status}</Badge>
              </div>
            )) : <p className="text-xs text-slate-400 py-4 text-center font-semibold">No prescriptions found in vault</p>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-black">Recent Medical Reports</CardTitle>
              <Link to="/patient/records"><Button variant="ghost" size="sm" className="text-xs font-bold">View Records</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recentReports?.length ? stats.recentReports.map((r) => (
              <div key={r._id} className="flex justify-between border-b py-2 last:border-0 dark:border-slate-800 items-center">
                <div className="min-w-0 flex-1 flex gap-2.5 items-center">
                  <FileHeart className="h-6 w-6 text-purple-600 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-sm truncate">{r.title}</p>
                    <p className="text-xs text-slate-400 capitalize font-semibold">{r.recordType?.replace('_', ' ')} · {new Date(r.recordDate || r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )) : <p className="text-xs text-slate-400 py-4 text-center font-semibold">No medical reports uploaded yet</p>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-black">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
            {stats?.activityTimeline?.length ? stats.activityTimeline.map((item) => (
              <div key={item.id} className="relative">
                <span className="absolute -left-[22px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-teal-500 dark:bg-slate-950">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{new Date(item.date).toLocaleDateString()} @ {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            )) : <p className="text-xs text-slate-400 py-4 text-center font-semibold">No recent activities logged</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
