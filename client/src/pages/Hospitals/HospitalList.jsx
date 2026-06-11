import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, RefreshCw, GitCompare, Navigation, AlertCircle, Sparkles, Filter, Search, Map, Grid, CheckCircle2 } from 'lucide-react';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { hospitalService } from '@/services/hospitalService';
import { HospitalCard } from '@/components/HospitalCard';
import { NearbyHospitalMap } from '@/components/NearbyHospitalMap';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

export default function HospitalList() {
  const {
    latitude,
    longitude,
    loading: locLoading,
    error: locError,
    refetch: refetchLocation,
  } = useCurrentLocation();

  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('All');
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [searchMode, setSearchMode] = useState('all'); // 'all' or 'nearby'
  const [showMap, setShowMap] = useState(false);

  const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';

  const {
    data: hospitalsResponse,
    isLoading: hospitalsLoading,
    refetch: refetchHospitals,
    isError,
  } = useQuery({
    queryKey: ['hospitals-discovery', searchQuery, city, selectedFacilities, searchMode, latitude, longitude],
    queryFn: () => {
      if (searchMode === 'nearby' && latitude && longitude) {
        return hospitalService.getNearby(latitude, longitude);
      } else {
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (city && city !== 'All') params.city = city;
        if (selectedFacilities.length > 0) params.facilities = selectedFacilities.join(',');
        return hospitalService.getAll(params);
      }
    },
    keepPreviousData: true,
  });

  const hospitals = hospitalsResponse?.data || [];
  const userPlace = hospitalsResponse?.userLocation;

  const toggleCompare = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const toggleFacility = (facility) => {
    setSelectedFacilities((prev) =>
      prev.includes(facility) ? prev.filter((x) => x !== facility) : [...prev, facility]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setCity('All');
    setSelectedFacilities([]);
    setSearchMode('all');
  };

  const formattedCityState = () => {
    if (searchMode === 'nearby' && userPlace) {
      const parts = [userPlace.city, userPlace.state].filter(Boolean);
      return parts.join(', ');
    }
    return city === 'All' ? 'All Locations' : city;
  };

  const handleUseLocation = () => {
    setSearchMode('nearby');
    refetchLocation();
  };

  return (
    <div className="space-y-6">
      {/* Discovery Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-700 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <Sparkles className="h-72 w-72" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> Discovery Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Find and Book the Best Care
          </h1>
          <p className="text-teal-100/90 text-sm md:text-base leading-relaxed">
            Search hospitals, specialized departments, and top-tier doctors in real-time. Book video consultations or in-clinic visits instantly.
          </p>
        </div>
      </div>

      {/* Real-time search and selector dashboard */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-4 items-center">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search hospital by name, specialties, or street..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchMode('all');
                  setSearchQuery(e.target.value);
                }}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 pl-11 focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-850 dark:text-slate-100 shadow-inner outline-none transition"
              />
            </div>

            {/* City Dropdown */}
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <select
                value={city}
                onChange={(e) => {
                  setSearchMode('all');
                  setCity(e.target.value);
                }}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 pl-11 focus:ring-2 focus:ring-teal-500 text-slate-850 dark:text-slate-100 shadow-inner outline-none appearance-none cursor-pointer transition"
              >
                <option value="All">All Cities</option>
                <option value="New York">New York</option>
                <option value="Brooklyn">Brooklyn</option>
                <option value="Lucknow">Lucknow</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleUseLocation}
                variant={searchMode === 'nearby' ? 'default' : 'outline'}
                className={`flex-1 rounded-xl font-bold text-xs py-3 justify-center gap-1.5 ${
                  searchMode === 'nearby'
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                }`}
              >
                {locLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                Near Me
              </Button>
              
              {selected.length >= 2 && (
                <Link to={`/patient/compare?ids=${selected.join(',')}`} className="flex-1">
                  <Button className="w-full rounded-xl font-bold text-xs py-3 bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center gap-1.5 shadow">
                    <GitCompare className="h-4 w-4" /> Compare ({selected.length})
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-4 items-start">
        {/* Sidebar filters */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-teal-650" /> Refine Search
              </h2>
              {(searchQuery || city !== 'All' || selectedFacilities.length > 0 || searchMode === 'nearby') && (
                <button
                  onClick={clearAllFilters}
                  className="text-[10px] font-bold text-teal-600 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <CardContent className="p-5 space-y-5">
              {/* Toggle Layout */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Layout Preference
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850">
                  <button
                    onClick={() => setShowMap(false)}
                    className={`flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-bold gap-1 transition ${
                      !showMap
                        ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" /> List Grid
                  </button>
                  <button
                    disabled={searchMode === 'nearby' && !hasLocation}
                    onClick={() => setShowMap(true)}
                    className={`flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-bold gap-1 transition ${
                      showMap
                        ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 disabled:opacity-40'
                    }`}
                  >
                    <Map className="h-3.5 w-3.5" /> Map View
                  </button>
                </div>
              </div>

              {/* Facilities check boxes */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Clinic Facilities
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'Emergency', label: 'Emergency Admissions', icon: '🚨' },
                    { key: 'ICU', label: 'Intensive Care Unit (ICU)', icon: '🏥' },
                    { key: 'Ambulance', label: 'Ambulance Service', icon: '🚑' },
                    { key: 'Pharmacy', label: 'In-house Pharmacy', icon: '💊' },
                    { key: 'Lab', label: 'Diagnostics Laboratory', icon: '🧪' },
                    { key: 'MRI', label: 'MRI Scanner', icon: '🧲' },
                    { key: 'CTScan', label: 'CT Scanner', icon: '🌀' },
                    { key: 'BloodBank', label: 'Blood Bank Services', icon: '🩸' },
                    { key: 'Dialysis', label: 'Dialysis Unit', icon: '💧' },
                    { key: 'Ventilator', label: 'Ventilator Support', icon: '🫁' },
                  ].map((fac) => {
                    const isChecked = selectedFacilities.includes(fac.key);
                    return (
                      <button
                        key={fac.key}
                        onClick={() => toggleFacility(fac.key)}
                        className={`w-full flex items-center justify-between p-2.5 text-left text-xs font-bold rounded-xl border transition ${
                          isChecked
                            ? 'bg-teal-50 border-teal-400 text-teal-700 dark:bg-teal-950/20 dark:border-teal-850 dark:text-teal-400 shadow-sm'
                            : 'bg-transparent border-slate-100 dark:border-slate-800/60 text-slate-650 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-850'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{fac.icon}</span>
                          <span>{fac.label}</span>
                        </span>
                        {isChecked && <CheckCircle2 className="h-4 w-4 text-teal-650 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border dark:border-slate-800">
            <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 flex-wrap">
              <span>Hospitals found in</span>
              <span className="text-slate-850 dark:text-slate-200 font-bold underline decoration-teal-500 decoration-2">
                {formattedCityState()}
              </span>
              {selectedFacilities.map((fac) => (
                <Badge key={fac} className="bg-teal-600/10 text-teal-650 dark:bg-teal-950/30 border-0 font-bold text-[10px]">
                  {fac}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-slate-400 font-bold shrink-0">
              {hospitalsLoading ? 'Searching...' : `${hospitals.length} match(es) found`}
            </div>
          </div>

          {searchMode === 'nearby' && locLoading && (
            <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <MapPin className="h-10 w-10 text-teal-600 animate-bounce" />
                <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-4 text-sm">
                  Acquiring GPS coordinates...
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Calculating nearby medical institutions dynamically.
                </p>
              </CardContent>
            </Card>
          )}

          {searchMode === 'nearby' && locError && !locLoading && (
            <Card className="border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20 rounded-2xl">
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <AlertCircle className="h-10 w-10 text-amber-600" />
                <p className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                  GPS Location Denied
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-450 max-w-sm">
                  Please enable location permissions in your browser or select a city filter manually.
                </p>
                <Button onClick={() => setSearchMode('all')} size="sm" className="mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  Fallback to Manual Search
                </Button>
              </CardContent>
            </Card>
          )}

          {!(searchMode === 'nearby' && locLoading) && (
            <>
              {showMap && (
                <NearbyHospitalMap
                  userLat={latitude || 40.7484}
                  userLng={longitude || -73.9857}
                  hospitals={hospitals}
                />
              )}

              {!showMap && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {hospitalsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-80 rounded-2xl" />
                    ))
                  ) : hospitals.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed dark:border-slate-800">
                      <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                      <p className="font-extrabold text-slate-850 dark:text-slate-200 text-base">No clinics or hospitals match</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        Modify search term or check alternate facilities checkboxes.
                      </p>
                      <Button onClick={clearAllFilters} className="mt-4 bg-teal-650 hover:bg-teal-700 text-white text-xs font-bold">
                        Reset Filters
                      </Button>
                    </div>
                  ) : (
                    hospitals.map((h) => (
                      <div key={h._id} className="relative group">
                        {h.isNetworkHospital !== false && !String(h._id).startsWith('google_') && !String(h._id).startsWith('overpass_') && (
                          <input
                            type="checkbox"
                            checked={selected.includes(h._id)}
                            onChange={() => toggleCompare(h._id)}
                            className="absolute right-4 top-4 z-10 h-4.5 w-4.5 cursor-pointer accent-teal-600 rounded"
                            title="Compare clinic statistics"
                          />
                        )}
                        <HospitalCard hospital={h} showDistance={searchMode === 'nearby'} />
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
