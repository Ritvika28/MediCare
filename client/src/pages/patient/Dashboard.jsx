import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Calendar, AlertTriangle, FileText, Bot, Building2, Activity,
  Clock, Calculator, HeartPulse, Droplet, Search, Plus, Check, Clipboard,
  TrendingUp, Pill, Award, ShieldAlert, ArrowRight, UserPlus, FileHeart
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/axios';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useNearbyHospitals } from '@/hooks/useHospitals';
import { StatCard } from '@/components/shared/StatCard';
import { EmergencyButton } from '@/components/EmergencyButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

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
};

const quickActions = [
  { to: '/patient/hospitals', icon: Building2, label: 'Find Hospitals', color: 'teal' },
  { to: '/patient/appointments', icon: Calendar, label: 'Book Appointment', color: 'blue' },
  { to: '/patient/medicine-reminder', icon: Clock, label: 'Reminders', color: 'indigo' },
  { to: '/patient/health-risk-assessment', icon: HeartPulse, label: 'Risk Assessment', color: 'rose' },
  { to: '/patient/health-calculators', icon: Calculator, label: 'Calculators Hub', color: 'amber' },
  { to: '/patient/blood-banks', icon: Droplet, label: 'Blood Banks', color: 'red' },
  { to: '/patient/nearby-labs', icon: MapPin, label: 'Nearby Labs', color: 'emerald' },
  { to: '/patient/emergency-hub', icon: AlertTriangle, label: 'Emergency Hub', color: 'orange' },
  { to: '/patient/ai-assistant', icon: Bot, label: 'AI Assistant', color: 'cyan' },
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { latitude, longitude, loading: locLoading, refetch: refetchLocation } = useCurrentLocation();
  const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';
  const { data: nearbyData } = useNearbyHospitals(latitude, longitude, hasLocation);
  const nearbyCount = nearbyData?.data?.length || 0;

  // Fetch consolidated stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/patients/dashboard/stats').then((r) => r.data.data),
  });

  // Log water intake
  const logWaterMutation = useMutation({
    mutationFn: (amount) => api.post('/calculators/log', {
      calculatorType: 'water_intake',
      inputs: { amount: parseFloat(amount) },
      outputs: { waterIntakeLiters: parseFloat(amount) / 1000 },
      resultSummary: `Logged ${amount}ml water intake`
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-stats']);
      toast('Water logged successfully!', 'success');
    }
  });

  // Log medicine taken
  const logMedicineMutation = useMutation({
    mutationFn: ({ reminderId, time }) => api.post(`/reminders/${reminderId}/log`, {
      date: new Date().toISOString().split('T')[0],
      time,
      status: 'taken'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-stats']);
      toast('Medication logged as taken!', 'success');
    }
  });

  const handleLogWater = (amount) => {
    logWaterMutation.mutate(amount);
  };

  const handleLogMedicine = (reminderId, time) => {
    logMedicineMutation.mutate({ reminderId, time });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
      </div>
    );
  }

  const tip = stats?.healthTips?.[Math.floor(Math.random() * stats.healthTips.length)] || {
    tip: 'Keep tracking your daily medicines and hydration levels for a detailed health report.'
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 p-6 text-white shadow-lg dark:from-teal-800 dark:to-emerald-950">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Good Day, {user?.firstName}!</h1>
          <p className="text-teal-50/80">Manage appointments, medical vaults, and monitor daily vitals.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/patient/emergency-hub">
            <Button className="bg-red-500 font-bold hover:bg-red-600 animate-pulse text-white border-0">
              <AlertTriangle className="h-4 w-4" /> Emergency
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Health Score Circular Dial */}
        <Card className="flex flex-col justify-between overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500">Wellness Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <div className="relative flex items-center justify-center">
              <svg className="h-28 w-28 transform -rotate-90">
                <circle cx="56" cy="56" r="45" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
                <circle cx="56" cy="56" r="45" className="stroke-teal-600" strokeWidth="8" fill="transparent"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - (stats?.healthScore || 75) / 100)} />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.healthScore || 75}</span>
                <span className="text-[10px] uppercase text-slate-400 font-medium">Optimal</span>
              </div>
            </div>
          </CardContent>
          <div className="bg-slate-50 p-2.5 text-center dark:bg-slate-900 border-t dark:border-slate-800">
            <Link to="/patient/health-score" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
              View Analytics <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Health Risk Level */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500">Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4 text-center">
            {stats?.riskLevel && stats.riskLevel !== 'unknown' ? (
              <div className="space-y-2">
                <div className={cn(
                  "mx-auto flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold",
                  stats.riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                  stats.riskLevel === 'moderate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                  'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                )}>
                  {stats.riskScore}%
                </div>
                <p className="text-sm font-bold capitalize text-slate-700 dark:text-slate-200">{stats.riskLevel} Health Risk</p>
              </div>
            ) : (
              <div className="space-y-2">
                <ShieldAlert className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500">No assessment completed yet</p>
              </div>
            )}
          </CardContent>
          <div className="bg-slate-50 p-2.5 text-center dark:bg-slate-900 border-t dark:border-slate-800">
            <Link to="/patient/health-risk-assessment" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
              Take Assessment <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Water Intake Tracker */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold text-slate-500">Hydration Logger</CardTitle>
            <CardDescription className="text-xs">{stats?.waterIntake.toFixed(1)}L / {stats?.waterTarget}L target</CardDescription>
          </CardHeader>
          <CardContent className="py-2 space-y-4">
            <div className="w-full bg-slate-100 rounded-full h-3.5 dark:bg-slate-800 overflow-hidden">
              <div className="bg-blue-500 h-3.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (stats?.waterIntake / stats?.waterTarget) * 100)}%` }}></div>
            </div>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" className="text-xs h-7 py-0 px-2" onClick={() => handleLogWater(250)} disabled={logWaterMutation.isPending}>
                + 250ml
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 py-0 px-2" onClick={() => handleLogWater(500)} disabled={logWaterMutation.isPending}>
                + 500ml
              </Button>
            </div>
          </CardContent>
          <div className="bg-slate-50 p-2 text-center dark:bg-slate-900 border-t dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium">Logged today</span>
          </div>
        </Card>

        {/* BMI Widget */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500">Body Mass Index (BMI)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">{stats?.bmi || 22.5}</div>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              {stats?.bmi < 18.5 ? 'Underweight' : stats?.bmi < 25 ? 'Normal Weight' : 'Overweight'}
            </div>
          </CardContent>
          <div className="bg-slate-50 p-2.5 text-center dark:bg-slate-900 border-t dark:border-slate-800">
            <Link to="/patient/health-calculators" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
              Health Calculators <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Quick Action Grid */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to}>
              <Card className="h-full transition-shadow hover:shadow-md hover:border-teal-500/30">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <div className={cn("rounded-xl p-3", colorClasses[action.color] || 'bg-teal-50 text-teal-600')}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Middle Grid: Medicines, Appointments & Timeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Pill Schedule */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Today's Medicines</CardTitle>
              <Pill className="h-5 w-5 text-indigo-500" />
            </div>
            <CardDescription>Click to check off taken doses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
            {stats?.todayMedicines?.length ? stats.todayMedicines.map((m) => (
              <div key={m._id} className="rounded-xl border border-slate-100 p-3 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col justify-between gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{m.medicineName}</h4>
                    <p className="text-xs text-slate-400 capitalize">{m.dosage} · {m.instructions.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {m.times.map((t) => {
                    const isTaken = m.takenToday.includes(t);
                    return (
                      <Button key={t} size="sm" variant={isTaken ? 'success' : 'outline'} className={cn(
                        "text-[10px] h-6 py-0 px-2 flex items-center gap-1",
                        isTaken && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-200"
                      )} onClick={() => !isTaken && handleLogMedicine(m._id, t)} disabled={isTaken || logMedicineMutation.isPending}>
                        {isTaken ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {t}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                No medication reminders scheduled for today
              </div>
            )}
          </CardContent>
          <div className="bg-slate-50 p-3 text-center dark:bg-slate-900 border-t dark:border-slate-800">
            <Link to="/patient/medicine-reminder" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Manage Medication Reminders
            </Link>
          </div>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Upcoming Bookings</CardTitle>
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {stats?.upcomingAppointments?.length ? stats.upcomingAppointments.map((apt) => (
              <div key={apt._id} className="flex gap-3 border-b pb-3 last:border-0 dark:border-slate-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 font-bold shrink-0">
                  Dr
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm truncate">Dr. {apt.doctor?.user?.firstName} {apt.doctor?.user?.lastName}</h4>
                  <p className="text-xs text-slate-500 truncate">{apt.doctor?.specialization} · {apt.hospital?.name}</p>
                  <p className="text-xs font-medium text-teal-600 dark:text-teal-400 mt-1">{formatDateTime(apt.scheduledAt)}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                No upcoming appointments. Need a doctor?
                <Link to="/patient/hospitals" className="block text-teal-600 font-bold mt-2 hover:underline">Find a Hospital</Link>
              </div>
            )}
          </CardContent>
          <div className="bg-slate-50 p-3 text-center dark:bg-slate-900 border-t dark:border-slate-800">
            <Link to="/patient/appointments" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              View Booking History
            </Link>
          </div>
        </Card>

        {/* Health Tip of the Day */}
        <Card className="lg:col-span-1 flex flex-col justify-between bg-gradient-to-br from-teal-50/50 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/20 border-teal-100 dark:border-teal-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <CardTitle className="text-base font-bold text-teal-900 dark:text-teal-300">Daily Health Tip</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed italic">
            "{tip.tip}"
          </CardContent>
          <div className="bg-teal-600/5 p-3 text-center border-t border-teal-100 dark:border-teal-900">
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold tracking-wider uppercase">Preventive Care Advice</span>
          </div>
        </Card>
      </div>

      {/* Bottom Grid: Recent Documents & Activity Timeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Prescription Vault shortcut */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Prescription Vault</CardTitle>
              <Link to="/patient/prescriptions"><Button variant="ghost" size="sm">View Vault</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recentPrescriptions?.length ? stats.recentPrescriptions.map((p) => (
              <div key={p._id} className="flex justify-between border-b py-2 last:border-0 dark:border-slate-800 items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">Issued by Dr. {p.doctor?.user?.firstName} {p.doctor?.user?.lastName}</p>
                  <p className="text-xs text-slate-400 truncate">{p.diagnosis || 'General Diagnosis'} · {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={p.status === 'active' ? 'success' : 'outline'}>{p.status}</Badge>
              </div>
            )) : <p className="text-xs text-slate-400 py-4 text-center">No prescriptions found in vault</p>}
          </CardContent>
        </Card>

        {/* Recent Reports Vault */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Recent Medical Reports</CardTitle>
              <Link to="/patient/records"><Button variant="ghost" size="sm">View Records</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recentReports?.length ? stats.recentReports.map((r) => (
              <div key={r._id} className="flex justify-between border-b py-2 last:border-0 dark:border-slate-800 items-center">
                <div className="min-w-0 flex-1 flex gap-2.5 items-center">
                  <FileHeart className="h-6 w-6 text-purple-600" />
                  <div className="truncate">
                    <p className="font-semibold text-sm truncate">{r.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{r.recordType.replace('_', ' ')} · {new Date(r.recordDate || r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )) : <p className="text-xs text-slate-400 py-4 text-center">No medical reports uploaded yet</p>}
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
            {stats?.activityTimeline?.length ? stats.activityTimeline.map((item, idx) => (
              <div key={item.id} className="relative">
                <span className="absolute -left-[22px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white border-2 border-teal-500 dark:bg-slate-950">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                  <p className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString()} @ {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            )) : <p className="text-xs text-slate-400 py-4 text-center">No recent activities logged</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
