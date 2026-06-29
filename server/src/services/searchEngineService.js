import { Hospital } from '../models/Hospital.js';
import { Doctor } from '../models/Doctor.js';
import { Lab } from '../models/Lab.js';
import { BloodBank } from '../models/BloodBank.js';
import { SearchHistory } from '../models/SearchHistory.js';
import { GeoCache } from '../models/GeoCache.js';
import { forwardGeocode, reverseGeocode } from './geocodeService.js';
import { fetchNearbyHealthcareFromOverpass } from './overpassService.js';
import { rankResults } from './rankingService.js';
import { haversineDistance } from './locationService.js';
import { GoogleGenAI } from '@google/genai';
import { buildHospitalSearchFilter } from './hospitalSearchService.js';
import { searchDoctorsNearby } from './doctorSearchService.js';
import { buildLabSearchFilter } from '../controllers/labController.js';
import { buildBloodBankSearchFilter } from '../controllers/bloodBankController.js';

// Initialize Gemini for intent extraction
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

/**
 * Extracts structured search intent parameters from natural language inputs.
 * Gemini never returns actual records, only parameters for the backend to query.
 */
export const extractSearchIntent = async (queryText) => {
  const cleanQuery = (queryText || '').trim();
  if (cleanQuery.length < 5) {
    return { entityType: 'all', query: cleanQuery };
  }

  const ai = getGeminiClient();
  if (!ai) {
    console.warn('[Search Intent] Gemini client unavailable. Falling back to regex.');
    return fallbackIntentExtractor(cleanQuery);
  }

  try {
    const prompt = `
      You are a search intent parser for a healthcare platform.
      Extract the structured search attributes from this user search query: "${cleanQuery}"
      
      Rules:
      1. Extract location name (city, town, district, or neighborhood).
      2. Identify the target entityType (must be one of: 'hospital', 'doctor', 'lab', 'blood_bank', 'pharmacy', or 'all').
      3. Identify specialties if mentioned (e.g., 'Cardiologist', 'Pediatrician', 'Dermatologist').
      4. Detect service tags if mentioned (e.g., 'MRI', 'CT Scan', 'Dialysis', 'Blood Test', 'ICU').
      5. Check if emergency care is required (true/false).
      6. Determine radius in km if specified (e.g., 'within 5km' -> 5), else null.
      
      Respond strictly in this JSON format (no markdown code fences or backticks, just raw JSON):
      {
        "entityType": "hospital|doctor|lab|blood_bank|pharmacy|all",
        "city": "extracted city or null",
        "locality": "extracted local neighborhood or null",
        "specialty": "extracted specialty or null",
        "service": "extracted service tag or null",
        "emergency": true|false,
        "radius": number|null,
        "nameKeyword": "extracted name of specific hospital/doctor if mentioned, or null"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text.trim());
    console.log('[Search Intent] Gemini extracted intent successfully:', parsed);
    return parsed;
  } catch (err) {
    console.error('[Search Intent] Gemini intent extraction failed:', err.message);
    return fallbackIntentExtractor(cleanQuery);
  }
};

const fallbackIntentExtractor = (query) => {
  const lower = query.toLowerCase();
  let entityType = 'all';
  let emergency = false;

  if (lower.includes('hospital')) entityType = 'hospital';
  else if (lower.includes('doctor') || lower.includes('dr')) entityType = 'doctor';
  else if (lower.includes('lab') || lower.includes('scan') || lower.includes('test')) entityType = 'lab';
  else if (lower.includes('blood') || lower.includes('donor')) entityType = 'blood_bank';
  else if (lower.includes('pharmacy') || lower.includes('chemist') || lower.includes('medicine')) entityType = 'pharmacy';

  if (lower.includes('emergency') || lower.includes('icu') || lower.includes('trauma') || lower.includes('accident')) {
    emergency = true;
  }

  return {
    entityType,
    emergency,
    query
  };
};

/**
 * Intelligent duplicate removal comparing names, address similarity, and distance coordinates.
 * Direct MongoDB items receive verified status and priority.
 */
export const deduplicateHealthcare = (networkItems, overpassItems) => {
  const merged = [];
  const seenNames = new Set();

  const getCanonicalName = (name) => {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/hospital|clinic|center|healthcare|diagnostic|lab|laboratory|blood bank|pharmacy/gi, '')
      .replace(/[^a-z0-9]/gi, '')
      .trim();
  };

  // 1. Add direct network items first (trusted source)
  networkItems.forEach(item => {
    const canonical = getCanonicalName(item.name);
    if (canonical) seenNames.add(canonical);
    merged.push({
      ...item.toObject ? item.toObject() : item,
      isVerified: true,
      source: 'mongodb'
    });
  });

  // 2. Add Overpass items that don't match names or close coordinate distances
  overpassItems.forEach(item => {
    const canonical = getCanonicalName(item.name);
    
    // Check name similarity
    let isDuplicate = seenNames.has(canonical);
    
    // Check coordinate distance threshold (within 150 meters)
    if (!isDuplicate) {
      isDuplicate = networkItems.some(net => {
        const netLat = net.latitude || net.location?.coordinates?.[1];
        const netLng = net.longitude || net.location?.coordinates?.[0];
        const osmLat = item.latitude;
        const osmLng = item.longitude;
        if (netLat && netLng && osmLat && osmLng) {
          const dist = haversineDistance(netLat, netLng, osmLat, osmLng);
          return dist < 0.15; // 150m threshold
        }
        return false;
      });
    }

    if (!isDuplicate) {
      if (canonical) seenNames.add(canonical);
      merged.push({
        ...item,
        isVerified: false,
        source: 'overpass'
      });
    }
  });

  return merged;
};

/**
 * Main Centralized Search Engine Coordinator.
 * Evaluates the query/location options and runs the matching search pipeline.
 */
export const unifiedSearchHealthcare = async (options = {}, userId = null) => {
  const {
    query = '',
    latitude,
    longitude,
    radius = 10, // default 10km
    city,
    locality,
    entityType = 'all',
    filters = {}
  } = options;

  let searchLat = parseFloat(latitude);
  let searchLng = parseFloat(longitude);
  let searchRadiusM = radius * 1000;
  let detectedCity = city;

  // 1. Audit GPS / Location Inputs and Geocode if City / Locality is specified
  let isGeographicPlaceDetected = false;
  let nameFilterText = query.trim();

  // Strip known clinical/facility/specialty/name keywords to find location string
  const clinicalKeywords = [
    'hospital', 'hospitals', 'doctor', 'doctors', 'dr', 'clinic', 'clinics',
    'pharmacy', 'pharmacies', 'chemist', 'medicine', 'medicines',
    'lab', 'labs', 'laboratory', 'laboratories', 'scan', 'scans', 'test', 'tests',
    'mri', 'ct', 'icu', 'nicu', 'emergency', 'trauma', 'cardiology', 'neurology',
    'cancer', 'orthopedic', 'pediatric', 'gynecology', 'burn unit', 'dialysis',
    'ventilator', 'operation theatre', 'blood bank', 'bloodbank', 'ambulance',
    'cardiologist', 'dermatologist', 'neurologist', 'pediatrician', 'physician',
    'apollo', 'fortis', 'max', 'manipal', 'medanta', 'narayana', 'tata', 'lilavati', 'kokilaben', 'wockhardt',
    'sharma', 'verma', 'gupta', 'singh', 'kumar', 'sen', 'patel', 'joshi', 'reddy', 'rao', 'nair', 'das', 'roy',
    'banerjee', 'chatterjee', 'mukherjee', 'khan', 'ali', 'shaikh',
    'in', 'near', 'around', 'at', 'of'
  ];

  const nonGeographicKeywords = [
    'apollo', 'fortis', 'max', 'manipal', 'medanta', 'narayana', 'tata', 'lilavati', 'kokilaben', 'wockhardt',
    'sharma', 'verma', 'gupta', 'singh', 'kumar', 'sen', 'patel', 'joshi', 'reddy', 'rao', 'nair', 'das', 'roy',
    'banerjee', 'chatterjee', 'mukherjee', 'khan', 'ali', 'shaikh', 'dr', 'doctor', 'clinic', 'lab', 'labs'
  ];

  if (nameFilterText && !city && !locality) {
    // A. Check if the entire query is a direct city/place name
    const isBrandOrName = nonGeographicKeywords.includes(nameFilterText.toLowerCase());
    if (!isBrandOrName) {
      const queryGeocoded = await forwardGeocode(nameFilterText);
      if (queryGeocoded && queryGeocoded.length > 0) {
        const topPlace = queryGeocoded[0];
        const geoTypes = ['city', 'town', 'village', 'suburb', 'county', 'state_district', 'state', 'administrative', 'postcode'];
        const matchesGeoType = !topPlace.type || 
                              geoTypes.includes(topPlace.type) || 
                              geoTypes.includes(topPlace.class) ||
                              (topPlace.city && nameFilterText.toLowerCase().includes(topPlace.city.toLowerCase())) ||
                              (topPlace.displayName && topPlace.displayName.toLowerCase().startsWith(nameFilterText.toLowerCase()));
        
        if (matchesGeoType) {
          searchLat = topPlace.latitude;
          searchLng = topPlace.longitude;
          detectedCity = topPlace.city || nameFilterText;
          isGeographicPlaceDetected = true;
          nameFilterText = ''; // Clean since the entire query was the place name
          console.log(`[Search Engine] Query "${query}" is direct geographic place. Overriding coords:`, searchLat, searchLng);
        }
      }
    }

    // B. Fallback: Query contains mixed keywords (e.g. "MRI Jodhpur"). Strip keywords to get location.
    if (!isGeographicPlaceDetected) {
      let locationText = nameFilterText.toLowerCase();
      clinicalKeywords.forEach(kw => {
        locationText = locationText.replace(new RegExp(`\\b${kw}\\b`, 'gi'), ' ');
      });
      locationText = locationText.replace(/\s+/g, ' ').trim();

      // Ensure the location candidate is not just a brand name or doctor name
      const isLocBrandOrName = nonGeographicKeywords.includes(locationText.toLowerCase());
      if (locationText.length >= 3 && !isLocBrandOrName) {
        console.log(`[Search Engine] Extracted location candidate: "${locationText}" from query: "${query}"`);
        const locGeocoded = await forwardGeocode(locationText);
        if (locGeocoded && locGeocoded.length > 0) {
          const topLoc = locGeocoded[0];
          const geoTypes = ['city', 'town', 'village', 'suburb', 'county', 'state_district', 'state', 'administrative', 'postcode'];
          const matchesGeoType = !topLoc.type || 
                                geoTypes.includes(topLoc.type) || 
                                geoTypes.includes(topLoc.class);
          
          if (matchesGeoType) {
            searchLat = topLoc.latitude;
            searchLng = topLoc.longitude;
            detectedCity = topLoc.city || locationText;
            isGeographicPlaceDetected = true;
            
            // Clean up nameFilterText by stripping the matched city/location text
            const cityWords = detectedCity.toLowerCase().split(/\s+/);
            cityWords.forEach(word => {
              nameFilterText = nameFilterText.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
            });
            nameFilterText = nameFilterText.replace(/\s+/g, ' ').trim();
            console.log(`[Search Engine] Extracted location "${detectedCity}". Coords:`, searchLat, searchLng, `Clean query: "${nameFilterText}"`);
          }
        }
      }
    }
  }

  if (city || locality) {
    const geoQuery = [locality, city, 'India'].filter(Boolean).join(', ');
    const geocoded = await forwardGeocode(geoQuery);
    if (geocoded && geocoded.length > 0) {
      searchLat = geocoded[0].latitude;
      searchLng = geocoded[0].longitude;
      detectedCity = geocoded[0].city || city;
      console.log(`[Search Engine] Geocoded "${geoQuery}" to coords:`, searchLat, searchLng);
    }
  }

  // Fallback to center coordinates if coordinates are missing (e.g. Delhi center)
  if (Number.isNaN(searchLat) || Number.isNaN(searchLng)) {
    searchLat = 28.6139;
    searchLng = 77.2090;
    detectedCity = detectedCity || 'Delhi';
  }

  // 2. Track search history per authenticated user (Search History tracking)
  if (userId && query.trim()) {
    try {
      await SearchHistory.findOneAndUpdate(
        { user: userId, query: query.trim() },
        { 
          entityType, 
          city: detectedCity, 
          specialty: filters.specialty || undefined,
          $inc: { count: 1 } 
        },
        { upsert: true, new: true }
      );
    } catch (histErr) {
      console.error('[Search Engine] History update failed:', histErr.message);
    }
  }

  // 3. Centralized Search Pipeline execution based on target categories
  let dbResults = [];
  let osmResults = [];

  const latQuery = searchLat;
  const lngQuery = searchLng;
  const radiusQuery = searchRadiusM;

  const mongoPointQuery = {
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lngQuery, latQuery] },
        $maxDistance: radiusQuery
      }
    }
  };

  // Perform parallel entity query searches using Promise.all for optimization
  const queryPromises = [];

  // A. HOSPITALS — Uses full clinical filter logic (ICU, MRI, CT Scan, Facilities, Specialties)
  if (entityType === 'all' || entityType === 'hospital') {
    queryPromises.push((async () => {
      try {
        // Build the full clinical filter using hospitalSearchService (preserves all ICU/MRI/Specialty filters)
        const baseFilter = await buildHospitalSearchFilter({
          search: nameFilterText,
          city: detectedCity,
          facilities: filters.facilities,
        });

        // Combine with geo-proximity filter
        // Only apply $near if we have valid coords (Mongoose requires 2dsphere index)
        let dbQuery;
        if (!Number.isNaN(latQuery) && !Number.isNaN(lngQuery)) {
          dbQuery = { ...baseFilter, ...mongoPointQuery };
        } else {
          dbQuery = { ...baseFilter, isActive: true };
        }

        const items = await Hospital.find(dbQuery).populate('departments').limit(40).lean();
        dbResults.push(...items.map(i => ({ ...i, type: 'hospital' })));
      } catch (err) {
        // If $near fails (e.g. missing geo index), fall back to non-spatial search
        console.warn('[Search Engine] Hospital geo query failed, falling back:', err.message);
        const baseFilter = await buildHospitalSearchFilter({
          search: nameFilterText,
          city: detectedCity,
          facilities: filters.facilities,
        });
        const items = await Hospital.find(baseFilter).populate('departments').limit(40).lean();
        dbResults.push(...items.map(i => ({ ...i, type: 'hospital' })));
      }

      // Fetch Overpass matching hospitals (always centered on the overridden/detected location)
      if (!Number.isNaN(latQuery) && !Number.isNaN(lngQuery)) {
        const osm = await fetchNearbyHealthcareFromOverpass(latQuery, lngQuery, 'hospital', radiusQuery, filters.facilities || nameFilterText);
        osmResults.push(...osm.map(i => ({ ...i, type: 'hospital' })));
      }
    })());
  }

  // B. CLINICS & PHARMACIES (Overpass only)
  if (entityType === 'clinic' || entityType === 'pharmacy') {
    queryPromises.push((async () => {
      if (!Number.isNaN(latQuery) && !Number.isNaN(lngQuery)) {
        const osm = await fetchNearbyHealthcareFromOverpass(latQuery, lngQuery, entityType, radiusQuery, nameFilterText);
        osmResults.push(...osm.map(i => ({ ...i, type: entityType })));
      }
    })());
  }

  // C. DOCTORS — MongoDB ONLY (never Overpass). Uses searchDoctorsNearby for complete clinical matching.
  if (entityType === 'all' || entityType === 'doctor') {
    queryPromises.push((async () => {
      try {
        const docParams = {
          search: nameFilterText,
          city: detectedCity,
          lat: latQuery,
          lng: lngQuery,
          latitude: latQuery,
          longitude: lngQuery,
          radius: radius,
          specialization: filters.specialty,
          gender: filters.gender,
          limit: 40,
          page: 1,
        };

        const { doctors } = await searchDoctorsNearby(docParams);

        const doctorsMapped = doctors.map(doc => {
          const docObj = doc.toObject ? doc.toObject() : { ...doc };
          const hospital = docObj.hospitalId || docObj.hospital;
          const hospLat = hospital?.location?.coordinates?.[1] || latQuery;
          const hospLng = hospital?.location?.coordinates?.[0] || lngQuery;
          return {
            ...docObj,
            type: 'doctor',
            name: docObj.name || `Dr. ${docObj.user?.firstName || ''} ${docObj.user?.lastName || ''}`.trim(),
            specialty: docObj.specialization || docObj.specialty,
            hospitalName: hospital?.name || docObj.hospitalName || 'Private Clinic',
            latitude: hospLat,
            longitude: hospLng,
            consultationFee: docObj.consultationFee || 500,
            experience: docObj.experience || docObj.experienceYears || 5,
            rating: docObj.rating || 4.5,
          };
        });
        dbResults.push(...doctorsMapped);
      } catch (err) {
        console.warn('[Search Engine] Doctor search failed:', err.message);
      }
    })());
  }

  // D. LABORATORIES — Uses buildLabSearchFilter (preserves test keyword matching: MRI, CT, blood, ultrasound)
  if (entityType === 'all' || entityType === 'lab') {
    queryPromises.push((async () => {
      try {
        const labFilter = buildLabSearchFilter({
          search: nameFilterText,
          city: detectedCity,
        });

        let dbQuery;
        if (!Number.isNaN(latQuery) && !Number.isNaN(lngQuery)) {
          dbQuery = { ...labFilter, ...mongoPointQuery };
        } else {
          dbQuery = { ...labFilter };
        }

        const items = await Lab.find(dbQuery).limit(40).lean();
        dbResults.push(...items.map(i => ({ ...i, type: 'lab' })));
      } catch (err) {
        console.warn('[Search Engine] Lab geo query failed, falling back:', err.message);
        const labFilter = buildLabSearchFilter({ search: nameFilterText, city: detectedCity });
        const items = await Lab.find(labFilter).limit(40).lean();
        dbResults.push(...items.map(i => ({ ...i, type: 'lab' })));
      }

      if (!Number.isNaN(latQuery) && !Number.isNaN(lngQuery)) {
        const osm = await fetchNearbyHealthcareFromOverpass(latQuery, lngQuery, 'laboratory', radiusQuery, nameFilterText);
        osmResults.push(...osm.map(i => ({ ...i, type: 'lab' })));
      }
    })());
  }

  // E. BLOOD BANKS — Uses buildBloodBankSearchFilter (blood group filtering, hospital lookup)
  if (entityType === 'all' || entityType === 'blood_bank') {
    queryPromises.push((async () => {
      try {
        const { filter: bbFilter } = await buildBloodBankSearchFilter({
          search: nameFilterText,
          city: detectedCity,
          bloodGroup: filters.bloodGroup,
        });

        let dbQuery;
        if (!Number.isNaN(latQuery) && !Number.isNaN(lngQuery)) {
          dbQuery = { ...bbFilter, ...mongoPointQuery };
        } else {
          dbQuery = { ...bbFilter };
        }

        const items = await BloodBank.find(dbQuery).populate('hospital', 'name').limit(40).lean();
        dbResults.push(...items.map(i => ({ ...i, type: 'blood_bank' })));
      } catch (err) {
        console.warn('[Search Engine] Blood bank geo query failed, falling back:', err.message);
        const { filter: bbFilter } = await buildBloodBankSearchFilter({
          search: nameFilterText,
          city: detectedCity,
          bloodGroup: filters.bloodGroup,
        });
        const items = await BloodBank.find(bbFilter).populate('hospital', 'name').limit(40).lean();
        dbResults.push(...items.map(i => ({ ...i, type: 'blood_bank' })));
      }

      if (!Number.isNaN(latQuery) && !Number.isNaN(lngQuery)) {
        const osm = await fetchNearbyHealthcareFromOverpass(latQuery, lngQuery, 'blood_bank', radiusQuery, nameFilterText);
        osmResults.push(...osm.map(i => ({ ...i, type: 'blood_bank' })));
      }
    })());
  }

  await Promise.all(queryPromises);

  // 4. Merge, Deduplicate, and rank results using Smart Ranking engine
  const mergedResults = deduplicateHealthcare(dbResults, osmResults);
  const rankedResults = rankResults(mergedResults, latQuery, lngQuery, {
    specialty: filters.specialty || nameFilterText,
    emergency: filters.emergency
  });

  // Apply Smart Filters constraints
  let finalFiltered = rankedResults;

  if (filters.rating) {
    const minRating = parseFloat(filters.rating);
    finalFiltered = finalFiltered.filter(item => (item.rating || 0) >= minRating);
  }

  if (filters.verified === true) {
    finalFiltered = finalFiltered.filter(item => item.isVerified === true);
  }

  return {
    latitude: latQuery,
    longitude: lngQuery,
    city: detectedCity,
    results: finalFiltered
  };
};
