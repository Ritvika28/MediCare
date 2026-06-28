import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/api/axios';
import { emergencyService } from '@/services/emergencyService';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Phone, HeartPulse, AlertTriangle, Clock, MapPin, Navigation,
  User, ShieldAlert, Ambulance, Plus, Trash2, Edit2, Share2,
  CheckCircle, Info, Activity, Star, X, Siren
} from 'lucide-react';

// ─── Static Data ─────────────────────────────────────────────────────────────

const HELPLINES = [
  { name: 'National Emergency', number: '112', desc: 'Police · Fire · Medical combined dispatch', icon: ShieldAlert, color: 'from-rose-600 to-red-700' },
  { name: 'Ambulance (MICU)', number: '102', desc: 'Free public medical ambulance service', icon: HeartPulse, color: 'from-red-600 to-rose-600' },
  { name: 'Poison Control', number: '1800-116-117', desc: 'Toxicology & ingestion emergencies (free)', icon: AlertTriangle, color: 'from-amber-600 to-orange-600' },
  { name: 'Police Helpline', number: '100', desc: 'Law enforcement & security dispatch', icon: ShieldAlert, color: 'from-blue-600 to-indigo-600' },
];

const FIRST_AID_GUIDES = [
  {
    id: 'cpr', title: '❤️ CPR',
    desc: 'For unresponsive individuals not breathing normally.',
    steps: [
      'Verify the environment is safe.',
      'Tap shoulders: "Are you okay?" — shout for help.',
      'Call 112 immediately. Get an AED if available.',
      'Tilt head back, look for breathing (up to 10 seconds).',
      'Place hands center of chest — compress hard & fast (100–120/min, 5–6 cm deep).',
      'After 30 compressions, give 2 rescue breaths if trained. Repeat until help arrives.',
    ],
  },
  {
    id: 'choking', title: '🫁 Choking',
    desc: 'For airway obstruction — person cannot speak or breathe.',
    steps: [
      'Ask "Are you choking?" — if they can cough, encourage it.',
      'Lean forward; give 5 sharp back blows between shoulder blades.',
      'Give 5 abdominal thrusts (Heimlich): fist above navel, inward & upward.',
      'Alternate 5 back blows + 5 abdominal thrusts.',
      'If unconscious, lower to ground and begin CPR. Call 112.',
    ],
  },
  {
    id: 'heart_attack', title: '💔 Heart Attack',
    desc: 'Chest pain, arm/jaw pain, cold sweat, breathlessness.',
    steps: [
      'Call 112 / 102 immediately.',
      'Help person sit upright; loosen tight clothing.',
      'Give aspirin 325mg if not allergic (chew, don\'t swallow whole).',
      'Stay calm and reassure the patient.',
      'Begin CPR if person becomes unconscious and stops breathing.',
    ],
  },
  {
    id: 'bleeding', title: '🩸 Bleeding',
    desc: 'To prevent hemorrhagic shock from severe trauma.',
    steps: [
      'Apply direct firm pressure with sterile cloth.',
      'Raise the wounded limb above heart level.',
      'Do not remove cloth if soaked — add another layer on top.',
      'For uncontrolled limb bleeding: apply tourniquet 2–3 inches above wound.',
      'Keep patient warm and calm until ambulance arrives.',
    ],
  },
  {
    id: 'burns', title: '🔥 Burns',
    desc: 'Thermal or chemical skin injuries.',
    steps: [
      'Cool burn under running cool water for 10–20 minutes.',
      'Remove jewelry/clothing gently before swelling begins.',
      'Cover loosely with clean non-stick bandage or plastic wrap.',
      'Do NOT pop blisters — increases infection risk.',
      'For face, hands, feet, or chemical burns: seek immediate hospital care.',
    ],
  },
  {
    id: 'stroke', title: '🧠 Stroke (FAST)',
    desc: 'Act fast — every minute counts in stroke response.',
    steps: [
      'FACE — Ask them to smile. Is one side drooping?',
      'ARMS — Ask them to raise both arms. Does one drift down?',
      'SPEECH — Ask a simple question. Is speech slurred or strange?',
      'TIME — If any FAST signs: call 112 immediately.',
      'Note exact time symptoms started — critical for hospital treatment.',
    ],
  },
];

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900',
  dispatched: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900',
  in_transit: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900',
  arrived: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmergencyHub() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { latitude, longitude, loading: locLoading, error: locError, refetch: refetchLocation } = useCurrentLocation();
  const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';

  const [description, setDescription] = useState('');
  const [selectedGuide, setSelectedGuide] = useState('cpr');
  const [contactForm, setContactForm] = useState({ name: '', phone: '', relationship: 'Family' });
  const [editingId, setEditingId] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [activeTab, setActiveTab] = useState('sos'); // 'sos' | 'guides' | 'history'

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerGroupRef = useRef(null);

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: contactsRes, isLoading: contactsLoading } = useQuery({
    queryKey: ['emergency-contacts'],
    queryFn: () => emergencyService.listContacts(),
  });
  const contacts = contactsRes?.data || [];

  const { data: nearestData } = useQuery({
    queryKey: ['emergency-nearest', latitude, longitude],
    queryFn: () => emergencyService.getNearest(latitude, longitude),
    enabled: hasLocation,
  });
  const nearest = nearestData?.data;

  const { data: requestsRes, isLoading: requestsLoading } = useQuery({
    queryKey: ['emergency-requests'],
    queryFn: () => api.get('/emergency/requests').then(r => r.data),
  });
  const requests = requestsRes?.data || [];

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const requestMutation = useMutation({
    mutationFn: (type) => emergencyService.createRequest({
      type, description, latitude, longitude,
      hospitalId: nearest?.hospital?._id,
      address: nearest?.hospital?.address?.street,
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-requests'] });
      toast('🚨 Emergency SOS sent! Help is being dispatched.', 'success');
      if (res.data?.emergencyContact?.phone) {
        toast(`📞 Emergency contact notified: ${res.data.emergencyContact.name}`, 'info');
      }
      setDescription('');
      setActiveTab('history');
    },
    onError: (err) => toast(getApiErrorMessage(err), 'error'),
  });

  const contactMutation = useMutation({
    mutationFn: (data) => editingId
      ? emergencyService.updateContact(editingId, data)
      : emergencyService.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
      setContactForm({ name: '', phone: '', relationship: 'Family' });
      setEditingId(null);
      setShowContactForm(false);
      toast(editingId ? 'Contact updated' : 'Contact added', 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err), 'error'),
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => emergencyService.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
      toast('Contact removed', 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err), 'error'),
  });

  // ─── Share Location ────────────────────────────────────────────────────────

  const shareLocation = () => {
    if (!hasLocation) { toast('Enable GPS first', 'error'); return; }
    const text = `🚨 EMERGENCY: I need help!\n📍 My location: https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
    if (navigator.share) {
      navigator.share({ title: 'Emergency Location', text, url: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}` });
    } else {
      navigator.clipboard?.writeText(text);
      toast('Location link copied to clipboard', 'success');
    }
  };

  // ─── Leaflet Map ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!hasLocation || !mapContainerRef.current || !window.L) return;
    const L = window.L;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([latitude, longitude], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(mapInstanceRef.current);
      markerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    } else {
      mapInstanceRef.current.setView([latitude, longitude], 14);
    }

    const markers = markerGroupRef.current;
    markers.clearLayers();

    const userIcon = L.divIcon({
      html: `<div class="relative flex h-5 w-5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span class="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white shadow"></span></div>`,
      className: 'custom-user-marker', iconSize: [20, 20], iconAnchor: [10, 10],
    });
    L.marker([latitude, longitude], { icon: userIcon }).addTo(markers).bindPopup('<b>Your Location</b>').openPopup();

    if (nearest?.hospital?.location?.coordinates) {
      const [hLng, hLat] = nearest.hospital.location.coordinates;
      const hospitalIcon = L.divIcon({
        html: `<div class="flex items-center justify-center h-8 w-8 rounded-full bg-red-600 border-2 border-white shadow-lg text-white animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></div>`,
        className: 'custom-hospital-marker', iconSize: [32, 32], iconAnchor: [16, 16],
      });
      L.marker([hLat, hLng], { icon: hospitalIcon }).addTo(markers).bindPopup(`<b>${nearest.hospital.name}</b><br/>Emergency Ward`);
      mapInstanceRef.current.fitBounds(L.latLngBounds([[latitude, longitude], [hLat, hLng]]), { padding: [40, 40] });
    }
  }, [latitude, longitude, hasLocation, nearest]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const startEdit = (c) => {
    setContactForm({ name: c.name, phone: c.phone, relationship: c.relationship });
    setEditingId(c._id);
    setShowContactForm(true);
  };

  const cancelContactForm = () => {
    setContactForm({ name: '', phone: '', relationship: 'Family' });
    setEditingId(null);
    setShowContactForm(false);
  };

  const submitContact = (e) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim()) { toast('Name and phone are required', 'error'); return; }
    contactMutation.mutate(contactForm);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-red-700 via-rose-700 to-orange-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10 pointer-events-none">
          <Siren className="h-72 w-72 animate-pulse" />
        </div>
        <div className="relative z-10 space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-rose-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm mb-2">
            <AlertTriangle className="h-3.5 w-3.5" /> Emergency Response Centre
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Emergency Hub</h1>
          <p className="text-rose-100/90 text-sm md:text-base leading-relaxed font-medium">
            Trigger SOS · Manage emergency contacts · Live hospital map · First aid guides · Dispatch tracking
          </p>
        </div>
        {/* Quick Call bar */}
        <div className="relative z-10 mt-6 flex flex-wrap gap-3">
          <a href="tel:112">
            <Button className="bg-white text-rose-700 hover:bg-rose-50 font-black rounded-xl shadow px-5 gap-2 text-sm">
              <Phone className="h-4 w-4 fill-current" /> Call 112
            </Button>
          </a>
          <a href="tel:102">
            <Button className="bg-white/15 hover:bg-white/25 text-white border border-white/30 font-black rounded-xl px-5 gap-2 text-sm">
              <Ambulance className="h-4 w-4" /> Ambulance 102
            </Button>
          </a>
          <Button
            onClick={shareLocation}
            disabled={!hasLocation}
            className="bg-white/15 hover:bg-white/25 text-white border border-white/30 font-black rounded-xl px-5 gap-2 text-sm"
          >
            <Share2 className="h-4 w-4" /> Share Location
          </Button>
        </div>
      </div>

      {/* ── Helplines Grid ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HELPLINES.map((line, i) => (
          <Card key={i} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <CardContent className="p-5 flex flex-col gap-4 h-full">
              <div className="flex gap-3 items-start">
                <div className={`p-2.5 rounded-xl text-white bg-gradient-to-br ${line.color} shrink-0 group-hover:scale-105 transition-transform`}>
                  <line.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">{line.name}</h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5 leading-snug">{line.desc}</p>
                </div>
              </div>
              <a href={`tel:${line.number}`} className="mt-auto block">
                <Button className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 rounded-xl text-xs font-black gap-1.5">
                  <Phone className="h-3.5 w-3.5 fill-current" /> Call {line.number}
                </Button>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Grid: SOS + Map | Contacts ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Left: SOS Trigger + Live Map */}
        <div className="lg:col-span-3 space-y-5">
          {/* SOS Card */}
          <Card className="rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-white to-rose-50/30 dark:from-slate-900 dark:to-rose-950/10 shadow-sm">
            <CardHeader className="pb-3 border-b dark:border-slate-800">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Siren className="h-5 w-5 text-rose-600" /> Trigger SOS Dispatch
              </CardTitle>
              <CardDescription>Send an emergency request to the nearest hospital and notify your contacts.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Location status */}
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold ${hasLocation ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'}`}>
                <MapPin className="h-4 w-4 shrink-0" />
                {locLoading ? 'Acquiring GPS location…' : hasLocation ? `📍 Location acquired (${latitude.toFixed(5)}, ${longitude.toFixed(5)})` : locError || 'GPS not available — enable location permission.'}
                {!hasLocation && !locLoading && (
                  <Button onClick={refetchLocation} size="sm" className="ml-auto text-[10px] h-6 px-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700">
                    Retry
                  </Button>
                )}
              </div>

              {/* Nearest hospital info */}
              {nearest?.hospital && (
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 p-3 flex items-center gap-3">
                  <HeartPulse className="h-8 w-8 text-red-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 dark:text-white truncate">{nearest.hospital.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{nearest.distanceKm?.toFixed(2)} km away · Emergency Unit</p>
                  </div>
                  <a href={`tel:${nearest.hospital.phone}`}>
                    <Button size="sm" className="text-[10px] h-7 px-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 gap-1">
                      <Phone className="h-3 w-3" /> Call
                    </Button>
                  </a>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">Brief description (optional)</label>
                <Input
                  placeholder="e.g. Chest pain, unconscious patient, accident…"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="rounded-xl text-sm"
                />
              </div>

              {/* SOS Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => requestMutation.mutate('ambulance')}
                  disabled={!hasLocation || requestMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl gap-2 py-3 text-sm shadow-md hover:shadow-rose-500/30 hover:shadow-lg transition-all"
                >
                  <Ambulance className="h-5 w-5" />
                  {requestMutation.isPending ? 'Sending…' : 'Request Ambulance'}
                </Button>
                <Button
                  onClick={() => requestMutation.mutate('emergency_alert')}
                  disabled={requestMutation.isPending}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl gap-2 py-3 text-sm shadow-md transition-all"
                >
                  <User className="h-5 w-5" />
                  {requestMutation.isPending ? 'Sending…' : 'Notify My Contacts'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Map */}
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b dark:border-slate-800">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-600" /> Live Location & Nearest Emergency Unit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {hasLocation ? (
                <div ref={mapContainerRef} className="h-64 w-full" />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50 dark:bg-slate-900">
                  <MapPin className="h-10 w-10 text-slate-300" />
                  <p className="text-xs font-bold">Allow location access to view the map</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Emergency Contacts */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" /> Emergency Contacts
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => { cancelContactForm(); setShowContactForm(true); }}
                  className="h-7 px-2.5 text-[10px] rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1"
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              <CardDescription>Contacts notified automatically when you trigger SOS.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Inline contact form */}
              {showContactForm && (
                <form onSubmit={submitContact} className="space-y-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/10 p-4">
                  <p className="text-xs font-black text-indigo-700 dark:text-indigo-300">{editingId ? 'Edit Contact' : 'New Emergency Contact'}</p>
                  <Input
                    placeholder="Full Name *"
                    value={contactForm.name}
                    onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                    className="rounded-xl text-sm h-9"
                    required
                  />
                  <Input
                    placeholder="Phone Number *"
                    value={contactForm.phone}
                    onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                    className="rounded-xl text-sm h-9"
                    required
                  />
                  <select
                    value={contactForm.relationship}
                    onChange={e => setContactForm(f => ({ ...f, relationship: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    {['Family', 'Spouse', 'Parent', 'Sibling', 'Friend', 'Colleague', 'Doctor', 'Other'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={contactMutation.isPending} className="flex-1 h-8 text-xs font-black rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">
                      {contactMutation.isPending ? 'Saving…' : editingId ? 'Update' : 'Save Contact'}
                    </Button>
                    <Button type="button" onClick={cancelContactForm} variant="outline" className="h-8 w-8 p-0 rounded-lg flex-shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </form>
              )}

              {/* Contact list */}
              {contactsLoading ? (
                <div className="flex justify-center p-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" /></div>
              ) : contacts.length === 0 && !showContactForm ? (
                <div className="text-center py-8 space-y-2 border-2 border-dashed dark:border-slate-800 rounded-2xl">
                  <User className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">No emergency contacts yet</p>
                  <p className="text-[10px] text-slate-400">Add a contact who will be notified during SOS</p>
                </div>
              ) : (
                contacts.map((c) => (
                  <div key={c._id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
                      <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-black text-slate-800 dark:text-white truncate">{c.name}</p>
                        {c.isPrimary && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">{c.relationship} · {c.phone}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <a href={`tel:${c.phone}`}>
                        <Button size="sm" className="h-7 w-7 p-0 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button size="sm" onClick={() => startEdit(c)} className="h-7 w-7 p-0 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => deleteContactMutation.mutate(c._id)}
                        disabled={deleteContactMutation.isPending}
                        className="h-7 w-7 p-0 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 border border-rose-100 dark:border-rose-900"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── First Aid Guides + SOS History ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* First Aid Guides */}
        <Card className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b dark:border-slate-800">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-red-600" /> First Aid Protocol Guides
            </CardTitle>
            <CardDescription>Certified step-by-step emergency procedures to follow while waiting for help.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            {/* Guide tabs */}
            <div className="flex flex-wrap gap-2">
              {FIRST_AID_GUIDES.map(guide => (
                <button
                  key={guide.id}
                  onClick={() => setSelectedGuide(guide.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    selectedGuide === guide.id
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {guide.title}
                </button>
              ))}
            </div>

            {/* Active guide */}
            {(() => {
              const guide = FIRST_AID_GUIDES.find(g => g.id === selectedGuide);
              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-black text-slate-800 dark:text-white">{guide.title}</p>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">{guide.desc}</p>
                  </div>
                  <div className="space-y-3">
                    {guide.steps.map((step, index) => (
                      <div key={index} className="flex gap-3 items-start text-xs font-medium">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 text-[10px] font-black shrink-0 border border-rose-100 dark:border-rose-900">
                          {index + 1}
                        </div>
                        <p className="text-slate-700 dark:text-slate-350 leading-relaxed mt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* SOS Request History */}
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" /> SOS Dispatch History
            </CardTitle>
            <CardDescription>Your past emergency requests and their current status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
            {requestsLoading ? (
              <div className="flex justify-center p-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              </div>
            ) : requests.length > 0 ? (
              requests.slice(0, 8).map(req => (
                <div key={req._id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <Badge className="text-[9px] uppercase font-bold border-0 bg-red-50 dark:bg-red-950/30 text-red-600">
                      {req.type === 'ambulance' ? '🚑 Ambulance' : '🚨 Alert'}
                    </Badge>
                    <Badge className={`text-[9px] uppercase font-bold border ${STATUS_COLORS[req.status] || ''}`}>
                      {req.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  {req.hospital && (
                    <p className="text-[10px] text-slate-400 font-semibold truncate">🏥 {req.hospital.name}</p>
                  )}
                  {req.description && (
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed italic truncate">"{req.description}"</p>
                  )}
                  <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>{new Date(req.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {req.location?.coordinates?.length === 2 && (
                      <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> GPS</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-2">
                <Info className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold">No SOS dispatches yet</p>
                <p className="text-[10px] leading-relaxed">Emergency requests will be tracked here once triggered.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
