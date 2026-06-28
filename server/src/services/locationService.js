export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  return haversineDistance(lat1, lon1, lat2, lon2) / 1000;
};

export const formatDistance = (meters) => {
  if (meters == null || Number.isNaN(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
};

export const getOpenStreetMapRouteUrl = (fromLat, fromLng, toLat, toLng) => {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${fromLat}%2C${fromLng}%3B${toLat}%2C${toLng}`;
};

export const enrichHospitalWithDistance = (hospital, userLat, userLng) => {
  const doc = hospital.toObject?.() || { ...hospital };
  const [hLng, hLat] = doc.location?.coordinates || [doc.longitude, doc.latitude];
  const lat = hLat ?? doc.latitude;
  const lng = hLng ?? doc.longitude;

  if (lat == null || lng == null) {
    return { ...doc, distance: null, distanceText: '' };
  }

  const distance = haversineDistance(userLat, userLng, lat, lng);
  return {
    ...doc,
    latitude: lat,
    longitude: lng,
    distance,
    distanceText: formatDistance(distance),
    distanceKm: (distance / 1000).toFixed(1),
    isNetworkHospital: true,
    source: 'database',
  };
};

export const enrichHospitalsWithDistance = (hospitals, lat, lng, maxDistanceMeters = Infinity) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  return hospitals
    .map((h) => enrichHospitalWithDistance(h, latitude, longitude))
    .filter((h) => h.distance != null && h.distance <= maxDistanceMeters)
    .sort((a, b) => a.distance - b.distance);
};

