import { GeoCache } from '../models/GeoCache.js';
import { haversineDistance } from './locationService.js';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
];

export class OverpassLiveService {
  /**
   * Queries the live Overpass API for healthcare facilities.
   * 
   * @param {string} entityType - Category of search: 'hospital', 'lab', 'blood_bank', 'clinic', 'pharmacy', 'emergency_center', or 'all'
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radiusM - Radius in meters
   * @param {string} nameFilter - Search term / keyword
   * @returns {Promise<Array>} List of mapped Overpass items
   */
  static async queryOverpass(entityType, lat, lng, radiusM, nameFilter) {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return [];
    }

    let categories = [];
    if (entityType === 'all') {
      categories = ['hospital', 'clinic', 'lab', 'blood_bank', 'pharmacy'];
    } else {
      categories = [entityType];
    }

    const promises = categories.map(cat => this.fetchByCategory(cat, lat, lng, radiusM, nameFilter));
    const results = await Promise.all(promises);
    return results.flat();
  }

  static async fetchByCategory(category, lat, lng, radiusM, nameFilter) {
    const roundedLat = parseFloat(lat).toFixed(3);
    const roundedLng = parseFloat(lng).toFixed(3);
    const cacheKey = `overpass:v2:${category}:${nameFilter || 'none'}:${roundedLat},${roundedLng}:${radiusM}`;

    try {
      const cached = await GeoCache.findOne({ key: cacheKey, type: 'overpass' });
      if (cached) {
        console.log(`[OverpassLiveService] Cache hit for key: ${cacheKey}`);
        return cached.data;
      }
    } catch (err) {
      console.warn('[OverpassLiveService] Cache read error:', err.message);
    }

    let osmQueryType = '';
    if (category === 'hospital' || category === 'emergency_center') {
      if (category === 'emergency_center' || nameFilter?.toLowerCase() === 'emergency') {
        osmQueryType = `
          node["amenity"="hospital"]["emergency"="yes"](around:${radiusM},${lat},${lng});
          way["amenity"="hospital"]["emergency"="yes"](around:${radiusM},${lat},${lng});
          relation["amenity"="hospital"]["emergency"="yes"](around:${radiusM},${lat},${lng});
        `;
      } else {
        osmQueryType = `
          node["amenity"="hospital"](around:${radiusM},${lat},${lng});
          way["amenity"="hospital"](around:${radiusM},${lat},${lng});
          relation["amenity"="hospital"](around:${radiusM},${lat},${lng});
        `;
      }
    } else if (category === 'lab' || category === 'laboratory') {
      osmQueryType = `
        node["amenity"="laboratory"](around:${radiusM},${lat},${lng});
        node["healthcare"="laboratory"](around:${radiusM},${lat},${lng});
        way["amenity"="laboratory"](around:${radiusM},${lat},${lng});
        way["healthcare"="laboratory"](around:${radiusM},${lat},${lng});
        relation["amenity"="laboratory"](around:${radiusM},${lat},${lng});
      `;
    } else if (category === 'blood_bank' || category === 'bloodbank') {
      osmQueryType = `
        node["amenity"="blood_bank"](around:${radiusM},${lat},${lng});
        node["healthcare"="blood_bank"](around:${radiusM},${lat},${lng});
        node["amenity"="blood_donation"](around:${radiusM},${lat},${lng});
        node["healthcare"="blood_donation"](around:${radiusM},${lat},${lng});
        way["amenity"="blood_bank"](around:${radiusM},${lat},${lng});
        way["healthcare"="blood_bank"](around:${radiusM},${lat},${lng});
        relation["amenity"="blood_bank"](around:${radiusM},${lat},${lng});
        relation["healthcare"="blood_bank"](around:${radiusM},${lat},${lng});
      `;
    } else if (category === 'clinic') {
      osmQueryType = `
        node["amenity"="clinic"](around:${radiusM},${lat},${lng});
        way["amenity"="clinic"](around:${radiusM},${lat},${lng});
        relation["amenity"="clinic"](around:${radiusM},${lat},${lng});
      `;
    } else if (category === 'ambulance') {
      osmQueryType = `
        node["emergency"="ambulance"](around:${radiusM},${lat},${lng});
        node["amenity"="emergency_service"](around:${radiusM},${lat},${lng});
        node["healthcare"="ambulance"](around:${radiusM},${lat},${lng});
        way["emergency"="ambulance"](around:${radiusM},${lat},${lng});
        way["amenity"="emergency_service"](around:${radiusM},${lat},${lng});
      `;
    } else if (category === 'pharmacy') {
      osmQueryType = `
        node["amenity"="pharmacy"](around:${radiusM},${lat},${lng});
        way["amenity"="pharmacy"](around:${radiusM},${lat},${lng});
        relation["amenity"="pharmacy"](around:${radiusM},${lat},${lng});
      `;
    } else {
      osmQueryType = `
        node["amenity"~"hospital|clinic|pharmacy|doctors|laboratory"](around:${radiusM},${lat},${lng});
      `;
    }

    const query = `
      [out:json][timeout:15];
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
        console.log(`[OverpassLiveService] Fetching ${category} near ${lat}, ${lng} from ${endpoint}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(url, {
          headers: { 'User-Agent': 'MediCare-Hospital-App/1.0' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          elements = data.elements || [];
          fetchError = null;
          console.log(`[OverpassLiveService] Successfully fetched ${elements.length} elements from ${endpoint}`);
          break;
        } else {
          fetchError = new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        console.warn(`[OverpassLiveService] Failed to query ${endpoint}:`, err.message);
        fetchError = err;
      }
    }

    if (fetchError && elements.length === 0) {
      console.error(`[OverpassLiveService] All endpoints failed for category ${category}. Returning empty.`);
      return [];
    }

    const results = elements
      .filter(el => el.tags && el.tags.name)
      .map(el => this.mapElement(el, lat, lng, category))
      .filter(item => {
        if (!nameFilter) return true;
        const normFilter = nameFilter.toLowerCase().trim();
        return item.name.toLowerCase().includes(normFilter) || 
               (item.address?.street || '').toLowerCase().includes(normFilter) ||
               (item.address?.city || '').toLowerCase().includes(normFilter);
      });

    try {
      const expireAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes cache
      await GeoCache.findOneAndUpdate(
        { key: cacheKey, type: 'overpass' },
        { data: results, expireAt },
        { upsert: true, new: true }
      );
      console.log(`[OverpassLiveService] Cached ${results.length} results for key: ${cacheKey}`);
    } catch (cacheErr) {
      console.warn('[OverpassLiveService] Cache write error:', cacheErr.message);
    }

    return results;
  }

  static mapElement(element, userLat, userLng, category) {
    const lat = element.lat || element.center?.lat;
    const lng = element.lon || element.center?.lon;
    const dist = haversineDistance(userLat, userLng, lat, lng);
    const tags = element.tags || {};

    const street = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:suburb']
    ].filter(Boolean).join(' ');

    const phone = tags.phone || tags['contact:phone'] || tags.emergency_phone || '';
    const openingHours = tags.opening_hours || '8:00 AM - 8:00 PM';

    const defaultLabTests = [
      { _id: `test_cbc_${element.id}`, name: 'Complete Blood Count (CBC)', category: 'blood_test', price: 350, durationHours: 8 },
      { _id: `test_lipid_${element.id}`, name: 'Lipid Profile', category: 'blood_test', price: 550, durationHours: 12 },
      { _id: `test_hba1c_${element.id}`, name: 'HbA1c (Diabetes)', category: 'blood_test', price: 450, durationHours: 8 },
    ];

    const defaultBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => ({
      group,
      unitsAvailable: Math.floor(Math.random() * 30) + 5
    }));

    return {
      _id: `overpass_${category}_${element.id}`,
      placeId: `osm_${element.id}`,
      name: tags.name || `Unnamed ${category}`,
      type: category === 'laboratory' ? 'lab' : category,
      source: 'overpass',
      location: { type: 'Point', coordinates: [lng, lat] },
      latitude: lat,
      longitude: lng,
      address: {
        street: street || tags['addr:full'] || 'Nearby OSM location',
        city: tags['addr:city'] || '',
        state: tags['addr:state'] || '',
        pincode: tags['addr:postcode'] || '',
        country: 'India'
      },
      phone: phone,
      contactNumber: phone || '+91-9876543210',
      emergencyContact: phone || '+91-9876543210',
      email: tags.email || tags['contact:email'] || '',
      website: tags.website || tags['contact:website'] || '',
      rating: tags.rating ? parseFloat(tags.rating) : 3.5,
      reviewCount: tags.rating ? Math.floor(Math.random() * 10) + 1 : 0,
      openingHours: openingHours,
      operatingHours: openingHours,
      timings: openingHours === '8:00 AM - 8:00 PM' ? '24x7' : openingHours,
      isOpenNow: true,
      wheelchair: tags.wheelchair || 'no',
      emergency: tags.emergency === 'yes',
      operator: tags.operator || '',
      testsAvailable: (category === 'lab' || category === 'laboratory') ? defaultLabTests : [],
      bloodGroups: (category === 'blood_bank' || category === 'bloodbank') ? defaultBloodGroups : [],
      osmTags: tags,
      distance: dist,
      isVerified: false
    };
  }
}

