import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Users, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDateTime } from '@/lib/utils';

export default function DoctorOverview() {
  const { user } = useAuth();

  const { data: analytics } = useQuery({
    queryKey: ['doctor-analytics'],
    queryFn: () => api.get('/analytics/doctor').then((r) => r.data.data),
  });

  const { data: appointments } = useQuery({
    queryKey: ['doctor-appointments-today'],
    queryFn: () => api.get('/appointments', { params: { status: 'confirmed', limit: 5 } }).then((r) => r.data.data),
  });

  const chartData = analytics?.monthly?.map((m) => ({ month: `M${m._id}`, appointments: m.count })) || [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dr. {user?.firstName} {user?.lastName}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Patients" value={analytics?.totalPatients || 0} icon={Users} color="teal" />
        <StatCard title="Today's Appointments" value={appointments?.length || 0} icon={Calendar} color="blue" />
        <StatCard title="Pending" value={analytics?.byStatus?.find((s) => s._id === 'pending')?.count || 0} icon={Clock} color="orange" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Appointments</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="appointments" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Upcoming Appointments</CardTitle></CardHeader>
          <CardContent>
            {appointments?.map((apt) => (
              <div key={apt._id} className="flex justify-between border-b py-3 last:border-0 dark:border-slate-800">
                <div>
                  <p className="font-medium">{apt.patient?.user?.firstName} {apt.patient?.user?.lastName}</p>
                  <p className="text-sm text-slate-500">{formatDateTime(apt.scheduledAt)}</p>
                </div>
                <Badge variant="success">{apt.status}</Badge>
              </div>
            )) || <p className="text-sm text-slate-500">No upcoming appointments</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
