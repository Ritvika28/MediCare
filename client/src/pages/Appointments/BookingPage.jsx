import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { getApiErrorMessage } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Calendar, AlertCircle, Clock, ShieldAlert, Sparkles } from 'lucide-react';

export default function BookingPage() {
  const { doctorId } = useParams();
  const [searchParams] = useSearchParams();
  const hospitalId = searchParams.get('hospitalId');
  const departmentId = searchParams.get('departmentId');
  const consultationType = searchParams.get('type') || 'physical';
  
  const dateParam = searchParams.get('date');
  const timeParam = searchParams.get('time');

  const navigate = useNavigate();
  const { toast } = useToast();

  const [date, setDate] = useState(() => {
    if (dateParam) {
      return new Date(dateParam).toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');

  // Fetch Doctor Profile
  const { data: doctor } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => api.get(`/doctors/${doctorId}`).then((r) => r.data.data.doctor),
  });

  // Fetch Slots
  const { data: slots = [] } = useQuery({
    queryKey: ['slots', doctorId, date],
    queryFn: () => api.get(`/doctors/${doctorId}/slots`, { params: { date } }).then((r) => r.data.data || []),
    enabled: !!doctorId && !!date,
  });

  // Pre-select slot matching the time query param if present
  useEffect(() => {
    if (slots.length > 0 && timeParam && !selectedSlot) {
      const match = slots.find(s => s.time === timeParam || new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) === timeParam);
      if (match && match.isAvailable) {
        setSelectedSlot(match);
      }
    }
  }, [slots, timeParam, selectedSlot]);

  const bookMutation = useMutation({
    mutationFn: () =>
      api.post('/appointments', {
        doctorId,
        hospitalId: hospitalId || doctor?.hospitalId || doctor?.hospital,
        departmentId: departmentId || doctor?.departmentId || doctor?.department,
        scheduledAt: selectedSlot.start,
        reason,
        symptoms: symptoms ? symptoms.split(',').map((s) => s.trim()) : undefined,
        type: consultationType,
      }),
    onSuccess: () => {
      toast('Appointment booked successfully! Notifications sent.', 'success');
      navigate('/patient/appointments');
    },
    onError: (err) => toast(getApiErrorMessage(err, 'Booking failed'), 'error'),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          Confirm Appointment <Sparkles className="h-5 w-5 text-teal-500 fill-teal-500" />
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Review appointment details and complete slot registration
        </p>
      </div>

      {doctor && (
        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-bold flex items-center justify-center text-lg">
              {doctor.user?.firstName?.[0]}{doctor.user?.lastName?.[0]}
            </div>
            <div>
              <p className="font-bold text-slate-850 dark:text-slate-200">Dr. {doctor.user?.firstName} {doctor.user?.lastName}</p>
              <p className="text-xs text-teal-600 font-semibold">{doctor.specialization} Speciality</p>
              <div className="flex gap-2 mt-1">
                <Badge className="bg-teal-600 text-white border-0 text-[10px] uppercase font-bold tracking-wider">{consultationType} visit</Badge>
                <Badge variant="secondary" className="text-[10px]">Fee: ₹{doctor.consultationFee}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="pb-3 border-b dark:border-slate-800/80">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-605" /> Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Date Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Date</label>
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }} 
              min={new Date().toISOString().split('T')[0]} 
              className="text-xs"
            />
          </div>

          {/* Slots List */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Available Slots</label>
            {slots.length === 0 ? (
              <div className="text-center p-6 bg-slate-50 dark:bg-slate-850 rounded-xl text-slate-500 border border-dashed dark:border-slate-800">
                <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold">No slots available for this day</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.start === slot.start;
                  const isAvailable = slot.isAvailable;

                  let style = '';
                  if (!isAvailable) {
                    style = 'bg-rose-50 border-rose-100 text-rose-500 opacity-50 cursor-not-allowed';
                  } else if (isSelected) {
                    style = 'bg-teal-600 border-teal-600 text-white font-bold';
                  } else {
                    style = 'bg-white border-slate-200 dark:bg-slate-900 text-slate-700 hover:border-teal-500 hover:text-teal-600';
                  }

                  return (
                    <Button
                      key={slot.start}
                      variant="outline"
                      disabled={!isAvailable}
                      className={`text-xs py-1.5 h-auto transition font-semibold ${style}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot.time || new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Reason for Consultation</label>
            <Input 
              placeholder="e.g. Regular medical follow up" 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              className="text-xs"
            />
          </div>

          {/* Symptoms */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Symptoms (comma separated)</label>
            <Input 
              placeholder="e.g. Headache, Fever, Cough" 
              value={symptoms} 
              onChange={(e) => setSymptoms(e.target.value)} 
              className="text-xs"
            />
          </div>

          {/* Confirm CTA */}
          <div className="pt-2">
            <Button 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 shadow-md flex items-center justify-center gap-2" 
              disabled={!selectedSlot || bookMutation.isPending} 
              onClick={() => bookMutation.mutate()}
            >
              {bookMutation.isPending ? 'Confirming booking...' : 'Book Doctor Appointment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
