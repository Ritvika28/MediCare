import fs from 'fs';
import path from 'path';

import mongoose from '../../server/node_modules/mongoose/index.js';

// Robust char-by-char CSV parser that handles quotes, escaped quotes, nested commas, and newlines
export function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',') {
      if (inQuotes) {
        row[row.length - 1] += char;
      } else {
        row.push("");
      }
    } else if (char === '\r' || char === '\n') {
      if (inQuotes) {
        row[row.length - 1] += char;
      } else {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        lines.push(row);
        row = [""];
      }
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

// Write to custom logs in HealthcareData/logs/
export function createLogger(logFileName) {
  const WORKSPACE_DIR = path.dirname(path.dirname(import.meta.url).replace('file://', ''));
  const logDir = path.join(WORKSPACE_DIR, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFilePath = path.join(logDir, logFileName);
  
  return function log(msg) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logFilePath, formatted);
  };
}

// Trim and clean standard text fields
export function cleanText(val) {
  if (!val) return '';
  return val.toString().replace(/\s+/g, ' ').trim();
}

// Title Case helper
export function toTitleCase(str) {
  return cleanText(str)
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Normalize Name (for name similarity checking)
export function getCanonicalName(name) {
  return cleanText(name)
    .toLowerCase()
    .replace(/hospital|clinic|center|healthcare|diagnostic|lab|laboratory|blood bank|pharmacy|centre/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

// Normalize Phone Number to +91-XXXXXXXXXX or standard digits
export function normalizePhone(phone) {
  const clean = cleanText(phone).replace(/[^\d+]/g, '');
  if (!clean) return '';
  // If it's a 10-digit number without country code
  if (clean.length === 10 && !clean.startsWith('+')) {
    return `+91-${clean}`;
  }
  if (clean.startsWith('91') && clean.length === 12) {
    return `+91-${clean.slice(2)}`;
  }
  if (clean.startsWith('+91') && clean.length === 13) {
    return `+91-${clean.slice(3)}`;
  }
  return clean;
}

// Normalize Email Address
export function normalizeEmail(email) {
  const clean = cleanText(email).toLowerCase();
  if (clean === '0' || clean === 'null' || clean === 'na' || clean === 'n/a') return '';
  return clean;
}

// Normalize Website URL
export function normalizeWebsite(url) {
  let clean = cleanText(url).toLowerCase();
  if (clean === '0' || clean === 'null' || clean === 'na' || clean === 'n/a') return '';
  if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  return clean;
}

// Levenshtein similarity score (0.0 to 1.0)
export function stringSimilarity(str1, str2) {
  const s1 = getCanonicalName(str1);
  const s2 = getCanonicalName(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return (maxLen - distance) / maxLen;
}

// Static coordinate lookup for major Indian cities to avoid Nominatim blocks during mass imports
export const CITY_COORDINATES = {
  'delhi': [77.2090, 28.6139],
  'new delhi': [77.2090, 28.6139],
  'mumbai': [72.8777, 19.0760],
  'bombay': [72.8777, 19.0760],
  'kolkata': [88.3639, 22.5726],
  'calcutta': [88.3639, 22.5726],
  'chennai': [80.2707, 13.0827],
  'madras': [80.2707, 13.0827],
  'bengaluru': [77.5946, 12.9716],
  'bangalore': [77.5946, 12.9716],
  'hyderabad': [78.4867, 17.3850],
  'ahmedabad': [72.5714, 23.0225],
  'pune': [73.8567, 18.5204],
  'surat': [72.8311, 21.1702],
  'jaipur': [75.7873, 26.9124],
  'lucknow': [80.9462, 26.8467],
  'kanpur': [80.3319, 26.4499],
  'nagpur': [79.0882, 21.1458],
  'indore': [75.8577, 22.7196],
  'thane': [72.9781, 19.2183],
  'bhopal': [77.4126, 23.2599],
  'visakhapatnam': [83.2185, 17.6868],
  'patna': [85.1376, 25.5941],
  'vadodara': [73.1812, 22.3072],
  'ghaziabad': [77.4229, 28.6692],
  'ludhiana': [75.8573, 30.9010],
  'agra': [78.0081, 27.1767],
  'nashik': [73.7898, 19.9975],
  'faridabad': [77.3178, 28.4089],
  'meerut': [77.7064, 28.9845],
  'rajkot': [70.8022, 22.3039],
  'varanasi': [82.9739, 25.3176],
  'srinagar': [74.7973, 34.0837],
  'coimbatore': [76.9558, 11.0168],
  'jabalpur': [79.9339, 23.1686],
  'madurai': [78.1198, 9.9252],
  'jodhpur': [73.0243, 26.2389],
  'gwalior': [78.1784, 26.2183],
  'vijayawada': [80.6480, 16.5062],
  'noida': [77.3910, 28.5355],
  'gurgaon': [77.0266, 28.4595],
  'gurugram': [77.0266, 28.4595],
  'dehradun': [78.0322, 30.3165],
  'haridwar': [78.1642, 29.9457],
  'ranchi': [85.3096, 23.3441],
  'dhanbad': [86.4304, 23.7957],
  'bhubaneswar': [85.8245, 20.2961],
  'cuttack': [85.8793, 20.4625],
  'thiruvananthapuram': [76.9366, 8.5241],
  'trivandrum': [76.9366, 8.5241],
  'kochi': [76.2673, 9.9312],
  'kozhikode': [75.7804, 11.2588],
  'guwahati': [91.7362, 26.1445],
  'raipur': [81.6296, 21.2514],
  'bilaspur': [82.1391, 22.0790],
  'shimla': [77.1734, 31.1048],
  'jammu': [74.8570, 32.7266],
  'amritsar': [74.8723, 31.6340],
  'jalandhar': [75.5762, 31.3260],
  'chandigarh': [76.7794, 30.7333],
  'panchkula': [76.8591, 30.6942],
  'ambala': [76.7797, 30.3782],
  'rohtak': [76.6026, 28.8955],
  'hisar': [75.7217, 29.1486],
  'karnal': [76.9902, 29.6857],
  'panipat': [76.9629, 29.3909],
  'sonipat': [77.0150, 28.9931],
  'salem': [78.1460, 11.6643],
  'hosur': [77.8253, 12.7409],
  'trichy': [78.7047, 10.7905],
  'tiruchirappalli': [78.7047, 10.7905],
  'tirunelveli': [77.7567, 8.7139],
  'vellore': [79.1326, 12.9165],
  'udaipur': [73.6824, 24.5854],
  'ajmer': [74.6399, 26.4498],
  'kota': [75.8648, 25.2138],
  'bikaner': [73.3119, 28.0229],
  'aurangabad': [75.3426, 19.8762],
  'nagaur': [73.7147, 27.1983],
  'alwar': [76.6083, 27.5530],
  'sikar': [75.1398, 27.6018],
  'barmer': [71.3974, 25.7532],
  'sri ganganagar': [73.8779, 29.9142],
  'bhilwara': [74.6469, 25.3468],
  'nanded': [77.3175, 19.1383],
  'kolhapur': [74.2433, 16.7050],
  'solapur': [75.9064, 17.6599],
  'sangli': [74.5815, 16.8524],
  'satara': [73.9850, 17.6805],
  'jalgaon': [75.5626, 21.0077],
  'amravati': [77.7523, 20.9374],
  'akola': [77.0028, 20.7002],
  'latur': [76.5641, 18.4088],
  'dhule': [74.7749, 20.9042],
  'ahmednagar': [74.7496, 19.0948],
  'chandrapur': [79.2961, 19.9615],
  'jalna': [75.8833, 19.8410],
  'wardha': [78.6022, 20.7453],
  'gondia': [80.1799, 21.4549],
  'yavatmal': [78.1189, 20.3888],
  'parbhani': [76.7748, 19.2618],
  'beed': [75.7604, 18.9897],
  'guntur': [80.4365, 16.3067],
  'nellore': [79.9865, 14.4426],
  'kurnool': [78.0364, 15.8281],
  'kakinada': [82.2475, 16.9890],
  'rajahmundry': [81.7830, 17.0005],
  'kadapa': [78.8241, 14.4710],
  'anantapur': [77.5924, 14.6796],
  'eluru': [81.1001, 16.7104],
  'vizianagaram': [83.4149, 18.1118],
  'ongole': [80.0458, 15.5057],
  'chittoor': [79.1004, 13.2172],
  'tirupati': [79.4192, 13.6288],
  'srikakulam': [83.8938, 18.2949],
  'machilipatnam': [81.1307, 16.1875],
  'anantapuram': [77.5924, 14.6796],
  'west bengal': [88.3639, 22.5726],
  'karnataka': [77.5946, 12.9716],
  'maharashtra': [72.8777, 19.0760],
  'tamil nadu': [80.2707, 13.0827],
  'telangana': [78.4867, 17.3850],
  'gujarat': [72.5714, 23.0225],
  'rajasthan': [75.7873, 26.9124],
  'uttar pradesh': [80.9462, 26.8467]
};

// Returns coordinates for a city from the static map, or null if not found
export function getStaticCityCoordinates(city, state) {
  if (city) {
    const cleanCity = city.toLowerCase().trim();
    if (CITY_COORDINATES[cleanCity]) {
      return CITY_COORDINATES[cleanCity];
    }
  }
  if (state) {
    const cleanState = state.toLowerCase().trim();
    if (CITY_COORDINATES[cleanState]) {
      return CITY_COORDINATES[cleanState];
    }
  }
  return null;
}

const geoCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['geocoding', 'reverse-geocoding', 'routing', 'overpass', 'autocomplete', 'search'], index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    expireAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export const GeoCache = mongoose.models.GeoCache || mongoose.model('GeoCache', geoCacheSchema);

async function callNominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&countrycodes=in`;
  let attempts = 0;
  while (attempts < 3) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MediCare-Hospital-App/1.0' },
      });
      if (res.status === 429) {
        console.log('[Geocode] Nominatim rate limited. Retrying after 1.5s...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        attempts++;
        continue;
      }
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error(`[Geocode] Nominatim error:`, err.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }
  return [];
}

export async function localForwardGeocode(queryStr) {
  const query = (queryStr || '').trim();
  if (!query) return [];

  const cacheKey = `forward:${query.toLowerCase()}`;

  try {
    const cached = await GeoCache.findOne({ key: cacheKey, type: 'geocoding' });
    if (cached) {
      return cached.data;
    }
  } catch (err) {
    console.error('[Geocode] Cache read error:', err.message);
  }

  try {
    let elements = await callNominatim(query);

    // Fallback: Query + ", India"
    if ((!elements || elements.length === 0) && !query.toLowerCase().includes('india')) {
      elements = await callNominatim(`${query}, India`);
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
}

