import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Search, MapPin, Phone, Clock, Compass, Activity, Star, AlertCircle, Sparkles, Receipt, Microscope
} from 'lucide-react';

export default function NearbyLabs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [useGeo, setUseGeo] = useState(false);
  const [coords, setCoords] = useState(null);
  const [expandedLab, setExpandedLab] = useState(null);

  // Auto-request location on mount (Priority 6)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setUseGeo(true);
        },
        (err) => {
          console.warn('[Labs] Location permission not granted on mount:', err.message);
        }
      );
    }
  }, []);

  // Fetch laboratories
  const { data: labsRes, isLoading } = useQuery({
    queryKey: ['labs', searchQuery, selectedCategory, useGeo, coords],
    queryFn: () => {
      const params = { testCategory: selectedCategory };
      if (useGeo && coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
        params.radius = 50;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      return api.get('/labs', { params }).then(r => r.data);
    },
  });

  function handleLocationToggle() {
    if (!useGeo) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoords({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setUseGeo(true);
          },
          (err) => {
            alert('Could not retrieve coordinates. Defaulting to text search.');
          }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    } else {
      setUseGeo(false);
      setCoords(null);
    }
  }

  const labs = labsRes?.data || [];

  const categoryNames = {
    blood_test: '🩸 Blood Test',
    mri: '🧠 MRI Scan',
    ct_scan: '🩻 CT Scan',
    x_ray: '🦴 X-Ray',
    ultrasound: '🔊 Ultrasound'
  };

  return (
    <div className="space-y-6">
      {/* Premium Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-cyan-600 to-indigo-650 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <Microscope className="h-80 w-80" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-cyan-150 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Diagnostics Finder
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Nearby Laboratories</h1>
          <p className="text-cyan-100/90 text-sm md:text-base leading-relaxed">
            Locate high-quality, ISO-certified testing facilities, compare diagnostic test pricing, check report turnaround times, and contact center coordinators.
          </p>
        </div>
      </div>

      {/* Filter and Search controls */}
      <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search labs by name, city, state, or test type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition"
            />
          </div>

          <div className="w-full md:w-56">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition"
            >
              <option value="">All Diagnostic Categories</option>
              {Object.entries(categoryNames).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant={useGeo ? 'default' : 'outline'}
            onClick={handleLocationToggle}
            className={`rounded-xl gap-2 w-full md:w-auto font-bold py-2.5 ${
              useGeo ? 'bg-cyan-650 hover:bg-cyan-700 text-white' : 'text-slate-755 dark:text-slate-305'
            }`}
          >
            <Compass className="h-4 w-4" /> {useGeo ? 'GPS Active' : 'Find Nearby'}
          </Button>
        </CardContent>
      </Card>

      {/* Grid List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent"></div>
        </div>
      ) : labs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {labs.map(lab => {
            const isExpanded = expandedLab === lab._id;
            return (
              <Card key={lab._id} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base font-bold leading-tight text-slate-800 dark:text-white">
                        {lab.name}
                      </CardTitle>
                      {lab.rating > 0 && (
                        <Badge className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-0 flex items-center gap-1 font-bold shrink-0">
                          <Star className="h-3 w-3 fill-current" /> {lab.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge className={lab.isOpenNow ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 border-0' : 'bg-rose-50 text-rose-650 dark:bg-rose-950/30 border-0'}>
                        {lab.isOpenNow ? 'Open Now' : 'Closed'}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-semibold">{lab.operatingHours}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact & Address */}
                    <div className="space-y-2 text-xs font-semibold text-slate-650 dark:text-slate-400">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{lab.address.street}, {lab.address.city}, {lab.address.state} {lab.address.pincode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <a href={`tel:${lab.contactNumber}`} className="hover:underline text-cyan-600 dark:text-cyan-400">
                          {lab.contactNumber}
                        </a>
                      </div>
                    </div>

                    {/* Filtered tests count */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Available Diagnostic Tests</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {lab.testsAvailable?.slice(0, isExpanded ? undefined : 3).map(test => (
                          <div key={test._id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{test.name}</p>
                              <p className="text-[9px] font-semibold text-slate-400">{categoryNames[test.category] || test.category} · Reports in {test.durationHours}h</p>
                            </div>
                            <span className="text-xs font-black text-cyan-705 dark:text-cyan-405">₹{test.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0 space-y-2">
                  {lab.distance != null && (
                    <div className="flex items-center justify-between text-xs">
                      <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border-0 font-bold">
                        📍 {lab.distance} km away
                      </Badge>
                      {lab.location?.coordinates && (
                        <a
                          href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${lab.location.coordinates[1]}%2C${lab.location.coordinates[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Compass className="h-3.5 w-3.5" /> Directions
                        </a>
                      )}
                    </div>
                  )}
                  {lab.testsAvailable?.length > 3 && (
                    <Button
                      variant="outline"
                      onClick={() => setExpandedLab(isExpanded ? null : lab._id)}
                      className="w-full rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      {isExpanded ? 'Show Less' : `View All (${lab.testsAvailable.length}) Tests`}
                    </Button>
                  )}
                  <a href={`tel:${lab.contactNumber}`} className="block">
                    <Button className="w-full bg-cyan-650 hover:bg-cyan-705 text-white rounded-xl text-xs font-bold gap-1.5">
                      <Receipt className="h-3.5 w-3.5" /> Book Diagnostic Scan
                    </Button>
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl p-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
          <AlertCircle className="h-12 w-12 text-slate-400 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Laboratories Found</h3>
          <p className="text-xs text-slate-450 max-w-sm">
            We couldn't find any diagnostic labs fitting your criteria. Try adjusting the city or category filter.
          </p>
        </div>
      )}
    </div>
  );
}
