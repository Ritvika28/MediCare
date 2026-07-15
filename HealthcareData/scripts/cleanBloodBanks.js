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
const RAW_DIR = path.join(WORKSPACE_DIR, 'raw', 'bloodbanks');
const CLEANED_DIR = path.join(WORKSPACE_DIR, 'cleaned', 'bloodbanks');
const log = createLogger('clean.log');

async function run() {
  log('====================================');
  log('STARTING BLOOD BANK CLEANING PIPELINE');
  log('====================================');

  if (!fs.existsSync(CLEANED_DIR)) {
    fs.mkdirSync(CLEANED_DIR, { recursive: true });
  }

  try {
    const files = fs.readdirSync(RAW_DIR).filter(file => file.endsWith('.csv'));
    log(`Found ${files.length} CSV files in raw/bloodbanks/`);

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
      const nameIndex = headers.findIndex(h => /center|bank|name/i.test(h));
      const addressIndex = headers.findIndex(h => /address|street|localaddress/i.test(h));
      const cityIndex = headers.findIndex(h => /district|city|town/i.test(h));
      const stateIndex = headers.findIndex(h => /state/i.test(h));
      const phoneIndex = headers.findIndex(h => /phone|contact|mobile|telephone/i.test(h));
      const emailIndex = headers.findIndex(h => /email/i.test(h));

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

        const cityRaw = cityIndex !== -1 ? row[cityIndex] : '';
        const cityClean = toTitleCase(cityRaw);
        
        // Deduplication
        const uniqueKey = `${name.toLowerCase()}|${cityClean.toLowerCase()}`;
        if (seenKeys.has(uniqueKey)) {
          duplicateCount++;
          continue;
        }
        seenKeys.add(uniqueKey);

        const streetRaw = addressIndex !== -1 ? row[addressIndex] : '';
        const stateRaw = stateIndex !== -1 ? row[stateIndex] : '';
        const state = toTitleCase(stateRaw);

        const phoneRaw = phoneIndex !== -1 ? row[phoneIndex] : '';
        const phone = normalizePhone(phoneRaw);

        const emailRaw = emailIndex !== -1 ? row[emailIndex] : '';
        const email = normalizeEmail(emailRaw);

        cleanedRows.push({
          name,
          address: {
            street: toTitleCase(streetRaw) || '',
            city: cityClean || '',
            state: state || '',
            pincode: '',
            country: 'India'
          },
          location: null, // to be geocoded during import if missing
          phone,
          email,
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
      log(`SUCCESS: Cleaned blood bank data saved to ${outputPath}`);
    }

    log('SUCCESS: BLOOD BANK DATA CLEANING COMPLETED');
  } catch (error) {
    log(`CRITICAL ERROR during blood bank cleaning: ${error.stack}`);
    process.exit(1);
  }
}

run();
