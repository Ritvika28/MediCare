import { useEffect, useRef } from 'react';

export function NearbyHospitalMap({ userLat, userLng, hospitals = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Check if L exists globally (from CDN)
    if (!window.L) {
      console.warn('Leaflet (L) is not loaded yet.');
      return;
    }

    const L = window.L;

    // If map instance doesn't exist, create it
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([userLat || 0, userLng || 0], 13);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current);

      // Create a layer group for markers
      markersGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    } else {
      // If it exists, update view
      if (userLat && userLng) {
        mapInstanceRef.current.setView([userLat, userLng], 13);
      }
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    // Clear previous markers
    markersGroup.clearLayers();

    // Define icons
    // Standard Leaflet has issues loading marker icons via React/Vite paths sometimes,
    // so we can define custom HTML markers or use standard CDN URLs.
    const userIcon = L.divIcon({
      html: `<div class="relative flex h-5 w-5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white shadow-md"></span>
      </div>`,
      className: 'custom-user-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const hospitalIcon = L.divIcon({
      html: `<div class="flex items-center justify-center h-8 w-8 rounded-full bg-teal-600 border-2 border-white shadow-lg text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
      </div>`,
      className: 'custom-hospital-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Add user marker
    if (userLat && userLng) {
      L.marker([userLat, userLng], { icon: userIcon })
        .addTo(markersGroup)
        .bindPopup('<b>Your Location</b>');
    }

    // Add hospital markers
    hospitals.forEach((h) => {
      const lat = h.latitude || h.location?.coordinates?.[1];
      const lng = h.longitude || h.location?.coordinates?.[0];

      if (lat && lng) {
        const isNetwork = h.isNetworkHospital !== false && !String(h._id).startsWith('google_') && !String(h._id).startsWith('overpass_');

        let popupContent = `
          <div class="p-2 min-w-[200px]">
            <h4 class="font-bold text-sm text-slate-900">${h.name}</h4>
            <p class="text-xs text-slate-500 mt-1">${h.address?.street || ''}</p>
            ${h.distanceText ? `<p class="text-xs font-semibold text-teal-600 mt-1">🚗 ${h.distanceText}</p>` : ''}
            <div class="mt-2 flex gap-2">
        `;

        if (isNetwork) {
          popupContent += `<a href="/patient/hospitals/${h._id}" class="inline-block bg-teal-600 text-white text-xs font-semibold px-2 py-1 rounded hover:bg-teal-700 transition">Book Appointment</a>`;
        } else {
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat || ''},${userLng || ''}&destination=${lat},${lng}&travelmode=driving`;
          popupContent += `<a href="${mapsUrl}" target="_blank" rel="noreferrer" class="inline-block bg-slate-800 text-white text-xs font-semibold px-2 py-1 rounded hover:bg-slate-900 transition">Get Directions</a>`;
        }

        popupContent += `</div></div>`;

        L.marker([lat, lng], { icon: hospitalIcon })
          .addTo(markersGroup)
          .bindPopup(popupContent);
      }
    });

    // Zoom map to fit all markers if we have hospitals
    if (hospitals.length > 0 && userLat && userLng) {
      const bounds = L.latLngBounds([[userLat, userLng]]);
      hospitals.forEach((h) => {
        const lat = h.latitude || h.location?.coordinates?.[1];
        const lng = h.longitude || h.location?.coordinates?.[0];
        if (lat && lng) bounds.extend([lat, lng]);
      });
      map.fitBounds(bounds, { padding: [40, 40] });
    }

  }, [userLat, userLng, hospitals]);

  return (
    <div className="relative w-full h-[350px] rounded-xl overflow-hidden shadow border border-slate-200 dark:border-slate-800 mb-6 z-0">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
