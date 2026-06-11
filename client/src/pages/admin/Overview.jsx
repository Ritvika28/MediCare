import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Stethoscope, Users, Calendar, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminOverview() {
  const { data } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/analytics/admin/dashboard').then((r) => r.data.data),
  });

  const chartData = data?.monthlyAppointments?.map((m) => ({
    name: `${m._id.month}/${m._id.year}`,
    count: m.count,
  })) || [];

  const pieData = data?.appointmentStats?.map((s) => ({ name: s._id, value: s.count })) || [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Doctors" value={data?.totals?.doctors || 0} icon={Stethoscope} color="teal" />
        <StatCard title="Patients" value={data?.totals?.patients || 0} icon={Users} color="blue" />
        <StatCard title="Appointments" value={data?.totals?.appointments || 0} icon={Calendar} color="purple" />
        <StatCard title="Revenue" value={`$${data?.estimatedRevenue || 0}`} icon={DollarSign} color="orange" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Appointments</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Appointment Status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
