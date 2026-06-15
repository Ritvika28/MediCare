import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/axios';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { Calendar } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const statusVariant = { pending: 'warning', confirmed: 'success', cancelled: 'destructive', completed: 'secondary', rejected: 'destructive' };

export default function PatientAppointments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.get('/appointments').then((r) => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/appointments/${id}/cancel`, { reason: 'Cancelled by patient' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast('Appointment cancelled', 'success');
    },
  });

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Appointment History</h1>
        <Link to="/doctors"><Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold">Find Doctors</Button></Link>
      </div>
      <p className="text-sm text-slate-500 mt-1">View past appointments. Contact doctors directly via their profile.</p>
      <div className="mt-6 space-y-4">
        {data?.length ? data.map((apt) => (
          <Card key={apt._id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="font-semibold">Dr. {apt.doctor?.user?.firstName} {apt.doctor?.user?.lastName}</p>
                <p className="text-sm text-slate-500">{apt.doctor?.specialization}</p>
                <p className="mt-1 text-sm font-medium">{formatDateTime(apt.scheduledAt)}</p>
                {apt.hospital?.name && <p className="text-xs text-slate-400">{apt.hospital.name}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant[apt.status]}>{apt.status}</Badge>
                {apt.doctor?._id && (
                  <Link to={`/patient/doctors/${apt.doctor._id}`}>
                    <Button variant="outline" size="sm" className="text-xs font-bold">View Doctor Profile</Button>
                  </Link>
                )}
                {['pending', 'confirmed'].includes(apt.status) && (
                  <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate(apt._id)} className="text-xs text-red-600">Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )) : (
          <EmptyState icon={Calendar} title="No appointments" description="Find doctors and contact them via their profile" actionLabel="Find Doctors" onAction={() => navigate('/doctors')} />
        )}
      </div>
    </div>
  );
}
