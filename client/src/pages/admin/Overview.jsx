import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Stethoscope, Users, Activity, BarChart3 } from 'lucide-react';

export default function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/analytics/admin/dashboard').then((r) => r.data.data),
  });

  return (
    <div className="space-y-6">
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-6 md:p-8 text-white shadow-xl overflow-hidden border border-slate-800">
        <div className="relative z-10 space-y-1.5">
          <p className="text-teal-350 text-xs font-bold uppercase tracking-widest">Management Hub</p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Admin Overview Dashboard</h1>
          <p className="text-slate-400 text-sm max-w-md">System statistics, user registries, and medical facilities metrics.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <StatCard title="Total Registered Doctors" value={data?.totals?.doctors || 0} icon={Stethoscope} color="teal" />
        <StatCard title="Total Active Patients" value={data?.totals?.patients || 0} icon={Users} color="blue" />
      </div>

      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600" /> Platform Insights
          </CardTitle>
          <CardDescription>Visual metrics and logs from the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
            <p className="text-xs font-bold text-slate-500 mb-1">SYSTEM ACTIVITY STATUS</p>
            <p className="text-sm font-semibold text-slate-655 dark:text-slate-350">
              The platform services are fully operational. Use the navigation panel to manage hospitals, beds, emergencies, departments, and registered users.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
