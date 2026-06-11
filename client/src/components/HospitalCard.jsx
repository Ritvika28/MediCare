import { Link } from 'react-router-dom';
import { MapPin, Star, Bed, Phone, Navigation, Clock, Activity, Building2, Users } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export function HospitalCard({ hospital, showDistance = true }) {
  const city = hospital.address?.city || hospital.city;
  const state = hospital.address?.state || hospital.state;
  const isGoogle = hospital.source === 'google' || String(hospital._id).startsWith('google_');
  const isOverpass = hospital.source === 'overpass' || String(hospital._id).startsWith('overpass_');
  const isNetwork = hospital.isNetworkHospital !== false && !isGoogle && !isOverpass;

  const distanceLabel = hospital.distanceText || (hospital.distanceKm ? `${hospital.distanceKm} km away` : null);

  const lat = hospital.latitude || hospital.location?.coordinates?.[1];
  const lng = hospital.longitude || hospital.location?.coordinates?.[0];

  const directionsUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : null;

  const hoursText = hospital.operatingHours || 'Open 24/7';

  // Facilities mapping for rendering badges
  const renderedFacilities = [];
  if (hospital.facilities) {
    if (hospital.facilities.Emergency) renderedFacilities.push({ label: 'Emergency', icon: '🚨' });
    if (hospital.facilities.ICU) renderedFacilities.push({ label: 'ICU', icon: '🏥' });
    if (hospital.facilities.Ambulance) renderedFacilities.push({ label: 'Ambulance', icon: '🚑' });
    if (hospital.facilities.Pharmacy) renderedFacilities.push({ label: 'Pharmacy', icon: '💊' });
    if (hospital.facilities.Lab) renderedFacilities.push({ label: 'Lab', icon: '🧪' });
    if (hospital.facilities.MRI) renderedFacilities.push({ label: 'MRI', icon: '🩻' });
    if (hospital.facilities.CTScan) renderedFacilities.push({ label: 'CT Scan', icon: '📡' });
    if (hospital.facilities.BloodBank) renderedFacilities.push({ label: 'Blood Bank', icon: '🩸' });
    if (hospital.facilities.Dialysis) renderedFacilities.push({ label: 'Dialysis', icon: '💉' });
    if (hospital.facilities.Ventilator) renderedFacilities.push({ label: 'Ventilator', icon: '🫁' });
  } else if (hospital.emergencyServices || hospital.emergencyAvailable) {
    renderedFacilities.push({ label: 'Emergency', icon: '🚨' });
  }

  const coverImg = hospital.coverImage || hospital.images?.[0] || 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80';
  const logoImg = hospital.logo || 'https://images.unsplash.com/photo-1624727828489-a1e03b79bba8?auto=format&fit=crop&w=150&h=150&q=80';

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
      <CardContent className="p-0 flex flex-col h-full justify-between">
        <div>
          {/* Cover image container */}
          <div className="h-36 w-full relative overflow-hidden bg-slate-100">
            <img 
              src={coverImg} 
              alt={hospital.name} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Network / Partner badge */}
            <div className="absolute left-3 top-3 flex justify-between w-[calc(100%-1.5rem)]">
              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full text-white ${
                isNetwork ? 'bg-teal-600/90 backdrop-blur' : 'bg-slate-700/90 backdrop-blur'
              }`}>
                {isNetwork ? 'Medicare Network' : 'Partner Clinic'}
              </span>
              
              {hospital.facilities?.Emergency && (
                <span className="text-[10px] bg-red-600 text-white font-extrabold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <span className="h-1.5 w-1.5 bg-white rounded-full animate-ping" /> 24/7 Emergency
                </span>
              )}
            </div>

            {/* Distance label if available */}
            {showDistance && distanceLabel && (
              <span className="absolute right-3 bottom-3 text-xs font-bold text-white bg-slate-900/60 backdrop-blur px-2.5 py-1 rounded-lg">
                📍 {distanceLabel}
              </span>
            )}
          </div>

          {/* Details Section */}
          <div className="p-5 relative pt-7">
            {/* Floating Logo overlay */}
            <div className="absolute -top-6 left-5 h-12 w-12 rounded-xl border-2 border-white dark:border-slate-900 bg-white dark:bg-slate-800 p-0.5 shadow-md overflow-hidden flex items-center justify-center">
              <img src={logoImg} alt="Hospital Logo" className="h-full w-full object-contain rounded-lg" />
            </div>

            {/* Hospital Name & Rating */}
            <div className="space-y-1.5 mt-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 line-clamp-1 leading-snug group-hover:text-teal-600 transition">
                  {hospital.name}
                </h3>
              </div>

              {/* Rating and review counts */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="flex items-center gap-0.5 text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md">
                  <Star className="h-3 w-3 fill-amber-500 stroke-amber-500" /> 
                  {hospital.rating ? hospital.rating.toFixed(1) : '4.6'}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-medium">
                  ({hospital.reviewCount || 45} reviews)
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-3">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
              <span className="line-clamp-1 font-medium">
                {hospital.address?.street ? `${hospital.address.street}, ` : ''}{city}, {state}
              </span>
            </div>

            {/* Facilities badging */}
            {renderedFacilities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {renderedFacilities.map((fac) => (
                  <Badge 
                    key={fac.label} 
                    variant="outline" 
                    className="text-[10px] py-0.5 px-2 font-bold bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {fac.icon} {fac.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-455">
                <Users className="h-4 w-4 text-teal-650 shrink-0" />
                <span>{hospital.totalDoctors || hospital.doctors?.length || 0} Doctors</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-455">
                <Building2 className="h-4 w-4 text-teal-650 shrink-0" />
                <span>{hospital.totalDepartments || hospital.departments?.length || 0} Specialties</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-5 pt-0 mt-2 space-y-2">
          {/* Quick Actions Call & Directions */}
          <div className="grid grid-cols-2 gap-2">
            {hospital.phone ? (
              <a href={`tel:${hospital.phone}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Phone className="h-3.5 w-3.5" /> Call Clinic
                </Button>
              </a>
            ) : (
              <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1.5 text-xs opacity-50 cursor-not-allowed" disabled>
                <Phone className="h-3.5 w-3.5 text-slate-400" /> No Phone
              </Button>
            )}

            {directionsUrl ? (
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="w-full">
                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Navigation className="h-3.5 w-3.5 text-teal-600 animate-pulse" /> Directions
                </Button>
              </a>
            ) : (
              <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1.5 text-xs opacity-50 cursor-not-allowed" disabled>
                <Navigation className="h-3.5 w-3.5 text-slate-400" /> Directions
              </Button>
            )}
          </div>

          {/* Details / Booking Action */}
          {isNetwork ? (
            <Link to={`/patient/hospitals/${hospital._id}`} className="block w-full">
              <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 rounded-xl shadow-md transition-all" size="sm">
                View Specialties & Doctors
              </Button>
            </Link>
          ) : (
            <div className="text-center py-2 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed dark:border-slate-850">
              Admission-Only Network Partner
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
