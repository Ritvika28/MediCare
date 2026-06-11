import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Calendar, FileText, Pill, Activity, User, Phone, Droplet, 
  Sparkles, CheckCircle2, ChevronRight, Stethoscope, FileHeart
} from 'lucide-react';

export default function PatientProfile() {
  const { user, profile, fetchUser } = useAuth();
  const { toast } = useToast();

  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: user?.firstName,
      lastName: user?.lastName,
      phone: user?.phone,
      bloodGroup: profile?.bloodGroup,
      gender: profile?.gender,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.patch('/patients/profile/me', data),
    onSuccess: () => {
      fetchUser();
      toast('Profile updated successfully', 'success');
    },
  });

  // Query Appointments for Timeline
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['profile-appointments'],
    queryFn: () => api.get('/appointments').then((r) => r.data.data || []),
  });

  // Query Prescriptions for Timeline
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['profile-prescriptions'],
    queryFn: () => api.get('/prescriptions').then((r) => r.data.data || []),
  });

  // Query Medical Records for Timeline
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['profile-records'],
    queryFn: () => api.get('/records').then((r) => r.data.data || []),
  });

  // Merge & Sort all entries chronologically (newest first)
  const [timeline, setTimeline] = useState([]);
  
  useEffect(() => {
    const list = [];

    appointments.forEach((apt) => {
      list.push({
        id: `apt_${apt._id}`,
        date: new Date(apt.scheduledAt || apt.appointmentDate),
        type: 'appointment',
        title: `Appointment with Dr. ${apt.doctor?.user?.firstName || ''} ${apt.doctor?.user?.lastName || ''}`,
        subtitle: `${apt.doctor?.specialization || 'General Practitioner'} · ${apt.hospital?.name || 'MediCare Partner'}`,
        badge: apt.status,
        badgeVariant: apt.status === 'confirmed' || apt.status === 'completed' ? 'success' : 'secondary',
        icon: Calendar,
        colorClass: 'bg-teal-500/10 text-teal-600 dark:bg-teal-950/40',
      });
    });

    prescriptions.forEach((pres) => {
      list.push({
        id: `pres_${pres._id}`,
        date: new Date(pres.createdAt || pres.date),
        type: 'prescription',
        title: `Prescription issued by Dr. ${pres.doctor?.user?.firstName || ''} ${pres.doctor?.user?.lastName || ''}`,
        subtitle: `Medicines listed: ${pres.medicines?.map(m => m.name).join(', ') || 'General therapy'}`,
        badge: 'Prescribed',
        badgeVariant: 'success',
        icon: Pill,
        colorClass: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/40',
      });
    });

    records.forEach((rec) => {
      list.push({
        id: `rec_${rec._id}`,
        date: new Date(rec.createdAt || rec.date),
        type: 'record',
        title: rec.title || 'Medical Record File',
        subtitle: `${rec.type || 'Diagnostics'} · ${rec.doctorName || 'Attending Physician'}`,
        badge: rec.category || 'General',
        badgeVariant: 'secondary',
        icon: FileText,
        colorClass: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40',
      });
    });

    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    setTimeline(list);
  }, [appointments, prescriptions, records]);

  const timelineLoading = appointmentsLoading || prescriptionsLoading || recordsLoading;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          Profile Settings & Timeline <Sparkles className="h-5 w-5 text-teal-500 fill-teal-500" />
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage personal data and browse your consolidated chronological health timeline
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Personal Information Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b dark:border-slate-800/80">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5 text-teal-600" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">First Name</label>
                    <Input {...register('firstName')} placeholder="First Name" className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Last Name</label>
                    <Input {...register('lastName')} placeholder="Last Name" className="text-xs" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Phone number</label>
                  <Input {...register('phone')} placeholder="Phone" className="text-xs" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Blood group</label>
                  <Input {...register('bloodGroup')} placeholder="e.g. O+" className="text-xs" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Gender</label>
                  <select 
                    {...register('gender')} 
                    className="flex h-10 w-full rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 shadow"
                >
                  Save Profile Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Chronological Health Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b dark:border-slate-800/80">
              <CardTitle className="text-base flex items-center gap-2">
                <FileHeart className="h-5 w-5 text-teal-600" /> Medical & Health Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {timelineLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed dark:border-slate-800 rounded-xl">
                  <Activity className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-850 dark:text-slate-200">No medical timeline entries found</p>
                  <p className="text-xs text-slate-400 mt-1">Book consultations, receive prescriptions to build history.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-850 ml-4 pl-6 space-y-6">
                  {timeline.map((item) => (
                    <div key={item.id} className="relative group">
                      {/* Timeline Dot Indicator */}
                      <span className={`absolute -left-[37px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-slate-950 ${item.colorClass} shadow-sm transition transform group-hover:scale-110 duration-200`}>
                        <item.icon className="h-3.5 w-3.5" />
                      </span>

                      {/* Timeline Card */}
                      <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900/60 shadow-sm transition hover:border-teal-500/30 flex flex-wrap justify-between items-start gap-4">
                        <div className="space-y-1 flex-1">
                          <p className="text-xs font-semibold text-slate-400">
                            {item.date.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <h4 className="font-bold text-sm text-slate-850 dark:text-slate-100">{item.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.subtitle}</p>
                        </div>
                        <Badge variant={item.badgeVariant} className="text-[9px] uppercase font-extrabold tracking-wider border-0 px-2 py-0.5">
                          {item.badge}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
