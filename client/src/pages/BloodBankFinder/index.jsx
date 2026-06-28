import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Search, MapPin, Phone, Clock, Heart, Award, Star, Compass, AlertCircle, Sparkles, X
} from 'lucide-react';

export default function BloodBankFinder() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [useGeo, setUseGeo] = useState(false);
  const [coords, setCoords] = useState(null);
  const [registeringBank, setRegisteringBank] = useState(null);
  const [formData, setFormData] = useState({ name: '', bloodGroup: 'O+', phone: '', email: '' });
  const [successMsg, setSuccessMsg] = useState('');

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
          console.warn('[BloodBank] Location permission not granted on mount:', err.message);
        }
      );
    }
  }, []);

  // Fetch blood banks with query filters
  const { data: banksRes, isLoading, refetch } = useQuery({
    queryKey: ['blood-banks', searchQuery, selectedGroup, useGeo, coords],
    queryFn: () => {
      const params = { bloodGroup: selectedGroup };
      if (useGeo && coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
        params.radius = 50;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      return api.get('/blood-banks', { params }).then(r => r.data);
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({ bankId, data }) => api.post(`/blood-banks/${bankId}/volunteers`, data),
    onSuccess: () => {
      setSuccessMsg('Thank you! You have registered as a volunteer blood donor.');
      queryClient.invalidateQueries(['blood-banks']);
      setFormData({ name: '', bloodGroup: 'O+', phone: '', email: '' });
      setTimeout(() => {
        setRegisteringBank(null);
        setSuccessMsg('');
      }, 3000);
    }
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

  function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    registerMutation.mutate({
      bankId: registeringBank._id,
      data: formData
    });
  }

  const bloodBanks = banksRes?.data || [];

  return (
    <div className="space-y-6">
      {/* Premium Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-red-700 via-rose-600 to-amber-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <Heart className="h-80 w-80" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-rose-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Life-Saving Stock Tracker
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Blood Bank Finder & Donor Hub</h1>
          <p className="text-rose-100/90 text-sm md:text-base leading-relaxed">
            Locate blood banks in real-time, view verified blood group inventory stock, or sign up as a voluntary community donor to support clinical emergencies.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search blood banks by name, city, state, or hospital..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
            />
          </div>

          <div className="w-full md:w-48">
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
            >
              <option value="">All Blood Groups</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(grp => (
                <option key={grp} value={grp}>{grp}</option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant={useGeo ? 'default' : 'outline'}
            onClick={handleLocationToggle}
            className={`rounded-xl gap-2 w-full md:w-auto font-bold py-2.5 ${
              useGeo ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Compass className="h-4 w-4" /> {useGeo ? 'GPS Active' : 'Find Nearby'}
          </Button>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
        </div>
      ) : bloodBanks.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bloodBanks.map(bank => (
            <Card key={bank._id} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-bold leading-tight text-slate-800 dark:text-white">
                      {bank.name}
                    </CardTitle>
                    {bank.rating > 0 && (
                      <Badge className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-0 flex items-center gap-1 font-bold shrink-0">
                        <Star className="h-3 w-3 fill-current" /> {bank.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  {bank.hospital?.name && (
                    <CardDescription className="text-xs font-semibold text-slate-400">
                      Affiliated: {bank.hospital.name}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Address and details */}
                  <div className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-450">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{bank.address.street}, {bank.address.city}, {bank.address.state} {bank.address.pincode ? `- ${bank.address.pincode}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>Operating hours: {bank.timings}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <a href={`tel:${bank.emergencyContact}`} className="hover:underline text-red-600 dark:text-red-400 font-bold">
                        {bank.emergencyContact} (Emergency Contact)
                      </a>
                    </div>
                  </div>

                  {/* Stock Levels */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Blood Stock Status</p>
                    <div className="grid grid-cols-4 gap-2">
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => {
                        const stock = bank.bloodGroups?.find(b => b.group === group);
                        const units = stock ? stock.unitsAvailable : 0;
                        const badgeColor = units >= 50
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/50'
                          : units > 0
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450 border border-amber-100 dark:border-amber-900/50'
                          : 'bg-rose-50 text-rose-650 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-100 dark:border-rose-900/50';

                        return (
                          <div key={group} className={`flex flex-col items-center p-2 rounded-lg ${badgeColor}`}>
                            <span className="text-xs font-black">{group}</span>
                            <span className="text-[10px] font-bold">{units} Units</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="p-4 pt-0 space-y-2">
                {bank.distance != null && (
                  <div className="flex items-center justify-between text-xs">
                    <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border-0 font-bold">
                      📍 {bank.distance} km away
                    </Badge>
                    {bank.location?.coordinates && (
                      <a
                        href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${bank.location.coordinates[1]}%2C${bank.location.coordinates[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <Compass className="h-3.5 w-3.5" /> Get Directions
                      </a>
                    )}
                  </div>
                )}
                <Button
                  onClick={() => setRegisteringBank(bank)}
                  className="w-full bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Heart className="h-3.5 w-3.5 fill-current" /> Register Donor
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl p-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
          <AlertCircle className="h-12 w-12 text-slate-400 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Blood Banks Found</h3>
          <p className="text-xs text-slate-450 max-w-sm">
            We couldn't find any blood bank centers fitting your criteria. Try adjusting the city search parameters or resetting the location filter.
          </p>
        </div>
      )}

      {/* Donor Registration Modal */}
      {registeringBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-950 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <button
              onClick={() => setRegisteringBank(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <Heart className="h-5 w-5 text-red-600 fill-current animate-pulse" /> Register as a Donor
              </h2>
              <p className="text-xs text-slate-450 mt-1">
                You are registering at <strong>{registeringBank.name}</strong>.
              </p>
            </div>

            {successMsg ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 text-center space-y-2">
                <Award className="h-8 w-8 text-emerald-600 mx-auto animate-bounce" />
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Blood Group</label>
                    <select
                      value={formData.bloodGroup}
                      onChange={e => setFormData(p => ({ ...p, bloodGroup: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(grp => (
                        <option key={grp} value={grp}>{grp}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="e.g. +91 9988776655"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="e.g. donor@example.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRegisteringBank(null)}
                    className="rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-bold"
                  >
                    {registerMutation.isPending ? 'Registering...' : 'Submit Registration'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
