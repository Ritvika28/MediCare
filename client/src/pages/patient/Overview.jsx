import { useQuery } from '@tanstack/react-query';
import { Calendar, FileText, Pill, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/utils';

export default function PatientOverview() {
  const { user } = useAuth();

  const { data: appointments } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => api.get('/appointments', { params: { limit: 5, status: 'confirmed' } }).then((r) => r.data.data),
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications', { params: { unread: 'true' } }).then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome, {user?.firstName}!</h1>
      <p className="text-slate-500">Here's your health overview</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Upcoming" value={appointments?.length || 0} icon={Calendar} color="teal" />
        <StatCard title="Records" value="—" icon={FileText} color="blue" />
        <StatCard title="Prescriptions" value="—" icon={Pill} color="purple" />
        <StatCard title="Notifications" value={notifications?.unreadCount || 0} icon={Bell} color="orange" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Link to="/patient/appointments"><Button variant="ghost" size="sm">View all</Button></Link>
          </CardHeader>
          <CardContent>
            {appointments?.length ? appointments.map((apt) => (
              <div key={apt._id} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
                <div>
                  <p className="font-medium">Dr. {apt.doctor?.user?.firstName} {apt.doctor?.user?.lastName}</p>
                  <p className="text-sm text-slate-500">{formatDateTime(apt.scheduledAt)}</p>
                </div>
                <Badge variant="success">{apt.status}</Badge>
              </div>
            )) : <p className="text-sm text-slate-500">No upcoming appointments</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/doctors"><Button variant="outline" className="w-full">Find Doctor</Button></Link>
            <Link to="/patient/ai-assistant"><Button variant="outline" className="w-full">AI Assistant</Button></Link>
            <Link to="/patient/records"><Button variant="outline" className="w-full">Upload Record</Button></Link>
            <Link to="/patient/emergency"><Button variant="destructive" className="w-full">Emergency</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
