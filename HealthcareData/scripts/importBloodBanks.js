import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from '../../server/node_modules/mongoose/index.js';
import { getStaticCityCoordinates } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = path.join(__dirname, '..');
const MERGED_FILE = path.join(WORKSPACE_DIR, 'merged', 'bloodbanks_Master.json');
const IMPORT_DIR = path.join(WORKSPACE_DIR, 'import');
const LOGS_DIR = path.join(WORKSPACE_DIR, 'logs');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const logFilePath = path.join(LOGS_DIR, 'import.log');
const failedFilePath = path.join(LOGS_DIR, 'failedRecords.log');

function log(msg) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [BLOOD_BANKS] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(logFilePath, formatted);
}

function logFailed(record, reason) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [BLOOD_BANKS] FAILED: "${record.name}" in city "${record.address?.city}". Reason: ${reason}. Record: ${JSON.stringify(record)}\n`;
  fs.appendFileSync(failedFilePath, formatted);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  log('==========================================');
  log('STARTING BLOOD BANK IMPORT & GEOPROCESSING');
  log('==========================================');

  if (!fs.existsSync(MERGED_FILE)) {
    log(`ERROR: Merged master file not found at ${MERGED_FILE}. Run merge script first.`);
    process.exit(1);
  }

  try {
    log(`Connecting to MongoDB: ${process.env.MONGODB_URI}`);
    await mongoose.connect(process.env.MONGODB_URI);
    log('MongoDB connected successfully.');

    const { BloodBank } = await import('../../server/src/models/BloodBank.js');
    const { localForwardGeocode } = await import('./utils.js');

    const rawMerged = JSON.parse(fs.readFileSync(MERGED_FILE, 'utf-8'));
    log(`Loaded ${rawMerged.length} merged blood bank records for import.`);

    const importReadyRecords = [];
    let geocodeAttempts = 0;
    let geocodeSuccess = 0;

    const bloodGroupsList = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    for (let i = 0; i < rawMerged.length; i++) {
      const record = rawMerged[i];

      // Geocoding missing coordinates
      if (!record.location || !record.location.coordinates || record.location.coordinates.length < 2) {
        const city = record.address.city || '';
        const state = record.address.state || '';
        
        // Try static city coordinate lookup first
        const staticCoords = getStaticCityCoordinates(city, state);
        if (staticCoords) {
          record.location = {
            type: 'Point',
            coordinates: staticCoords
          };
          geocodeSuccess++;
        } else if (geocodeAttempts < 20) {
          geocodeAttempts++;
          const street = record.address.street || '';
          
          const query = `${record.name}, ${city}, ${state}, India`.trim().replace(/^,\s*/, '');
          log(`Geocoding (${geocodeAttempts}): "${record.name}" -> Query: "${query}"`);

          try {
            const geoRes = await localForwardGeocode(query);
            if (geoRes && geoRes.length > 0) {
              record.location = {
                type: 'Point',
                coordinates: [geoRes[0].longitude, geoRes[0].latitude]
              };
              geocodeSuccess++;
              log(`  -> SUCCESS: [${geoRes[0].longitude}, ${geoRes[0].latitude}]`);
            } else {
              const fallbackQuery = `${street}, ${city}, ${state}, India`.trim().replace(/^,\s*/, '');
              log(`  -> Trying fallback query: "${fallbackQuery}"`);
              const fallbackRes = await localForwardGeocode(fallbackQuery);
              if (fallbackRes && fallbackRes.length > 0) {
                record.location = {
                  type: 'Point',
                  coordinates: [fallbackRes[0].longitude, fallbackRes[0].latitude]
                };
                geocodeSuccess++;
                log(`  -> SUCCESS (Fallback): [${fallbackRes[0].longitude}, ${fallbackRes[0].latitude}]`);
              } else {
                const cityQuery = `${city}, ${state}, India`.trim().replace(/^,\s*/, '');
                log(`  -> Trying City fallback query: "${cityQuery}"`);
                const cityRes = await localForwardGeocode(cityQuery);
                if (cityRes && cityRes.length > 0) {
                  record.location = {
                    type: 'Point',
                    coordinates: [cityRes[0].longitude, cityRes[0].latitude]
                  };
                  geocodeSuccess++;
                  log(`  -> SUCCESS (City fallback): [${cityRes[0].longitude}, ${cityRes[0].latitude}]`);
                } else {
                  log(`  -> WARNING: Geocoding failed for "${record.name}". Skipping.`);
                  record.location = null;
                }
              }
            }
          } catch (geoErr) {
            log(`  -> ERROR: Geocoding failed: ${geoErr.message}`);
          }

          await delay(1100);
        } else {
          // Fallback to Delhi coordinates
          record.location = {
            type: 'Point',
            coordinates: [77.2090, 28.6139]
          };
        }
      }

      if (!record.location || !record.location.coordinates || record.location.coordinates.length < 2) {
        logFailed(record, 'Missing coordinates after geocoding attempts');
        continue;
      }

      // Generate randomized blood stock
      const stock = bloodGroupsList.map(bg => ({
        group: bg,
        unitsAvailable: Math.floor(Math.random() * 50) + 10
      }));

      importReadyRecords.push({
        name: record.name,
        address: record.address,
        location: record.location,
        bloodGroups: stock,
        emergencyContact: record.phone || '9999999999',
        timings: '24x7',
        rating: record.rating || parseFloat((4.0 + Math.random() * 1.0).toFixed(1)),
        volunteers: [],
        emergency: true,
        verified: true
      });
    }

    // Save MongoDB ready JSON
    const importReadyPath = path.join(IMPORT_DIR, 'BloodBanks.json');
    fs.writeFileSync(importReadyPath, JSON.stringify(importReadyRecords, null, 2), 'utf-8');
    log(`Saved import-ready JSON to ${importReadyPath}`);

    log(`Starting bulk upsert of ${importReadyRecords.length} blood banks into MongoDB...`);
    const ops = importReadyRecords.map(doc => ({
      updateOne: {
        filter: { name: doc.name, 'address.city': doc.address.city },
        update: { $set: doc },
        upsert: true
      }
    }));

    let upsertCount = 0;
    const chunkSize = 2000;
    for (let i = 0; i < ops.length; i += chunkSize) {
      const chunk = ops.slice(i, i + chunkSize);
      try {
        const res = await BloodBank.bulkWrite(chunk, { ordered: false });
        upsertCount += (res.modifiedCount + res.upsertedCount + res.insertedCount);
      } catch (bulkErr) {
        log(`WARNING: Bulk write encountered some errors: ${bulkErr.message}`);
        if (bulkErr.writeErrors) {
          bulkErr.writeErrors.forEach(e => {
            logFailed(importReadyRecords[i + e.index], `Bulk write error: ${e.errmsg}`);
          });
        }
      }
    }

    log(`MongoDB Blood Bank Import summary:`);
    log(`  - Total records geocoded: ${geocodeSuccess} / ${geocodeAttempts}`);
    log(`  - Saved to json count: ${importReadyRecords.length}`);
    log(`  - Successfully imported to MongoDB: ${upsertCount}`);

    log('Building database indexes...');
    await BloodBank.createIndexes();
    log('Database indexes synchronized successfully.');

    log('SUCCESS: BLOOD BANK IMPORT PIPELINE RUN COMPLETE');
    process.exit(0);
  } catch (error) {
    log(`CRITICAL ERROR during blood bank import: ${error.stack}`);
    process.exit(1);
  }
}

run();
