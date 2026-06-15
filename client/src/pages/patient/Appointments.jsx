import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/axios';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { Calendar, Clock, X, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const statusVariant = { pending: 'warning', confirmed: 'success', cancelled: 'destructive', completed: 'secondary', rejected: 'destructive' };

export default function PatientAppointments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [reschedulingAppointment, setReschedulingAppointment] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.get('/appointments').then((r) => r.data.data),
  });

  // Query slots for rescheduling
  const { data: slots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: ['slots', reschedulingAppointment?.doctor?._id, rescheduleDate],
    queryFn: () => api.get(`/doctors/${reschedulingAppointment.doctor._id}/slots`, { params: { date: rescheduleDate } }).then((r) => r.data.data || []),
    enabled: !!reschedulingAppointment?.doctor?._id && !!rescheduleDate,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/appointments/${id}/cancel`, { reason: 'Cancelled by patient' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast('Appointment cancelled successfully', 'success');
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, scheduledAt }) => api.patch(`/appointments/${id}`, { scheduledAt }),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast('Appointment rescheduled successfully! Check notifications.', 'success');
      setReschedulingAppointment(null);
      setSelectedSlot(null);
    },
    onError: () => {
      toast('Failed to reschedule. The slot may have been booked.', 'error');
    }
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
    <div className="relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Appointments</h1>
        <Link to="/doctors"><Button className="bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold">Book New</Button></Link>
      </div>
      <div className="mt-6 space-y-4">
        {data?.length ? data.map((apt) => (
          <Card key={apt._id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-205">Dr. {apt.doctor?.user?.firstName} {apt.doctor?.user?.lastName}</p>
                <p className="text-sm text-slate-500">{apt.doctor?.specialization}</p>
                <p className="mt-1 text-sm font-medium">{formatDateTime(apt.scheduledAt)}</p>
                {apt.reason && <p className="text-xs text-slate-400 mt-1">Reason: {apt.reason}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant[apt.status]}>{apt.status}</Badge>
                {['pending', 'confirmed', 'completed'].includes(apt.status) && (
                  <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(apt._id)} className="text-teal-600 border-teal-600/30 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-xs font-bold rounded-lg">
                    PDF Receipt
                  </Button>
                )}
                {['pending', 'confirmed'].includes(apt.status) && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setReschedulingAppointment(apt); setSelectedSlot(null); }} className="text-xs font-bold rounded-lg">
                      Reschedule
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate(apt._id)} className="text-xs font-bold rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700">Cancel</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )) : (
          <EmptyState icon={Calendar} title="No appointments" description="Book your first appointment with a doctor" actionLabel="Find Doctors" onAction={() => navigate('/doctors')} />
        )}
      </div>

      {/* Rescheduling Modal overlay */}
      {reschedulingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-950 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <button
              onClick={() => setReschedulingAppointment(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                🗓️ Reschedule Appointment
              </h2>
              <p className="text-xs text-slate-450 mt-1">
                With <strong>Dr. {reschedulingAppointment.doctor?.user?.firstName} {reschedulingAppointment.doctor?.user?.lastName}</strong>.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Select Date</label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => { setRescheduleDate(e.target.value); setSelectedSlot(null); }}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Available Slots</label>
                {isLoadingSlots ? (
                  <p className="text-xs text-slate-450 animate-pulse">Loading slots...</p>
                ) : slots.length === 0 ? (
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 border border-dashed dark:border-slate-800/80">
                    <Clock className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-bold">No slots available for this day</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.start === slot.start;
                      const isAvailable = slot.isAvailable;

                      let style = '';
                      if (!isAvailable) {
                        style = 'bg-rose-50 border-rose-100 text-rose-500 opacity-50 cursor-not-allowed';
                      } else if (isSelected) {
                        style = 'bg-teal-600 border-teal-600 text-white font-black';
                      } else {
                        style = 'bg-white border-slate-200 dark:bg-slate-900 text-slate-700 hover:border-teal-500 hover:text-teal-600';
                      }

                      return (
                        <Button
                          key={slot.start}
                          variant="outline"
                          disabled={!isAvailable}
                          className={`text-[10px] py-1 h-auto transition font-bold ${style}`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot.time || new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReschedulingAppointment(null)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!selectedSlot || rescheduleMutation.isPending}
                  onClick={() => rescheduleMutation.mutate({ id: reschedulingAppointment._id, scheduledAt: selectedSlot.start })}
                  className="bg-teal-650 hover:bg-teal-705 text-white rounded-xl text-xs font-bold"
                >
                  {rescheduleMutation.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
