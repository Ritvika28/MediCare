import { GeoCache } from '../models/GeoCache.js';
import { haversineDistance } from './locationService.js';

/**
 * Get route directions, distance, travel time (duration), and ETA between start and end.
 * Caches results in MongoDB to prevent duplicate API hits.
 */
export const getRouteDirections = async (startLat, startLng, endLat, endLng) => {
  const sLat = parseFloat(startLat);
  const sLng = parseFloat(startLng);
  const eLat = parseFloat(endLat);
  const eLng = parseFloat(endLng);

  if (Number.isNaN(sLat) || Number.isNaN(sLng) || Number.isNaN(eLat) || Number.isNaN(eLng)) {
    return null;
  }

  const cacheKey = `route:${sLat.toFixed(5)},${sLng.toFixed(5)}:${eLat.toFixed(5)},${eLng.toFixed(5)}`;

  try {
    // Check MongoDB cache
    const cached = await GeoCache.findOne({ key: cacheKey, type: 'routing' });
    if (cached) {
      console.log('[OpenRouteService] Returning cached route directions for key:', cacheKey);
      return cached.data;
    }
  } catch (err) {
    console.error('[OpenRouteService] Cache read error:', err.message);
  }

  const defaultOsmUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${sLat}%2C${sLng}%3B${eLat}%2C${eLng}`;

  // Fallback function when ORS API fails or key is missing
  const getFallbackData = () => {
    const distMeters = haversineDistance(sLat, sLng, eLat, eLng);
    const speedMps = 8.33; // ~30 km/h average speed in city
    const durationSeconds = distMeters / speedMps;

    const formattedDistance = distMeters < 1000 
      ? `${Math.round(distMeters)} m` 
      : `${(distMeters / 1000).toFixed(1)} km`;

    const formattedDuration = durationSeconds < 60
      ? `${Math.round(durationSeconds)} secs`
      : durationSeconds < 3600
      ? `${Math.round(durationSeconds / 60)} mins`
      : `${Math.floor(durationSeconds / 3600)} h ${Math.round((durationSeconds % 3600) / 60)} mins`;

    return {
      distanceMeters: distMeters,
      durationSeconds,
      distanceText: formattedDistance,
      durationText: formattedDuration,
      navigationUrl: defaultOsmUrl,
      source: 'fallback-haversine',
    };
  };

  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) {
    console.log('[OpenRouteService] API key missing, using fallback calculations');
    return getFallbackData();
  }

  try {
    const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
    console.log('[OpenRouteService] Requesting ORS API directions from', sLat, sLng, 'to', eLat, eLng);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': apiKey,
      },
      body: JSON.stringify({
        coordinates: [
          [sLng, sLat],
          [eLng, eLat],
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenRouteService] API returned error:', response.status, errorText);
      return getFallbackData();
    }

    const resData = await response.json();
    const route = resData.routes?.[0];
    if (!route || !route.summary) {
      console.error('[OpenRouteService] Invalid API response format:', JSON.stringify(resData));
      return getFallbackData();
    }

    const distMeters = route.summary.distance; // distance in meters
    const durationSeconds = route.summary.duration; // duration in seconds

    const formattedDistance = distMeters < 1000 
      ? `${Math.round(distMeters)} m` 
      : `${(distMeters / 1000).toFixed(1)} km`;

    const formattedDuration = durationSeconds < 60
      ? `${Math.round(durationSeconds)} secs`
      : durationSeconds < 3600
      ? `${Math.round(durationSeconds / 60)} mins`
      : `${Math.floor(durationSeconds / 3600)} h ${Math.round((durationSeconds % 3600) / 60)} mins`;

    const routeData = {
      distanceMeters: distMeters,
      durationSeconds,
      distanceText: formattedDistance,
      durationText: formattedDuration,
      navigationUrl: defaultOsmUrl,
      source: 'openrouteservice',
    };

    // Cache the result in MongoDB for 24 hours
    try {
      const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await GeoCache.findOneAndUpdate(
        { key: cacheKey, type: 'routing' },
        { data: routeData, expireAt },
        { upsert: true, new: true }
      );
      console.log('[OpenRouteService] Successfully cached route coordinates.');
    } catch (cacheErr) {
      console.error('[OpenRouteService] Cache write error:', cacheErr.message);
    }

    return routeData;
  } catch (err) {
    console.error('[OpenRouteService] API request failed:', err.message);
    return getFallbackData();
  }
};
