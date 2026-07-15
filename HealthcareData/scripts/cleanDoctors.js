/**
 * cleanDoctors.js
 * Scaffolding script to clean raw doctors datasets.
 * Usage: node scripts/cleanDoctors.js <raw_file_name>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = path.join(__dirname, '..');
const RAW_DIR = path.join(WORKSPACE_DIR, 'raw', 'doctors');
const CLEANED_DIR = path.join(WORKSPACE_DIR, 'cleaned', 'doctors');
const LOG_FILE = path.join(WORKSPACE_DIR, 'logs', 'doctor_clean.log');

function log(msg) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, formatted);
}

async function run() {
  const args = process.argv.slice(2);
  const inputFileName = args[0];

  if (!inputFileName) {
    log('ERROR: Please specify a raw file name inside raw/doctors/. Example: node scripts/cleanDoctors.js doctors_list.json');
    process.exit(1);
  }

  const inputPath = path.join(RAW_DIR, inputFileName);
  if (!fs.existsSync(inputPath)) {
    log(`ERROR: Raw file not found at: ${inputPath}`);
    process.exit(1);
  }

  log(`Starting cleanup process for: ${inputFileName}`);

  try {
    const rawData = fs.readFileSync(inputPath, 'utf-8');
    let records = [];

    if (inputFileName.endsWith('.json')) {
      records = JSON.parse(rawData);
    } else {
      const lines = rawData.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim());
      records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || '';
        });
        return obj;
      });
    }

    log(`Loaded ${records.length} records from raw dataset.`);

    const cleanedRecords = [];
    const seenEmails = new Set();
    let duplicates = 0;
    let emptyEmails = 0;

    for (const record of records) {
      const email = (record.email || record.Email || '').trim().toLowerCase();
      const firstName = (record.firstName || record.First_Name || record.Name || '').trim();

      if (!email) {
        emptyEmails++;
        continue;
      }

      if (seenEmails.has(email)) {
        duplicates++;
        continue;
      }

      seenEmails.add(email);

      const cleaned = {
        firstName,
        lastName: (record.lastName || record.Last_Name || '').trim(),
        email,
        specialization: (record.specialization || record.Specialty || 'General Practitioner').trim(),
        experienceYears: parseInt(record.experienceYears || record.Experience || 0, 10),
        contactNumber: (record.phone || record.Contact_No || '').trim().replace(/[^\d+]/g, ''),
        consultationFee: parseInt(record.consultationFee || record.Fee || 500, 10),
      };

      cleanedRecords.push(cleaned);
    }

    log(`Cleanup summary:`);
    log(`- Total original records: ${records.length}`);
    log(`- Cleaned records output: ${cleanedRecords.length}`);
    log(`- Removed duplicates: ${duplicates}`);
    log(`- Removed empty emails: ${emptyEmails}`);

    const outputFileName = `cleaned_${inputFileName.replace(/\.[^/.]+$/, "")}.json`;
    const outputPath = path.join(CLEANED_DIR, outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(cleanedRecords, null, 2), 'utf-8');

    log(`SUCCESS: Cleaned records successfully written to: ${outputPath}`);
  } catch (error) {
    log(`CRITICAL ERROR during doctor cleanup: ${error.message}`);
    process.exit(1);
  }
}

run();
