import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { getApiErrorMessage } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Calendar, AlertCircle, Clock, ShieldAlert, Sparkles, Building2, User, ChevronRight, Check } from 'lucide-react';

export default function BookingPage() {
  const { doctorId: initialDoctorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isSelectionMode = initialDoctorId === 'select';

  // Stepper State
  // 0: Select Hospital, 1: Select Doctor, 2: Date & Slot, 3: Details & Symptoms, 4: Confirm
  const [step, setStep] = useState(() => (isSelectionMode ? 0 : 2));
  
  const [selectedHospitalId, setSelectedHospitalId] = useState(searchParams.get('hospitalId') || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState(() => (isSelectionMode ? '' : initialDoctorId));
  const [consultationType, setConsultationType] = useState(searchParams.get('type') || 'physical');
  const [date, setDate] = useState(() => {
    const d = searchParams.get('date');
    return d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');

  // 1. Fetch Hospitals (for Step 0)
  const { data: hospitalsRes, isLoading: hospitalsLoading } = useQuery({
    queryKey: ['booking-hospitals'],
    queryFn: () => api.get('/hospitals', { params: { limit: 100 } }).then((r) => r.data),
    enabled: step === 0 || isSelectionMode,
  });

  const hospitalsList = hospitalsRes?.data || [];

  // 2. Fetch Doctors (for Step 1 - filtered by hospital if selected)
  const { data: doctorsRes, isLoading: doctorsLoading } = useQuery({
    queryKey: ['booking-doctors', selectedHospitalId],
    queryFn: () => api.get('/doctors', { params: { hospitalId: selectedHospitalId || undefined, limit: 100 } }).then((r) => r.data),
    enabled: step === 1 || (isSelectionMode && !!selectedHospitalId),
  });

  const doctorsList = doctorsRes?.data || [];

  // 3. Fetch Selected Doctor Info (if we have doctorId)
  const { data: doctorData, isLoading: doctorLoading } = useQuery({
    queryKey: ['booking-selected-doctor', selectedDoctorId],
    queryFn: () => api.get(`/doctors/${selectedDoctorId}`).then((r) => r.data.data.doctor),
    enabled: !!selectedDoctorId,
  });

  // Automatically update hospital selection if doctor is pre-loaded
  useEffect(() => {
    if (doctorData && !selectedHospitalId) {
      setSelectedHospitalId(doctorData.hospitalId || doctorData.hospital?._id || doctorData.hospital || '');
    }
  }, [doctorData, selectedHospitalId]);

  // 4. Fetch Available Slots
  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['booking-slots', selectedDoctorId, date],
    queryFn: () => api.get(`/doctors/${selectedDoctorId}/slots`, { params: { date } }).then((r) => r.data.data || []),
    enabled: !!selectedDoctorId && !!date && step >= 2,
  });

  // Pre-select slot from query parameters if present
  const timeParam = searchParams.get('time');
  useEffect(() => {
    if (slots.length > 0 && timeParam && !selectedSlot) {
      const match = slots.find(
        (s) => s.time === timeParam || new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) === timeParam
      );
      if (match && match.isAvailable) {
        setSelectedSlot(match);
      }
    }
  }, [slots, timeParam, selectedSlot]);

  // Booking Mutation
  const bookMutation = useMutation({
    mutationFn: () =>
      api.post('/appointments', {
        doctorId: selectedDoctorId,
        hospitalId: selectedHospitalId || doctorData?.hospitalId || doctorData?.hospital,
        departmentId: doctorData?.departmentId || doctorData?.department,
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

  const selectedHospitalObj = hospitalsList.find(h => h._id === selectedHospitalId) || doctorData?.hospital;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      {/* Title & Wizard Progress Bar */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-850 dark:text-white flex items-center gap-2">
            Appointment Booking Wizard <Sparkles className="h-6 w-6 text-teal-600 animate-pulse" />
          </h1>
          <p className="text-slate-450 text-sm mt-1">
            Complete the steps below to secure your clinical consultation slot.
          </p>
        </div>

        {/* Horizontal Stepper UI */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          {['Hospital', 'Specialist', 'Date & Time', 'Symptoms', 'Confirm'].map((lbl, idx) => (
            <div key={lbl} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition ${
                  step === idx 
                    ? 'bg-teal-600 text-white shadow-md' 
                    : step > idx 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  {step > idx ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={`hidden md:inline text-xs font-bold ${step === idx ? 'text-teal-600' : 'text-slate-400'}`}>{lbl}</span>
              </div>
              {idx < 4 && <ChevronRight className="h-4 w-4 text-slate-300 mx-auto hidden md:block" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 0: Hospital Selection */}
      {step === 0 && (
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" /> Select Care Center
            </CardTitle>
            <CardDescription>Choose one of our associated multi-specialty hospitals or clinics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hospitalsLoading ? (
              <p className="text-xs text-slate-450 animate-pulse">Loading care centers...</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {hospitalsList.map((hosp) => (
                  <div key={hosp._id} className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    selectedHospitalId === hosp._id 
                      ? 'border-teal-500 bg-teal-50/30 dark:bg-teal-950/20' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/40'
                  }`} onClick={() => setSelectedHospitalId(hosp._id)}>
                    <div>
                      <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{hosp.name}</p>
                      <p className="text-xs text-slate-450 mt-1">{hosp.address?.street}, {hosp.address?.city}</p>
                    </div>
                    <Button size="sm" className={`mt-4 rounded-xl text-xs font-bold w-full ${
                      selectedHospitalId === hosp._id ? 'bg-teal-600 text-white' : 'bg-transparent border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 hover:bg-slate-100'
                    }`} onClick={() => { setSelectedHospitalId(hosp._id); setStep(1); }}>
                      Select & Continue
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Doctor Selection */}
      {step === 1 && (
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-teal-600" /> Choose Your Specialist
            </CardTitle>
            <CardDescription>Select from available doctors at the chosen facility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {doctorsLoading ? (
              <p className="text-xs text-slate-450 animate-pulse">Loading doctors list...</p>
            ) : doctorsList.length === 0 ? (
              <p className="text-xs text-slate-450 py-8 text-center border border-dashed rounded-xl">No doctors available in this center. Go back and select another.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {doctorsList.map((doc) => (
                  <div key={doc._id} className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    selectedDoctorId === doc._id 
                      ? 'border-teal-500 bg-teal-50/30 dark:bg-teal-950/20' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/40'
                  }`} onClick={() => setSelectedDoctorId(doc._id)}>
                    <div className="flex gap-3 items-start">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {doc.user?.avatar ? <img src={doc.user.avatar} className="object-cover h-full w-full" /> : 'Dr'}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Dr. {doc.user?.firstName} {doc.user?.lastName}</p>
                        <p className="text-[11px] font-bold text-teal-605">{doc.specialization}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Exp: {doc.experience} Years · Fee: ₹{doc.consultationFee}</p>
                      </div>
                    </div>
                    <Button size="sm" className={`mt-4 rounded-xl text-xs font-bold w-full ${
                      selectedDoctorId === doc._id ? 'bg-teal-600 text-white' : 'bg-transparent border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 hover:bg-slate-100'
                    }`} onClick={() => { setSelectedDoctorId(doc._id); setStep(2); }}>
                      Select Specialist
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2 border-t dark:border-slate-800 flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)} className="rounded-xl text-xs">Back</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Date & Available Slots */}
      {step === 2 && (
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-950">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-605" /> Pick Date & Time Slot
            </CardTitle>
            {doctorData && (
              <CardDescription>
                Booking appointment with <strong>Dr. {doctorData.user?.firstName} {doctorData.user?.lastName}</strong> ({doctorData.specialization})
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Choose Consultation Date</label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }} 
                min={new Date().toISOString().split('T')[0]} 
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Available Slots</label>
              {slotsLoading ? (
                <p className="text-xs text-slate-450 animate-pulse">Checking slot availability...</p>
              ) : slots.length === 0 ? (
                <div className="text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500 border border-dashed dark:border-slate-800">
                  <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No available timings for this day</p>
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
                      style = 'bg-teal-600 border-teal-600 text-white font-black';
                    } else {
                      style = 'bg-white border-slate-200 dark:bg-slate-900 text-slate-700 hover:border-teal-500 hover:text-teal-605';
                    }

                    return (
                      <Button
                        key={slot.start}
                        variant="outline"
                        disabled={!isAvailable}
                        className={`text-xs py-1.5 h-auto transition font-semibold rounded-xl ${style}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot.time || new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t dark:border-slate-800 flex justify-between">
              {isSelectionMode ? (
                <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl text-xs">Back</Button>
              ) : (
                <div />
              )}
              <Button 
                disabled={!selectedSlot} 
                onClick={() => setStep(3)}
                className="bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
              >
                Continue to Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Details & Symptoms Input */}
      {step === 3 && (
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-800 dark:text-white">Describe Your Concern</CardTitle>
            <CardDescription>Provide clinical context to help the doctor prepare for your visit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Consultation Mode</label>
              <div className="flex gap-2">
                {['physical', 'video', 'audio'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setConsultationType(mode)}
                    className={`flex-1 p-2.5 rounded-xl border text-xs font-bold capitalize transition ${
                      consultationType === mode 
                        ? 'bg-teal-605 border-teal-505 text-white' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Reason for Consultation</label>
              <Input 
                placeholder="e.g. Regular medical follow up, persistent cough" 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Symptoms (comma separated)</label>
              <Input 
                placeholder="e.g. Headache, Fever, Cough" 
                value={symptoms} 
                onChange={(e) => setSymptoms(e.target.value)} 
                className="text-xs rounded-xl"
              />
            </div>

            <div className="pt-4 border-t dark:border-slate-800 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl text-xs">Back</Button>
              <Button 
                onClick={() => setStep(4)}
                className="bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
              >
                Review & Confirm
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Final Confirmation */}
      {step === 4 && (
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-800 dark:text-white">Review Booking Confirmation</CardTitle>
            <CardDescription>Verify all slots and doctor options before locking in appointment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 space-y-3 text-xs font-bold text-slate-600 dark:text-slate-350">
              <div className="flex justify-between border-b dark:border-slate-800 pb-2">
                <span>Care Center:</span>
                <span className="text-slate-850 dark:text-slate-200">{selectedHospitalObj?.name || 'MediCare Hospital'}</span>
              </div>
              <div className="flex justify-between border-b dark:border-slate-800 pb-2">
                <span>Specialist:</span>
                <span className="text-slate-850 dark:text-slate-200">Dr. {doctorData?.user?.firstName} {doctorData?.user?.lastName}</span>
              </div>
              <div className="flex justify-between border-b dark:border-slate-800 pb-2">
                <span>Date & Time:</span>
                <span className="text-teal-605">{date} @ {selectedSlot?.time || new Date(selectedSlot?.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between border-b dark:border-slate-800 pb-2">
                <span>Consultation Mode:</span>
                <span className="capitalize">{consultationType} visit</span>
              </div>
              <div className="flex justify-between border-b dark:border-slate-800 pb-2">
                <span>Consultation Fee:</span>
                <span className="text-teal-650 font-black">₹{doctorData?.consultationFee || 500}</span>
              </div>
              {reason && (
                <div className="flex justify-between border-b dark:border-slate-800 pb-2">
                  <span>Reason:</span>
                  <span>{reason}</span>
                </div>
              )}
              {symptoms && (
                <div className="flex justify-between pb-2">
                  <span>Symptoms:</span>
                  <span>{symptoms}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t dark:border-slate-800 flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(3)} className="rounded-xl text-xs">Back</Button>
              <Button 
                onClick={() => bookMutation.mutate()}
                disabled={bookMutation.isPending}
                className="bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex-1"
              >
                {bookMutation.isPending ? 'Securing slot...' : 'Confirm & Book Slot'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
