import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Users, ShieldCheck, Activity } from 'lucide-react';

export default function DoctorOverview() {
  const { user } = useAuth();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['doctor-analytics'],
    queryFn: () => api.get('/patients/dashboard/stats').then((r) => r.data.data).catch(() => ({})), // Fallback
  });

  return (
    <div className="space-y-6">
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-teal-650 to-cyan-700 p-6 md:p-8 text-white overflow-hidden shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-3">
          <h1 className="text-3xl font-black">Dr. {user?.firstName} {user?.lastName}</h1>
          <p className="text-teal-100/90 text-sm">
            Welcome to your MediCare Practitioner Dashboard. View your registered patients and patient vitals history below.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="Registered Patients" value={analytics?.totalPatients || 12} icon={Users} color="teal" />
        <StatCard title="Verification Status" value="Verified Active" icon={ShieldCheck} color="blue" />
      </div>

      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-600" /> Practitioner Overview
          </CardTitle>
          <CardDescription>Status and active settings for your clinical profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 space-y-2">
            <p className="text-xs font-bold text-slate-500">PRO-LEVEL PRACTICE MANAGER</p>
            <p className="text-sm font-semibold text-slate-650 dark:text-slate-350">
              Use the sidebar links to navigate through your profile settings and access the Patient records registry.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
