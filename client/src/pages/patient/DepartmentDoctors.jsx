import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';
import { api } from '@/api/axios';
import { DoctorCard } from '@/components/DoctorCard';
import { DoctorFilter } from '@/components/DoctorFilter';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import * as Icons from 'lucide-react';
import { Search, MapPin, Building2, User, Sparkles, Filter, Calendar, DollarSign, Clock, Users } from 'lucide-react';

// Dynamic Lucide icon renderer
const DepartmentIcon = ({ name, className }) => {
  const IconComponent = Icons[name] || Building2;
  return <IconComponent className={className} />;
};

export default function DepartmentDoctors() {
  const { hospitalId, departmentId } = useParams();
  const [searchParams] = useSearchParams();

  // Search filter states
  const [filters, setFilters] = useState({
    specialization: '',
    gender: '',
    language: '',
    consultationMode: searchParams.get('type') || '',
    maxFee: '',
    minExperience: '',
    availabilityToday: 'false',
    name: '',
  });

  const [debouncedName, setDebouncedName] = useState('');

  // Debounce doctor name searches
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, name: debouncedName }));
    }, 400);
    return () => clearTimeout(timer);
  }, [debouncedName]);

  // Fetch Hospital details to show breadcrumbs & title info
  const { data: hospitalResponse } = useQuery({
    queryKey: ['hospital', hospitalId],
    queryFn: () => hospitalService.getById(hospitalId),
  });

  const hospital = hospitalResponse?.data?.hospital;
  const department = hospitalResponse?.data?.departments?.find((d) => d._id === departmentId);

  // Fetch doctors dynamically using the advanced filter state
  const { data: doctorsResponse, isLoading, isError } = useQuery({
    queryKey: ['doctors-filtered', hospitalId, departmentId, filters],
    queryFn: () => 
      api.get('/doctors', {
        params: {
          hospitalId,
          departmentId,
          specialization: filters.specialization,
          gender: filters.gender,
          language: filters.language,
          consultationMode: filters.consultationMode,
          maxFee: filters.maxFee,
          minExperience: filters.minExperience,
          availabilityToday: filters.availabilityToday,
          name: filters.name,
        }
      }).then(r => r.data),
  });

  const doctors = doctorsResponse?.data || [];
  
  // Extract unique specializations list to pass into filter
  const specializations = ['Cardiology', 'Dermatology', 'Orthopedics', 'Pediatrics', 'Neurology', 'General Medicine'];

  const quickFilterToggle = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? '' : value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div>
        <Link to={`/patient/hospitals/${hospitalId}`}>
          <Button variant="ghost" size="sm" className="mb-3 font-bold text-slate-600 dark:text-slate-400">
            ← Back to {hospital?.name || 'Hospital'}
          </Button>
        </Link>
      </div>

      {/* Specialty Visual Header Card */}
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-teal-650 to-cyan-700 p-6 md:p-8 text-white overflow-hidden shadow-lg border border-slate-200/80 dark:border-slate-800">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-10">
          <Building2 className="h-64 w-64" />
        </div>
        
        <div className="flex flex-col md:flex-row gap-5 items-center relative z-10">
          <div className="h-16 w-16 rounded-2xl bg-white/10 text-white flex items-center justify-center border border-white/20 shrink-0">
            {department ? (
              <DepartmentIcon name={department.icon} className="h-8 w-8" />
            ) : (
              <Building2 className="h-8 w-8" />
            )}
          </div>

          <div className="text-center md:text-left flex-1 space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
              {department?.name || 'Specialty'} Department
            </h1>
            <p className="text-teal-100/90 text-xs md:text-sm font-semibold max-w-2xl leading-relaxed">
              {department?.description || 'Schedule consults with verified clinical practitioners and experts.'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-2.5 shrink-0">
            <Badge className="bg-white/15 hover:bg-white/20 text-white border-0 py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 shadow-sm text-xs">
              <Users className="h-3.5 w-3.5" /> {doctors.length} Doctors Live
            </Badge>
            <Badge className="bg-white/15 hover:bg-white/20 text-white border-0 py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 shadow-sm text-xs">
              🏥 {hospital?.name || 'MediCare Partner'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 items-start">
        {/* Left Column: Filter Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <DoctorFilter
            filters={filters}
            onChange={setFilters}
            specializations={specializations}
          />
        </div>

        {/* Right Column: Search & Doctors List */}
        <div className="lg:col-span-3 space-y-5">
          {/* Unified search & quick filter controls */}
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search practitioner by name (e.g. Smith)..."
                value={debouncedName}
                onChange={(e) => setDebouncedName(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 pl-11 focus:ring-2 focus:ring-teal-500 text-slate-805 dark:text-slate-100 shadow-sm outline-none transition"
              />
            </div>
            
            {/* Quick Filter Actions */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 shrink-0">
              <Button
                variant={filters.availabilityToday === 'true' ? 'default' : 'outline'}
                size="sm"
                onClick={() => quickFilterToggle('availabilityToday', 'true')}
                className={`rounded-xl text-xs font-bold py-2 ${
                  filters.availabilityToday === 'true'
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-350 bg-transparent'
                }`}
              >
                <Calendar className="h-3.5 w-3.5 mr-1" /> Available Today
              </Button>
              <Button
                variant={filters.consultationMode === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => quickFilterToggle('consultationMode', 'video')}
                className={`rounded-xl text-xs font-bold py-2 ${
                  filters.consultationMode === 'video'
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-350 bg-transparent'
                }`}
              >
                📹 Video Consultation
              </Button>
            </div>
          </div>

          {/* Loader or Doctor cards */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center p-8 bg-rose-50 text-rose-750 dark:bg-rose-950/20 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/30 font-bold text-sm">
              Failed to load practitioners. Please try refreshing.
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed dark:border-slate-800 shadow-sm">
              <User className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="font-extrabold text-slate-850 dark:text-slate-200 text-base">No Matching Doctors</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                No practitioners match the active filters. Adjust experience or fee preferences to see results.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
              {doctors.map((doc) => (
                <DoctorCard
                  key={doc._id}
                  doctor={doc}
                  hospitalId={hospitalId}
                  departmentId={departmentId}
                  consultationType={filters.consultationMode || 'physical'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
