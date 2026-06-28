import { haversineDistance } from './locationService.js';
import { GeoCache } from '../models/GeoCache.js';

// Round coordinate to a specific precision (e.g., 3 decimals = ~111m)
const roundCoordinate = (coord, precision = 3) => {
  return parseFloat(coord).toFixed(precision);
};

const mapOverpassToHealthcare = (element, userLat, userLng, category) => {
  const lat = element.lat || element.center?.lat;
  const lng = element.lon || element.center?.lon;
  const distance = haversineDistance(userLat, userLng, lat, lng);
  const tags = element.tags || {};

  const street = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb']
  ].filter(Boolean).join(' ');

  const commonData = {
    _id: `overpass_${category}_${element.id}`,
    placeId: `osm_${element.id}`,
    name: tags.name || `Unnamed ${category.charAt(0).toUpperCase() + category.slice(1)}`,
    source: 'overpass',
    isNetworkHospital: false,
    location: { type: 'Point', coordinates: [lng, lat] },
    latitude: lat,
    longitude: lng,
    address: {
      street: street || tags['addr:full'] || 'Nearby OSM location',
      city: tags['addr:city'] || '',
      state: tags['addr:state'] || '',
      pincode: tags['addr:postcode'] || '',
    },
    phone: tags.phone || tags['contact:phone'] || tags.emergency_phone || '',
    rating: tags.rating ? parseFloat(tags.rating) : 0,
    distance,
    distanceText: distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`,
    distanceKm: (distance / 1000).toFixed(1),
  };

  // Specific properties for category
  if (category === 'hospital') {
    return {
      ...commonData,
      emergencyAvailable: tags.emergency === 'yes' || true,
      availableBeds: null,
      totalBeds: null,
    };
  } else if (category === 'lab' || category === 'laboratory') {
    return {
      ...commonData,
      contactNumber: commonData.phone || 'N/A',
      testsAvailable: [
        { name: 'Routine Blood Test', category: 'blood_test', price: 299, durationHours: 12 },
        { name: 'Basic Scan', category: 'x_ray', price: 499, durationHours: 24 }
      ],
      operatingHours: tags.opening_hours || '8:00 AM - 8:00 PM',
      isOpenNow: true,
    };
  } else if (category === 'blood_bank' || category === 'bloodbank') {
    return {
      ...commonData,
      emergencyContact: commonData.phone || 'N/A',
      timings: tags.opening_hours || '24x7',
      bloodGroups: [
        { group: 'O+', unitsAvailable: 15 },
        { group: 'A+', unitsAvailable: 10 },
        { group: 'B+', unitsAvailable: 8 },
        { group: 'AB+', unitsAvailable: 5 }
      ],
    };
  }

  return commonData;
};

export const fetchNearbyHealthcareFromOverpass = async (latitude, longitude, category, radiusMeters = 10000) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radius = parseInt(radiusMeters, 10);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return [];
  }

  // Generate cache key with 3 decimal place precision for coords
  const cacheKey = `overpass:${category}:${roundCoordinate(lat, 3)},${roundCoordinate(lng, 3)}:${radius}`;

  try {
    const cached = await GeoCache.findOne({ key: cacheKey, type: 'overpass' });
    if (cached) {
      console.log(`[Overpass] Returning cached data for category ${category} and key:`, cacheKey);
      return cached.data;
    }
  } catch (err) {
    console.error('[Overpass] Cache read error:', err.message);
  }

  // Construct Overpass API Query
  let osmQueryType = '';
  if (category === 'hospital') {
    osmQueryType = `
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="hospital"](around:${radius},${lat},${lng});
      relation["amenity"="hospital"](around:${radius},${lat},${lng});
    `;
  } else if (category === 'lab' || category === 'laboratory') {
    osmQueryType = `
      node["amenity"="laboratory"](around:${radius},${lat},${lng});
      way["amenity"="laboratory"](around:${radius},${lat},${lng});
      relation["amenity"="laboratory"](around:${radius},${lat},${lng});
    `;
  } else if (category === 'blood_bank' || category === 'bloodbank') {
    osmQueryType = `
      node["amenity"="blood_bank"](around:${radius},${lat},${lng});
      node["healthcare"="blood_bank"](around:${radius},${lat},${lng});
      node["amenity"="blood_donation"](around:${radius},${lat},${lng});
      way["amenity"="blood_bank"](around:${radius},${lat},${lng});
      way["healthcare"="blood_bank"](around:${radius},${lat},${lng});
    `;
  } else if (category === 'clinic') {
    osmQueryType = `
      node["amenity"="clinic"](around:${radius},${lat},${lng});
      way["amenity"="clinic"](around:${radius},${lat},${lng});
      relation["amenity"="clinic"](around:${radius},${lat},${lng});
    `;
  } else if (category === 'pharmacy') {
    osmQueryType = `
      node["amenity"="pharmacy"](around:${radius},${lat},${lng});
      way["amenity"="pharmacy"](around:${radius},${lat},${lng});
      relation["amenity"="pharmacy"](around:${radius},${lat},${lng});
    `;
  } else {
    // Default fallback to general medical amenities
    osmQueryType = `
      node["amenity"~"hospital|clinic|pharmacy|doctors"](around:${radius},${lat},${lng});
    `;
  }

  const query = `
    [out:json][timeout:25];
    (
      ${osmQueryType}
    );
    out center;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    console.log(`[Overpass] Fetching ${category} near`, lat, lng, 'within radius', radius);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MediCare-Hospital-App/1.0',
      },
    });

    if (!res.ok) {
      console.error('[Overpass] HTTP error:', res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    const elements = data.elements || [];
    console.log(`[Overpass] Found raw elements for ${category}:`, elements.length);

    // Map and filter elements that have a name
    const results = elements
      .filter((el) => el.tags && el.tags.name)
      .map((el) => mapOverpassToHealthcare(el, lat, lng, category))
      .sort((a, b) => a.distance - b.distance);

    console.log(`[Overpass] Mapped valid ${category} results:`, results.length);

    // Cache the result in MongoDB for 2 hours (OSM results change slowly)
    try {
      const expireAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      await GeoCache.findOneAndUpdate(
        { key: cacheKey, type: 'overpass' },
        { data: results, expireAt },
        { upsert: true, new: true }
      );
      console.log(`[Overpass] Cached results for key: ${cacheKey}`);
    } catch (cacheErr) {
      console.error('[Overpass] Cache write error:', cacheErr.message);
    }

    return results;
  } catch (err) {
    console.error('[Overpass] Error fetching from Overpass API:', err.message);
    return [];
  }
};

// Maintain compatibility with existing code
export const fetchNearbyHospitalsFromOverpass = async (latitude, longitude, radiusMeters = 10000) => {
  return fetchNearbyHealthcareFromOverpass(latitude, longitude, 'hospital', radiusMeters);
};
