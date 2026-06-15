import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import {
  Activity,
  Heart,
  TrendingUp,
  Sparkles,
  Shield,
  Zap,
  Calendar,
  AlertTriangle,
  UserCheck,
  MapPin,
  Clock,
  ExternalLink,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { Link } from 'react-router-dom';
import { useLocation } from '@/hooks/useLocation';

export default function HealthTwinDashboard() {
  const { location } = useLocation({ requestOnMount: true });

  const { data: twinRes, isLoading: isTwinLoading } = useQuery({
    queryKey: ['ml-health-twin'],
    queryFn: () => api.get('/ml/health-twin').then(r => r.data)
  });

  const { data: forecastRes } = useQuery({
    queryKey: ['ml-forecast'],
    queryFn: () => api.get('/ml/forecast').then(r => r.data)
  });

  const { data: predictionsRes } = useQuery({
    queryKey: ['ml-predict'],
    queryFn: () => api.get('/ml/predict').then(r => r.data)
  });

  const { data: recommendationsRes } = useQuery({
    queryKey: ['ml-recommendations', location?.latitude, location?.longitude],
    queryFn: () => {
      const params = {};
      if (location?.latitude && location?.longitude) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
      }
      return api.get('/ml/recommendations', { params }).then(r => r.data);
    },
    staleTime: 5 * 60 * 1000
  });

  const twin = twinRes?.data || null;
  const forecast = forecastRes?.data || null;
  const predictions = predictionsRes?.data || [];
  const recommendations = recommendationsRes?.data || null;

  if (isTwinLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Formatting utility
  const formatRiskName = (name) => {
    return name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' ');
  };

  const getProgressColor = (score) => {
    if (score < 30) return 'bg-emerald-500';
    if (score < 60) return 'bg-amber-500';
    if (score < 85) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const getScoreBadgeClass = (score) => {
    if (score < 30) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300';
    if (score < 60) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300';
    if (score < 85) return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300';
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300';
  };

  // Trajectory chart data
  const trajectoryData = forecast ? [
    { name: 'Current', score: twin?.healthTwinScore || 75 },
    ...forecast.forecasts.map(f => ({
      name: `${f.days}d`,
      score: f.score
    }))
  ] : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 p-6 md:p-8 text-white shadow-2xl border border-indigo-500/20">
        <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300 animate-pulse" /> Digital Twin Mode Active
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              My Personal Health Twin
            </h1>
            <p className="text-indigo-200/90 text-sm md:text-base leading-relaxed max-w-xl">
              Your real-time virtual avatar. Synthesized from your biometric markers, vitals logs, and lifestyle choices to run predictive analytics.
            </p>
          </div>
          
          {/* Twin Score Widget */}
          {twin && (
            <div className="flex items-center gap-4 bg-white/5 p-4 md:p-6 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
              <div className="relative flex items-center justify-center">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="34" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                  <circle cx="40" cy="40" r="34" className="stroke-indigo-400" strokeWidth="6" fill="transparent"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - twin.healthTwinScore / 100)} />
                </svg>
                <span className="absolute text-xl font-black">{twin.healthTwinScore}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Twin Score</p>
                <p className="text-[10px] text-white/60">Stability index: {twin.healthStabilityIndex}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {twin && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Biometric Age Estimates */}
          <Card className="rounded-2xl border shadow-md md:col-span-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-500" /> Biometric Ages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{twin.healthAge} yrs</p>
                  <p className="text-xs text-slate-400">Biological Health Age</p>
                </div>
                {twin.biologicalAgeEstimate && (
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Estimate variance</p>
                    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 font-bold border-0 text-[10px] mt-1">
                      {twin.biologicalAgeEstimate - twin.healthAge >= 0 ? '+' : ''}
                      {(twin.biologicalAgeEstimate - twin.healthAge).toFixed(1)} yrs diff
                    </Badge>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Biological Age Estimate</span>
                  <span>{twin.biologicalAgeEstimate} years</span>
                </div>
                <Progress value={(twin.biologicalAgeEstimate / 100) * 100} className="h-2 bg-slate-100 dark:bg-slate-800" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                💡 <span className="font-semibold text-slate-700 dark:text-slate-300">Twin Age Insight:</span> Your health age reflects organ system aging rate based on blood pressure, blood glucose, sleep, and lifestyle markers.
              </p>
            </CardContent>
          </Card>

          {/* Stability Card */}
          <Card className="rounded-2xl border shadow-md md:col-span-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" /> Health Stability Index
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{twin.healthStabilityIndex}%</p>
                <p className="text-xs text-slate-400 mt-1">Overall System Buffer Index</p>
              </div>
              <div className="space-y-1">
                <Progress value={twin.healthStabilityIndex} className="h-2 bg-slate-100 dark:bg-slate-800" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your stability index quantifies the resilience of your vital metrics. Maintaining regular sleep patterns and keeping blood pressure stable will increase this index.
              </p>
            </CardContent>
          </Card>

          {/* Forecasted Trajectory */}
          <Card className="rounded-2xl border shadow-md md:col-span-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" /> 90d Trajectory Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-24">
                {trajectoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trajectoryData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="twinForecastGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fill="url(#twinForecastGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">No trajectory records</div>
                )}
              </div>
              {forecast?.forecasts?.length > 0 && (
                <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-100/50">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">90d Projection:</span>
                  <span className="text-xs font-black text-purple-800 dark:text-purple-200">
                    {forecast.forecasts[forecast.forecasts.length - 1].score} / 100
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Radar Map & Risk Profile Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Radar */}
        {twin?.radarData?.length > 0 && (
          <Card className="rounded-2xl border shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" /> Organ Systems Vitals Map
              </CardTitle>
              <CardDescription>Target score mapping across bio-markers</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={twin.radarData}>
                  <PolarGrid className="stroke-slate-200 dark:stroke-slate-800" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Radar name="System Health Index" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Risk Profile & Opportunities */}
        <Card className="rounded-2xl border shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" /> Virtual Avatar Summary
            </CardTitle>
            <CardDescription>Identified wellness indicators and concerns</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {/* Risk Areas vs Strong Areas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2">Attention Needed</p>
                <div className="flex flex-wrap gap-1.5">
                  {twin?.riskAreas?.length > 0 ? (
                    twin.riskAreas.map(r => (
                      <Badge key={r} className="bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200/55 text-[10px]">
                        ⚠️ {r}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">All pathways stable</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">Strong Organ Indexes</p>
                <div className="flex flex-wrap gap-1.5">
                  {twin?.strongAreas?.length > 0 ? (
                    twin.strongAreas.map(s => (
                      <Badge key={s} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200/55 text-[10px]">
                        ✓ {s}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Pending data log</span>
                  )}
                </div>
              </div>
            </div>

            {/* Improvement Opportunities */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Habits Modification Opportunities</p>
              <ul className="space-y-2">
                {twin?.improvementOpportunities?.length > 0 ? (
                  twin.improvementOpportunities.map((o, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 items-start">
                      <span className="h-4 w-4 shrink-0 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold dark:bg-indigo-950 dark:text-indigo-400 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{o}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-400">Perfect alignment with wellness advice! Keep going.</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disease Risk Prediction Cards */}
      <Card className="rounded-2xl border shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" /> Disease Risk Predictions
          </CardTitle>
          <CardDescription>Weighted scoring model calculations based on vitals history and medical logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {predictions.map((p) => (
              <div key={p.predictionType} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {formatRiskName(p.predictionType)} Risk
                  </h4>
                  <Badge className={`border-0 text-[9px] font-extrabold ${getScoreBadgeClass(p.score)}`}>
                    {p.riskLevel} Risk
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-800 dark:text-white">{p.score}%</span>
                  <span className="text-[10px] text-slate-400 font-bold">Confidence: {p.confidence}%</span>
                </div>
                <Progress value={p.score} className={`h-1.5 ${getProgressColor(p.score)}`} />
                <p className="text-[10px] text-slate-400 mt-3 font-semibold leading-relaxed">
                  Factors: {p.contributingFactors?.join(', ') || 'Normal range.'}
                </p>
              </div>
            ))}
            {predictions.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                Log calculators or assessments to see risk predictions.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Providers Quick Action */}
      {recommendations && (
        <Card className="rounded-2xl border shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-500" /> Recommended For You
            </CardTitle>
            <CardDescription>AI recommended doctors and hospitals based on clinical risks and coordinates</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {/* Hospitals */}
            <div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">Top Hospital Matches</p>
              <div className="space-y-3">
                {recommendations.recommendedHospitals?.map((h) => (
                  <div key={h.hospital?._id || h.hospital} className="flex justify-between items-center p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div>
                      <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">
                        {h.hospital?.name || 'MediCare Center'}
                      </h5>
                      <p className="text-[10px] text-slate-400 truncate max-w-xs">{h.hospital?.address?.city || 'Nearby'}</p>
                      <div className="flex gap-1.5 mt-1.5">
                        {h.reasons?.slice(0, 2).map((r, i) => (
                          <Badge key={i} className="text-[8px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 font-bold border-0">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-800 dark:text-white">{h.score} pts</span>
                      {h.distance && <p className="text-[9px] text-slate-400 flex items-center justify-end gap-1"><Clock className="h-2.5 w-2.5" /> {h.distance} km</p>}
                    </div>
                  </div>
                ))}
                {!recommendations.recommendedHospitals?.length && (
                  <p className="text-xs text-slate-400">Enable location services to see nearby hospitals</p>
                )}
              </div>
            </div>

            {/* Doctors */}
            <div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">Top Doctor Matches</p>
              <div className="space-y-3">
                {recommendations.recommendedDoctors?.map((d) => (
                  <div key={d.doctor?._id || d.doctor} className="flex justify-between items-center p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div>
                      <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">
                        Dr. {d.doctor?.user?.firstName || ''} {d.doctor?.user?.lastName || 'Expert'}
                      </h5>
                      <p className="text-[10px] text-slate-400">{d.doctor?.specialization || 'Clinical Specialist'}</p>
                      <div className="flex gap-1.5 mt-1.5">
                        {d.reasons?.slice(0, 2).map((r, i) => (
                          <Badge key={i} className="text-[8px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 font-bold border-0">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-800 dark:text-white">{d.score} pts</span>
                      <p className="text-[9px] text-slate-400 font-bold">★ {d.doctor?.rating || '4.5'}</p>
                    </div>
                  </div>
                ))}
                {!recommendations.recommendedDoctors?.length && (
                  <p className="text-xs text-slate-400">Log clinical risk assessment to match doctors</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
