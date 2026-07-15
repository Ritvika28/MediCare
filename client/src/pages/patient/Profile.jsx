import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
  Sparkles, Shield, FileHeart, Award, HeartPulse, Heart,
  Building2, AlertCircle, ChevronDown, ChevronUp, MapPin
} from 'lucide-react';
import { useHealthTwin, usePredictions, useForecast, useAnomalies } from '@/hooks/useML';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' } }),
};

const TIMELINE_COLORS = {
  appointment: 'bg-teal-500/15 text-teal-600 border-teal-200/60 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50',
  prescription: 'bg-indigo-500/15 text-indigo-600 border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50',
  record: 'bg-emerald-500/15 text-emerald-600 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50',
  calculator: 'bg-amber-500/15 text-amber-600 border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50',
};

const TIMELINE_DOTS = {
  appointment: 'bg-teal-500',
  prescription: 'bg-indigo-500',
  record: 'bg-emerald-500',
  calculator: 'bg-amber-500',
};

export default function PatientProfile() {
  const { user, profile, fetchUser, authInitialized } = useAuth();
  const token = localStorage.getItem('accessToken');
  const isEnabled = !!user && !!token && authInitialized;
  const { toast } = useToast();

  console.log('[Profile UI] Render cycle details:', { authInitialized, user: !!user, token: !!token, isEnabled });
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  const { data: twinData } = useHealthTwin();
  const { data: predictionsData } = usePredictions();
  const { data: forecastData } = useForecast();
  const { data: anomaliesData } = useAnomalies();

  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState(profile?.allergies || []);
  const allergyInputRef = useRef(null);

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      dateOfBirth: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
      bloodGroup: profile?.bloodGroup || '',
      gender: profile?.gender || '',
      addressCity: profile?.address?.city || '',
      addressState: profile?.address?.state || '',
      addressZip: profile?.address?.zipCode || '',
      insuranceProvider: profile?.insuranceProvider || '',
      insuranceNumber: profile?.insuranceNumber || '',
      emergencyContactName: profile?.emergencyContact?.name || '',
      emergencyContactPhone: profile?.emergencyContact?.phone || '',
      emergencyContactRelationship: profile?.emergencyContact?.relationship || '',
    },
  });

  // Reset form when profile/user loads
  useEffect(() => {
    if (user || profile) {
      reset({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || '',
        dateOfBirth: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
        bloodGroup: profile?.bloodGroup || '',
        gender: profile?.gender || '',
        addressCity: profile?.address?.city || '',
        addressState: profile?.address?.state || '',
        addressZip: profile?.address?.zipCode || '',
        insuranceProvider: profile?.insuranceProvider || '',
        insuranceNumber: profile?.insuranceNumber || '',
        emergencyContactName: profile?.emergencyContact?.name || '',
        emergencyContactPhone: profile?.emergencyContact?.phone || '',
        emergencyContactRelationship: profile?.emergencyContact?.relationship || '',
      });
      if (profile?.allergies?.length) setAllergies(profile.allergies);
    }
  }, [user, profile, reset]);

  const watchedValues = watch();

  const calculateCompletion = () => {
    const fields = [
      watchedValues.firstName,
      watchedValues.lastName,
      watchedValues.phone,
      watchedValues.dateOfBirth,
      watchedValues.bloodGroup,
      watchedValues.gender,
      watchedValues.addressCity,
      watchedValues.insuranceProvider,
      watchedValues.emergencyContactName,
      watchedValues.emergencyContactPhone,
      allergies.length > 0 ? 'filled' : '',
    ];
    const filled = fields.filter(val => !!val?.trim?.() || !!val).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completionPercent = calculateCompletion();

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth || undefined,
        bloodGroup: data.bloodGroup,
        gender: data.gender,
        allergies,
        address: {
          city: data.addressCity,
          state: data.addressState,
          zipCode: data.addressZip,
          country: 'India',
        },
        insuranceProvider: data.insuranceProvider,
        insuranceNumber: data.insuranceNumber,
        emergencyContact: {
          name: data.emergencyContactName,
          phone: data.emergencyContactPhone,
          relationship: data.emergencyContactRelationship,
        },
      };
      return api.patch('/patients/profile/me', payload);
    },
    onSuccess: () => {
      fetchUser();
      toast('Health passport updated successfully', 'success');
    },
    onError: () => toast('Failed to update profile', 'error'),
  });

  const addAllergy = () => {
    const val = allergyInput.trim();
    if (!val || allergies.includes(val)) { setAllergyInput(''); return; }
    setAllergies(prev => [...prev, val]);
    setAllergyInput('');
    allergyInputRef.current?.focus();
  };

  const removeAllergy = (a) => setAllergies(prev => prev.filter(x => x !== a));

  const appointments = [];
  const appointmentsLoading = false;

  const { data: prescriptionsData, isLoading: prescriptionsLoading, error: prescriptionsError } = useQuery({
    queryKey: ['profile-prescriptions'],
    queryFn: () => api.get('/prescriptions').then((r) => r.data.data || []),
    enabled: isEnabled,
  });
  const prescriptions = prescriptionsData || [];

  const { data: recordsData, isLoading: recordsLoading, error: recordsError } = useQuery({
    queryKey: ['profile-records'],
    queryFn: () => api.get('/records').then((r) => r.data.data || []),
    enabled: isEnabled,
  });
  const records = recordsData || [];

  const { data: calcHistoryData, isLoading: calcHistoryLoading, error: calcHistoryError } = useQuery({
    queryKey: ['calculator-history'],
    queryFn: () => api.get('/calculators/history?limit=20').then((r) => r.data.data || []),
    enabled: isEnabled,
  });
  const calcHistory = calcHistoryData || [];

  const { data: healthMetricsRes, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['profile-health-metrics'],
    queryFn: () => api.get('/patients/health-metrics').then((r) => r.data.data),
    enabled: isEnabled,
  });
  const latestMetrics = healthMetricsRes?.latest || {};
  const healthScore = healthMetricsRes?.healthScore;

  const metricCards = [
    { key: 'bmi', label: 'BMI', icon: Activity, format: (m) => m?.value ? `${m.value} kg/m²` : '—', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
    { key: 'blood_pressure', label: 'Blood Pressure', icon: HeartPulse, format: (m) => m?.metadata?.outputs ? `${m.metadata.outputs.systolic}/${m.metadata.outputs.diastolic} mmHg` : '—', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30' },
    { key: 'blood_sugar', label: 'Blood Sugar', icon: Droplet, format: (m) => m?.value ? `${m.value} mg/dL` : '—', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
    { key: 'sleep_assessment', label: 'Sleep Score', icon: Sparkles, format: (m) => m?.score != null ? `${m.score}/100` : '—', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' },
    { key: 'stress_assessment', label: 'Stress Score', icon: Heart, format: (m) => m?.score != null ? `${m.score}/100` : '—', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30' },
    { key: 'kidney_health', label: 'Kidney Score', icon: Shield, format: (m) => m?.value ? `eGFR ${m.value}` : '—', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30' },
    { key: 'liver_health', label: 'Liver Score', icon: FileHeart, format: (m) => m?.score ?? m?.value ?? '—', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
  ];

  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    const list = [];

    // Appointments timeline elements removed

    prescriptions.forEach((pres) => {
      list.push({
        id: `pres_${pres._id}`,
        date: new Date(pres.createdAt || pres.date),
        type: 'prescription',
        title: `Prescription from Dr. ${pres.doctor?.user?.firstName || ''} ${pres.doctor?.user?.lastName || ''}`.trim() || 'Prescription Issued',
        subtitle: `Medicines: ${pres.medicines?.map(m => m.name).join(', ') || 'General therapy'}`,
        badge: 'Prescribed',
        badgeVariant: 'success',
        icon: Pill,
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
      });
    });

    const CALC_LABELS = {
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

    calcHistory.forEach((calc) => {
      list.push({
        id: `calc_${calc._id}`,
        date: new Date(calc.createdAt),
        type: 'calculator',
        title: CALC_LABELS[calc.calculatorType] || `${calc.calculatorType.replace(/_/g, ' ')} Completed`,
        subtitle: calc.resultSummary || 'Health metric logged',
        badge: calc.outputs?.status || calc.outputs?.category || calc.outputs?.classification || 'Logged',
        badgeVariant: 'success',
        icon: HeartPulse,
      });
    });

    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    setTimeline(list);
  }, [prescriptionsData, recordsData, calcHistoryData]);

  const timelineLoading = appointmentsLoading || prescriptionsLoading || recordsLoading || calcHistoryLoading;
  const displayedTimeline = showAllTimeline ? timeline : timeline.slice(0, 10);

  if (!authInitialized || !user) {
    console.log('[Profile UI] Auth is loading/not initialized yet. Showing skeleton screen.');
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const hasError = prescriptionsError || recordsError || calcHistoryError || metricsError;
  console.log('[Profile UI] Error states check:', { prescriptionsError: !!prescriptionsError, recordsError: !!recordsError, calcHistoryError: !!calcHistoryError, metricsError: !!metricsError });

  return (
    <div className="space-y-6">
      {/* Banner / Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-800"
      >
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10 pointer-events-none">
          <Award className="h-80 w-80 text-teal-400" />
        </div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold uppercase tracking-wider border border-teal-500/25">
              <Sparkles className="h-3.5 w-3.5" /> Personal Health Passport
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              {user?.firstName}'s Health Passport
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Your consolidated medical history, health metrics, vitals, and personal health timeline — all in one secure place.
            </p>
          </div>

          {/* Profile Completion Meter */}
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-slate-700 shrink-0">
            <div className="relative h-14 w-14 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#1e293b" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="24" fill="none" stroke="#0d9488" strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - completionPercent / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <span className="absolute text-xs font-black text-teal-400">{completionPercent}%</span>
            </div>
            <div>
              <p className="text-xs font-black text-slate-300">Passport Status</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {completionPercent === 100 ? '✓ Fully Complete' : `${8 - Math.round(completionPercent / 100 * 8)} fields missing`}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Health Metrics Summary */}
      <motion.div custom={0} initial="hidden" animate="show" variants={fadeUp}>
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b dark:border-slate-800/80">
            <CardTitle className="text-base flex items-center gap-2 font-black">
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
            ) : metricsError ? (
              <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/5 p-3.5 rounded-xl border border-rose-500/10 leading-relaxed font-semibold">
                ⚠️ Health metrics temporarily unavailable.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {metricCards.map(({ key, label, icon: Icon, format, color }, i) => {
                  const m = latestMetrics[key];
                  return (
                    <motion.div
                      key={key}
                      custom={i}
                      initial="hidden"
                      animate="show"
                      variants={fadeUp}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:shadow-md transition-shadow"
                    >
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg mb-2 ${color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        <p className="text-[9px] font-bold uppercase tracking-wider">{label}</p>
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">{format(m)}</p>
                      {m?.riskLevel && <p className="text-[9px] text-slate-500 mt-0.5 capitalize">{m.riskLevel} risk</p>}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Active Prescriptions', count: prescriptionsError ? '—' : prescriptions.length, icon: Pill, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' },
          { label: 'Medical Records', count: recordsError ? '—' : records.length, icon: FileText, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
        ].map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="show" variants={fadeUp}>
            <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{stat.count}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Bottom Main Content Panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Passport Form */}
        <div className="lg:col-span-1 space-y-5">

          {/* Levine PhenoAge Card */}
          {profile?.biologicalAge !== undefined && (
            <Card className="border border-indigo-100 dark:border-slate-800 bg-gradient-to-br from-white to-indigo-50/10 dark:from-slate-900 dark:to-slate-900 shadow-sm overflow-hidden rounded-2xl">
              <CardHeader className="pb-3 border-b dark:border-slate-800/80">
                <CardTitle className="text-base flex items-center gap-2 font-black">
                  <Sparkles className="h-5 w-5 text-indigo-600" /> Biological Age (PhenoAge)
                </CardTitle>
                <CardDescription>Based on clinical biomarkers & age metrics</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{profile.biologicalAge} yrs</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biological Age</p>
                  </div>
                  <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-0.5 text-right">
                    <span className="text-2xl font-black text-slate-500 dark:text-slate-400">{profile.chronologicalAge} yrs</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chronological Age</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border dark:border-slate-850 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-650 dark:text-slate-350">Age Acceleration</span>
                  <Badge className={`text-[10px] font-black py-1 px-2 border-0 rounded-lg ${
                    profile.ageDifference < 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450'
                  }`}>
                    {profile.ageDifference < 0 ? '' : '+'}{profile.ageDifference} years
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed text-center font-semibold">
                  {profile.ageDifference < 0
                    ? '🎉 Your biological health age is younger than your chronological age! Keep up your current healthy lifestyle.'
                    : '⚠️ Your biological health age is older than your chronological age. Focus on sleep hygiene, activity, and nutrition.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Personal Info */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b dark:border-slate-800/80">
              <CardTitle className="text-base flex items-center gap-2 font-black">
                <User className="h-5 w-5 text-teal-600" /> Personal Information
              </CardTitle>
              <CardDescription>Keep your details current</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">First Name</label>
                    <Input {...register('firstName')} placeholder="First Name" className="text-xs rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Last Name</label>
                    <Input {...register('lastName')} placeholder="Last Name" className="text-xs rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Phone Number</label>
                  <Input {...register('phone')} placeholder="+91 9876543210" className="text-xs rounded-xl" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Date of Birth</label>
                  <Input {...register('dateOfBirth')} type="date" className="text-xs rounded-xl" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Blood Group</label>
                    <select {...register('bloodGroup')} className="flex h-9 w-full rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-white">
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Gender</label>
                    <select {...register('gender')} className="flex h-9 w-full rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-white">
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div className="pt-1 border-t dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3 pt-2">
                    <MapPin className="h-4 w-4 text-teal-500" />
                    <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Address</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input {...register('addressCity')} placeholder="City" className="text-xs rounded-xl" />
                    <Input {...register('addressState')} placeholder="State" className="text-xs rounded-xl" />
                  </div>
                  <Input {...register('addressZip')} placeholder="PIN / ZIP Code" className="text-xs rounded-xl mt-2" />
                </div>

                {/* Allergies */}
                <div className="pt-1 border-t dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3 pt-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Known Allergies</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                    {allergies.map(a => (
                      <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-100 dark:border-amber-900">
                        {a}
                        <button type="button" onClick={() => removeAllergy(a)} className="text-amber-400 hover:text-amber-700">×</button>
                      </span>
                    ))}
                    {allergies.length === 0 && <span className="text-[10px] text-slate-400 font-semibold">No allergies recorded</span>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      ref={allergyInputRef}
                      value={allergyInput}
                      onChange={e => setAllergyInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                      placeholder="Type allergy & press Enter"
                      className="text-xs rounded-xl flex-1 h-8"
                    />
                    <Button type="button" onClick={addAllergy} size="sm" className="h-8 px-3 text-xs rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold">Add</Button>
                  </div>
                </div>

                {/* Emergency Contact Section */}
                <div className="pt-1 border-t dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3 pt-2">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Emergency Contact</p>
                  </div>
                  <div className="space-y-2">
                    <Input {...register('emergencyContactName')} placeholder="Contact full name" className="text-xs rounded-xl" />
                    <Input {...register('emergencyContactPhone')} placeholder="Contact phone number" className="text-xs rounded-xl" />
                    <Input {...register('emergencyContactRelationship')} placeholder="Relationship (e.g. Spouse, Parent)" className="text-xs rounded-xl" />
                  </div>
                </div>

                {/* Insurance Section */}
                <div className="pt-1 border-t dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3 pt-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Insurance Information</p>
                  </div>
                  <div className="space-y-2">
                    <Input {...register('insuranceProvider')} placeholder="Insurance provider (e.g. Star Health)" className="text-xs rounded-xl" />
                    <Input {...register('insuranceNumber')} placeholder="Policy / Member ID number" className="text-xs rounded-xl" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-all"
                >
                  {updateMutation.isPending ? 'Saving...' : '✓ Save Health Passport'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Health Twin Card */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b dark:border-slate-800/80">
              <CardTitle className="text-base flex items-center gap-2 font-black">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                Health Twin Score: <span className="text-indigo-600 dark:text-indigo-400">{twinData?.data?.healthTwinScore ?? '—'}</span>
              </CardTitle>
              <CardDescription>Biological age estimate: {twinData?.data?.biologicalAgeEstimate ?? '—'} yrs</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {(!twinData && isEnabled) ? (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/10 leading-relaxed font-semibold">
                  💡 AI insights temporarily unavailable.
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Risk Factors</p>
                    <div className="flex flex-wrap gap-1.5">
                      {predictionsData?.data?.filter(p => p.score >= 50).map(p => (
                        <Badge key={p.predictionType} className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200/50 text-[10px] font-bold">
                          ⚠️ {p.predictionType.charAt(0).toUpperCase() + p.predictionType.slice(1).replace('_', ' ')} ({p.score}%)
                        </Badge>
                      ))}
                      {!predictionsData?.data?.some(p => p.score >= 50) && (
                        <span className="text-xs text-emerald-600 font-semibold">✓ All vitals within normal ranges</span>
                      )}
                    </div>
                  </div>

                  {forecastData?.data?.forecasts && (
                    <div className="border-t dark:border-slate-800 pt-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Health Forecast Trajectory</p>
                      <div className="space-y-1 text-xs text-slate-700 dark:text-slate-400 font-semibold">
                        {forecastData.data.forecasts.map(f => (
                          <div key={f.days} className="flex justify-between">
                            <span>{f.days} Days Ahead</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{f.score}/100</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {anomaliesData?.data?.length > 0 && (
                    <div className="border-t dark:border-slate-800 pt-3">
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2">Active Health Alerts</p>
                      <div className="space-y-2">
                        {anomaliesData.data.slice(0, 2).map((a, i) => (
                          <div key={i} className="text-[11px] text-rose-700 bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100/50 leading-relaxed font-semibold">
                            {a.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Health Timeline */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b dark:border-slate-800/80">
              <CardTitle className="text-base flex items-center gap-2 font-black">
                <FileHeart className="h-5 w-5 text-teal-600" /> Personal Health Timeline
              </CardTitle>
              <CardDescription>Your complete medical history — prescriptions, records, and health assessments</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {timelineLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-32 rounded" />
                        <Skeleton className="h-14 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (recordsError || prescriptionsError || calcHistoryError) ? (
                <div className="text-center py-12 text-slate-500 border border-dashed dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
                  <Activity className="h-10 w-10 text-rose-500 mx-auto mb-2 animate-pulse" />
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">Timeline partially unavailable</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Some of your prescriptions or record logs could not be loaded at this time.</p>
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
                  <Activity className="h-10 w-10 text-slate-400 mx-auto mb-2 animate-pulse" />
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">No medical timeline entries yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Use health calculators or upload medical records to build your personal health history.</p>
                </div>
              ) : (
                <>
                  <div className="relative border-l-2 border-slate-100 dark:border-slate-800/60 ml-4 pl-6 space-y-5">
                    {displayedTimeline.map((item, idx) => {
                      const colorClass = TIMELINE_COLORS[item.type] || TIMELINE_COLORS.record;
                      const dotClass = TIMELINE_DOTS[item.type] || 'bg-slate-400';
                      return (
                        <motion.div
                          key={item.id}
                          custom={idx}
                          initial="hidden"
                          animate="show"
                          variants={fadeUp}
                          className="relative group"
                        >
                          {/* Dot */}
                          <span className={`absolute -left-[37px] top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${colorClass} transition-transform group-hover:scale-110 duration-200`}>
                            <item.icon className="h-3 w-3" />
                          </span>

                          {/* Card */}
                          <div className={`p-4 rounded-xl border ${colorClass} bg-white dark:bg-slate-900/40 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200 flex flex-wrap justify-between items-start gap-3`}>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-[10px] font-semibold text-slate-400">
                                {item.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <h4 className="font-black text-sm text-slate-800 dark:text-slate-200 truncate">{item.title}</h4>
                              <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.subtitle}</p>
                            </div>
                            <Badge variant={item.badgeVariant} className="text-[9px] uppercase font-extrabold tracking-wider border-0 px-2 py-0.5 rounded-full shrink-0">
                              {item.badge}
                            </Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {timeline.length > 10 && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowAllTimeline(!showAllTimeline)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        {showAllTimeline ? (
                          <><ChevronUp className="h-4 w-4" /> Show Less</>
                        ) : (
                          <><ChevronDown className="h-4 w-4" /> Show {timeline.length - 10} More Events</>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
