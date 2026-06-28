import { useEffect, useRef, useState } from 'react';

/**
 * Reusable generic LeafletMap component.
 * Supports:
 * - Current Location marker
 * - Multiple categories (Hospitals, Labs, Blood Banks, Doctors)
 * - Custom medical HTML/SVG icons
 * - Marker clustering
 * - Beautiful popup cards with directions
 * - Responsive layout & dark mode tiles
 */
export function LeafletMap({ 
  userLat, 
  userLng, 
  items = [], 
  category = 'hospital', // 'hospital' | 'lab' | 'blood_bank' | 'doctor' | 'all'
  height = '350px' 
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode theme
  useEffect(() => {
    const checkTheme = () => {
      const dark = document.documentElement.classList.contains('dark') || 
                   document.body.classList.contains('dark');
      setIsDarkMode(dark);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    const L = window.L;

    // Create map if it doesn't exist
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([userLat || 20.5937, userLng || 78.9629], 13); // Default to India center if no coords

      // Layer group for clusters
      if (L.markerClusterGroup) {
        clusterGroupRef.current = L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 50,
        }).addTo(mapInstanceRef.current);
      } else {
        clusterGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      }
    }

    const map = mapInstanceRef.current;

    // Set correct tile layer based on dark mode
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = isDarkMode
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    tileLayerRef.current = L.tileLayer(tileUrl, { attribution }).addTo(map);

    // Update view if user coords change
    if (userLat && userLng) {
      map.setView([userLat, userLng], 13);
    }
  }, [userLat, userLng, isDarkMode]);

  // Handle markers drawing & clustering
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterGroupRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;
    const clusterGroup = clusterGroupRef.current;

    // Clear previous markers
    clusterGroup.clearLayers();
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    // User Location marker (blue pulsing ring)
    if (userLat && userLng) {
      const userIcon = L.divIcon({
        html: `<div class="relative flex h-5 w-5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white shadow-md"></span>
        </div>`,
        className: 'custom-user-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<b class="text-slate-900 font-bold">Your Location</b>');
    }

    // Define icons for different healthcare services
    const getIcon = (type) => {
      let colorClass = 'bg-teal-600';
      let svgContent = '';

      if (type === 'hospital') {
        colorClass = 'bg-teal-600';
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>`;
      } else if (type === 'lab' || type === 'laboratory') {
        colorClass = 'bg-cyan-600';
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h2"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <path d="M10 22h4"/>
          <path d="M12 2v20"/>
          <path d="M12 4H8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4Z"/>
        </svg>`;
      } else if (type === 'blood_bank' || type === 'bloodbank') {
        colorClass = 'bg-red-600';
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7Z"/>
        </svg>`;
      } else if (type === 'doctor') {
        colorClass = 'bg-indigo-600';
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.8 2.8A3 3 0 1 1 9 7L6.5 9.5a3.5 3.5 0 0 0 0 5L9 17a3 3 0 1 1-4.2 4.2L2.3 18.7a3.5 3.5 0 0 1 0-5L4.8 11.2a3 3 0 1 1 0-8.4Z"/>
          <path d="M19.2 2.8A3 3 0 1 0 15 7l2.5 2.5a3.5 3.5 0 0 1 0 5L15 17a3 3 0 1 0 4.2 4.2l2.5-2.5a3.5 3.5 0 0 0 0-5l-2.5-2.5a3 3 0 1 0 0-8.4Z"/>
        </svg>`;
      }

      return L.divIcon({
        html: `<div class="flex items-center justify-center h-8 w-8 rounded-full ${colorClass} border-2 border-white shadow-lg text-white">
          ${svgContent}
        </div>`,
        className: `custom-medical-marker-${type}`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    };

    // Draw markers
    items.forEach((item) => {
      const lat = item.latitude || item.location?.coordinates?.[1];
      const lng = item.longitude || item.location?.coordinates?.[0];

      if (lat && lng) {
        // Determine item category/type
        let itemType = category;
        if (category === 'all') {
          if (item._id?.startsWith('overpass_laboratory_') || item.testsAvailable) {
            itemType = 'lab';
          } else if (item._id?.startsWith('overpass_blood_bank_') || item.bloodGroups) {
            itemType = 'blood_bank';
          } else if (item.specialization) {
            itemType = 'doctor';
          } else {
            itemType = 'hospital';
          }
        }

        const isNetwork = item.isNetworkHospital !== false && 
                          !String(item._id).startsWith('google_') && 
                          !String(item._id).startsWith('overpass_');

        let popupHtml = `
          <div class="p-2.5 min-w-[210px] text-slate-800 dark:text-slate-100">
            <h4 class="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">${item.name}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">${item.address?.street || item.address || ''}</p>
        `;

        if (item.distanceText) {
          popupHtml += `<p class="text-xs font-bold text-teal-650 mt-1.5">🚗 ${item.distanceText}</p>`;
        }

        popupHtml += `<div class="mt-2.5 flex gap-1.5">`;

        // Action links
        if (isNetwork) {
          const viewUrl = itemType === 'doctor' 
            ? `/patient/doctors/${item._id}` 
            : `/patient/hospitals/${item._id}`;
          popupHtml += `<a href="${viewUrl}" class="inline-block bg-teal-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-teal-700 transition shadow-sm">View Profile</a>`;
        } else {
          const destCoords = `${lat},${lng}`;
          const originCoords = userLat && userLng ? `&origin=${userLat},${userLng}` : '';
          const mapsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLat || ''}%2C${userLng || ''}%3B${lat}%2C${lng}`;
          popupHtml += `<a href="${mapsUrl}" target="_blank" rel="noreferrer" class="inline-block bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-slate-900 transition shadow-sm">Get Directions</a>`;
        }

        popupHtml += `</div></div>`;

        L.marker([lat, lng], { icon: getIcon(itemType) })
          .addTo(clusterGroup)
          .bindPopup(popupHtml);
      }
    });

    // Zoom and pan map to fit all markers nicely
    if (items.length > 0) {
      const bounds = L.latLngBounds([]);
      if (userLat && userLng) bounds.extend([userLat, userLng]);

      items.forEach((item) => {
        const lat = item.latitude || item.location?.coordinates?.[1];
        const lng = item.longitude || item.location?.coordinates?.[0];
        if (lat && lng) bounds.extend([lat, lng]);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    }
  }, [userLat, userLng, items, category]);

  return (
    <div 
      className="relative w-full rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 z-0 mb-6"
      style={{ height }}
    >
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
