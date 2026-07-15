import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parseCSV,
  createLogger,
  cleanText,
  toTitleCase,
  normalizePhone,
  normalizeEmail,
  normalizeWebsite
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = path.join(__dirname, '..');
const RAW_DIR = path.join(WORKSPACE_DIR, 'raw', 'hospitals');
const CLEANED_DIR = path.join(WORKSPACE_DIR, 'cleaned', 'hospitals');
const log = createLogger('clean.log');

async function run() {
  log('========================================');
  log('STARTING HOSPITAL DATA CLEANING PIPELINE');
  log('========================================');

  if (!fs.existsSync(CLEANED_DIR)) {
    fs.mkdirSync(CLEANED_DIR, { recursive: true });
  }

  try {
    const files = fs.readdirSync(RAW_DIR).filter(file => file.endsWith('.csv'));
    log(`Found ${files.length} CSV files in raw/hospitals/`);

    for (const file of files) {
      const filePath = path.join(RAW_DIR, file);
      log(`Processing file: ${file}`);
      
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const csvLines = parseCSV(fileData);
      if (csvLines.length === 0) {
        log(`WARNING: File ${file} is empty. Skipping.`);
        continue;
      }

      const headers = csvLines[0].map(h => h.trim().toLowerCase());
      log(`Headers found in ${file}: [ ${headers.join(', ')} ]`);

      // Dynamic header mapping
      const nameIndex = headers.findIndex(h => /name|hospital|centre|college/i.test(h) && !/nodal|person/i.test(h));
      const addressIndex = headers.findIndex(h => /address|street|localaddress|location/i.test(h) && !/coordinates/i.test(h));
      const cityIndex = headers.findIndex(h => /city|district|town|subtown|village/i.test(h));
      const stateIndex = headers.findIndex(h => /state/i.test(h) && !/id|code/i.test(h));
      const pinIndex = headers.findIndex(h => /pincode|zip|postcode/i.test(h));
      const phoneIndex = headers.findIndex(h => /phone|contact|mobile|telephone/i.test(h) && !/nodal/i.test(h));
      const emailIndex = headers.findIndex(h => /email/i.test(h) && !/nodal/i.test(h));
      const webIndex = headers.findIndex(h => /website/i.test(h));
      const coordIndex = headers.findIndex(h => /coordinates|coords/i.test(h));
      const latIndex = headers.findIndex(h => /^lat(itude)?$/i.test(h));
      const lngIndex = headers.findIndex(h => /^lo?ng(itude)?$/i.test(h));
      const specialtiesIndex = headers.findIndex(h => /specialties/i.test(h));
      const facilitiesIndex = headers.findIndex(h => /facilities/i.test(h));
      const bedsIndex = headers.findIndex(h => /beds|total_num_beds/i.test(h));

      log(`Header mappings for ${file}:`);
      log(`  - nameIndex: ${nameIndex}`);
      log(`  - addressIndex: ${addressIndex}`);
      log(`  - cityIndex: ${cityIndex}`);
      log(`  - stateIndex: ${stateIndex}`);
      log(`  - pinIndex: ${pinIndex}`);
      log(`  - phoneIndex: ${phoneIndex}`);
      log(`  - emailIndex: ${emailIndex}`);
      log(`  - coordIndex: ${coordIndex}`);
      log(`  - latIndex: ${latIndex}, lngIndex: ${lngIndex}`);

      const cleanedRows = [];
      let duplicateCount = 0;
      let missingNameCount = 0;
      let corruptCount = 0;
      const seenKeys = new Set();

      for (let i = 1; i < csvLines.length; i++) {
        const row = csvLines[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue; // blank row

        // Check if row has at least some columns
        if (row.length < Math.max(nameIndex, 1)) {
          corruptCount++;
          continue;
        }

        const nameRaw = nameIndex !== -1 ? row[nameIndex] : '';
        const name = toTitleCase(nameRaw);
        if (!name || name === '0' || name.toLowerCase() === 'null') {
          missingNameCount++;
          continue;
        }

        // Generate unique key for de-duplication inside the same file
        const cityRaw = cityIndex !== -1 ? row[cityIndex] : '';
        const cityClean = toTitleCase(cityRaw);
        const uniqueKey = `${name.toLowerCase()}|${cityClean.toLowerCase()}`;
        if (seenKeys.has(uniqueKey)) {
          duplicateCount++;
          continue;
        }
        seenKeys.add(uniqueKey);

        // Address clean
        const streetRaw = addressIndex !== -1 ? row[addressIndex] : '';
        const stateRaw = stateIndex !== -1 ? row[stateIndex] : '';
        const state = toTitleCase(stateRaw);
        const pinRaw = pinIndex !== -1 ? row[pinIndex] : '';
        const pincode = cleanText(pinRaw);

        // Coordinates check
        let latitude = null;
        let longitude = null;
        if (coordIndex !== -1 && row[coordIndex]) {
          const parts = row[coordIndex].split(',').map(v => parseFloat(v.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            // hospital_directory.csv uses "lat, lng" order
            latitude = parts[0];
            longitude = parts[1];
          }
        }
        if ((latitude === null || longitude === null) && latIndex !== -1 && lngIndex !== -1) {
          const latVal = parseFloat(row[latIndex]);
          const lngVal = parseFloat(row[lngIndex]);
          if (!isNaN(latVal) && !isNaN(lngVal)) {
            latitude = latVal;
            longitude = lngVal;
          }
        }

        // Validate coordinate bounds
        if (latitude !== null && longitude !== null) {
          if (latitude === 0 && longitude === 0) {
            latitude = null;
            longitude = null;
          } else if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            log(`WARNING: Invalid coordinates [${latitude}, ${longitude}] for hospital "${name}". Stripping coordinates.`);
            latitude = null;
            longitude = null;
          }
        }

        // Contact info
        const phoneRaw = phoneIndex !== -1 ? row[phoneIndex] : '';
        const phone = normalizePhone(phoneRaw);
        const emailRaw = emailIndex !== -1 ? row[emailIndex] : '';
        const email = normalizeEmail(emailRaw);
        const webRaw = webIndex !== -1 ? row[webIndex] : '';
        const website = normalizeWebsite(webRaw);

        // Specialties & facilities
        const specialtiesRaw = specialtiesIndex !== -1 ? row[specialtiesIndex] : '';
        const facilitiesRaw = facilitiesIndex !== -1 ? row[facilitiesIndex] : '';
        const specialties = specialtiesRaw ? specialtiesRaw.split(/[,;\n]/).map(s => toTitleCase(s)).filter(Boolean) : [];
        const facilitiesList = facilitiesRaw ? facilitiesRaw.split(/[,;\n]/).map(f => cleanText(f)).filter(Boolean) : [];

        // Bed count
        const bedsRaw = bedsIndex !== -1 ? parseInt(row[bedsIndex], 10) : 0;
        const totalBeds = isNaN(bedsRaw) ? 0 : bedsRaw;

        cleanedRows.push({
          name,
          address: {
            street: toTitleCase(streetRaw) || '',
            city: cityClean || '',
            state: state || '',
            pincode: pincode || '',
            country: 'India'
          },
          location: latitude && longitude ? {
            type: 'Point',
            coordinates: [longitude, latitude] // MongoDB expects [lng, lat]
          } : null,
          phone,
          email,
          website,
          facilities: facilitiesList,
          specialties,
          totalBeds,
          sourceFileName: file
        });
      }

      log(`File ${file} summary:`);
      log(`  - Total rows parsed: ${csvLines.length - 1}`);
      log(`  - Cleaned & retained: ${cleanedRows.length}`);
      log(`  - Duplicates removed: ${duplicateCount}`);
      log(`  - Empty name removed: ${missingNameCount}`);
      log(`  - Corrupt rows skipped: ${corruptCount}`);

      const outputFileName = `cleaned_${file.replace(/\.[^/.]+$/, "")}.json`;
      const outputPath = path.join(CLEANED_DIR, outputFileName);
      fs.writeFileSync(outputPath, JSON.stringify(cleanedRows, null, 2), 'utf-8');
      log(`SUCCESS: Cleaned data saved to ${outputPath}`);
    }

    log('SUCCESS: HOSPITAL DATA CLEANING COMPLETED');
  } catch (error) {
    log(`CRITICAL ERROR during hospital cleaning: ${error.stack}`);
    process.exit(1);
  }
}

run();
