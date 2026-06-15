import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Calendar, FileText, Pill, Activity, User, Phone, Droplet, 
  Sparkles, CheckCircle2, ChevronRight, Stethoscope, FileHeart, Award, HeartPulse, Heart
} from 'lucide-react';
import { useHealthTwin, usePredictions, useForecast, useAnomalies } from '@/hooks/useML';

export default function PatientProfile() {
  const { user, profile, fetchUser } = useAuth();
  const { toast } = useToast();

  const { data: twinData } = useHealthTwin();
  const { data: predictionsData } = usePredictions();
  const { data: forecastData } = useForecast();
  const { data: anomaliesData } = useAnomalies();

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      bloodGroup: profile?.bloodGroup || '',
      gender: profile?.gender || '',
    },
  });

  const watchedValues = watch();

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    const fields = [
      watchedValues.firstName,
      watchedValues.lastName,
      watchedValues.phone,
      watchedValues.bloodGroup,
      watchedValues.gender
    ];
    const filled = fields.filter(val => !!val?.trim?.() || !!val).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completionPercent = calculateCompletion();

  const updateMutation = useMutation({
    mutationFn: (data) => api.patch('/patients/profile/me', data),
    onSuccess: () => {
      fetchUser();
      toast('Health passport updated successfully', 'success');
    },
  });

  // Query Appointments for Timeline & Stats
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['profile-appointments'],
    queryFn: () => api.get('/appointments').then((r) => r.data.data || []),
  });
  const appointments = appointmentsData || [];

  // Query Prescriptions for Timeline & Stats
  const { data: prescriptionsData, isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['profile-prescriptions'],
    queryFn: () => api.get('/prescriptions').then((r) => r.data.data || []),
  });
  const prescriptions = prescriptionsData || [];

  // Query Medical Records for Timeline & Stats
  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['profile-records'],
    queryFn: () => api.get('/records').then((r) => r.data.data || []),
  });
  const records = recordsData || [];

  // Query calculator history for timeline
  const { data: calcHistoryData, isLoading: calcHistoryLoading } = useQuery({
    queryKey: ['calculator-history'],
    queryFn: () => api.get('/calculators/history?limit=20').then((r) => r.data.data || []),
  });
  const calcHistory = calcHistoryData || [];

  // Latest health metrics from HealthMetric engine
  const { data: healthMetricsRes, isLoading: metricsLoading } = useQuery({
    queryKey: ['profile-health-metrics'],
    queryFn: () => api.get('/patients/health-metrics').then((r) => r.data.data),
  });
  const latestMetrics = healthMetricsRes?.latest || {};
  const healthScore = healthMetricsRes?.healthScore;

  const metricCards = [
    { key: 'bmi', label: 'BMI', icon: Activity, format: (m) => m?.value ? `${m.value} kg/m²` : '—' },
    { key: 'blood_pressure', label: 'Blood Pressure', icon: HeartPulse, format: (m) => m?.metadata?.outputs ? `${m.metadata.outputs.systolic}/${m.metadata.outputs.diastolic} mmHg` : '—' },
    { key: 'blood_sugar', label: 'Blood Sugar', icon: Droplet, format: (m) => m?.value ? `${m.value} mg/dL` : '—' },
    { key: 'sleep_assessment', label: 'Sleep Score', icon: Sparkles, format: (m) => m?.score ?? '—' },
    { key: 'stress_assessment', label: 'Stress Score', icon: Heart, format: (m) => m?.score ?? '—' },
    { key: 'kidney_health', label: 'Kidney Score', icon: Stethoscope, format: (m) => m?.value ? `eGFR ${m.value}` : '—' },
    { key: 'liver_health', label: 'Liver Score', icon: FileHeart, format: (m) => m?.score ?? m?.value ?? '—' },
  ];

  // Merge & Sort all entries chronologically (newest first)
  const [timeline, setTimeline] = useState([]);
  
  useEffect(() => {
    const list = [];

    appointments.forEach((apt) => {
      list.push({
        id: `apt_${apt._id}`,
        date: new Date(apt.scheduledAt || apt.appointmentDate),
        type: 'appointment',
        title: `Appointment with Dr. ${apt.doctor?.user?.firstName || ''} ${apt.doctor?.user?.lastName || ''}`,
        subtitle: `${apt.doctor?.specialization || 'General Practitioner'} · ${apt.hospital?.name || 'Medicare Center'}`,
        badge: apt.status,
        badgeVariant: apt.status === 'confirmed' || apt.status === 'completed' ? 'success' : 'secondary',
        icon: Calendar,
        colorClass: 'bg-teal-500/10 text-teal-605 dark:bg-teal-950/40',
      });
    });

    prescriptions.forEach((pres) => {
      list.push({
        id: `pres_${pres._id}`,
        date: new Date(pres.createdAt || pres.date),
        type: 'prescription',
        title: `Prescription issued by Dr. ${pres.doctor?.user?.firstName || ''} ${pres.doctor?.user?.lastName || ''}`,
        subtitle: `Medicines: ${pres.medicines?.map(m => m.name).join(', ') || 'General therapy'}`,
        badge: 'Prescribed',
        badgeVariant: 'success',
        icon: Pill,
        colorClass: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/40',
      });
    });

    records.forEach((rec) => {
      list.push({
        id: `rec_${rec._id}`,
        date: new Date(rec.createdAt || rec.date),
        type: 'record',
        title: rec.title || 'Medical Record File',
        subtitle: `${rec.type || 'Diagnostics'} · ${rec.doctorName || 'Attending Physician'}`,
        badge: rec.category || 'General',
        badgeVariant: 'secondary',
        icon: FileText,
        colorClass: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40',
      });
    });

    calcHistory.forEach((calc) => {
      const labels = {
        blood_pressure: 'Blood Pressure Assessment',
        blood_sugar: 'Blood Sugar Test',
        kidney_health: 'Kidney Health Assessment',
        liver_health: 'Liver Health Assessment',
        stress_assessment: 'Stress Assessment',
        sleep_assessment: 'Sleep Assessment',
        cholesterol: 'Cholesterol Assessment',
        pcos_risk: 'PCOS Risk Assessment',
        bmi: 'BMI Calculation',
        heart_health: 'Heart Health Assessment',
        diabetes_risk: 'Diabetes Risk Assessment',
      };
      list.push({
        id: `calc_${calc._id}`,
        date: new Date(calc.createdAt),
        type: 'calculator',
        title: labels[calc.calculatorType] || `${calc.calculatorType.replace(/_/g, ' ')} completed`,
        subtitle: calc.resultSummary,
        badge: calc.outputs?.status || calc.outputs?.category || calc.outputs?.classification || 'Logged',
        badgeVariant: 'success',
        icon: HeartPulse,
        colorClass: 'bg-amber-500/10 text-amber-600 dark:bg-amber-950/40',
      });
    });

    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    setTimeline(list);
  }, [appointmentsData, prescriptionsData, recordsData, calcHistoryData]);

  const timelineLoading = appointmentsLoading || prescriptionsLoading || recordsLoading || calcHistoryLoading;

  return (
    <div className="space-y-6">
      {/* Banner / Title */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <Award className="h-80 w-80 text-teal-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold uppercase tracking-wider border border-teal-500/25">
              <Sparkles className="h-3.5 w-3.5" /> Premium Health Passport
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              Dr. {user?.firstName}'s Health Desk
            </h1>
            <p className="text-slate-405 text-sm max-w-xl">
              Consolidated medical record counts, personal health cards, and chronological clinical history tracking.
            </p>
          </div>

          {/* Profile Completion Meter */}
          <div className="flex items-center gap-4 bg-slate-850/50 p-4 rounded-2xl border border-slate-800 shrink-0 backdrop-blur-sm">
            <div className="relative h-14 w-14 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#1e293b" strokeWidth="4" />
                <circle cx="28" cy="28" r="24" fill="none" stroke="#0d9488" strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - completionPercent / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xs font-black text-teal-400">{completionPercent}%</span>
            </div>
            <div>
              <p className="text-xs font-black text-slate-300">Passport Status</p>
              <p className="text-[10px] text-slate-450 mt-0.5">{completionPercent === 100 ? 'Fully Complete' : 'Incomplete details'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Metrics Summary */}
      <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
        <CardHeader className="pb-3 border-b dark:border-slate-800/80">
          <CardTitle className="text-base flex items-center gap-2 text-slate-850 dark:text-white font-black">
            <HeartPulse className="h-5 w-5 text-rose-500" /> Latest Health Metrics
            {healthScore != null && (
              <Badge variant="success" className="ml-auto text-[10px] font-bold">Health Score: {healthScore}</Badge>
            )}
          </CardTitle>
          <CardDescription>From calculators and assessments — persists across sessions</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {metricsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metricCards.map(({ key, label, icon: Icon, format }) => {
                const m = latestMetrics[key];
                return (
                  <div key={key} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="h-3.5 w-3.5 text-teal-600" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">{format(m)}</p>
                    {m?.riskLevel && <p className="text-[9px] text-slate-500 mt-0.5">{m.riskLevel}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Past consultations', count: appointments.length, icon: Calendar, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/20' },
          { label: 'Active prescriptions', count: prescriptions.length, icon: Pill, color: 'text-indigo-650 bg-indigo-50 dark:bg-indigo-950/20' },
          { label: 'Uploaded Health Files', count: records.length, icon: FileText, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
        ].map((stat) => (
          <Card key={stat.label} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl shrink-0 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-850 dark:text-white">{stat.count}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Main Content Panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Personal Info Passport Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b dark:border-slate-800/80">
              <CardTitle className="text-base flex items-center gap-2 text-slate-850 dark:text-white font-black">
                <User className="h-5 w-5 text-teal-605" /> Passport Settings
              </CardTitle>
              <CardDescription>Keep your clinical variables up to date</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">First Name</label>
                    <Input {...register('firstName')} placeholder="First Name" className="text-xs rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Last Name</label>
                    <Input {...register('lastName')} placeholder="Last Name" className="text-xs rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Phone Number</label>
                  <Input {...register('phone')} placeholder="Phone" className="text-xs rounded-xl" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Blood Group</label>
                  <Input {...register('bloodGroup')} placeholder="e.g. O+" className="text-xs rounded-xl" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Gender</label>
                  <select 
                    {...register('gender')} 
                    className="flex h-10 w-full rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-250 focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="w-full bg-teal-650 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl shadow"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Save Profile Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Health Twin Card in Profile */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mt-6">
            <CardHeader className="pb-3 border-b dark:border-slate-800/80">
              <CardTitle className="text-base flex items-center gap-2 text-slate-850 dark:text-white font-black">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" /> Health Twin Score: {twinData?.data?.healthTwinScore ?? '—'}
              </CardTitle>
              <CardDescription>Estimated biological age: {twinData?.data?.biologicalAgeEstimate ?? '—'} yrs</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Top Risks */}
              <div>
                <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">Top Risk Factors</p>
                <div className="flex flex-wrap gap-1.5">
                  {predictionsData?.data?.filter(p => p.score >= 50).map(p => (
                    <Badge key={p.predictionType} className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200/50 text-[10px] font-bold">
                      ⚠️ {p.predictionType.charAt(0).toUpperCase() + p.predictionType.slice(1).replace('_', ' ')} ({p.score}%)
                    </Badge>
                  ))}
                  {!predictionsData?.data?.some(p => p.score >= 50) && (
                    <span className="text-xs text-slate-500 font-semibold">✓ Vitals within normal ranges</span>
                  )}
                </div>
              </div>

              {/* Trajectory */}
              {forecastData?.data?.forecasts && (
                <div className="border-t dark:border-slate-800 pt-3">
                  <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">Forecast Trajectory</p>
                  <div className="space-y-1 text-xs text-slate-650 dark:text-slate-400 font-semibold">
                    {forecastData.data.forecasts.map(f => (
                      <div key={f.days} className="flex justify-between">
                        <span>{f.days} Days Trajectory</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{f.score}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Anomalies */}
              {anomaliesData?.data?.length > 0 && (
                <div className="border-t dark:border-slate-800 pt-3">
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2">Active Alerts</p>
                  <div className="space-y-2">
                    {anomaliesData.data.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-[11px] text-rose-700 bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100/50 leading-relaxed font-semibold">
                        {a.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Consolidated Health Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b dark:border-slate-800/80">
              <CardTitle className="text-base flex items-center gap-2 text-slate-850 dark:text-white font-black">
                <FileHeart className="h-5 w-5 text-teal-605" /> Consolidated Health Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {timelineLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
                  <Activity className="h-10 w-10 text-slate-400 mx-auto mb-2 animate-pulse" />
                  <p className="font-extrabold text-slate-850 dark:text-slate-200">No medical timeline entries found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Use health calculators or upload medical records to build clinical history.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800/60 ml-4 pl-6 space-y-6">
                  {timeline.slice(0, 15).map((item) => (
                    <div key={item.id} className="relative group">
                      {/* Timeline Dot Indicator */}
                      <span className={`absolute -left-[37px] top-1.5 flex h-6.5 w-6.5 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 ${item.colorClass} shadow-sm transition transform group-hover:scale-110 duration-200`}>
                        <item.icon className="h-3.5 w-3.5" />
                      </span>

                      {/* Timeline Card */}
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm transition hover:border-teal-500/30 flex flex-wrap justify-between items-start gap-4">
                        <div className="space-y-1 flex-1">
                          <p className="text-xs font-semibold text-slate-400">
                            {item.date.toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">{item.title}</h4>
                          <p className="text-xs text-slate-505 leading-relaxed font-semibold">{item.subtitle}</p>
                        </div>
                        <Badge variant={item.badgeVariant} className="text-[9px] uppercase font-extrabold tracking-wider border-0 px-2.5 py-0.5 rounded-full">
                          {item.badge}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
