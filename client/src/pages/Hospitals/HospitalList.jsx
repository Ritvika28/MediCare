import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MapPin, RefreshCw, GitCompare, Navigation, AlertCircle, Sparkles, Filter, 
  Search, Map, Grid, CheckCircle2, Heart, HeartOff, Brain, ChevronRight, X, Clock, HelpCircle
} from 'lucide-react';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { LeafletMap } from '@/components/maps/LeafletMap';
import { HospitalCard } from '@/components/HospitalCard';
import { DoctorCard } from '@/components/DoctorCard';
import axios from 'axios';

// API instance helper matching auth setup
const api = axios.create({
  baseURL: '/api',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
});

const SEGREGATION_TABS = [
  { id: 'all', label: 'All Hospitals', icon: '🏥' },
  { id: 'Emergency', label: 'Emergency', icon: '🚨', type: 'facility' },
  { id: 'ICU', label: 'ICU', icon: '🏥', type: 'facility' },
  { id: 'NICU', label: 'NICU', icon: '👶', type: 'facility' },
  { id: 'MRI', label: 'MRI', icon: '🧲', type: 'facility' },
  { id: 'CTScan', label: 'CT Scan', icon: '🌀', type: 'facility' },
  { id: 'Ambulance', label: 'Ambulance', icon: '🚑', type: 'facility' },
  { id: 'BloodBank', label: 'Blood Bank', icon: '🩸', type: 'facility' },
  { id: 'Dialysis', label: 'Dialysis', icon: '💧', type: 'facility' },
  { id: 'Ventilator', label: 'Ventilator', icon: '🫁', type: 'facility' },
  { id: 'OperationTheatre', label: 'Operation Theatre', icon: '🏨', type: 'facility' },
  { id: 'Cardiology', label: 'Cardiology', icon: '🫀', type: 'specialty' },
  { id: 'Neurology', label: 'Neurology', icon: '🧠', type: 'specialty' },
  { id: 'Orthopedics', label: 'Orthopedics', icon: '🦴', type: 'specialty' },
  { id: 'Pediatrics', label: 'Pediatrics', icon: '👶', type: 'specialty' },
  { id: 'Gynecology', label: 'Gynecology', icon: '🤰', type: 'specialty' },
  { id: 'Oncology', label: 'Cancer Care', icon: '🎗️', type: 'specialty' },
  { id: 'Trauma', label: 'Trauma Center', icon: '🚑', type: 'specialty' },
];

export default function HospitalList() {
  const queryClient = useQueryClient();
  const {
    latitude,
    longitude,
    loading: locLoading,
    error: locError,
    refetch: refetchLocation,
  } = useCurrentLocation();

  // Search Parameter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRadius, setSelectedRadius] = useState(10); // in km (5, 10, 20, 50)
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'hospital' | 'doctor' | 'lab' | 'blood_bank' | 'pharmacy'
  const [showMap, setShowMap] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [minRating, setMinRating] = useState(0);
  const [requireVerified, setRequireVerified] = useState(false);
  const [requireEmergency, setRequireEmergency] = useState(false);

  // Autocomplete states
  const [autocompleteText, setAutocompleteText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef(null);

  // Search History states
  const [history, setHistory] = useState({ recent: [], popularSpecialties: [], popularCities: [] });

  // Favorites state
  const [favorites, setFavorites] = useState([]);

  // AI Recommendation Panel states
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(true);

  const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';

  // 1. Load favorites and history on mount
  useEffect(() => {
    const fetchHistoryAndFavorites = async () => {
      try {
        const histRes = await api.get('/search/history');
        if (histRes.data?.success) setHistory(histRes.data.data);
      } catch (err) {
        console.warn('Search history not available (unauthenticated)');
      }

      try {
        const favRes = await api.get('/search/favorites');
        if (favRes.data?.success) setFavorites(favRes.data.data);
      } catch (err) {
        console.warn('Favorites not available (unauthenticated)');
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

  // 2. Fetch autocomplete suggestions with debounce
  useEffect(() => {
    if (autocompleteText.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await api.get(`/search/autocomplete?q=${encodeURIComponent(autocompleteText)}`);
        if (res.data?.success) {
          setSuggestions(res.data.data);
          setActiveSuggestionIndex(-1);
        }
      } catch (err) {
        console.error('Autocomplete query failed:', err.message);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [autocompleteText]);

  // 3. Central Query execution for healthcare entities using unified search endpoint
  const {
    data: searchResponse,
    isLoading: searchLoading,
    refetch: refetchSearch
  } = useQuery({
    queryKey: [
      'healthcare-unified-search', 
      searchQuery, 
      selectedRadius, 
      selectedCategory, 
      latitude, 
      longitude, 
      minRating, 
      requireVerified, 
      requireEmergency, 
      sortBy
    ],
    queryFn: async () => {
      const params = {
        query: searchQuery,
        radius: selectedRadius,
        entityType: 'hospital', // Strictly 'hospital' for this page!
        rating: minRating || undefined,
        verified: requireVerified || undefined,
        emergency: requireEmergency || undefined
      };

      if (selectedCategory && selectedCategory !== 'all') {
        const tab = SEGREGATION_TABS.find(t => t.id === selectedCategory);
        if (tab) {
          if (tab.type === 'facility') {
            params.facilities = tab.id;
          } else if (tab.type === 'specialty') {
            params.specialty = tab.id;
          }
        }
      }
      
      if (latitude && longitude) {
        params.latitude = latitude;
        params.longitude = longitude;
      }

      const res = await api.get('/search', { params });
      return res.data?.data || { results: [] };
    },
    keepPreviousData: true
  });

  const results = searchResponse?.results || [];
  const searchLat = searchResponse?.latitude || latitude;
  const searchLng = searchResponse?.longitude || longitude;
  const searchCity = searchResponse?.city || 'Delhi';

  // 4. Request Gemini explanation of returned results (AI Explanation Panel)
  useEffect(() => {
    if (results.length === 0) {
      setAiSummary('');
      return;
    }
    
    const triggerAISummary = async () => {
      setAiLoading(true);
      try {
        const firstThree = results.slice(0, 3).map(r => ({
          name: r.name,
          type: r.type,
          rating: r.rating || 4.5,
          distanceKm: r.distanceKm || 'Unknown',
          hasEmergency: !!(r.hasEmergency || r.emergencyServices),
          isVerified: !!r.isVerified
        }));

        const prompt = `Analyze and compare these top search results near ${searchCity} to help the user choose. Keep it professional, objective, and short (3 sentences max). Compare rating, distance, emergency features, and verify badge. Never invent any other clinics: ${JSON.stringify(firstThree)}`;
        
        const chatRes = await api.post('/ai/chat', { message: prompt });
        if (chatRes.data?.success) {
          setAiSummary(chatRes.data.data.message);
        }
      } catch (err) {
        console.error('AI comparison query failed:', err.message);
        setAiSummary('AI comparison service temporarily unavailable.');
      } finally {
        setAiLoading(false);
      }
    };

    const timer = setTimeout(triggerAISummary, 800);
    return () => clearTimeout(timer);
  }, [results, searchCity]);

  // 5. Toggle favorites (Hospitals, Doctors, Labs, Blood Banks)
  const toggleFavoriteMutation = useMutation({
    mutationFn: (item) => api.post('/search/favorites/toggle', {
      entityId: String(item._id),
      entityType: item.type || 'hospital',
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
      queryClient.invalidateQueries(['healthcare-unified-search']);
    }
  });

  const isFavorited = (entityId) => {
    return favorites.some(f => String(f.entityId) === String(entityId));
  };

  // Keyboard navigation for autocomplete list
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

  const handleUseLocation = () => {
    refetchLocation();
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setAutocompleteText('');
    setSelectedRadius(10);
    setSelectedCategory('all');
    setMinRating(0);
    setRequireVerified(false);
    setRequireEmergency(false);
  };

  return (
    <div className="space-y-6">
      {/* Premium Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-700 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <Sparkles className="h-72 w-72" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> Unified Discovery Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Healthcare Near Me & Across India
          </h1>
          <p className="text-teal-100/90 text-sm md:text-base leading-relaxed">
            Instantly map and filter hospitals, verified doctors, laboratories, pharmacies, and blood banks dynamically.
          </p>
        </div>
      </div>

      {/* Central Search Controls Dashboard */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-md">
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-4 items-center">
            {/* Location Autocomplete Input */}
            <div className="md:col-span-2 relative" ref={autocompleteRef}>
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search location, city, specialty, doctor, or ask in natural language..."
                value={autocompleteText || searchQuery}
                onChange={(e) => {
                  setAutocompleteText(e.target.value);
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 pl-11 focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-850 dark:text-slate-100 shadow-inner outline-none transition"
              />
              
              {/* Autocomplete Dropdown List */}
              {showSuggestions && (suggestions.length > 0 || history.recent.length > 0) && (
                <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl p-2 max-h-60 overflow-y-auto">
                  {suggestions.length > 0 ? (
                    suggestions.map((s, index) => (
                      <button
                        key={index}
                        onClick={() => selectSuggestion(s)}
                        className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-left text-xs font-bold transition cursor-pointer ${
                          index === activeSuggestionIndex 
                            ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{s.displayName}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Recent Searches</p>
                      {history.recent.map((q, index) => (
                        <button
                          key={index}
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

            {/* Radius Selector Pill List */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest pl-1">Search Radius</label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                {[5, 10, 20, 50].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRadius(r)}
                    className={`py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                      selectedRadius === r
                        ? 'bg-teal-650 text-white shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>

            {/* Locate Me button */}
            <div className="flex gap-2">
              <Button
                onClick={handleUseLocation}
                variant="outline"
                className={`flex-1 rounded-xl font-bold text-xs py-3 justify-center gap-1.5 border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-350 ${
                  hasLocation ? 'border-teal-500/30 bg-teal-50/10' : ''
                }`}
              >
                {locLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-teal-600" />
                ) : (
                  <Navigation className="h-4 w-4 text-teal-600" />
                )}
                {hasLocation ? 'GPS Calibrated' : 'Near Me'}
              </Button>
            </div>
          </div>

          {/* Hospital Segregation / Facility Tabs */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-850 overflow-x-auto no-scrollbar scroll-smooth">
            {SEGREGATION_TABS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-teal-600/10 border-teal-500/20 text-teal-700 dark:text-teal-400 dark:bg-teal-950/20 shadow-sm'
                    : 'bg-transparent border-transparent text-slate-650 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-850'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid View */}
      <div className="grid gap-6 lg:grid-cols-4 items-start">
        
        {/* Left Side Filters */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-md">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-teal-650" /> Smart Filters
              </h2>
              {(searchQuery || selectedCategory !== 'all' || minRating > 0 || requireVerified || requireEmergency) && (
                <button onClick={clearAllFilters} className="text-[10px] font-black text-teal-600 hover:underline">
                  Clear All
                </button>
              )}
            </div>
            
            <CardContent className="p-5 space-y-5">
              {/* Layout Preference */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Layout Preference
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850">
                  <button
                    onClick={() => setShowMap(false)}
                    className={`flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-bold gap-1 transition cursor-pointer ${
                      !showMap
                        ? 'bg-white dark:bg-slate-900 text-teal-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" /> Grid List
                  </button>
                  <button
                    onClick={() => setShowMap(true)}
                    className={`flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-bold gap-1 transition cursor-pointer ${
                      showMap
                        ? 'bg-white dark:bg-slate-900 text-teal-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Map className="h-3.5 w-3.5" /> Map View
                  </button>
                </div>
              </div>

              {/* Rating filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Minimum Rating: {minRating > 0 ? `⭐ ${minRating}+` : 'Any'}
                </label>
                <div className="flex gap-1">
                  {[3, 4, 4.5].map(r => (
                    <button
                      key={r}
                      onClick={() => setMinRating(minRating === r ? 0 : r)}
                      className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                        minRating === r
                          ? 'bg-teal-50 border-teal-400 text-teal-700 dark:bg-teal-950/20'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-600 dark:border-slate-800'
                      }`}
                    >
                      ⭐ {r}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Partner Tags
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950">
                    <input
                      type="checkbox"
                      checked={requireVerified}
                      onChange={(e) => setRequireVerified(e.target.checked)}
                      className="accent-teal-600 h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Verified Network Only</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950">
                    <input
                      type="checkbox"
                      checked={requireEmergency}
                      onChange={(e) => setRequireEmergency(e.target.checked)}
                      className="accent-teal-600 h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350">24/7 Emergency Approval</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results grid */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* AI Explanation / Recommendation panel (collapsible glassmorphic overlay) */}
          {aiSummary && showAiPanel && (
            <Card className="border border-teal-200/50 bg-teal-50/15 dark:bg-teal-950/5 dark:border-teal-900 rounded-3xl relative overflow-hidden">
              <div className="p-4 flex gap-3 items-start pr-10">
                <Brain className="h-6 w-6 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                    AI Clinical Comparison Insight
                  </h4>
                  <p className="text-xs leading-relaxed font-bold text-slate-650 dark:text-slate-300">
                    {aiLoading ? 'Recalculating comparison options...' : aiSummary}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAiPanel(false)}
                className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </Card>
          )}

          {/* Results Info header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border dark:border-slate-800">
            <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <span>Healthcare in</span>
              <span className="text-slate-800 dark:text-slate-200 font-black underline decoration-teal-500 decoration-2">
                {searchCity}
              </span>
              <Badge className="bg-teal-600/10 text-teal-650 border-0 text-[9px] font-black uppercase">
                {selectedCategory}
              </Badge>
            </div>
            <div className="text-xs text-slate-400 font-bold">
              {searchLoading ? 'Scanning databases...' : `${results.length} result(s) ranked`}
            </div>
          </div>

          {/* Map / Grid list container */}
          {showMap ? (
            <LeafletMap
              userLat={searchLat}
              userLng={searchLng}
              items={results}
              category={selectedCategory}
              height="450px"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {searchLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 rounded-2xl" />
                ))
              ) : results.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed dark:border-slate-800">
                  <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-850 dark:text-slate-200 text-base">No matching providers found</p>
                  <p className="text-xs text-slate-450 mt-1 max-w-xs mx-auto">
                    Try raising the search radius or resetting the verified filters.
                  </p>
                  <Button onClick={clearAllFilters} className="mt-4 bg-teal-650 hover:bg-teal-700 text-white text-xs font-bold rounded-xl px-4">
                    Reset Query
                  </Button>
                </div>
              ) : (
                results.map((item) => (
                  <div key={item._id} className="relative group">
                    
                    {/* Floating Save Favorite Icon overlay */}
                    <button
                      onClick={() => toggleFavoriteMutation.mutate(item)}
                      title={isFavorited(item._id) ? 'Remove from favorites' : 'Save to favorites'}
                      className="absolute right-4 top-4 z-10 p-2 rounded-xl bg-white/95 dark:bg-slate-950/95 shadow border border-slate-200/50 dark:border-slate-800 text-rose-500 hover:scale-110 active:scale-95 transition cursor-pointer"
                    >
                      {isFavorited(item._id) ? (
                        <Heart className="h-4.5 w-4.5 fill-rose-500 text-rose-500" />
                      ) : (
                        <Heart className="h-4.5 w-4.5 text-slate-400" />
                      )}
                    </button>

                    {/* Conditional render card type */}
                    {item.type === 'doctor' ? (
                      <DoctorCard doctor={item} consultationType="physical" />
                    ) : (
                      <HospitalCard hospital={item} showDistance={true} />
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
