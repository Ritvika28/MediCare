import { Link } from 'react-router-dom';
import { Star, Clock, Users, Globe, BadgeCheck, Phone, CheckCircle2, Video } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export function DoctorCard({ doctor, hospitalId, departmentId, consultationType = 'physical' }) {
  const user = doctor.user;
  const wait = doctor.waitingTime || (doctor.currentQueue || 0) * (doctor.averageConsultationTime || 30);
  
  // Custom display attributes
  const isAvailableToday = doctor.schedule?.some(s => s.dayOfWeek === new Date().getDay());
  
  const hId = hospitalId || doctor.hospitalId || doctor.hospital?._id || doctor.hospital;
  const dId = departmentId || doctor.departmentId || doctor.department?._id || doctor.department;
  const hospitalName = doctor.hospital?.name || 'MediCare Partner Hospital';

  // Qualifications display helper
  const qualifications = doctor.qualification || doctor.education?.map(edu => edu.degree).join(', ') || 'MBBS, MD';

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-2xl shadow-sm">
      <CardContent className="p-5 space-y-4">
        {/* Bio Header */}
        <div className="flex gap-4 items-start">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.fullName}
              className="h-16 w-16 rounded-full object-cover border-2 border-teal-500/20 shadow-sm shrink-0"
            />
          ) : (
            <div className="h-16 w-16 shrink-0 flex items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 text-xl font-bold border border-teal-200/20">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-slate-100 line-clamp-1">
                Dr. {user?.firstName} {user?.lastName}
              </h3>
              {doctor.isVerified && (
                <BadgeCheck className="h-5 w-5 text-blue-500 fill-blue-500 stroke-white shrink-0" title="Verified Practitioner" />
              )}
            </div>
            
            <p className="text-[11px] font-extrabold text-teal-650 uppercase tracking-widest">{doctor.specialization}</p>
            <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold line-clamp-1">{qualifications}</p>
            <p className="text-[11px] text-slate-455 dark:text-slate-500 font-bold line-clamp-1">🏥 {hospitalName}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center shadow-inner">
          <div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">EXPERIENCE</span>
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-350">{doctor.experience || doctor.experienceYears || 0} Years</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">CLINIC FEE</span>
            <span className="text-xs font-extrabold text-teal-650">₹{doctor.consultationFee || 500}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">RATINGS</span>
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-350 flex items-center justify-center gap-0.5">
              <Star className="h-3.5 w-3.5 fill-amber-500 stroke-amber-500" /> {doctor.rating ? doctor.rating.toFixed(1) : '4.5'}
            </span>
          </div>
        </div>

        {/* Available Modes & Days */}
        <div className="space-y-1 pt-1">
          {doctor.availableDays && doctor.availableDays.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Days:</span>
              {doctor.availableDays.slice(0, 3).map((day) => (
                <span key={day} className="text-[9px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                  {day.slice(0, 3)}
                </span>
              ))}
              {doctor.availableDays.length > 3 && (
                <span className="text-[9px] font-extrabold bg-slate-100 dark:bg-slate-850 text-slate-500 px-1.5 py-0.5 rounded">
                  +{doctor.availableDays.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Mode availability */}
          <div className="flex gap-2.5 text-[10px] text-slate-400 font-bold pt-1">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-teal-500 rounded-full" /> Physical Consult
            </span>
            {doctor.onlineConsultationFee > 0 && (
              <span className="flex items-center gap-1 text-teal-650">
                <Video className="h-3 w-3 shrink-0" /> Online Consult (₹{doctor.onlineConsultationFee})
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Queue Prediction & Languages */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] border-t dark:border-slate-800/80 pt-3 text-slate-550 dark:text-slate-450 font-semibold">
          <div className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{(doctor.languages || ['English', 'Hindi']).join(', ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-teal-650"><Users className="h-3.5 w-3.5 shrink-0" /> Queue: {doctor.currentQueue || 0}</span>
            <span className="flex items-center gap-1 text-slate-455"><Clock className="h-3.5 w-3.5 shrink-0" /> ~{wait || 15}m wait</span>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="grid grid-cols-1 gap-2 pt-2 border-t dark:border-slate-800/60">
          <Link to={hId ? `/patient/hospitals/${hId}/doctors/${doctor._id}` : `/patient/doctors/${doctor._id}`} className="w-full">
            <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 rounded-xl shadow-md">
              View Doctor Profile
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
