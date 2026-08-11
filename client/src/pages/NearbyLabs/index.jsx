import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LeafletMap } from '@/components/maps/LeafletMap';
import {
  Search, MapPin, Phone, Clock, Compass, Star, AlertCircle, Sparkles, X, Filter, Grid, Map, Share2, Receipt, Microscope, Heart
} from 'lucide-react';

export default function NearbyLabs() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [useGeo, setUseGeo] = useState(false);
  const [coords, setCoords] = useState(null);
  const [selectedLab, setSelectedLab] = useState(null);
  const [expandedLab, setExpandedLab] = useState(null);

  // Added Layout & Filtering states matching HospitalList
  const [showMap, setShowMap] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(10); // in km
  const [minRating, setMinRating] = useState(0);
  const [requireVerified, setRequireVerified] = useState(false);
  const [requireOpenNow, setRequireOpenNow] = useState(false);

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
          console.warn('[Labs] Location permission not granted on mount:', err.message);
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

  // Fetch laboratories
  const { data: labsRes, isLoading } = useQuery({
    queryKey: ['labs', searchQuery, selectedCategory, useGeo, coords, selectedRadius, minRating, requireVerified, requireOpenNow],
    queryFn: () => {
      const params = {
        testCategory: selectedCategory,
        radius: selectedRadius,
        minRating: minRating || undefined,
        verified: requireVerified || undefined,
        openNow: requireOpenNow || undefined
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
      return api.get('/labs', { params }).then(r => r.data);
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (item) => api.post('/search/favorites/toggle', {
      entityId: String(item._id),
      entityType: 'lab',
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
      queryClient.invalidateQueries(['labs']);
    }
  });

  const isFavorited = (entityId) => {
    return favorites.some(f => String(f.entityId) === String(entityId));
  };

  const handleShare = (item) => {
    const text = `${item.name}\n📍 Address: ${item.address.street}, ${item.address.city}\n📞 Contact: ${item.contactNumber}\n🔬 View live diagnostics on Medicare.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Diagnostic Lab details copied to clipboard!');
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

  const clearAllFilters = () => {
    setSearchQuery('');
    setAutocompleteText('');
    setSelectedRadius(10);
    setMinRating(0);
    setRequireVerified(false);
    setRequireOpenNow(false);
    setSelectedCategory('');
  };

  const labs = labsRes?.data || [];

  const categoryNames = {
    blood_test: '🩸 Blood Test',
    mri: '🧠 MRI Scan',
    ct_scan: '🩻 CT Scan',
    x_ray: '🦴 X-Ray',
    ultrasound: '🔊 Ultrasound'
  };

  const searchLat = coords?.lat || 28.6139;
  const searchLng = coords?.lng || 77.2090;

  return (
    <div className="space-y-6">
      {/* Premium Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-cyan-600 to-indigo-650 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <Microscope className="h-80 w-80" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-cyan-155 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
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
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-4 items-center">
            {/* Autocomplete Input */}
            <div className="md:col-span-2 relative" ref={autocompleteRef}>
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search location, city, or laboratory..."
                value={autocompleteText || searchQuery}
                onChange={e => {
                  setAutocompleteText(e.target.value);
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-955 pl-11 pr-4 py-3 focus:ring-2 focus:ring-cyan-500 outline-none transition text-slate-850 dark:text-slate-100"
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
                            ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/20'
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
                          <Clock className="h-3.5 w-3.5 text-slate-350" />
                          <span>{q}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Diagnostic Category selector */}
            <div className="w-full">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition text-slate-800 dark:text-slate-100"
              >
                <option value="">All Diagnostic Categories</option>
                {Object.entries(categoryNames).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* GPS locate button */}
            <Button
              type="button"
              variant={useGeo ? 'default' : 'outline'}
              onClick={handleLocationToggle}
              className={`rounded-xl gap-2 w-full font-bold py-3 ${
                useGeo ? 'bg-cyan-650 hover:bg-cyan-705 text-white border-cyan-500/20' : 'text-slate-700 dark:text-slate-300 border-slate-250 dark:border-slate-800'
              }`}
            >
              <Compass className="h-4 w-4 animate-pulse" /> {useGeo ? 'GPS Active' : 'Find Nearby'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Layout Grid */}
      <div className="grid gap-6 lg:grid-cols-4 items-start">
        {/* Left Side Filters */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-md">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-cyan-600" /> Smart Filters
              </h2>
              {(searchQuery || selectedCategory || minRating > 0 || requireVerified || requireOpenNow) && (
                <button onClick={clearAllFilters} className="text-[10px] font-black text-cyan-655 hover:underline">
                  Clear All
                </button>
              )}
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Layout toggling */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Layout Preference</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 dark:bg-slate-955 rounded-xl border dark:border-slate-850">
                  <button
                    onClick={() => setShowMap(false)}
                    className={`flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-bold gap-1 transition cursor-pointer ${
                      !showMap ? 'bg-white dark:bg-slate-900 text-cyan-700 shadow-sm' : 'text-slate-550'
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" /> Grid List
                  </button>
                  <button
                    onClick={() => setShowMap(true)}
                    className={`flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-bold gap-1 transition cursor-pointer ${
                      showMap ? 'bg-white dark:bg-slate-900 text-cyan-700 shadow-sm' : 'text-slate-550'
                    }`}
                  >
                    <Map className="h-3.5 w-3.5" /> Map View
                  </button>
                </div>
              </div>

              {/* Radius selectors */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Radius Range</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {[5, 10, 20, 50].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRadius(r)}
                      className={`py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                        selectedRadius === r
                          ? 'bg-cyan-650 text-white shadow-sm font-bold'
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
                          ? 'bg-cyan-50 border-cyan-400 text-cyan-700 dark:bg-cyan-950/20'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-655 dark:border-slate-800'
                      }`}
                    >
                      ⭐ {r}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Verification Tag</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={requireVerified}
                      onChange={(e) => setRequireVerified(e.target.checked)}
                      className="accent-cyan-650 h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Verified Center Only</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={requireOpenNow}
                      onChange={(e) => setRequireOpenNow(e.target.checked)}
                      className="accent-cyan-650 h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Open Now (Active)</span>
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
              items={labs}
              category="lab"
              height="500px"
            />
          ) : isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent"></div>
            </div>
          ) : labs.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {labs.map(lab => {
                const lat = lab.latitude || lab.location?.coordinates?.[1];
                const lng = lab.longitude || lab.location?.coordinates?.[0];
                const googleMapsUrl = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : '#';
                const isExpanded = expandedLab === lab._id;

                return (
                  <Card key={lab._id} className="relative border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900">
                    {/* Favorites Heart button */}
                    <button
                      onClick={() => toggleFavoriteMutation.mutate(lab)}
                      className="absolute right-4 top-4 z-10 p-2 rounded-xl bg-white/95 dark:bg-slate-955 shadow border border-slate-200 text-rose-500 hover:scale-110 active:scale-95 transition cursor-pointer"
                    >
                      {isFavorited(lab._id) ? (
                        <Heart className="h-4.5 w-4.5 fill-rose-500 text-rose-500" />
                      ) : (
                        <Heart className="h-4.5 w-4.5 text-slate-400" />
                      )}
                    </button>

                    <CardHeader className="pb-3 pr-14">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base font-black leading-tight text-slate-800 dark:text-white">
                          {lab.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className={lab.isOpenNow ? 'bg-emerald-50 text-emerald-600 border-0' : 'bg-rose-50 text-rose-650 border-0'}>
                          {lab.isOpenNow ? 'Open Now' : 'Closed'}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-semibold">{lab.operatingHours}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Address and details */}
                      <div className="space-y-2 text-xs font-semibold text-slate-655 dark:text-slate-400">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">
                            {typeof lab.address === 'string' ? lab.address : [lab.address?.street, lab.address?.city, lab.address?.state].filter(Boolean).join(', ') || 'Address unavailable'}
                          </span>
                        </div>
                        {lab.contactNumber && (

                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                            <a href={`tel:${lab.contactNumber}`} className="hover:underline text-cyan-600 dark:text-cyan-400 font-bold">
                              {lab.contactNumber}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Display top 3 diagnostic tests available */}
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Available Diagnostic Tests</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {lab.testsAvailable?.slice(0, isExpanded ? undefined : 3).map(test => (
                            <div key={test._id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
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

                    <div className="p-4 pt-0 space-y-2">
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLab(lab)}
                          className="flex-1 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShare(lab)}
                          className="rounded-xl p-2 px-2.5 text-slate-500 hover:text-slate-750 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-855"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {lab.contactNumber ? (
                          <a href={`tel:${lab.contactNumber}`} className="w-full">
                            <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl py-2 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-850">
                              <Phone className="h-3.5 w-3.5" /> Call
                            </Button>
                          </a>
                        ) : (
                          <Button variant="outline" size="sm" disabled className="w-full text-xs opacity-50">No Phone</Button>
                        )}
                        <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="w-full">
                          <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl py-2 text-teal-655 border-teal-500/20 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-850">
                            <Compass className="h-3.5 w-3.5 text-teal-605 animate-pulse" /> Directions
                          </Button>
                        </a>
                      </div>

                      {lab.testsAvailable?.length > 3 && (
                        <Button
                          variant="outline"
                          onClick={() => setExpandedLab(isExpanded ? null : lab._id)}
                          className="w-full rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-transparent"
                        >
                          {isExpanded ? 'Show Less' : `View All (${lab.testsAvailable.length}) Tests`}
                        </Button>
                      )}
                      
                      <a href={`tel:${lab.contactNumber}`} className="block">
                        <Button className="w-full bg-cyan-650 hover:bg-cyan-705 text-white rounded-xl text-xs font-bold gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> Call Lab to Consult
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
              <Button onClick={clearAllFilters} className="bg-cyan-650 hover:bg-cyan-705 text-white text-xs font-bold rounded-xl px-4">
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Details View Modal */}
      {selectedLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-950 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedLab(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-655 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-50 text-cyan-600 border-0 font-bold uppercase text-[9px]">Diagnostic Lab</Badge>
                {selectedLab.rating > 0 && <span className="text-xs font-bold text-amber-500">⭐ {selectedLab.rating}</span>}
              </div>
              <h2 className="text-xl font-black text-slate-850 dark:text-white mt-1">{selectedLab.name}</h2>
              {selectedLab.isOpenNow ? (
                <Badge className="bg-emerald-50 text-emerald-600 border-0 mt-1">Open Now</Badge>
              ) : (
                <Badge className="bg-rose-50 text-rose-650 border-0 mt-1">Closed</Badge>
              )}
            </div>

            <div className="space-y-3 text-xs font-semibold text-slate-650 dark:text-slate-400 border-y border-slate-100 dark:border-slate-850 py-4">
              <div className="flex gap-2">
                <MapPin className="h-4.5 w-4.5 text-slate-455 shrink-0" />
                <span>
                  {typeof selectedLab.address === 'string' ? selectedLab.address : [selectedLab.address?.street, selectedLab.address?.city, selectedLab.address?.state, selectedLab.address?.pincode].filter(Boolean).join(', ') || 'Address unavailable'}
                </span>
              </div>
              <div className="flex gap-2">

                <Clock className="h-4.5 w-4.5 text-slate-455 shrink-0" />
                <span>Operating hours: {selectedLab.operatingHours}</span>
              </div>
              {selectedLab.contactNumber && (
                <div className="flex gap-2">
                  <Phone className="h-4.5 w-4.5 text-slate-455 shrink-0" />
                  <span>Call Coordinator: <a href={`tel:${selectedLab.contactNumber}`} className="text-cyan-650 dark:text-cyan-405 font-bold hover:underline">{selectedLab.contactNumber}</a></span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Available Diagnostic Scans & Test Pricing</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {selectedLab.testsAvailable?.map(test => (
                  <div key={test._id} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border dark:border-slate-855">
                    <div>
                      <p className="text-xs font-bold text-slate-855 dark:text-slate-200">{test.name}</p>
                      <p className="text-[9px] font-bold text-slate-400">Reports ready in {test.durationHours} hours · Category: {test.category}</p>
                    </div>
                    <span className="text-sm font-black text-cyan-655 dark:text-cyan-400">₹{test.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <a href={`tel:${selectedLab.contactNumber}`}>
                <Button className="bg-cyan-650 hover:bg-cyan-705 text-white rounded-xl text-xs font-bold">
                  Call Lab to Consult
                </Button>
              </a>
              <Button
                onClick={() => setSelectedLab(null)}
                className="bg-slate-850 text-white rounded-xl text-xs font-bold"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
