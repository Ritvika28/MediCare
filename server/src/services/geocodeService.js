import { GeoCache } from '../models/GeoCache.js';

/**
 * Reverse Geocode: Coordinates (Lat/Lng) -> City, State, Country, Display Name
 */
export const reverseGeocode = async (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  // Cache key based on rounded coordinates to 4 decimal places (~11m precision)
  const cacheKey = `reverse:${lat.toFixed(4)},${lng.toFixed(4)}`;

  try {
    const cached = await GeoCache.findOne({ key: cacheKey, type: 'reverse-geocoding' });
    if (cached) {
      console.log('[Geocode] Returning cached reverse geocoding for key:', cacheKey);
      return cached.data;
    }
  } catch (err) {
    console.error('[Geocode] Cache read error:', err.message);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    console.log('[Geocode] Calling Nominatim reverse geocode for', lat, lng);
    
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MediCare-Hospital-App/1.0' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address || {};

    const geocodeResult = {
      city: addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state_district || '',
      state: addr.state || '',
      country: addr.country || '',
      displayName: data.display_name || '',
      latitude: lat,
      longitude: lng,
    };

    // Cache for 24 hours
    try {
      const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await GeoCache.findOneAndUpdate(
        { key: cacheKey, type: 'reverse-geocoding' },
        { data: geocodeResult, expireAt },
        { upsert: true, new: true }
      );
    } catch (cacheErr) {
      console.error('[Geocode] Cache write error:', cacheErr.message);
    }

    return geocodeResult;
  } catch (err) {
    console.error('[Geocode] Reverse geocode failed:', err.message);
    return null;
  }
};

/**
 * Forward Geocode: Address/City/State String -> Coordinates and location details
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callNominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&countrycodes=in`;
  let attempts = 0;
  while (attempts < 3) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MediCare-Hospital-App/1.0' },
      });
      if (res.status === 429) {
        console.log('[Geocode] Nominatim rate limited (429). Retrying after 1.5 seconds...');
        await delay(1500);
        attempts++;
        continue;
      }
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error(`[Geocode] Nominatim fetch error:`, err.message);
      await delay(1000);
      attempts++;
    }
  }
  return [];
}

export const forwardGeocode = async (queryStr) => {
  const query = (queryStr || '').trim();
  if (!query) return [];

  const cacheKey = `forward:${query.toLowerCase()}`;

  try {
    const cached = await GeoCache.findOne({ key: cacheKey, type: 'geocoding' });
    if (cached) {
      console.log('[Geocode] Returning cached forward geocoding for key:', cacheKey);
      return cached.data;
    }
  } catch (err) {
    console.error('[Geocode] Cache read error:', err.message);
  }

  try {
    console.log('[Geocode] Calling Nominatim forward geocode for query:', query);
    let elements = await callNominatim(query);

    // Fallback 1: Query + ", India"
    if ((!elements || elements.length === 0) && !query.toLowerCase().includes('india')) {
      const fallbackQuery1 = `${query}, India`;
      console.log(`[Geocode] Exact query "${query}" failed. Trying fallback: "${fallbackQuery1}"`);
      elements = await callNominatim(fallbackQuery1);
    }

    // Fallback 2: If query has multiple terms, try geocoding the last term + ", India" (usually the city)
    if (!elements || elements.length === 0) {
      const parts = query.split(/\s+/);
      if (parts.length > 1) {
        const lastWord = parts[parts.length - 1];
        const fallbackQuery2 = `${lastWord}, India`;
        console.log(`[Geocode] Exact query "${query}" failed. Trying fallback: "${fallbackQuery2}"`);
        elements = await callNominatim(fallbackQuery2);
      }
    }

    const results = elements.map((item) => {
      const addr = item.address || {};
      return {
        displayName: item.display_name || '',
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        city: addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state_district || '',
        state: addr.state || '',
        country: addr.country || '',
        class: item.class || '',
        type: item.type || '',
      };
    });

    // Cache for 24 hours
    try {
      const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await GeoCache.findOneAndUpdate(
        { key: cacheKey, type: 'geocoding' },
        { data: results, expireAt },
        { upsert: true, new: true }
      );
    } catch (cacheErr) {
      console.error('[Geocode] Cache write error:', cacheErr.message);
    }

    return results;
  } catch (err) {
    console.error('[Geocode] Geocoding failed:', err.message);
    return [];
  }
};

/**
 * Autocomplete: Suggestions for text inputs representing locations
 */
export const autocompleteGeocode = async (queryStr) => {
  return forwardGeocode(queryStr);
};
