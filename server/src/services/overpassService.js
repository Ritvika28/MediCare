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

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
];

export const fetchNearbyHealthcareFromOverpass = async (latitude, longitude, category, radiusMeters = 10000, facility = null) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radius = parseInt(radiusMeters, 10);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return [];
  }

  // Generate cache key with 3 decimal place precision for coords
  const cacheKey = `overpass:${category}:${facility || 'none'}:${roundCoordinate(lat, 3)},${roundCoordinate(lng, 3)}:${radius}`;

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
    if (facility) {
      const fac = facility.toLowerCase();
      let extraFilters = [];
      if (fac === 'emergency') {
        extraFilters = [
          'node["amenity"="hospital"]["emergency"="yes"]',
          'node["amenity"="hospital"]["name"~"Emergency|Trauma|Accident|Casualty",i]',
          'way["amenity"="hospital"]["emergency"="yes"]',
          'way["amenity"="hospital"]["name"~"Emergency|Trauma|Accident|Casualty",i]',
          'relation["amenity"="hospital"]["emergency"="yes"]',
          'relation["amenity"="hospital"]["name"~"Emergency|Trauma|Accident|Casualty",i]'
        ];
      } else if (fac === 'icu') {
        extraFilters = [
          'node["amenity"="hospital"]["icu"="yes"]',
          'node["amenity"="hospital"]["name"~"ICU|Intensive Care",i]',
          'way["amenity"="hospital"]["icu"="yes"]',
          'way["amenity"="hospital"]["name"~"ICU|Intensive Care",i]'
        ];
      } else if (fac === 'nicu') {
        extraFilters = [
          'node["amenity"="hospital"]["nicu"="yes"]',
          'node["amenity"="hospital"]["name"~"NICU|Neonatal",i]',
          'way["amenity"="hospital"]["nicu"="yes"]',
          'way["amenity"="hospital"]["name"~"NICU|Neonatal",i]'
        ];
      } else if (fac === 'mri') {
        extraFilters = [
          'node["amenity"="hospital"]["mri"="yes"]',
          'node["amenity"="hospital"]["name"~"MRI|Scan|Imaging",i]',
          'way["amenity"="hospital"]["mri"="yes"]',
          'way["amenity"="hospital"]["name"~"MRI|Scan|Imaging",i]'
        ];
      } else if (fac === 'ctscan' || fac === 'ct') {
        extraFilters = [
          'node["amenity"="hospital"]["ct"="yes"]',
          'node["amenity"="hospital"]["name"~"CT|Scan|Imaging",i]',
          'way["amenity"="hospital"]["ct"="yes"]',
          'way["amenity"="hospital"]["name"~"CT|Scan|Imaging",i]'
        ];
      } else if (fac === 'ambulance') {
        extraFilters = [
          'node["amenity"="hospital"]["ambulance"="yes"]',
          'node["amenity"="hospital"]["name"~"Ambulance|Rescue",i]',
          'way["amenity"="hospital"]["ambulance"="yes"]',
          'way["amenity"="hospital"]["name"~"Ambulance|Rescue",i]'
        ];
      } else if (fac === 'bloodbank' || fac === 'blood_bank') {
        extraFilters = [
          'node["amenity"="hospital"]["blood_bank"="yes"]',
          'node["amenity"="hospital"]["name"~"Blood",i]',
          'way["amenity"="hospital"]["blood_bank"="yes"]',
          'way["amenity"="hospital"]["name"~"Blood",i]'
        ];
      } else {
        extraFilters = [
          `node["amenity"="hospital"]["name"~"${facility}",i]`,
          `way["amenity"="hospital"]["name"~"${facility}",i]`
        ];
      }
      osmQueryType = extraFilters.map(filter => `${filter}(around:${radius},${lat},${lng});`).join('\n');
    } else {
      osmQueryType = `
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        way["amenity"="hospital"](around:${radius},${lat},${lng});
        relation["amenity"="hospital"](around:${radius},${lat},${lng});
      `;
    }
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

  let elements = [];
  let fetchError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const url = `${endpoint}?data=${encodeURIComponent(query)}`;
    try {
      console.log(`[Overpass] Fetching ${category} near ${lat}, ${lng} from ${endpoint}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

      const res = await fetch(url, {
        headers: { 'User-Agent': 'MediCare-Hospital-App/1.0' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        elements = data.elements || [];
        fetchError = null;
        console.log(`[Overpass] Successfully fetched ${elements.length} elements from ${endpoint}`);
        break;
      } else {
        console.warn(`[Overpass] Endpoint ${endpoint} returned error status: ${res.status}`);
        fetchError = new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`[Overpass] Failed to query ${endpoint}:`, err.message);
      fetchError = err;
    }
  }

  if (fetchError && elements.length === 0) {
    console.error('[Overpass] All Overpass API endpoints failed. Returning empty.');
    return [];
  }

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
};

// Maintain compatibility with existing code
export const fetchNearbyHospitalsFromOverpass = async (latitude, longitude, radiusMeters = 10000) => {
  return fetchNearbyHealthcareFromOverpass(latitude, longitude, 'hospital', radiusMeters);
};
