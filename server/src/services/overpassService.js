import { haversineDistance } from './locationService.js';

const mapOverpassToHospital = (element, userLat, userLng) => {
  const lat = element.lat || element.center?.lat;
  const lng = element.lon || element.center?.lon;
  const distance = haversineDistance(userLat, userLng, lat, lng);
  const tags = element.tags || {};

  const street = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb']
  ].filter(Boolean).join(' ');

  return {
    _id: `overpass_${element.id}`,
    placeId: `osm_${element.id}`,
    name: tags.name || 'Unnamed Hospital',
    source: 'overpass',
    isNetworkHospital: false,
    location: { type: 'Point', coordinates: [lng, lat] },
    latitude: lat,
    longitude: lng,
    address: {
      street: street || tags['addr:full'] || 'Nearby OSM location',
      city: tags['addr:city'] || '',
      state: tags['addr:state'] || '',
    },
    phone: tags.phone || tags['contact:phone'] || '',
    rating: 0,
    emergencyAvailable: tags.emergency === 'yes' || true,
    availableBeds: null,
    totalBeds: null,
    distance,
    distanceText: distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`,
    distanceKm: (distance / 1000).toFixed(1),
  };
};

export const fetchNearbyHospitalsFromOverpass = async (latitude, longitude, radiusMeters = 10000) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  console.log('[Overpass] Fetching hospitals near', lat, lng, 'within radius', radiusMeters);

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
    );
    out center;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MediCare-Hospital-App/1.0'
      }
    });

    if (!res.ok) {
      console.error('[Overpass] HTTP error:', res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    const elements = data.elements || [];
    console.log('[Overpass] Found raw elements:', elements.length);

    const results = elements
      .filter(el => el.tags && el.tags.name)
      .map(el => mapOverpassToHospital(el, lat, lng));

    console.log('[Overpass] Mapped valid hospitals:', results.length);
    return results.sort((a, b) => a.distance - b.distance);
  } catch (err) {
    console.error('[Overpass] Error fetching from Overpass API:', err.message);
    return [];
  }
};
