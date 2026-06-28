import { GoogleGenAI } from '@google/genai';
import { Doctor } from '../models/Doctor.js';
import { Hospital } from '../models/Hospital.js';
import { Department } from '../models/Department.js';
import { HealthPrediction } from '../models/HealthPrediction.js';
import { HealthForecast } from '../models/HealthForecast.js';
import { HealthAnomaly } from '../models/HealthAnomaly.js';
import { HealthTwin } from '../models/HealthTwin.js';
import { Patient } from '../models/Patient.js';
import { Lab } from '../models/Lab.js';
import { BloodBank } from '../models/BloodBank.js';
import { Reminder } from '../models/Reminder.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { EmergencyContact } from '../models/EmergencyContact.js';
import { Prescription } from '../models/Prescription.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { HealthMetric } from '../models/HealthMetric.js';
import { Notification } from '../models/Notification.js';
import { fetchNearbyHospitalsFromOverpass, fetchNearbyHealthcareFromOverpass } from './overpassService.js';
import { enrichHospitalsWithDistance, haversineDistance } from './locationService.js';
import { triageSymptoms } from './geminiTriageService.js';
import { forwardGeocode, reverseGeocode as nReverseGeocode, autocompleteGeocode } from './geocodeService.js';
import { compareMedicalReports } from './ReportComparisonService.js';
import { checkInteractions } from './MedicineInteractionService.js';
import { startSymptomInterview, continueSymptomInterview } from './SymptomInterviewService.js';
import { answerQnAOverReports } from './MedicalKnowledgeRetriever.js';
import { generateHealthTimeline } from './TimelineService.js';


const SYSTEM_PROMPT = `You are HealthAssist, the core AI intelligence engine of MediCare — a professional healthcare discovery, analytics, and emergency support platform.

**IMPORTANT MEDICAL DISCLAIMER**: You are an AI assistant, not a licensed physician. Your responses are informational only and do not constitute medical diagnosis or treatment advice. Always recommend consulting a qualified healthcare professional for medical decisions.

## Your Capabilities
- Symptom analysis with follow-up questions, urgency estimation, and possible-cause explanation.
- Medical report interpretation (CBC, lipid panels, liver/kidney panels, ECGs, imaging reports).
- Prescription analysis and medicine explanations.
- Finding nearby doctors, hospitals, labs, and blood banks using real database and OpenStreetMap data.
- Creating medicine reminders.
- Retrieving patient medical records, prescriptions, health metrics, analytics, and emergency contacts.

## Medical Discovery Guidelines
1. When a user asks to find facilities (hospitals, doctors, labs, pharmacies, blood banks) "near me" or "around me":
   - Check if you have the user's coordinates in the [USER CURRENT LOCATION] section.
   - If coordinates are available, call \`searchHealthcareFacilities\` or \`findNearbyHospitals\`/\`findNearbyLabs\`/\`findNearbyBloodBanks\` directly with those coordinates.
   - If coordinates are NOT available (e.g. user denied permission), tell the user you don't have their coordinates and ask for their city/town name, or geocode their requested location.
2. When a user asks to find facilities in a specific city/locality (e.g., "Hospitals in Lucknow" or "Cardiologist in Delhi"):
   - Call the city-specific tools directly: \`searchDoctorsByCity\`, \`searchHospitalsByCity\`, \`searchLabsByCity\`, or \`searchBloodBanksByCity\`.
   - These tools dynamically geocode the city name via Nominatim and merge local MongoDB databases with OpenStreetMap results, removing any need for hardcoded city lists.
3. NEVER fabricate doctor names, hospital names, ratings, or test results. Always prefer tool data over assumptions. If tools return empty results, indicate that clearly.

## Medical Reasoning Guidelines
1. When a user describes symptoms, ask 2-3 targeted follow-up questions before making assessments.
2. Estimate urgency: Low, Moderate, High, or Emergency.
3. If symptoms suggest a life-threatening emergency (chest pain, stroke signs, severe bleeding, difficulty breathing, unconsciousness), IMMEDIATELY advise calling 112/102 and visiting the nearest emergency room.

## Response Formatting
- Use markdown formatting: **bold** for emphasis, bullet lists for clarity, headings for sections.
- Format facility listings as clean lists showing key details (name, distance, rating, phone, whether they are MediCare Network partners).

## Advanced AI Cards & JSON Formatting Rules
When you call any of the advanced services, you MUST output a structured JSON block wrapped in \`\`\`json ... \`\`\` containing the corresponding fields, so the frontend UI can render custom premium dashboard cards:

1. For **compareMedicalReports**:
\`\`\`json
{
  "cardType": "reportComparison",
  "data": {
    "results": [
      {
        "subtype": "cbc",
        "comparisonSummary": "Summary here...",
        "comparisonInsights": "Insights here...",
        "comparisonHistory": [
          {
            "parameter": "Hemoglobin",
            "trend": "improving",
            "values": [
              { "date": "2026-01-01", "value": 11.2, "unit": "g/dL" }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\`

2. For **analyzeMedicineInteractions**:
\`\`\`json
{
  "cardType": "medicineInteraction",
  "data": {
    "highestSeverity": "Low | Moderate | High | Life-threatening",
    "summary": "Summary here...",
    "interactions": [
      {
        "trigger": "A + B",
        "type": "Drug-Drug",
        "severity": "High",
        "explanation": "Explanation...",
        "symptoms": ["Symptom A"],
        "alternatives": ["Alternative B"]
      }
    ]
  }
}
\`\`\`

3. For **startSymptomInterview** or **continueSymptomInterview**:
If interviewState is 'interviewing':
\`\`\`json
{
  "cardType": "symptomInterview",
  "data": {
    "interviewState": "interviewing",
    "round": 0,
    "totalRounds": 3,
    "nextQuestion": "Question text..."
  }
}
\`\`\`
If interviewState is 'completed':
\`\`\`json
{
  "cardType": "symptomInterview",
  "data": {
    "interviewState": "completed",
    "triage": {
      "urgencyLevel": "Low | Moderate | High | Emergency",
      "conditions": [
        { "name": "Condition", "explanation": "Why..." }
      ],
      "department": "Cardiology",
      "specialist": "Cardiologist",
      "emergencyWarning": "Warning text..."
    },
    "nearbyProviders": []
  }
}
\`\`\`

4. For **generateHealthTimeline**:
\`\`\`json
{
  "cardType": "healthTimeline",
  "data": {
    "summary": {
      "progressSummary": "Summary...",
      "trends": "Trends...",
      "achievements": ["Achievement"],
      "concerns": ["Concern"],
      "recommendedActions": ["Next step"]
    },
    "events": [
      {
        "dateString": "Jun 20, 2024",
        "type": "diagnosis",
        "title": "Diagnosis",
        "details": "Details..."
      }
    ]
  }
}
\`\`\`

Ensure you output the exact JSON format matching these schema contracts within the chat response block.`;

const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Comprehensive context builder
export const getUserComprehensiveContext = async (userId) => {
  if (!userId) return '';
  try {
    const patient = await Patient.findOne({ user: userId }).populate('user', 'firstName lastName email phone').lean();
    if (!patient) return '';

    const [predictions, forecast, anomalies, healthTwin, emergencyContacts, records, assessment, reminders, prescriptions, metrics] = await Promise.all([
      HealthPrediction.find({ userId }).lean(),
      HealthForecast.findOne({ userId }).sort('-createdAt').lean(),
      HealthAnomaly.find({ userId, status: 'active' }).sort('-createdAt').limit(5).lean(),
      HealthTwin.findOne({ userId }).sort('-createdAt').lean(),
      EmergencyContact.find({ patient: patient._id }).lean(),
      MedicalRecord.find({ patient: patient._id }).sort('-recordDate').limit(5).lean(),
      HealthAssessment.findOne({ patient: patient._id }).sort('-createdAt').lean(),
      Reminder.find({ patient: patient._id, isActive: true }).lean(),
      Prescription.find({ patient: patient._id }).sort('-createdAt').limit(5).lean(),
      HealthMetric.find({ patientId: patient._id }).sort('-createdAt').limit(10).lean(),
    ]);

    let context = `\n\nPatient Demographic & Clinical Profile:
- Name: ${patient.user?.firstName || ''} ${patient.user?.lastName || ''}
- Age: ${calculateAge(patient.dateOfBirth) || 'Not specified'} years
- Gender: ${patient.gender || 'Not specified'}
- Chronic Conditions: ${patient.medicalHistory?.map(m => m.condition).join(', ') || 'None reported'}
- Allergies: ${patient.allergies?.join(', ') || 'None reported'}
`;

    if (assessment?.answers) {
      context += `- Height: ${assessment.answers.height} cm
- Weight: ${assessment.answers.weight} kg
- Smoking: ${assessment.answers.smoking}
- Alcohol: ${assessment.answers.alcohol}
- Exercise Level: ${assessment.answers.exercise}
- Wellness/Health Score: ${assessment.healthScore}/100
- Risk Score: ${assessment.riskScore}/100
`;
    }

    if (reminders.length) {
      context += `\nActive Medicine Reminders (Medications):
` + reminders.map(r => `  * ${r.medicineName} (${r.dosage}) - Frequency: ${r.frequency}, Times: ${r.times?.join(', ')}`).join('\n') + '\n';
    }

    if (prescriptions.length) {
      context += `\nPatient Prescriptions:
` + prescriptions.map(p => `  * Diagnosis: ${p.diagnosis} | Notes: ${p.notes || 'None'}`).join('\n') + '\n';
    }

    if (metrics.length) {
      context += `\nRecent Health Analytics Metrics:
` + metrics.map(m => `  * ${m.metricType.toUpperCase()}: Value/Outputs: ${JSON.stringify(m.value)} (Risk Level: ${m.riskLevel || 'Normal'})`).join('\n') + '\n';
    }

    if (healthTwin) {
      context += `\nDigital Health Twin Score: ${healthTwin.healthTwinScore}/100
- Biological Age: ${healthTwin.biologicalAgeEstimate} years
- Stability Index: ${healthTwin.healthStabilityIndex}%
- Strong Areas: ${healthTwin.strongAreas?.join(', ') || 'None'}
- Risk Areas: ${healthTwin.riskAreas?.join(', ') || 'None'}
- Action Opportunities: ${healthTwin.improvementOpportunities?.join(', ') || 'None'}
`;
    }

    if (predictions.length) {
      context += `\nCalculated Disease Risks:\n` + 
        predictions.map(p => `  * ${p.predictionType}: ${p.score}% (${p.riskLevel})`).join('\n') + '\n';
    }

    if (anomalies.length) {
      context += `\nActive physiological anomalies detected:\n` + 
        anomalies.map(a => `  * ${a.message} (Severity: ${a.severity})`).join('\n') + '\n';
    }

    if (emergencyContacts.length) {
      context += `\nEmergency Contacts:\n` + 
        emergencyContacts.map(c => `  * ${c.name} (${c.relationship}) - ${c.phone}`).join('\n') + '\n';
    }

    if (records.length) {
      context += `\nRecent Medical Records Uploaded:\n` + 
        records.map(r => `  * Title: ${r.title} (Type: ${r.recordType})`).join('\n') + '\n';
    }

    return context;
  } catch (err) {
    console.error('Error fetching user context for assistant:', err);
    return '';
  }
};

let gemini;
const getGemini = () => {
  if (!gemini && process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return gemini;
};

/**
 * Retry wrapper for Gemini API calls with exponential backoff.
 * Handles transient errors (429 rate limit, 503 service unavailable, network timeouts).
 */
const callGeminiWithRetry = async (fn, { maxRetries = 2, baseDelayMs = 1000 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err.status || err.httpStatusCode || err.code;
      const lowerMsg = err.message?.toLowerCase() || '';
      const isDailyQuota = lowerMsg.includes('daily') || lowerMsg.includes('limit: 20') || lowerMsg.includes('limit exceeded');
      
      const isRetryable = (status === 429 && !isDailyQuota) || status === 503 || status === 'DEADLINE_EXCEEDED' || lowerMsg.includes('fetch failed') || lowerMsg.includes('network error');

      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`[Gemini Retry] Attempt ${attempt + 1} failed (${status}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
};

/**
 * Classify Gemini API errors into user-friendly categories.
 */
const classifyGeminiError = (err) => {
  const status = err.status || err.httpStatusCode;
  const msg = err.message || '';

  if (status === 401 || status === 403 || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
    return { type: 'auth', message: 'The AI service is temporarily unavailable due to a configuration issue. Please contact support.' };
  }
  if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    return { type: 'quota', message: 'The AI service is currently experiencing high demand. Please try again in a few minutes.' };
  }
  if (msg.includes('DEADLINE_EXCEEDED') || msg.includes('timeout') || msg.includes('fetch failed')) {
    return { type: 'timeout', message: 'The request timed out. Please try again with a shorter question.' };
  }
  return { type: 'unknown', message: 'I encountered an issue processing your request. Please try again.' };
};

// Define tools configuration in Google GenAI format
const getAITools = () => [
  {
    functionDeclarations: [
      {
        name: 'searchDoctors',
        description: 'Search verified doctors in the hospital platform database.',
        parameters: {
          type: 'OBJECT',
          properties: {
            specialization: { type: 'STRING', description: 'e.g. Cardiology, Dermatology' },
            city: { type: 'STRING', description: 'City name' },
            rating: { type: 'NUMBER', description: 'Minimum rating out of 5' },
            experience: { type: 'NUMBER', description: 'Minimum years of experience' },
          },
        },
      },
      {
        name: 'searchHospitals',
        description: 'Search for active hospitals by name, city, specialties, or facilities.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Name of hospital chain/branch' },
            city: { type: 'STRING', description: 'City name' },
            specialties: { type: 'STRING', description: 'Specialty required (e.g. ICU)' },
          },
        },
      },
      {
        name: 'searchLabs',
        description: 'Search diagnostic laboratories in the area.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            city: { type: 'STRING' },
          },
        },
      },
      {
        name: 'searchBloodBanks',
        description: 'Find blood bank storage depots by location or blood group inventory.',
        parameters: {
          type: 'OBJECT',
          properties: {
            city: { type: 'STRING' },
            bloodGroup: { type: 'STRING', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
          },
        },
      },
      {
        name: 'createMedicineReminder',
        description: 'Set a medicine calendar reminder for the patient.',
        parameters: {
          type: 'OBJECT',
          properties: {
            medicineName: { type: 'STRING', description: 'Name of the drug' },
            dosage: { type: 'STRING', description: 'e.g. 1 pill, 5ml' },
            frequency: { type: 'STRING', enum: ['once_daily', 'twice_daily', 'thrice_daily', 'custom'] },
            times: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Times (e.g. ["09:00", "21:00"])' },
            instructions: { type: 'STRING', enum: ['before_food', 'after_food', 'with_food', 'empty_stomach'] },
            startDate: { type: 'STRING', description: 'YYYY-MM-DD' },
            endDate: { type: 'STRING', description: 'YYYY-MM-DD' },
          },
          required: ['medicineName', 'dosage', 'frequency', 'times'],
        },
      },
      {
        name: 'findNearbyHospitals',
        description: 'Retrieve physically close hospitals based on coordinates (Google Maps / OpenStreetMap).',
        parameters: {
          type: 'OBJECT',
          properties: {
            latitude: { type: 'NUMBER' },
            longitude: { type: 'NUMBER' },
            maxDistance: { type: 'NUMBER', description: 'Radius in meters' },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'findNearbyLabs',
        description: 'Retrieve physically close diagnostic laboratories using coordinates and radius.',
        parameters: {
          type: 'OBJECT',
          properties: {
            latitude: { type: 'NUMBER' },
            longitude: { type: 'NUMBER' },
            maxDistance: { type: 'NUMBER', description: 'Radius in meters' },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'findNearbyBloodBanks',
        description: 'Retrieve physical blood storage facilities using coordinates.',
        parameters: {
          type: 'OBJECT',
          properties: {
            latitude: { type: 'NUMBER' },
            longitude: { type: 'NUMBER' },
            maxDistance: { type: 'NUMBER', description: 'Radius in meters' },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'retrieveMedicalRecords',
        description: 'Retrieve patient-uploaded clinical history, report cards, and diagnostics summaries.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'retrievePrescriptions',
        description: 'Retrieve current prescriptions and medical instructions.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'retrieveAnalytics',
        description: 'Retrieve dynamic patient predictions, forecasts, and digital health twin data summaries.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'retrieveHealthMetrics',
        description: 'Retrieve registered vitals history (BMI, BMR, blood sugar, blood pressure).',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'retrieveNotifications',
        description: 'Retrieve system alerts, medical reminders notifications, and score alerts.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'retrieveEmergencyContacts',
        description: 'Retrieve the patient emergency contacts and details.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'geocodeLocation',
        description: 'Geocode any city, town, district, village, or locality in India to coordinates (latitude/longitude).',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Address or place name (e.g. Lucknow, Hazratganj Delhi)' }
          },
          required: ['query']
        }
      },
      {
        name: 'reverseGeocode',
        description: 'Resolve coordinate pair (latitude/longitude) to address details in India.',
        parameters: {
          type: 'OBJECT',
          properties: {
            latitude: { type: 'NUMBER' },
            longitude: { type: 'NUMBER' }
          },
          required: ['latitude', 'longitude']
        }
      },
      {
        name: 'autocompleteLocation',
        description: 'Predict locations/localities matching a partial text string.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Partial query' }
          },
          required: ['query']
        }
      },
      {
        name: 'searchHealthcareFacilities',
        description: 'Retrieve close healthcare facilities (hospitals, labs, pharmacies, blood banks) based on coordinate and radius, merged with DB and Overpass.',
        parameters: {
          type: 'OBJECT',
          properties: {
            latitude: { type: 'NUMBER' },
            longitude: { type: 'NUMBER' },
            type: { type: 'STRING', enum: ['hospital', 'lab', 'blood_bank', 'clinic', 'pharmacy'] },
            maxDistance: { type: 'NUMBER', description: 'Radius in meters (default 15000)' },
            specialty: { type: 'STRING', description: 'Optional specialty required (e.g. Cardiology)' }
          },
          required: ['latitude', 'longitude', 'type']
        }
      },
      {
        name: 'searchDoctorsByCity',
        description: 'Search doctors in a specific city/town by geocoding the city first.',
        parameters: {
          type: 'OBJECT',
          properties: {
            city: { type: 'STRING', description: 'City name (e.g. Pune, Lucknow)' },
            specialization: { type: 'STRING', description: 'Optional medical specialty' }
          },
          required: ['city']
        }
      },
      {
        name: 'searchHospitalsByCity',
        description: 'Search hospitals in any city/town/village in India by geocoding the location first.',
        parameters: {
          type: 'OBJECT',
          properties: {
            city: { type: 'STRING', description: 'City/locality name' }
          },
          required: ['city']
        }
      },
      {
        name: 'searchLabsByCity',
        description: 'Search diagnostic laboratories in any city/locality by geocoding the location first.',
        parameters: {
          type: 'OBJECT',
          properties: {
            city: { type: 'STRING' }
          },
          required: ['city']
        }
      },
      {
        name: 'searchBloodBanksByCity',
        description: 'Search blood bank storage depots in any city/locality by geocoding first.',
        parameters: {
          type: 'OBJECT',
          properties: {
            city: { type: 'STRING' }
          },
          required: ['city']
        }
      },
      {
        name: 'compareMedicalReports',
        description: 'Compare multiple clinical lab reports (like CBC, Lipid, Liver/Kidney tests) chronologically and analyze trends.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'analyzeMedicineInteractions',
        description: 'Verify potential interactions between medicines, diseases, allergies, foods, alcohol, and pregnancy/age.',
        parameters: {
          type: 'OBJECT',
          properties: {
            medicineNames: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Medicines to check' },
          },
        },
      },
      {
        name: 'startSymptomInterview',
        description: 'Initiate a dynamic diagnostic symptom follow-up interview session with user.',
        parameters: {
          type: 'OBJECT',
          properties: {
            symptoms: { type: 'STRING', description: 'Patient symptoms described' },
          },
          required: ['symptoms'],
        },
      },
      {
        name: 'continueSymptomInterview',
        description: 'Submit an answer to the current follow-up question and retrieve the next question or final assessment.',
        parameters: {
          type: 'OBJECT',
          properties: {
            answer: { type: 'STRING', description: 'Patient response/answer to the question' },
          },
          required: ['answer'],
        },
      },
      {
        name: 'retrieveRelevantReports',
        description: 'Answer patient questions by querying uploaded clinical records in their vault (RAG).',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'User Q&A query about report details' },
          },
          required: ['query'],
        },
      },
      {
        name: 'generateHealthTimeline',
        description: 'Compile a chronological clinical health journey timeline and overall status summary.',
        parameters: { type: 'OBJECT', properties: {} },
      }
    ]
  }
];

// Generic healthcare search helper merging MongoDB and Overpass with distance ranking
export const searchHealthcare = async ({ latitude, longitude, category, maxDistance = 15000, specialty = '' }) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const dist = parseInt(maxDistance, 10) || 15000;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { error: 'Invalid coordinates' };
  }

  let dbResults = [];
  let overpassCategory = category;

  if (category === 'hospital' || category === 'clinic') {
    const dbHospitals = await Hospital.find({ isActive: true }).populate('departments').lean();
    dbResults = dbHospitals.map(h => {
      const [hLng, hLat] = h.location?.coordinates || [h.longitude, h.latitude];
      const distance = hLat != null && hLng != null ? haversineDistance(lat, lng, hLat, hLng) : null;
      return {
        name: h.name,
        address: h.address?.street || 'Medicare Network Hospital',
        distance,
        rating: h.rating || 4.0,
        isNetworkHospital: true,
        emergencyAvailable: h.emergencyAvailable ?? true,
        source: 'database',
        specialties: h.specialties || []
      };
    });
  } else if (category === 'lab') {
    const dbLabs = await Lab.find().lean();
    dbResults = dbLabs.map(l => {
      const [lLng, lLat] = l.location?.coordinates || [];
      const distance = lLat != null && lLng != null ? haversineDistance(lat, lng, lLat, lLng) : null;
      return {
        name: l.name,
        address: l.address?.street || 'Nearby laboratory',
        distance,
        phone: l.phone || l.contactNumber || 'N/A',
        source: 'database'
      };
    });
    overpassCategory = 'laboratory';
  } else if (category === 'blood_bank') {
    const dbBanks = await BloodBank.find().lean();
    dbResults = dbBanks.map(b => {
      const [bLng, bLat] = b.location?.coordinates || [];
      const distance = bLat != null && bLng != null ? haversineDistance(lat, lng, bLat, bLng) : null;
      return {
        name: b.name,
        address: b.address?.street || 'Nearby blood depot',
        distance,
        phone: b.phone || b.emergencyContact || 'N/A',
        source: 'database'
      };
    });
  }

  // Filter DB results by distance
  dbResults = dbResults.filter(r => r.distance !== null && r.distance <= dist);

  // Fetch Overpass results
  let overpassResults = [];
  try {
    overpassResults = await fetchNearbyHealthcareFromOverpass(lat, lng, overpassCategory, dist);
  } catch (err) {
    console.error(`[Overpass Error in searchHealthcare]:`, err);
  }

  // Merge and deduplicate by lowercased name
  const merged = [...dbResults];
  const seenNames = new Set(dbResults.map(r => r.name?.toLowerCase()));

  for (const item of overpassResults) {
    const lowerName = item.name?.toLowerCase();
    if (!seenNames.has(lowerName)) {
      seenNames.add(lowerName);
      merged.push({
        name: item.name,
        address: item.address?.street || item.vicinity || 'Nearby facility',
        distance: item.distance,
        rating: item.rating || 0,
        isNetworkHospital: false,
        emergencyAvailable: item.emergencyAvailable ?? false,
        source: 'overpass',
        phone: item.phone || 'N/A'
      });
    }
  }

  // Filter by specialty if provided (for hospitals)
  let filtered = merged;
  if (specialty && (category === 'hospital' || category === 'clinic')) {
    const specLower = specialty.toLowerCase();
    filtered = merged.filter(r => 
      r.specialties?.some(s => s.toLowerCase().includes(specLower)) ||
      r.name?.toLowerCase().includes(specLower)
    );
  }

  // Intelligent Ranking:
  // 1. Network/database hospitals float up.
  // 2. Emergency available facilities float up.
  // 3. Distance is the baseline sort.
  filtered.sort((a, b) => {
    let scoreA = a.distance || Infinity;
    let scoreB = b.distance || Infinity;

    if (a.isNetworkHospital) scoreA -= 2000;
    if (b.isNetworkHospital) scoreB -= 2000;

    if (a.emergencyAvailable) scoreA -= 1000;
    if (b.emergencyAvailable) scoreB -= 1000;

    return scoreA - scoreB;
  });

  return filtered.slice(0, 5).map(item => ({
    name: item.name,
    address: item.address,
    distanceKm: item.distance != null ? (item.distance / 1000).toFixed(1) : 'N/A',
    rating: item.rating || 'N/A',
    isNetwork: !!item.isNetworkHospital,
    emergency: !!item.emergencyAvailable,
    phone: item.phone || 'N/A',
    source: item.source
  }));
};

// Tool call executors
export const executeToolCall = async (toolCall, userId, contextInfo = {}) => {
  const { name, args } = toolCall;

  try {
    switch (name) {
      case 'searchDoctors': {
        const query = { isActive: true };
        if (args.specialization) query.specialization = new RegExp(args.specialization, 'i');
        if (args.rating) query.rating = { $gte: parseFloat(args.rating) };
        if (args.experience) query.experience = { $gte: parseInt(args.experience, 10) };

        let docs = await Doctor.find(query)
          .populate('user', 'firstName lastName email phone avatar')
          .populate('hospitalId', 'name address')
          .limit(5)
          .lean();

        if (args.city) {
          docs = docs.filter(d => 
            d.hospitalId?.address?.city?.toLowerCase() === args.city.toLowerCase() ||
            d.hospitalId?.address?.street?.toLowerCase().includes(args.city.toLowerCase())
          );
        }
        return docs.map(d => ({
          name: `Dr. ${d.user?.firstName || ''} ${d.user?.lastName || ''}`,
          specialization: d.specialization,
          rating: d.rating,
          experience: d.experience,
          consultationFee: d.consultationFee,
          hospitalName: d.hospitalId?.name || 'MediCare Partner Clinic'
        }));
      }

      case 'searchHospitals': {
        const query = { isActive: true };
        if (args.name) query.name = new RegExp(args.name, 'i');
        if (args.city) query['address.city'] = new RegExp(args.city, 'i');
        
        const hospitals = await Hospital.find(query).limit(5).lean();
        return hospitals.map(h => ({
          name: h.name,
          city: h.address?.city,
          address: h.address?.street,
          specialties: h.specialties,
          rating: h.rating,
          totalBeds: h.totalBeds,
          availableBeds: h.availableBeds
        }));
      }

      case 'searchLabs': {
        const query = {};
        if (args.name) query.name = new RegExp(args.name, 'i');
        if (args.city) query['address.city'] = new RegExp(args.city, 'i');
        return await Lab.find(query).limit(5).lean();
      }

      case 'searchBloodBanks': {
        const query = {};
        if (args.city) query['address.city'] = new RegExp(args.city, 'i');
        if (args.bloodGroup) query['bloodGroups.group'] = args.bloodGroup;
        return await BloodBank.find(query).limit(5).lean();
      }

      case 'createMedicineReminder': {
        if (!userId) return { success: false, error: 'User registration required' };
        const patient = await Patient.findOne({ user: userId });
        if (!patient) return { success: false, error: 'Patient profile not found' };

        const reminder = await Reminder.create({
          patient: patient._id,
          medicineName: args.medicineName,
          dosage: args.dosage,
          frequency: args.frequency,
          times: args.times,
          instructions: args.instructions || 'after_food',
          startDate: args.startDate ? new Date(args.startDate) : new Date(),
          endDate: args.endDate ? new Date(args.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        return { success: true, message: `Created reminder for ${args.medicineName}`, reminderId: reminder._id };
      }

      case 'findNearbyHospitals': {
        const lat = parseFloat(args.latitude);
        const lng = parseFloat(args.longitude);
        const dist = parseInt(args.maxDistance, 10) || 15000;

        const dbHospitals = await Hospital.find({ isActive: true }).populate('departments');
        const networkHospitals = enrichHospitalsWithDistance(dbHospitals, lat, lng, dist);

        let results = [...networkHospitals];

        const overpassHospitals = await fetchNearbyHospitalsFromOverpass(lat, lng, dist);
        const networkNames = new Set(networkHospitals.map(h => h.name?.toLowerCase()));
        const uniqueOverpass = overpassHospitals.filter(o => !networkNames.has(o.name?.toLowerCase()));
        results = [...networkHospitals, ...uniqueOverpass];

        results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        return results.slice(0, 5).map(h => ({
          name: h.name,
          address: h.address?.street || h.vicinity,
          distanceKm: h.distanceKm || (h.distance / 1000).toFixed(1),
          rating: h.rating,
          source: h.source
        }));
      }

      case 'findNearbyLabs': {
        const lat = parseFloat(args.latitude);
        const lng = parseFloat(args.longitude);
        const dist = parseInt(args.maxDistance, 10) || 15000;

        const dbLabs = await Lab.find().lean();
        let results = dbLabs.map(l => {
          let distance = null;
          if (l.location?.coordinates?.length === 2) {
            distance = haversineDistance(lat, lng, l.location.coordinates[1], l.location.coordinates[0]);
          }
          return { ...l, distance };
        }).filter(l => l.distance !== null && l.distance <= dist);

        const overpassLabs = await fetchNearbyHealthcareFromOverpass(lat, lng, 'laboratory', dist);
        const dbNames = new Set(results.map(l => l.name?.toLowerCase()));
        const uniqueOverpass = overpassLabs.filter(o => !dbNames.has(o.name?.toLowerCase()));
        results = [...results, ...uniqueOverpass].sort((a, b) => a.distance - b.distance);

        return results.slice(0, 5).map(l => ({
          name: l.name,
          address: l.address?.street || l.vicinity || 'Nearby laboratory',
          distanceKm: (l.distance / 1000).toFixed(1),
          phone: l.phone || l.contactNumber || 'N/A',
          source: l.source || 'database'
        }));
      }

      case 'findNearbyBloodBanks': {
        const lat = parseFloat(args.latitude);
        const lng = parseFloat(args.longitude);
        const dist = parseInt(args.maxDistance, 10) || 15000;

        const dbBanks = await BloodBank.find().lean();
        let results = dbBanks.map(b => {
          let distance = null;
          if (b.location?.coordinates?.length === 2) {
            distance = haversineDistance(lat, lng, b.location.coordinates[1], b.location.coordinates[0]);
          }
          return { ...b, distance };
        }).filter(b => b.distance !== null && b.distance <= dist);

        const overpassBanks = await fetchNearbyHealthcareFromOverpass(lat, lng, 'blood_bank', dist);
        const dbNames = new Set(results.map(b => b.name?.toLowerCase()));
        const uniqueOverpass = overpassBanks.filter(o => !dbNames.has(o.name?.toLowerCase()));
        results = [...results, ...uniqueOverpass].sort((a, b) => a.distance - b.distance);

        return results.slice(0, 5).map(b => ({
          name: b.name,
          address: b.address?.street || b.vicinity || 'Nearby blood depot',
          distanceKm: (b.distance / 1000).toFixed(1),
          phone: b.phone || b.emergencyContact || 'N/A',
          source: b.source || 'database'
        }));
      }

      case 'retrieveMedicalRecords': {
        const patient = await Patient.findOne({ user: userId });
        if (!patient) return { error: 'Patient profile not found.' };
        const records = await MedicalRecord.find({ patient: patient._id }).sort('-recordDate').limit(10).lean();
        return records.map(r => ({
          title: r.title,
          type: r.recordType,
          description: r.description,
          date: r.recordDate,
          doctor: r.doctor,
          hospital: r.hospital,
          fileUrl: r.fileUrl,
          aiSummary: r.aiSummary
        }));
      }

      case 'retrievePrescriptions': {
        const patient = await Patient.findOne({ user: userId });
        if (!patient) return { error: 'Patient profile not found.' };
        const prescriptions = await Prescription.find({ patient: patient._id }).sort('-createdAt').limit(10).lean();
        return prescriptions.map(p => ({
          diagnosis: p.diagnosis,
          notes: p.notes,
          pdfUrl: p.pdfUrl,
          date: p.createdAt,
          medicines: p.medicines
        }));
      }

      case 'retrieveAnalytics': {
        const patient = await Patient.findOne({ user: userId });
        if (!patient) return { error: 'Patient profile not found.' };
        const assessment = await HealthAssessment.findOne({ patient: patient._id }).sort('-createdAt').lean();
        const forecast = await HealthForecast.findOne({ userId }).sort('-createdAt').lean();
        const twin = await HealthTwin.findOne({ userId }).sort('-createdAt').lean();
        return {
          healthScore: assessment ? assessment.healthScore : null,
          riskScore: assessment ? assessment.riskScore : null,
          lifestyleAdvice: assessment ? assessment.lifestyleAdvice : [],
          forecast: forecast ? {
            trend: forecast.forecastTrend,
            milestones: forecast.milestones,
            personalizedSummary: forecast.personalizedSummary
          } : null,
          healthTwin: twin ? {
            score: twin.healthTwinScore,
            biologicalAge: twin.biologicalAgeEstimate,
            stabilityIndex: twin.healthStabilityIndex,
            strongAreas: twin.strongAreas,
            riskAreas: twin.riskAreas,
            improvementOpportunities: twin.improvementOpportunities
          } : null
        };
      }

      case 'retrieveHealthMetrics': {
        const patient = await Patient.findOne({ user: userId });
        if (!patient) return { error: 'Patient profile not found.' };
        const metrics = await HealthMetric.find({ patientId: patient._id }).sort('-createdAt').limit(10).lean();
        return metrics.map(m => ({
          type: m.metricType,
          value: m.value,
          score: m.score,
          riskLevel: m.riskLevel,
          summary: m.metadata?.resultSummary,
          date: m.createdAt
        }));
      }

      case 'retrieveNotifications': {
        const notifications = await Notification.find({ user: userId }).sort('-createdAt').limit(10).lean();
        return notifications.map(n => ({
          title: n.title,
          message: n.message,
          type: n.type,
          read: n.isRead,
          date: n.createdAt
        }));
      }

      case 'retrieveEmergencyContacts': {
        const patient = await Patient.findOne({ user: userId }).lean();
        const emergencyContacts = await EmergencyContact.find({ patient: patient?._id }).lean();
        if (!emergencyContacts.length && patient?.emergencyContact) {
          return [patient.emergencyContact];
        }
        return emergencyContacts.map(c => ({
          name: c.name,
          phone: c.phone,
          relationship: c.relationship
        }));
      }

      case 'geocodeLocation': {
        return await forwardGeocode(args.query);
      }

      case 'reverseGeocode': {
        return await nReverseGeocode(args.latitude, args.longitude);
      }

      case 'autocompleteLocation': {
        return await autocompleteGeocode(args.query);
      }

      case 'searchHealthcareFacilities': {
        return await searchHealthcare({
          latitude: args.latitude,
          longitude: args.longitude,
          category: args.type,
          maxDistance: args.maxDistance,
          specialty: args.specialty
        });
      }

      case 'searchDoctorsByCity': {
        const { city, specialization } = args;
        const geocode = await forwardGeocode(city);
        if (geocode && geocode.length > 0) {
          const { latitude, longitude } = geocode[0];
          const query = { isActive: true };
          if (specialization) query.specialization = new RegExp(specialization, 'i');
          const dbDoctors = await Doctor.find(query)
            .populate('user', 'firstName lastName avatar')
            .populate('hospitalId', 'name address location')
            .populate('hospital', 'name address location')
            .lean();
          
          const results = dbDoctors.map(d => {
            const hosp = d.hospitalId || d.hospital;
            const coords = hosp?.location?.coordinates || [];
            let distance = null;
            if (coords.length >= 2) {
              distance = haversineDistance(latitude, longitude, coords[1], coords[0]);
            }
            return { ...d, hosp, distance };
          }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

          return results.slice(0, 5).map(d => ({
            name: `Dr. ${d.user?.firstName || ''} ${d.user?.lastName || ''}`,
            specialization: d.specialization,
            rating: d.rating,
            experience: d.experience,
            consultationFee: d.consultationFee,
            hospitalName: d.hosp?.name || 'MediCare Partner Clinic',
            distanceKm: d.distance != null ? (d.distance / 1000).toFixed(1) : 'N/A'
          }));
        } else {
          const query = { isActive: true };
          if (specialization) query.specialization = new RegExp(specialization, 'i');
          let docs = await Doctor.find(query)
            .populate('user', 'firstName lastName email phone avatar')
            .populate('hospitalId', 'name address')
            .limit(5)
            .lean();
          docs = docs.filter(d => 
            d.hospitalId?.address?.city?.toLowerCase() === city.toLowerCase()
          );
          return docs.map(d => ({
            name: `Dr. ${d.user?.firstName || ''} ${d.user?.lastName || ''}`,
            specialization: d.specialization,
            rating: d.rating,
            experience: d.experience,
            consultationFee: d.consultationFee,
            hospitalName: d.hospitalId?.name || 'MediCare Partner Clinic'
          }));
        }
      }

      case 'searchHospitalsByCity': {
        const { city } = args;
        const geocode = await forwardGeocode(city);
        if (geocode && geocode.length > 0) {
          const { latitude, longitude } = geocode[0];
          return await searchHealthcare({ latitude, longitude, category: 'hospital' });
        }
        const hospitals = await Hospital.find({ isActive: true, 'address.city': new RegExp(city, 'i') }).limit(5).lean();
        return hospitals.map(h => ({
          name: h.name,
          address: h.address?.street || 'MediCare Network Hospital',
          rating: h.rating || 'N/A',
          isNetwork: true,
          source: 'database'
        }));
      }

      case 'searchLabsByCity': {
        const { city } = args;
        const geocode = await forwardGeocode(city);
        if (geocode && geocode.length > 0) {
          const { latitude, longitude } = geocode[0];
          return await searchHealthcare({ latitude, longitude, category: 'lab' });
        }
        const labs = await Lab.find({ 'address.city': new RegExp(city, 'i') }).limit(5).lean();
        return labs.map(l => ({
          name: l.name,
          address: l.address?.street || 'Nearby laboratory',
          source: 'database'
        }));
      }

      case 'searchBloodBanksByCity': {
        const { city } = args;
        const geocode = await forwardGeocode(city);
        if (geocode && geocode.length > 0) {
          const { latitude, longitude } = geocode[0];
          return await searchHealthcare({ latitude, longitude, category: 'blood_bank' });
        }
        const banks = await BloodBank.find({ 'address.city': new RegExp(city, 'i') }).limit(5).lean();
        return banks.map(b => ({
          name: b.name,
          address: b.address?.street || 'Nearby blood depot',
          source: 'database'
        }));
      }

      case 'compareMedicalReports': {
        return await compareMedicalReports(userId);
      }

      case 'analyzeMedicineInteractions': {
        return await checkInteractions(userId, args.medicineNames || []);
      }

      case 'startSymptomInterview': {
        return await startSymptomInterview(contextInfo?.conversationId, args.symptoms);
      }

      case 'continueSymptomInterview': {
        return await continueSymptomInterview(contextInfo?.conversationId, args.answer, {
          latitude: contextInfo?.latitude,
          longitude: contextInfo?.longitude
        });
      }

      case 'retrieveRelevantReports': {
        return await answerQnAOverReports(userId, args.query);
      }

      case 'generateHealthTimeline': {
        return await generateHealthTimeline(userId);
      }

      default:
        return { error: `Tool ${name} not found.` };
    }
  } catch (err) {
    console.error(`Error executing tool ${name}:`, err);
    return { error: err.message };
  }
};

export const chatWithAI = async (messages, userId, options = {}) => {
  const client = getGemini();
  const { latitude, longitude } = options;
  
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';

  if (!client) {
    // Gemini API key missing — use Gemini-based triage fallback (which has its own offline fallback)
    console.warn('[AI Chat] Gemini client unavailable. Using triage fallback.');
    try {
      const triage = await triageSymptoms(lastUserMessage, { age: 35 });
      return {
        content: `### Symptom Triage Assessment\n- **Recommended Specialist**: ${triage.recommendedSpecialist}\n- **Assigned Department**: ${triage.department}\n- **Urgency Level**: ${triage.urgencyLevel}\n- **Potential Conditions**: ${triage.conditions.join(', ')}\n\n${triage.emergencyWarning || 'Please consult with a professional physician regarding these findings.'}\n\n> ⚠️ *AI service is running in limited mode. Set the GEMINI_API_KEY environment variable for full capabilities.*`,
        provider: 'local_fallback',
      };
    } catch (fallbackErr) {
      console.error('[AI Chat Fallback Error]:', fallbackErr);
      return {
        content: 'The AI assistant is currently unavailable. Please ensure the GEMINI_API_KEY is configured and try again.',
        provider: 'local_fallback'
      };
    }
  }

  // Load comprehensive clinical context
  const patientContext = await getUserComprehensiveContext(userId);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    // Convert history: keep last 15 messages, merge consecutive same-role messages
    const trimmedMessages = messages.slice(-15);
    const rawHistory = [];
    let foundLast = false;
    for (let i = trimmedMessages.length - 1; i >= 0; i--) {
      const msg = trimmedMessages[i];
      if (msg.role === 'user' && msg.content === lastUserMessage && !foundLast) {
        foundLast = true;
        continue;
      }
      rawHistory.unshift({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const sanitizedHistory = [];
    for (const item of rawHistory) {
      if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === item.role) {
        sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += '\n' + item.parts[0].text;
      } else {
        sanitizedHistory.push(item);
      }
    }

    // Initialize chat session with Gemini
    let locationContext = '';
    if (latitude != null && longitude != null) {
      locationContext = `\n\n[USER CURRENT LOCATION]\n- Latitude: ${latitude}\n- Longitude: ${longitude}\n(Use these exact coordinates to search nearby facilities whenever the user says 'near me', 'around me', or 'nearby'.)`;
    }

    const chat = client.chats.create({
      model: modelName,
      history: sanitizedHistory,
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\n\n[PATIENT CLINICAL CONTEXT]\n${patientContext}${locationContext}`,
        tools: getAITools(),
        temperature: 0.5,
      }
    });

    // Send message with retry wrapper
    let response = await callGeminiWithRetry(() => chat.sendMessage({ message: lastUserMessage }));

    // Handle tool execution loop (up to 5 rounds)
    let loopCount = 0;
    while (response.functionCalls?.length > 0 && loopCount < 5) {
      loopCount++;
      const functionResponseParts = [];
      
      for (const call of response.functionCalls) {
        console.log(`[Tool Call] Executing: ${call.name}`, JSON.stringify(call.args || {}).slice(0, 200));
        const result = await executeToolCall(call, userId, { conversationId, latitude, longitude });
        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { result }
          }
        });
      }

      response = await callGeminiWithRetry(() => chat.sendMessage({ message: functionResponseParts }));
    }

    return {
      content: response.text || 'I could not generate a response. Please try rephrasing your question.',
      provider: 'gemini',
    };
  } catch (err) {
    console.error('[Gemini Chat Error]:', err.message || err);
    throw err;
  }
};

export const suggestDoctorsBySymptoms = async (symptoms) => {
  const triage = await triageSymptoms(symptoms, {});
  const specialization = triage.department;

  const doctors = await Doctor.find({ isVerified: true, specialization: new RegExp(specialization, 'i') })
    .populate('user', 'firstName lastName avatar')
    .populate('departmentId', 'name')
    .populate('hospitalId', 'name')
    .sort('-rating')
    .limit(5);

  return { specialization, doctors };
};
