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
const RAW_DIR = path.join(WORKSPACE_DIR, 'raw', 'labs');
const CLEANED_DIR = path.join(WORKSPACE_DIR, 'cleaned', 'labs');
const log = createLogger('clean.log');

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

async function run() {
  log('====================================');
  log('STARTING LAB DATA CLEANING PIPELINE');
  log('====================================');

  if (!fs.existsSync(CLEANED_DIR)) {
    fs.mkdirSync(CLEANED_DIR, { recursive: true });
  }

  try {
    const files = fs.readdirSync(RAW_DIR).filter(file => file.endsWith('.csv'));
    log(`Found ${files.length} CSV files in raw/labs/`);

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
      log(`Headers in ${file}: [ ${headers.join(', ')} ]`);

      // Dynamic header mapping
      const nameIndex = headers.findIndex(h => /name|cab|diagnostic/i.test(h));
      const addressIndex = headers.findIndex(h => /address|street|localaddress/i.test(h) && !/coordinates|phone/i.test(h));
      const cityIndex = headers.findIndex(h => /city|district|town/i.test(h));
      const stateIndex = headers.findIndex(h => /state/i.test(h));
      const phoneIndex = headers.findIndex(h => /phone|contact|mobile|telephone/i.test(h));

      const cleanedRows = [];
      let duplicateCount = 0;
      let missingNameCount = 0;
      let corruptCount = 0;
      const seenKeys = new Set();

      for (let i = 1; i < csvLines.length; i++) {
        const row = csvLines[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

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

        // Smart column shifting detection
        // Sometimes raw laboratories CSVs have columns shifted (e.g. Phone number falls in Address index)
        let phone = '';
        let street = '';
        let state = '';
        let city = '';

        // Extract values from indices
        const valAddress = addressIndex !== -1 ? row[addressIndex] : '';
        const valCity = cityIndex !== -1 ? row[cityIndex] : '';
        const valState = stateIndex !== -1 ? row[stateIndex] : '';
        const valPhone = phoneIndex !== -1 ? row[phoneIndex] : '';

        // 1. Phone matching logic (Phone can be shifted to Address or State index)
        const allRowValues = row.map(v => cleanText(v));
        const foundPhone = allRowValues.find(val => /^\d{10}$|^\d{3,5}-?\d{6,8}$/.test(val));
        phone = foundPhone ? normalizePhone(foundPhone) : normalizePhone(valPhone);

        // 2. State matching logic
        const foundState = allRowValues.find(val => {
          const lowerVal = val.toLowerCase();
          return INDIAN_STATES.some(s => s.toLowerCase() === lowerVal || s.toLowerCase().replace(/\s/g, '') === lowerVal.replace(/\s/g, ''));
        });
        state = foundState ? toTitleCase(foundState) : toTitleCase(valState);

        // 3. City matching logic
        // If state was shifted to City index, find correct city
        let cleanCity = toTitleCase(valCity);
        if (cleanCity && foundState && cleanCity.toLowerCase() === foundState.toLowerCase()) {
          // City index is actually holding the state. Look at other indexes for city
          const candidateCity = allRowValues.find(val => {
            if (!val || val === foundState) return false;
            // City is usually short, not phone, and not state
            return val.length < 20 && !/^\d+$/.test(val);
          });
          if (candidateCity) cleanCity = toTitleCase(candidateCity);
        }

        // 4. Street address logic
        // Find longest string that is not state, phone, or name
        const longTexts = allRowValues.filter(val => val && val !== name && val !== foundPhone && val !== foundState && val.length > 8);
        street = longTexts.length > 0 ? toTitleCase(longTexts[0]) : toTitleCase(valAddress);

        // Deduplication
        const uniqueKey = `${name.toLowerCase()}|${cleanCity.toLowerCase()}`;
        if (seenKeys.has(uniqueKey)) {
          duplicateCount++;
          continue;
        }
        seenKeys.add(uniqueKey);

        cleanedRows.push({
          name,
          address: {
            street: street || '',
            city: cleanCity || '',
            state: state || '',
            pincode: '',
            country: 'India'
          },
          location: null, // to be geocoded during import if missing
          phone,
          email: '',
          website: '',
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
      log(`SUCCESS: Cleaned lab data saved to ${outputPath}`);
    }

    log('SUCCESS: LAB DATA CLEANING COMPLETED');
  } catch (error) {
    log(`CRITICAL ERROR during lab cleaning: ${error.stack}`);
    process.exit(1);
  }
}

run();
