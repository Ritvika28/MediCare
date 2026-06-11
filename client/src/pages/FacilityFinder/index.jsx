import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';
import { HospitalCard } from '@/components/HospitalCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Search, Sparkles, Filter, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function FacilityFinder() {
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const facilitiesList = [
    { key: 'ICU', label: 'Intensive Care Unit (ICU)', icon: '🏥', desc: 'Critical care units with specialized monitors and staff' },
    { key: 'Ventilator', label: 'Ventilator Support', icon: '🫁', desc: 'Mechanical breathing assist systems for ICU care' },
    { key: 'MRI', label: 'MRI Scan Center', icon: '🧲', desc: 'High-resolution magnetic resonance imaging diagnostic scans' },
    { key: 'CTScan', label: 'CT Scanner', icon: '🌀', desc: 'Advanced computerized tomography imaging diagnostics' },
    { key: 'Dialysis', label: 'Dialysis Unit', icon: '💧', desc: 'Therapeutic renal filtration systems for kidney failure' },
    { key: 'BloodBank', label: 'Blood Bank Stock', icon: '🩸', desc: 'In-house storage of various blood types and stocks' },
    { key: 'Ambulance', label: '24/7 Ambulance', icon: '🚑', desc: 'Rapid patient transport and emergency responders' },
    { key: 'Emergency', label: 'Emergency Trauma Care', icon: '🚨', desc: 'Round-the-clock emergency medical admissions' },
    { key: 'Pharmacy', label: 'In-House Pharmacy', icon: '💊', desc: '24/7 medicine dispensing clinic store' },
    { key: 'Lab', label: 'Diagnostic Laboratory', icon: '🧪', desc: 'Pathology, blood tests, and clinical sample reports' }
  ];

  const {
    data: hospitalsResponse,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['hospitals-facility-finder', selectedFacilities],
    queryFn: () => {
      const params = {};
      if (selectedFacilities.length > 0) {
        params.facilities = selectedFacilities.join(',');
      }
      return hospitalService.getAll(params);
    },
    keepPreviousData: true
  });

  const hospitals = hospitalsResponse?.data || [];

  const toggleFacility = (facility) => {
    setSelectedFacilities((prev) =>
      prev.includes(facility) ? prev.filter((x) => x !== facility) : [...prev, facility]
    );
  };

  const clearFilters = () => {
    setSelectedFacilities([]);
    setSearchQuery('');
  };

  const filteredHospitals = hospitals.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.address?.street?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.address?.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Premium Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-600 to-teal-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <Sparkles className="h-72 w-72" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Filter className="h-3.5 w-3.5" /> Core Resource Locator
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Advanced Facility Finder
          </h1>
          <p className="text-teal-100/90 text-sm md:text-base leading-relaxed">
            Search, filter, and lock down clinic networks by critical equipment (such as ICU, MRI scan, dialysis, ventilators) in real-time.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 items-start">
        {/* Left Side: Filter Control Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-teal-650" /> Filter Facilities
              </h2>
              {selectedFacilities.length > 0 && (
                <button onClick={clearFilters} className="text-[10px] font-bold text-teal-600 hover:underline">
                  Clear All
                </button>
              )}
            </div>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-slate-400 font-medium">Select one or more advanced diagnostic or treatment facilities:</p>
              <div className="space-y-2">
                {facilitiesList.map((fac) => {
                  const isChecked = selectedFacilities.includes(fac.key);
                  return (
                    <button
                      key={fac.key}
                      onClick={() => toggleFacility(fac.key)}
                      className={`w-full flex flex-col p-3 text-left rounded-xl border transition ${
                        isChecked
                          ? 'bg-teal-50/50 border-teal-400 text-teal-700 dark:bg-teal-950/20 dark:border-teal-900 dark:text-teal-450 shadow-sm'
                          : 'bg-transparent border-slate-100 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-2 text-xs font-bold">
                          <span className="text-sm">{fac.icon}</span>
                          <span>{fac.label}</span>
                        </span>
                        {isChecked && <CheckCircle2 className="h-4 w-4 text-teal-650 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 pl-7 leading-normal font-medium">
                        {fac.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Hospital Listing Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* Real-time search by hospital name */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter matching hospitals by name, city, or zip code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 pl-11 focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-850 dark:text-slate-100 outline-none transition"
                />
              </div>
            </CardContent>
          </Card>

          {/* Results stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border dark:border-slate-800">
            <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 flex-wrap">
              <span>Hospitals matching:</span>
              {selectedFacilities.length === 0 ? (
                <span className="font-bold text-slate-700 dark:text-slate-350">Any Facility</span>
              ) : (
                selectedFacilities.map((fac) => {
                  const facilityObj = facilitiesList.find(f => f.key === fac);
                  return (
                    <Badge key={fac} className="bg-teal-600/10 text-teal-650 dark:bg-teal-950/30 border-0 font-bold text-[10px]">
                      {facilityObj?.icon} {facilityObj?.label}
                    </Badge>
                  );
                })
              )}
            </div>
            <div className="text-xs text-slate-400 font-bold shrink-0">
              {isLoading ? 'Searching...' : `${filteredHospitals.length} match(es) found`}
            </div>
          </div>

          {/* Hospitals list grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-850 animate-pulse border dark:border-slate-800" />
              ))
            ) : isError ? (
              <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed dark:border-slate-850">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                <p className="font-extrabold text-slate-800 dark:text-slate-200">Error loading clinics</p>
                <p className="text-xs text-slate-500 mt-1">Please reload or check your database connectivity.</p>
              </div>
            ) : filteredHospitals.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed dark:border-slate-850">
                <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-850 dark:text-slate-200 text-base">No clinics or hospitals match</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Try clearing some selected facility checkboxes or modify your search term.
                </p>
                <Button onClick={clearFilters} className="mt-4 bg-teal-650 hover:bg-teal-700 text-white text-xs font-bold">
                  Reset Filters
                </Button>
              </div>
            ) : (
              filteredHospitals.map((h) => (
                <HospitalCard key={h._id} hospital={h} showDistance={false} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
