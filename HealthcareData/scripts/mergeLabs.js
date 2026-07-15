import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createLogger,
  stringSimilarity,
  getCanonicalName,
  cleanText
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = path.join(__dirname, '..');
const CLEANED_DIR = path.join(WORKSPACE_DIR, 'cleaned', 'labs');
const MERGED_DIR = path.join(WORKSPACE_DIR, 'merged');
const log = createLogger('merge.log');
const dupLog = createLogger('duplicates.log');

// Distance helper
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km
}

function mergeRecords(rec1, rec2) {
  const coordinates = rec1.location?.coordinates || rec2.location?.coordinates || null;
  const location = coordinates ? { type: 'Point', coordinates } : null;

  return {
    name: rec1.name.length > rec2.name.length ? rec1.name : rec2.name,
    address: {
      street: rec1.address.street || rec2.address.street || '',
      city: rec1.address.city || rec2.address.city || '',
      state: rec1.address.state || rec2.address.state || '',
      pincode: rec1.address.pincode || rec2.address.pincode || '',
      country: 'India'
    },
    location,
    phone: rec1.phone || rec2.phone || '',
    email: rec1.email || rec2.email || '',
    website: rec1.website || rec2.website || '',
    sourceFileName: `${rec1.sourceFileName || 'unknown'}, ${rec2.sourceFileName || 'unknown'}`
  };
}

async function run() {
  log('========================================');
  log('STARTING OPTIMIZED LAB DATA MERGE');
  log('========================================');

  if (!fs.existsSync(MERGED_DIR)) {
    fs.mkdirSync(MERGED_DIR, { recursive: true });
  }

  try {
    if (!fs.existsSync(CLEANED_DIR)) {
      log(`ERROR: Cleaned lab directory ${CLEANED_DIR} not found.`);
      process.exit(1);
    }

    const files = fs.readdirSync(CLEANED_DIR).filter(file => file.endsWith('.json'));
    log(`Found ${files.length} cleaned lab files to merge.`);

    let allRecords = [];
    for (const file of files) {
      const filePath = path.join(CLEANED_DIR, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      log(`Loaded ${content.length} records from ${file}`);
      allRecords.push(...content);
    }

    log(`Total records loaded for merging: ${allRecords.length}`);

    // Map: cityKey -> Array of consolidated records
    const cityGroups = new Map();
    let dupsFound = 0;

    for (const record of allRecords) {
      const cityVal = record.address.city || 'unknown';
      const cityKey = cityVal.toLowerCase().trim();

      if (!cityGroups.has(cityKey)) {
        cityGroups.set(cityKey, []);
      }

      const group = cityGroups.get(cityKey);
      let matchIndex = -1;

      for (let j = 0; j < group.length; j++) {
        const master = group[j];

        // 1. Phone match
        if (record.phone && master.phone && record.phone === master.phone && record.phone.replace(/[^\d]/g, '').length >= 10) {
          matchIndex = j;
          dupLog(`[PHONE MATCH LAB] "${record.name}" with master "${master.name}" (Phone: ${record.phone})`);
          break;
        }

        // 2. Coordinate and Name match
        if (record.location?.coordinates && master.location?.coordinates) {
          const [lng1, lat1] = record.location.coordinates;
          const [lng2, lat2] = master.location.coordinates;
          const dist = haversineDistance(lat1, lng1, lat2, lng2);
          if (dist < 0.150) {
            const sim = stringSimilarity(record.name, master.name);
            if (sim >= 0.50) {
              matchIndex = j;
              dupLog(`[DISTANCE MATCH LAB] Dist: ${Math.round(dist * 1000)}m, Sim: ${Math.round(sim * 100)}% | "${record.name}" with "${master.name}"`);
              break;
            }
          }
        }

        // 3. Name similarity match
        const sim = stringSimilarity(record.name, master.name);
        if (sim >= 0.85) {
          matchIndex = j;
          dupLog(`[NAME SIMILARITY MATCH LAB] Name Sim: ${Math.round(sim * 100)}% | "${record.name}" with "${master.name}" in city "${cityVal}"`);
          break;
        }
      }

      if (matchIndex !== -1) {
        group[matchIndex] = mergeRecords(group[matchIndex], record);
        dupsFound++;
      } else {
        group.push(record);
      }
    }

    // Flatten all grouped lists back to flat array
    const masterRecords = [];
    for (const group of cityGroups.values()) {
      masterRecords.push(...group);
    }

    log(`Consolidation results for Labs:`);
    log(`  - Total original records: ${allRecords.length}`);
    log(`  - Master records retained: ${masterRecords.length}`);
    log(`  - Merged duplicates: ${dupsFound}`);

    const masterOutputPath = path.join(MERGED_DIR, 'labs_Master.json');
    fs.writeFileSync(masterOutputPath, JSON.stringify(masterRecords, null, 2), 'utf-8');
    log(`SUCCESS: Master consolidated lab file written to: ${masterOutputPath}`);
  } catch (error) {
    log(`CRITICAL ERROR during lab merge: ${error.stack}`);
    process.exit(1);
  }
}

run();
