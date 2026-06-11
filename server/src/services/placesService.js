import { haversineDistance } from './locationService.js';

const mapPlaceToHospital = (place, userLat, userLng) => {
  const lat = place.geometry?.location?.lat;
  const lng = place.geometry?.location?.lng;
  const distance = haversineDistance(userLat, userLng, lat, lng);

  return {
    _id: `google_${place.place_id}`,
    placeId: place.place_id,
    name: place.name,
    source: 'google',
    isNetworkHospital: false,
    location: { type: 'Point', coordinates: [lng, lat] },
    latitude: lat,
    longitude: lng,
    address: {
      street: place.vicinity || '',
      city: '',
      state: '',
    },
    phone: '',
    rating: place.rating || 0,
    emergencyAvailable: true,
    availableBeds: null,
    totalBeds: null,
    distance,
    distanceText: distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`,
    distanceKm: (distance / 1000).toFixed(1),
  };
};

export const fetchNearbyHospitalsFromGoogle = async (latitude, longitude, radiusMeters = 25000) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.log('[Places] GOOGLE_MAPS_API_KEY not set — skipping Google Places');
    return [];
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=hospital&key=${apiKey}`;

  console.log('[Places] Fetching hospitals near', lat, lng);

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('[Places] API status:', data.status, data.error_message);
    return [];
  }

  const results = (data.results || []).map((p) => mapPlaceToHospital(p, lat, lng));
  console.log('[Places] Found', results.length, 'hospitals from Google');
  return results.sort((a, b) => a.distance - b.distance);
};
