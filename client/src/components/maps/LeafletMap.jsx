import { useEffect, useRef, useState } from 'react';
import { Maximize2, Crosshair } from 'lucide-react';

/**
 * Reusable generic LeafletMap component.
 * Supports:
 * - Current Location marker
 * - Multiple categories (Hospitals, Labs, Blood Banks, Doctors, Pharmacies)
 * - Custom medical HTML/SVG icons with pop/growth animations
 * - Marker clustering
 * - Beautiful popup cards with directions
 * - Responsive layout & dark mode tiles
 * - Locate Me & Fullscreen floating controls
 */
export function LeafletMap({ 
  userLat, 
  userLng, 
  items = [], 
  category = 'hospital', // 'hospital' | 'lab' | 'blood_bank' | 'doctor' | 'pharmacy' | 'all'
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
      }).setView([userLat || 20.5937, userLng || 78.9629], 13);

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
        colorClass = 'bg-teal-650';
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
        colorClass = 'bg-rose-600';
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7Z"/>
        </svg>`;
      } else if (type === 'doctor') {
        colorClass = 'bg-indigo-650';
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>`;
      } else if (type === 'pharmacy') {
        colorClass = 'bg-emerald-600';
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
          <path d="m8.5 8.5 7 7"/>
        </svg>`;
      }

      return L.divIcon({
        html: `<div class="flex items-center justify-center h-8 w-8 rounded-full ${colorClass} border border-white shadow-lg text-white transform hover:scale-115 transition duration-150">
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
          if (item._id?.startsWith('overpass_laboratory_') || item.testsAvailable || item.type === 'lab') {
            itemType = 'lab';
          } else if (item._id?.startsWith('overpass_blood_bank_') || item.bloodGroups || item.type === 'blood_bank') {
            itemType = 'blood_bank';
          } else if (item.specialization || item.type === 'doctor') {
            itemType = 'doctor';
          } else if (item._id?.startsWith('overpass_pharmacy_') || item.type === 'pharmacy') {
            itemType = 'pharmacy';
          } else {
            itemType = 'hospital';
          }
        }

        const isNetwork = item.isNetworkHospital !== false && 
                          !String(item._id).startsWith('google_') && 
                          !String(item._id).startsWith('overpass_');

        let popupHtml = `
          <div class="p-3 min-w-[220px] text-slate-800 dark:text-slate-100">
            <h4 class="font-black text-sm text-slate-900 dark:text-white leading-snug">${item.name}</h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">${item.address?.street || item.address || ''}</p>
        `;

        if (item.distanceText || item.distanceKm) {
          const dist = item.distanceText || `${item.distanceKm} km`;
          popupHtml += `<p class="text-[11px] font-extrabold text-teal-650 mt-2 flex items-center gap-1">🚗 ${dist}</p>`;
        }

        popupHtml += `<div class="mt-3 flex gap-2">`;

        // Direct profile link or external directions mapper
        if (isNetwork) {
          const viewUrl = itemType === 'doctor' 
            ? `/patient/doctors/${item._id}` 
            : `/patient/hospitals/${item._id}`;
          popupHtml += `<a href="${viewUrl}" class="inline-block bg-teal-650 hover:bg-teal-700 text-white text-[10px] font-extrabold px-3 py-2 rounded-xl transition shadow-sm">Profile</a>`;
        }
        
        const destCoords = `${lat},${lng}`;
        const mapsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLat || ''}%2C${userLng || ''}%3B${lat}%2C${lng}`;
        popupHtml += `<a href="${mapsUrl}" target="_blank" rel="noreferrer" class="inline-block bg-slate-855 hover:bg-black text-white text-[10px] font-extrabold px-3 py-2 rounded-xl transition shadow-sm">Directions</a>`;

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

  const handleLocateMe = () => {
    if (userLat && userLng && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLat, userLng], 15, { animate: true, duration: 1 });
    }
  };

  const handleFullscreen = () => {
    const mapContainer = mapRef.current?.parentNode;
    if (!mapContainer) return;
    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen?.().catch(err => console.error('Fullscreen request failed:', err));
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div 
      className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 z-0 mb-6 bg-slate-50 group"
      style={{ height }}
    >
      <style>{`
        .custom-medical-marker-hospital, .custom-medical-marker-lab, .custom-medical-marker-blood_bank, .custom-medical-marker-doctor, .custom-medical-marker-pharmacy {
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .custom-medical-marker-hospital:hover, .custom-medical-marker-lab:hover, .custom-medical-marker-blood_bank:hover, .custom-medical-marker-doctor:hover, .custom-medical-marker-pharmacy:hover {
          transform: scale(1.22) !important;
          z-index: 1000 !important;
        }
      `}</style>

      {/* Floating View Map Controls (Locate Me & Fullscreen) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button 
          onClick={handleLocateMe}
          title="Locate my position"
          className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200/50 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer active:scale-95"
        >
          <Crosshair className="h-4.5 w-4.5" />
        </button>
        <button 
          onClick={handleFullscreen}
          title="Fullscreen Map View"
          className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200/50 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer active:scale-95"
        >
          <Maximize2 className="h-4.5 w-4.5" />
        </button>
      </div>

      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
