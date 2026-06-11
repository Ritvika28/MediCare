import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';

export default function DoctorAppointments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.get('/appointments').then((r) => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast('Appointment updated', 'success');
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Appointments</h1>
      <div className="mt-6 space-y-4">
        {data?.map((apt) => (
          <Card key={apt._id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="font-semibold">{apt.patient?.user?.firstName} {apt.patient?.user?.lastName}</p>
                <p className="text-sm text-slate-500">{formatDateTime(apt.scheduledAt)}</p>
                {apt.reason && <p className="text-sm">{apt.reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge>{apt.status}</Badge>
                {apt.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: apt._id, status: 'confirmed' })}>Accept</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: apt._id, status: 'rejected' })}>Reject</Button>
                  </>
                )}
                {apt.status === 'confirmed' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: apt._id, status: 'completed' })}>Complete</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
