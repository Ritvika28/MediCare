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
      queryClient.invalidateQueries(['appointments']);
      toast('Appointment cancelled', 'success');
    },
  });

  const handleDownloadPDF = async (appointmentId) => {
    try {
      const response = await api.get(`/appointments/${appointmentId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `appointment-${appointmentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast('Booking confirmation PDF downloaded!', 'success');
    } catch (err) {
      toast('Failed to download confirmation PDF', 'error');
    }
  };

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Appointments</h1>
        <Link to="/doctors"><Button>Book New</Button></Link>
      </div>
      <div className="mt-6 space-y-4">
        {data?.length ? data.map((apt) => (
          <Card key={apt._id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="font-semibold">Dr. {apt.doctor?.user?.firstName} {apt.doctor?.user?.lastName}</p>
                <p className="text-sm text-slate-500">{apt.doctor?.specialization}</p>
                <p className="mt-1 text-sm">{formatDateTime(apt.scheduledAt)}</p>
                {apt.reason && <p className="text-sm text-slate-400">Reason: {apt.reason}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant[apt.status]}>{apt.status}</Badge>
                {['pending', 'confirmed', 'completed'].includes(apt.status) && (
                  <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(apt._id)} className="text-teal-600 border-teal-600/30 hover:bg-teal-50 dark:hover:bg-teal-950/20">
                    PDF Receipt
                  </Button>
                )}
                {['pending', 'confirmed'].includes(apt.status) && (
                  <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate(apt._id)}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )) : (
          <EmptyState icon={Calendar} title="No appointments" description="Book your first appointment with a doctor" actionLabel="Find Doctors" onAction={() => navigate('/doctors')} />
        )}
      </div>
    </div>
  );
}
