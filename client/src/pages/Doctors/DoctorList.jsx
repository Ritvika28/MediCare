import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { DoctorCard } from '@/components/DoctorCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Search, Star, Filter, Calendar, Users, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

export default function DoctorList() {
  const [filters, setFilters] = useState({
    search: '',
    specialization: '',
    city: '',
    minExperience: '',
    maxFee: '',
    minRating: '',
    gender: '',
    availabilityToday: 'false',
    sort: 'rating',
    page: 1,
    limit: 10,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['doctors-list-search', filters],
    queryFn: () =>
      api.get('/doctors', {
        params: {
          search: filters.search || undefined,
          specialization: filters.specialization || undefined,
          city: filters.city || undefined,
          minExperience: filters.minExperience || undefined,
          maxFee: filters.maxFee || undefined,
          minRating: filters.minRating || undefined,
          gender: filters.gender || undefined,
          availabilityToday: filters.availabilityToday === 'true' ? 'true' : undefined,
          sort: filters.sort || undefined,
          page: filters.page,
          limit: filters.limit,
        },
      }).then((r) => r.data),
  });

  const doctors = data?.data || [];
  const pagination = data?.pagination || { total: 0 };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      specialization: '',
      city: '',
      minExperience: '',
      maxFee: '',
      minRating: '',
      gender: '',
      availabilityToday: 'false',
      sort: 'rating',
      page: 1,
      limit: 10,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-700 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge className="bg-white/10 text-teal-100 hover:bg-white/20 border-0 py-1 px-3 rounded-full text-xs font-bold uppercase tracking-wider">
            Verified Specialists
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Consult Top Doctors Online or In-Clinic
          </h1>
          <p className="text-teal-100/90 text-sm md:text-base leading-relaxed">
            Find the right doctor for your health needs, read verified patient reviews, and schedule appointments instantly.
          </p>
        </div>
      </div>

      {/* Search Header */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-4 items-center">
            {/* Name/Keywords Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors by name, specialty..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 pl-11 focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-850 dark:text-slate-100 shadow-inner outline-none transition"
              />
            </div>

            {/* City Dropdown */}
            <div className="relative">
              <input
                type="text"
                placeholder="City (e.g. Mumbai, Delhi, Lucknow)..."
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 focus:ring-2 focus:ring-teal-500 text-slate-850 dark:text-slate-100 shadow-inner outline-none transition"
              />
            </div>

            {/* Sort Selector */}
            <div className="relative flex items-center gap-2">
              <ArrowUpDown className="h-4.5 w-4.5 text-slate-400 shrink-0" />
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 focus:ring-2 focus:ring-teal-500 text-slate-850 dark:text-slate-100 shadow-inner outline-none appearance-none cursor-pointer transition"
              >
                <option value="rating">Highest Rated</option>
                <option value="experience">Most Experienced</option>
                <option value="fee">Lowest Consultation Fee</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-4 items-start">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-teal-650" /> Filter Specialists
              </h2>
              <button
                onClick={handleClearFilters}
                className="text-[10px] font-bold text-teal-600 hover:underline"
              >
                Clear All
              </button>
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Specialization */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Specialization</label>
                <select
                  value={filters.specialization}
                  onChange={(e) => handleFilterChange('specialization', e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="">All Specializations</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Neurology">Neurology</option>
                  <option value="General Medicine">General Medicine</option>
                </select>
              </div>

              {/* Experience */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Min Experience</label>
                <select
                  value={filters.minExperience}
                  onChange={(e) => handleFilterChange('minExperience', e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="">Any Experience</option>
                  <option value="5">5+ Years</option>
                  <option value="10">10+ Years</option>
                  <option value="15">15+ Years</option>
                </select>
              </div>

              {/* Max Consultation Fee */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Max Fee (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={filters.maxFee}
                  onChange={(e) => handleFilterChange('maxFee', e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              {/* Min Rating */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Min Rating</label>
                <select
                  value={filters.minRating}
                  onChange={(e) => handleFilterChange('minRating', e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4.0+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.8">4.8+ Stars</option>
                </select>
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Doctor Gender</label>
                <select
                  value={filters.gender}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="">Any Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Availability Today */}
              <div className="space-y-2 pt-2 border-t dark:border-slate-800">
                <button
                  onClick={() => handleFilterChange('availabilityToday', filters.availabilityToday === 'true' ? 'false' : 'true')}
                  className={`w-full flex items-center justify-center gap-1.5 p-2.5 text-xs font-bold rounded-xl border transition ${
                    filters.availabilityToday === 'true'
                      ? 'bg-teal-50 border-teal-450 text-teal-705 dark:bg-teal-950/20 dark:border-teal-850 dark:text-teal-400'
                      : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Calendar className="h-4 w-4" /> Available Today
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results List */}
        <div className="lg:col-span-3 space-y-6">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center p-8 bg-rose-50 text-rose-700 rounded-2xl">
              Failed to retrieve practitioners. Please refresh.
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed dark:border-slate-800 shadow-sm">
              <Users className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="font-extrabold text-slate-850 dark:text-slate-200 text-base">No Doctors Found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Try modifying your search query or clearing active filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              {doctors.map((doc) => (
                <DoctorCard key={doc._id} doctor={doc} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.total > filters.limit && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 1}
                onClick={() => handleFilterChange('page', filters.page - 1)}
              >
                Previous
              </Button>
              <span className="text-xs font-bold self-center px-4">
                Page {filters.page} of {Math.ceil(pagination.total / filters.limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= Math.ceil(pagination.total / filters.limit)}
                onClick={() => handleFilterChange('page', filters.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
