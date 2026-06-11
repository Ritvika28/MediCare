import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Ambulance, Phone, MapPin, Navigation, User, HeartPulse, Activity } from 'lucide-react';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { emergencyService } from '@/services/emergencyService';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function Emergency() {
  const { latitude, longitude, loading: locLoading, error: locError, refetch: refetchLocation } = useCurrentLocation();
  const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';
  
  const { toast } = useToast();
  const [description, setDescription] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerGroupRef = useRef(null);

  const { data: nearestData, refetch: refetchNearest } = useQuery({
    queryKey: ['emergency-nearest', latitude, longitude],
    queryFn: () => emergencyService.getNearest(latitude, longitude),
    enabled: hasLocation,
  });

  const nearest = nearestData?.data;

  const requestMutation = useMutation({
    mutationFn: (type) =>
      emergencyService.createRequest({
        type,
        description,
        latitude,
        longitude,
        hospitalId: nearest?.hospital?._id,
        address: nearest?.hospital?.address?.street,
      }),
    onSuccess: (res) => {
      toast('Emergency SOS request sent! Help has been dispatched.', 'success');
      if (res.data?.emergencyContact?.phone) {
        toast(`Emergency contact notified: ${res.data.emergencyContact.name}`, 'info');
      }
    },
    onError: (err) => toast(getApiErrorMessage(err), 'error'),
  });

  // Render Leaflet Map
  useEffect(() => {
    if (!hasLocation || !mapContainerRef.current || !window.L) return;

    const L = window.L;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([latitude, longitude], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM',
      }).addTo(mapInstanceRef.current);

      markerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    } else {
      mapInstanceRef.current.setView([latitude, longitude], 14);
    }

    const map = mapInstanceRef.current;
    const markers = markerGroupRef.current;
    markers.clearLayers();

    // User pin (blue pulsing divIcon)
    const userIcon = L.divIcon({
      html: `<div class="relative flex h-5 w-5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-450 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white shadow"></span>
      </div>`,
      className: 'custom-user-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    L.marker([latitude, longitude], { icon: userIcon })
      .addTo(markers)
      .bindPopup('<b>Your Current Location</b>')
      .openPopup();

    // Hospital pin
    if (nearest?.hospital?.location?.coordinates) {
      const [hLng, hLat] = nearest.hospital.location.coordinates;

      const hospitalIcon = L.divIcon({
        html: `<div class="flex items-center justify-center h-8 w-8 rounded-full bg-red-600 border-2 border-white shadow-lg text-white animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </div>`,
        className: 'custom-hospital-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([hLat, hLng], { icon: hospitalIcon })
        .addTo(markers)
        .bindPopup(`<b>${nearest.hospital.name}</b><br/>Emergency Ward`);

      // Fit bounds
      const bounds = L.latLngBounds([[latitude, longitude], [hLat, hLng]]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [latitude, longitude, hasLocation, nearest]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Alert Header Banner */}
      <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/40 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 animate-pulse">
          <AlertTriangle className="h-44 w-44 text-rose-600" />
        </div>
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-600 animate-bounce" />
        <h1 className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-400">EMERGENCY SOS</h1>
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-350 max-w-md mx-auto">
          If you are experiencing life-threatening symptoms, dial local emergency dispatchers immediately.
        </p>
        <a href="tel:112" className="mt-4 inline-block">
          <Button variant="destructive" size="lg" className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 px-6 shadow-md">
            <Phone className="h-5 w-5" /> CALL NATIONAL EMERGENCY (112)
          </Button>
        </a>
      </div>

      {/* Geolocation Status map */}
      <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="pb-3 border-b dark:border-slate-800/80">
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-5 w-5 text-rose-600" /> Live GPS Tracker</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {hasLocation ? (
            <div className="space-y-4">
              <div 
                ref={mapContainerRef} 
                className="w-full h-48 rounded-xl border dark:border-slate-800 overflow-hidden z-0" 
              />
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1">
                <span>Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                <Button variant="outline" size="sm" onClick={refetchLocation}>
                  Recalibrate GPS
                </Button>
              </div>
            </div>
          ) : locLoading ? (
            <div className="text-center p-8 text-slate-500">
              <Activity className="h-8 w-8 text-rose-500 animate-spin mx-auto mb-2" />
              <p className="text-sm font-semibold">Triangulating satellite coordinates...</p>
            </div>
          ) : (
            <div className="text-center p-8 text-slate-500">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">Location Access Denied</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {locError || 'Please allow GPS location access to find nearest emergency hospitals.'}
              </p>
              <Button onClick={refetchLocation} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold">
                Authorize Geolocation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nearest Emergency Center Details */}
      {nearest?.hospital && (
        <Card className="border border-teal-200 dark:border-teal-900 bg-teal-50/10 dark:bg-teal-950/15 shadow-sm">
          <CardHeader className="pb-3 border-b dark:border-slate-800/80">
            <CardTitle className="text-base flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-emerald-600" /> Nearest Trauma Center
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{nearest.hospital.name}</p>
              <p className="text-xs text-slate-500 font-medium">
                📍 {[nearest.hospital.address?.street, nearest.hospital.address?.city, nearest.hospital.address?.state].filter(Boolean).join(', ')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {nearest.hospital.phone && (
                <a href={`tel:${nearest.hospital.phone}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 py-2">
                    <Phone className="h-4 w-4" /> Call Trauma Ward
                  </Button>
                </a>
              )}
              {nearest.routeUrl && (
                <a href={nearest.routeUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 py-2 bg-teal-600 hover:bg-teal-700 text-white shadow">
                    <Navigation className="h-4 w-4" /> Start Navigation
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Ambulance SOS Dispatch */}
      <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="pb-3 border-b dark:border-slate-800/80">
          <CardTitle className="text-base flex items-center gap-2"><Ambulance className="h-5 w-5 text-rose-600" /> Dispatch SOS Ambulance</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <textarea
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            placeholder="Type symptoms or condition (e.g. cardiac arrest, road collision)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="space-y-2 pt-2">
            <Button
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2 py-2.5 shadow-md"
              onClick={() => requestMutation.mutate('ambulance')}
              disabled={requestMutation.isPending || !hasLocation}
            >
              <Ambulance className="h-5 w-5" /> DISPATCH AMBULANCE UNIT
            </Button>
            <Button
              className="w-full font-bold flex items-center justify-center gap-2 py-2.5 border dark:border-slate-800"
              variant="outline"
              onClick={() => requestMutation.mutate('emergency_alert')}
              disabled={requestMutation.isPending}
            >
              <User className="h-5 w-5 text-slate-500" /> Notify My Emergency Contacts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
