import { useQuery } from '@tanstack/react-query';
import { FileText, Pill, Bell, Building2, Calculator, HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function PatientOverview() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/patients/dashboard/stats').then((r) => r.data.data),
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications', { params: { unread: 'true' } }).then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome, {user?.firstName}!</h1>
      <p className="text-slate-500">Your healthcare discovery and wellness overview</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Health Score" value={stats?.healthScore ?? '—'} icon={HeartPulse} color="teal" />
        <StatCard title="Records" value={stats?.recentReports?.length ?? 0} icon={FileText} color="blue" />
        <StatCard title="Prescriptions" value={stats?.recentPrescriptions?.length ?? 0} icon={Pill} color="purple" />
        <StatCard title="Notifications" value={notifications?.unreadCount || 0} icon={Bell} color="orange" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Health Snapshot</CardTitle>
            <Link to="/patient/health-analytics"><Button variant="ghost" size="sm">View analytics</Button></Link>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p>BMI: {stats?.bmi ?? '—'}</p>
            <p>Blood Pressure: {stats?.bloodPressure ?? '—'}</p>
            <p>Risk Level: {stats?.riskLevel ?? 'unknown'}</p>
            <p>Water Intake: {(stats?.waterIntake ?? 0).toFixed(1)}L / {stats?.waterTarget ?? 3}L</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/doctors"><Button variant="outline" className="w-full">Find Doctors</Button></Link>
            <Link to="/patient/hospitals"><Button variant="outline" className="w-full"><Building2 className="h-4 w-4 mr-1 inline" />Hospitals</Button></Link>
            <Link to="/patient/health-calculators"><Button variant="outline" className="w-full"><Calculator className="h-4 w-4 mr-1 inline" />Calculators</Button></Link>
            <Link to="/patient/emergency"><Button variant="destructive" className="w-full">Emergency SOS</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
