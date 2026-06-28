import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useHospital } from '@/hooks/useHospitals';
import { BedAvailabilityCard } from '@/components/BedAvailabilityCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import * as Icons from 'lucide-react';
import { 
  MapPin, Phone, Star, Building2, Globe, Mail, Clock, 
  ShieldCheck, ArrowUpRight, Navigation, HeartPulse, Stethoscope, Users
} from 'lucide-react';

// Dynamic Lucide icon renderer
const DepartmentIcon = ({ name, className }) => {
  const IconComponent = Icons[name] || Stethoscope;
  return <IconComponent className={className} />;
};

export default function HospitalDetails() {
  const { id } = useParams();
  const { data, isLoading } = useHospital(id);
  const { hospital, departments, bedAvailability, doctors, doctorCount } = data?.data || {};

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const address = hospital?.address;
  const lat = hospital?.latitude || hospital?.location?.coordinates?.[1];
  const lng = hospital?.longitude || hospital?.location?.coordinates?.[0];

  useEffect(() => {
    if (!lat || !lng || !mapContainerRef.current || !window.L) return;

    const L = window.L;
    
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
      }).setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM',
      }).addTo(mapInstanceRef.current);

      const hospitalMarkerIcon = L.divIcon({
        html: `<div class="flex items-center justify-center h-8 w-8 rounded-full bg-teal-600 border-2 border-white shadow-lg text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </div>`,
        className: 'custom-hospital-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([lat, lng], { icon: hospitalMarkerIcon }).addTo(mapInstanceRef.current);
    }
  }, [lat, lng, hospital]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!hospital) return <div className="text-center py-12 text-slate-500 font-bold">Hospital profile not found</div>;

  const insuranceList = hospital.acceptedInsurance?.length 
    ? hospital.acceptedInsurance 
    : ['Star Health Insurance', 'HDFC ERGO', 'Niva Bupa', 'ICICI Lombard', 'Care Health'];

  const directionsUrl = lat && lng ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${lat}%2C${lng}` : '#';

  const getDoctorCountForDepartment = (deptId) => {
    return doctors?.filter(doc => 
      doc.departmentId?._id?.toString() === deptId.toString() || 
      doc.departmentId?.toString() === deptId.toString()
    ).length || 0;
  };

  const coverImg = hospital.coverImage || 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80';
  const logoImg = hospital.logo || 'https://images.unsplash.com/photo-1624727828489-a1e03b79bba8?auto=format&fit=crop&w=150&h=150&q=80';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/patient/hospitals">
        <Button variant="ghost" size="sm" className="mb-2 font-bold text-slate-600 dark:text-slate-400">
          ← Back to Discovery
        </Button>
      </Link>

      {/* Hospital Banner Profile Section */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Cover Photo */}
        <div className="h-60 w-full relative">
          <img src={coverImg} alt={hospital.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        </div>

        {/* Info Layout */}
        <div className="p-6 md:p-8 relative pt-14 md:pt-16">
          {/* Logo Badge Overlay */}
          <div className="absolute -top-16 left-6 md:left-8 h-24 w-24 rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 shadow-md p-1 overflow-hidden flex items-center justify-center">
            <img src={logoImg} alt="Clinic Logo" className="h-full w-full object-contain rounded-xl" />
          </div>

          {/* Details */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black text-slate-850 dark:text-slate-100">
                  {hospital.name}
                </h1>
                {hospital.facilities?.Emergency && (
                  <Badge className="bg-red-500 text-white font-bold animate-pulse px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase">
                    24/7 Emergency
                  </Badge>
                )}
              </div>

              <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-455 text-sm font-semibold">
                <MapPin className="h-4 w-4 shrink-0 text-teal-655" />
                {address?.street && `${address.street}, `}
                {[address?.city, address?.state, address?.pincode].filter(Boolean).join(', ') || 'Address not listed'}
              </p>

              <div className="flex flex-wrap gap-2.5 pt-1.5">
                <Badge className="bg-amber-500/10 text-amber-600 border-0 flex items-center gap-1 font-bold">
                  <Star className="h-3.5 w-3.5 fill-current" /> {hospital.rating ? hospital.rating.toFixed(1) : '4.6'} ({hospital.reviewCount || 45} reviews)
                </Badge>
                <Badge className="bg-teal-500/10 text-teal-600 border-0 flex items-center gap-1 font-bold">
                  <Users className="h-3.5 w-3.5" /> {doctorCount || 0} Doctors
                </Badge>
                <Badge className="bg-cyan-500/10 text-cyan-600 border-0 flex items-center gap-1 font-bold">
                  <Building2 className="h-3.5 w-3.5" /> {departments?.length || 0} Specialties
                </Badge>
              </div>

              {hospital.description && (
                <p className="text-xs md:text-sm text-slate-655 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
                  {hospital.description}
                </p>
              )}
            </div>

            {/* Quick Contacts */}
            <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-800/80 min-w-[200px] text-xs font-semibold text-slate-655 shrink-0 shadow-inner">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">
                Hospital Contact
              </span>
              {hospital.phone && (
                <a href={`tel:${hospital.phone}`} className="flex items-center gap-2 hover:text-teal-600">
                  <Phone className="h-4 w-4 text-teal-655" /> {hospital.phone}
                </a>
              )}
              {hospital.email && (
                <a href={`mailto:${hospital.email}`} className="flex items-center gap-2 hover:text-teal-600 mt-0.5">
                  <Mail className="h-4 w-4 text-teal-655" /> {hospital.email}
                </a>
              )}
              {hospital.website && (
                <a href={hospital.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-teal-600 mt-0.5">
                  <Globe className="h-4 w-4 text-teal-655" /> {hospital.website}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bed inventory, map locator, facilities */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <BedAvailabilityCard beds={bedAvailability} />

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Hours */}
            <Card className="border border-slate-200/80 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Clock className="h-4 w-4 text-teal-655" /> Hours & Admissions
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200">OPD Scheduling Hours</p>
                <p className="font-semibold text-slate-500">{hospital.operatingHours || 'Monday - Saturday: 09:00 AM - 08:00 PM'}</p>
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold rounded-xl flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Emergency Admissions Open 24/7
                </div>
              </CardContent>
            </Card>

            {/* Insurance */}
            <Card className="border border-slate-200/80 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <HeartPulse className="h-4 w-4 text-teal-655" /> Insurance Providers
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-655 dark:text-slate-400 space-y-2.5">
                <p className="font-bold text-slate-800 dark:text-slate-200">Supported Cashless Policies:</p>
                <div className="flex flex-wrap gap-1">
                  {insuranceList.map((ins) => (
                    <Badge key={ins} variant="secondary" className="bg-slate-50 dark:bg-slate-850 border dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-350">
                      {ins}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Map and directions */}
        <div className="lg:col-span-1">
          <Card className="border border-slate-200/80 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm rounded-2xl h-full flex flex-col justify-between overflow-hidden">
            <CardHeader className="pb-3 border-b dark:border-slate-800/80">
              <CardTitle className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 text-slate-750 dark:text-slate-350">
                <Navigation className="h-4 w-4 text-teal-655" /> Clinic Map & Routes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between bg-slate-50/40 dark:bg-slate-900/30">
              {lat && lng ? (
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-40 rounded-xl border dark:border-slate-800 overflow-hidden z-0 shadow-inner"
                />
              ) : (
                <div className="w-full h-40 rounded-xl bg-slate-100 dark:bg-slate-950 border dark:border-slate-800 flex items-center justify-center text-xs text-slate-455">
                  Coordinates not listed
                </div>
              )}
              
              <div className="space-y-2">
                {hospital.phone && (
                  <a href={`tel:${hospital.phone}`} className="block w-full">
                    <Button variant="outline" className="w-full text-xs font-bold py-2 flex items-center justify-center gap-1.5 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                      <Phone className="h-4 w-4" /> Call Desk
                    </Button>
                  </a>
                )}
                {lat && lng && (
                  <a href={directionsUrl} target="_blank" rel="noreferrer" className="block w-full">
                    <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 shadow-md">
                      <ArrowUpRight className="h-4 w-4" /> Navigation Maps
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Specialties/Departments */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-3xl">
        <CardHeader className="border-b pb-4 dark:border-slate-800/80">
          <CardTitle className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Building2 className="h-5 w-5 text-teal-655" /> Select Specialty Department
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments?.map((dept) => {
              const count = getDoctorCountForDepartment(dept._id);
              return (
                <Link key={dept._id} to={`/patient/hospitals/${id}/departments/${dept._id}`}>
                  <div className="rounded-2xl border border-slate-200/85 dark:border-slate-800 p-5 transition duration-300 hover:border-teal-400 hover:bg-teal-500/5 dark:hover:bg-teal-950/10 shadow-sm flex flex-col justify-between h-full group">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-teal-600/10 text-teal-650 flex items-center justify-center shrink-0">
                          <DepartmentIcon name={dept.icon} className="h-5 w-5" />
                        </div>
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 group-hover:text-teal-600 transition">
                          {dept.name}
                        </h3>
                      </div>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-455 line-clamp-2 leading-relaxed">
                        {dept.description || 'Browse specialized clinical experts and schedule consultations.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                        👨‍⚕️ {count} Practitioner{count !== 1 ? 's' : ''}
                      </span>
                      <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 font-bold p-0 text-xs flex items-center gap-0.5 bg-transparent hover:bg-transparent">
                        Book →
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
