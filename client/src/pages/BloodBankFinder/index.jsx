import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LeafletMap } from '@/components/maps/LeafletMap';
import {
  Search, MapPin, Phone, Clock, Heart, Award, Star, Compass, AlertCircle, Sparkles, X, Filter, Grid, Map, Share2, ClipboardCheck
} from 'lucide-react';

export default function BloodBankFinder() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [useGeo, setUseGeo] = useState(false);
  const [coords, setCoords] = useState(null);
  const [registeringBank, setRegisteringBank] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);
  const [formData, setFormData] = useState({ name: '', bloodGroup: 'O+', phone: '', email: '' });
  const [successMsg, setSuccessMsg] = useState('');

  // Added Layout & Filtering states matching HospitalList
  const [showMap, setShowMap] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(10); // in km
  const [minRating, setMinRating] = useState(0);
  const [requireVerified, setRequireVerified] = useState(false);
  const [require24x7, setRequire24x7] = useState(false);

  // Autocomplete states
  const [autocompleteText, setAutocompleteText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef(null);

  // Favorites state
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState({ recent: [] });

  const hasLocation = typeof coords?.lat === 'number' && typeof coords?.lng === 'number';

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

  // Load history and favorites
  useEffect(() => {
    const fetchHistoryAndFavorites = async () => {
      try {
        const histRes = await api.get('/search/history');
        if (histRes.data?.success) setHistory(histRes.data.data);
      } catch (err) {
        console.warn('Search history not available');
      }

      try {
        const favRes = await api.get('/search/favorites');
        if (favRes.data?.success) setFavorites(favRes.data.data);
      } catch (err) {
        console.warn('Favorites not available');
      }
    };
    fetchHistoryAndFavorites();
  }, []);

  // Dismiss autocomplete dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch autocomplete suggestions with debounce
  useEffect(() => {
    if (autocompleteText.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await api.get(`/search/autocomplete?q=${encodeURIComponent(autocompleteText)}`);
        if (res.data?.success) {
          setSuggestions(res.data.data || []);
        }
      } catch (err) {
        console.error('Autocomplete query failed:', err.message);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [autocompleteText]);

  // Fetch blood banks with query filters
  const { data: banksRes, isLoading, refetch } = useQuery({
    queryKey: ['blood-banks', searchQuery, selectedGroup, useGeo, coords, selectedRadius, minRating, requireVerified],
    queryFn: () => {
      const params = {
        bloodGroup: selectedGroup,
        radius: selectedRadius,
        rating: minRating || undefined,
        verified: requireVerified || undefined
      };
      if (useGeo && coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
        params.latitude = coords.lat;
        params.longitude = coords.lng;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
        params.query = searchQuery.trim();
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

  const toggleFavoriteMutation = useMutation({
    mutationFn: (item) => api.post('/search/favorites/toggle', {
      entityId: String(item._id),
      entityType: 'blood_bank',
      name: item.name,
      address: item.address?.street || item.address || 'Address not listed',
      rating: item.rating || 4.5,
      details: item
    }),
    onSuccess: (res) => {
      const isFav = res.data?.isFavorite;
      setFavorites(prev =>
        isFav
          ? [...prev, res.data.data]
          : prev.filter(f => f.entityId !== String(res.data.data?.entityId || res.data.entityId))
      );
      queryClient.invalidateQueries(['blood-banks']);
    }
  });

  const isFavorited = (entityId) => {
    return favorites.some(f => String(f.entityId) === String(entityId));
  };

  const handleShare = (item) => {
    const text = `${item.name}\n📍 Address: ${item.address.street}, ${item.address.city}\n📞 Contact: ${item.emergencyContact}\n🩸 View live stock on Medicare.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Blood Bank details copied to clipboard!');
      });
    } else {
      alert(text);
    }
  };

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

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        selectSuggestion(suggestions[activeSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (s) => {
    setSearchQuery(s.city || s.displayName);
    setAutocompleteText('');
    setShowSuggestions(false);
  };

  function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    registerMutation.mutate({
      bankId: registeringBank._id,
      data: formData
    });
  }

  const clearAllFilters = () => {
    setSearchQuery('');
    setAutocompleteText('');
    setSelectedRadius(10);
    setMinRating(0);
    setRequireVerified(false);
    setRequire24x7(false);
    setSelectedGroup('');
  };

  let bloodBanks = banksRes?.data || [];

  // Frontend filters matching rating & timings tag
  if (require24x7) {
    bloodBanks = bloodBanks.filter(b => b.timings?.toLowerCase().includes('24x7') || b.timings?.toLowerCase().includes('24 hours'));
  }

  const searchLat = coords?.lat || 28.6139;
  const searchLng = coords?.lng || 77.2090;

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
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-4 items-center">
            {/* Autocomplete Input */}
            <div className="md:col-span-2 relative" ref={autocompleteRef}>
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search location, city, or blood bank..."
                value={autocompleteText || searchQuery}
                onChange={e => {
                  setAutocompleteText(e.target.value);
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-950 pl-11 pr-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition text-slate-800 dark:text-slate-100"
              />

              {/* Suggestions dropdown */}
              {showSuggestions && (suggestions.length > 0 || history.recent.length > 0) && (
                <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl p-2 max-h-60 overflow-y-auto">
                  {suggestions.length > 0 ? (
                    suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectSuggestion(s)}
                        className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-left text-xs font-bold transition cursor-pointer ${
                          idx === activeSuggestionIndex
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350'
                        }`}
                      >
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{s.displayName}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Recent Searches</p>
                      {history.recent.slice(0, 3).map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setSearchQuery(q); setShowSuggestions(false); }}
                          className="w-full flex items-center gap-2 p-1.5 rounded-lg text-left text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer"
                        >
                          <Clock className="h-3.5 w-3.5 text-slate-355" />
                          <span>{q}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Blood group selector */}
            <div className="w-full">
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition text-slate-800 dark:text-slate-100"
              >
                <option value="">All Blood Groups</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(grp => (
                  <option key={grp} value={grp}>{grp}</option>
                ))}
              </select>
            </div>

            {/* Location tag button */}
            <Button
              type="button"
              variant={useGeo ? 'default' : 'outline'}
              onClick={handleLocationToggle}
              className={`rounded-xl gap-2 w-full font-bold py-3 ${
                useGeo ? 'bg-red-650 hover:bg-red-700 text-white border-red-500/20' : 'text-slate-700 dark:text-slate-300 border-slate-250 dark:border-slate-800'
              }`}
            >
              <Compass className="h-4 w-4 animate-pulse" /> {useGeo ? 'GPS Active' : 'Find Nearby'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Layout Grid */}
      <div className="grid gap-6 lg:grid-cols-4 items-start">
        {/* Left Filters */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-md">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-red-600" /> Smart Filters
              </h2>
              {(searchQuery || selectedGroup || minRating > 0 || requireVerified || require24x7) && (
                <button onClick={clearAllFilters} className="text-[10px] font-black text-red-655 hover:underline">
                  Clear All
                </button>
              )}
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Layout toggling */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Layout Preference</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850">
                  <button
                    onClick={() => setShowMap(false)}
                    className={`flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-bold gap-1 transition cursor-pointer ${
                      !showMap ? 'bg-white dark:bg-slate-900 text-red-700 shadow-sm' : 'text-slate-550'
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" /> Grid List
                  </button>
                  <button
                    onClick={() => setShowMap(true)}
                    className={`flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-bold gap-1 transition cursor-pointer ${
                      showMap ? 'bg-white dark:bg-slate-900 text-red-700 shadow-sm' : 'text-slate-550'
                    }`}
                  >
                    <Map className="h-3.5 w-3.5" /> Map View
                  </button>
                </div>
              </div>

              {/* Radius / Distance selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Radius Range</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {[5, 10, 20, 50].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRadius(r)}
                      className={`py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                        selectedRadius === r
                          ? 'bg-red-650 text-white shadow-sm font-bold'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Minimum Rating</label>
                <div className="flex gap-1">
                  {[3, 4, 4.5].map(r => (
                    <button
                      key={r}
                      onClick={() => setMinRating(minRating === r ? 0 : r)}
                      className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                        minRating === r
                          ? 'bg-red-50 border-red-400 text-red-700 dark:bg-red-950/20'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-650 dark:border-slate-800'
                      }`}
                    >
                      ⭐ {r}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Verified network check */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Verification Tag</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={requireVerified}
                      onChange={(e) => setRequireVerified(e.target.checked)}
                      className="accent-red-650 h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Verified Center Only</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={require24x7}
                      onChange={(e) => setRequire24x7(e.target.checked)}
                      className="accent-red-650 h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Open 24/7 (Emergency)</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results grid or map */}
        <div className="lg:col-span-3 space-y-4">
          {showMap ? (
            <LeafletMap
              userLat={searchLat}
              userLng={searchLng}
              items={bloodBanks}
              category="blood_bank"
              height="500px"
            />
          ) : isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
            </div>
          ) : bloodBanks.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {bloodBanks.map(bank => {
                const lat = bank.latitude || bank.location?.coordinates?.[1];
                const lng = bank.longitude || bank.location?.coordinates?.[0];
                const googleMapsUrl = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : '#';

                return (
                  <Card key={bank._id} className="relative border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900">
                    {/* Favorites Heart button */}
                    <button
                      onClick={() => toggleFavoriteMutation.mutate(bank)}
                      className="absolute right-4 top-4 z-10 p-2 rounded-xl bg-white/95 dark:bg-slate-950/95 shadow border border-slate-200 text-rose-500 hover:scale-110 active:scale-95 transition cursor-pointer"
                    >
                      {isFavorited(bank._id) ? (
                        <Heart className="h-4.5 w-4.5 fill-rose-500 text-rose-500" />
                      ) : (
                        <Heart className="h-4.5 w-4.5 text-slate-400" />
                      )}
                    </button>

                    <CardHeader className="pb-3 pr-14">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base font-black leading-tight text-slate-800 dark:text-white">
                          {bank.name}
                        </CardTitle>
                      </div>
                      {bank.hospital?.name && (
                        <CardDescription className="text-xs font-semibold text-slate-400">
                          Affiliated: {bank.hospital.name}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Address and details */}
                      <div className="space-y-2 text-xs font-semibold text-slate-650 dark:text-slate-400">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">
                            {typeof bank.address === 'string' ? bank.address : [bank.address?.street, bank.address?.city, bank.address?.state].filter(Boolean).join(', ') || 'Address unavailable'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">

                          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>Status: {bank.timings}</span>
                        </div>
                        {bank.emergencyContact && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                            <a href={`tel:${bank.emergencyContact}`} className="hover:underline text-red-600 dark:text-red-400 font-bold">
                              {bank.emergencyContact}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Stock Indicators */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blood Stock Status</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {['A+', 'B+', 'O+', 'AB+'].map(group => {
                            const stock = bank.bloodGroups?.find(b => b.group === group);
                            const units = stock ? stock.unitsAvailable : 0;
                            const badgeColor = units >= 25
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                              : units > 0
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                              : 'bg-rose-50 text-rose-650 dark:bg-rose-950/20';

                            return (
                              <div key={group} className={`flex flex-col items-center p-1.5 rounded-lg border dark:border-slate-800 ${badgeColor}`}>
                                <span className="text-[11px] font-black">{group}</span>
                                <span className="text-[9px] font-bold">{units} U</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>

                    <div className="p-4 pt-0 space-y-2">
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBank(bank)}
                          className="flex-1 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShare(bank)}
                          className="rounded-xl p-2 px-2.5 text-slate-500 hover:text-slate-750 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-855"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {bank.emergencyContact ? (
                          <a href={`tel:${bank.emergencyContact}`} className="w-full">
                            <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl py-2 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-850">
                              <Phone className="h-3.5 w-3.5" /> Call
                            </Button>
                          </a>
                        ) : (
                          <Button variant="outline" size="sm" disabled className="w-full text-xs opacity-50">No Phone</Button>
                        )}
                        <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="w-full">
                          <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl py-2 text-teal-600 border-teal-500/20 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-850">
                            <Compass className="h-3.5 w-3.5 text-teal-605 animate-pulse" /> Directions
                          </Button>
                        </a>
                      </div>

                      <Button
                        onClick={() => setRegisteringBank(bank)}
                        className="w-full bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold gap-1.5"
                      >
                        <Heart className="h-3.5 w-3.5 fill-current" /> Register Donor
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl p-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
              <AlertCircle className="h-12 w-12 text-slate-400 animate-bounce" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Blood Banks Found</h3>
              <p className="text-xs text-slate-450 max-w-sm">
                We couldn't find any blood bank centers fitting your criteria. Try adjusting the city search parameters or resetting the location filter.
              </p>
              <Button onClick={clearAllFilters} className="bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-xl px-4">
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Details View Drawer/Modal */}
      {selectedBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-950 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedBank(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-655 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-rose-50 text-rose-600 border-0 font-bold uppercase text-[9px]">Blood Bank</Badge>
                {selectedBank.rating > 0 && <span className="text-xs font-bold text-amber-500">⭐ {selectedBank.rating}</span>}
              </div>
              <h2 className="text-xl font-black text-slate-850 dark:text-white mt-1">{selectedBank.name}</h2>
              {selectedBank.hospital?.name && <p className="text-xs text-slate-400">Affiliated with: {selectedBank.hospital.name}</p>}
            </div>

            <div className="space-y-3 text-xs font-semibold text-slate-650 dark:text-slate-400 border-y border-slate-100 dark:border-slate-850 py-4">
              <div className="flex gap-2">
                <MapPin className="h-4.5 w-4.5 text-slate-450 shrink-0" />
                <span>
                  {typeof selectedBank.address === 'string' ? selectedBank.address : [selectedBank.address?.street, selectedBank.address?.city, selectedBank.address?.state, selectedBank.address?.pincode].filter(Boolean).join(', ') || 'Address unavailable'}
                </span>
              </div>
              <div className="flex gap-2">

                <Clock className="h-4.5 w-4.5 text-slate-455 shrink-0" />
                <span>Operating status: {selectedBank.timings}</span>
              </div>
              {selectedBank.emergencyContact && (
                <div className="flex gap-2">
                  <Phone className="h-4.5 w-4.5 text-slate-450 shrink-0" />
                  <span>Call Emergency Coordinator: <a href={`tel:${selectedBank.emergencyContact}`} className="text-red-650 dark:text-red-405 font-bold hover:underline">{selectedBank.emergencyContact}</a></span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Complete Stock Inventory</h4>
              <div className="grid grid-cols-4 gap-2">
                {selectedBank.bloodGroups?.map(s => (
                  <div key={s.group} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border dark:border-slate-850">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-350">{s.group}</span>
                    <span className="text-[10px] font-bold text-red-650 dark:text-red-405 mt-0.5">{s.unitsAvailable} Units</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedBank.volunteers?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Community Donors ({selectedBank.volunteers.length})</h4>
                <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                  {selectedBank.volunteers.map((v, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border dark:border-slate-855">
                      <span className="font-bold text-slate-700 dark:text-slate-355">{v.name}</span>
                      <Badge className="bg-red-50 text-red-600 border-0 font-bold shrink-0">{v.bloodGroup}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => { setSelectedBank(null); setRegisteringBank(selectedBank); }}
                className="rounded-xl text-xs font-bold text-red-650 border-red-500/20 bg-transparent"
              >
                Register as Donor
              </Button>
              <Button
                onClick={() => setSelectedBank(null)}
                className="bg-slate-850 text-white rounded-xl text-xs font-bold"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Donor Registration Modal */}
      {registeringBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-950 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <button
              onClick={() => setRegisteringBank(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-650 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <Heart className="h-5 w-5 text-red-600 fill-current animate-pulse" /> Register as a Donor
              </h2>
              <p className="text-xs text-slate-455 mt-1">
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
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-955 p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition text-slate-850 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Blood Group</label>
                    <select
                      value={formData.bloodGroup}
                      onChange={e => setFormData(p => ({ ...p, bloodGroup: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-955 p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition text-slate-850 dark:text-slate-100"
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
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-955 p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition text-slate-850 dark:text-slate-100"
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
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-955 p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition text-slate-850 dark:text-slate-100"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRegisteringBank(null)}
                    className="rounded-xl text-xs font-bold bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="bg-red-650 hover:bg-red-755 text-white rounded-xl text-xs font-bold"
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
