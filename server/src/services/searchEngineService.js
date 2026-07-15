import { SearchHistory } from '../models/SearchHistory.js';
import { forwardGeocode } from './geocodeService.js';
import { GoogleGenAI } from '@google/genai';

// Import modular healthcare search services
import { DatasetService } from './DatasetService.js';
import { OverpassLiveService } from './OverpassLiveService.js';
import { MergeService } from './MergeService.js';
import { RankingEngineService } from './RankingEngineService.js';

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
 * Main Centralized Search Engine Coordinator.
 * Always executes concurrent MongoDB (DatasetService) and Overpass Live (OverpassLiveService) queries,
 * then maps, merges, and ranks them.
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

    // B. Fallback: Query contains mixed keywords. Strip keywords to get location.
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

  // 2. Track search history per authenticated user
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

  // 3. Centralized Parallel Search execution (both MongoDB and OSM/Overpass in parallel)
  let dbResults = [];
  let osmResults = [];

  const searchPromises = [
    // Database search promise
    DatasetService.queryDataset(entityType, nameFilterText, searchLat, searchLng, searchRadiusM, {
      ...filters,
      city: detectedCity
    }).then(res => {
      dbResults = res;
    }).catch(err => {
      console.error('[Search Engine] Dataset query error in coordinator:', err.message);
    }),

    // Overpass search promise
    OverpassLiveService.queryOverpass(entityType, searchLat, searchLng, searchRadiusM, nameFilterText).then(res => {
      osmResults = res;
    }).catch(err => {
      console.error('[Search Engine] Overpass query error in coordinator:', err.message);
    })
  ];

  // Execute queries concurrently
  await Promise.all(searchPromises);

  // 4. Merge, Deduplicate, and rank results using Smart Ranking engine
  const mergedResults = MergeService.mergeResults(dbResults, osmResults, searchLat, searchLng);
  const rankedResults = RankingEngineService.rankResults(mergedResults, searchLat, searchLng, {
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
    latitude: searchLat,
    longitude: searchLng,
    city: detectedCity,
    results: finalFiltered
  };
};

/**
 * Intelligent duplicate removal comparing names and coordinate distances.
 * Maintained for backward compatibility.
 */
export const deduplicateHealthcare = (networkItems, overpassItems) => {
  return MergeService.mergeResults(networkItems, overpassItems, 0, 0);
};
