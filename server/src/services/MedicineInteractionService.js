import { GoogleGenAI } from '@google/genai';
import { Patient } from '../models/Patient.js';
import { Reminder } from '../models/Reminder.js';
import { Prescription } from '../models/Prescription.js';
import { getUserComprehensiveContext, callGeminiWithRetry } from './aiService.js';
import { logAIRequest } from '../utils/aiLogger.js';

let geminiClient;
const getGeminiClient = () => {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
};

const parseGeminiJSON = (text) => {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err2) {
      console.error('[JSON Parse Error] Gemini response:', text);
      return {};
    }
  }
};

/**
 * Check potential drug-drug and drug-patient interactions using Gemini.
 */
export const checkInteractions = async (userId, targetMedicines = []) => {
  const patient = await Patient.findOne({ user: userId }).lean();
  if (!patient) return { error: 'Patient profile not found.' };

  const client = getGeminiClient();
  if (!client) {
    return { error: 'AI service key missing. Interaction checks cannot be performed.' };
  }

  // 1. Resolve active reminders & prescriptions if targetMedicines is empty or to merge them
  const [reminders, prescriptions] = await Promise.all([
    Reminder.find({ patient: patient._id, isActive: true }).lean(),
    Prescription.find({ patient: patient._id }).sort('-createdAt').limit(2).lean()
  ]);

  const currentMeds = new Set();
  reminders.forEach(r => currentMeds.add(r.medicineName));
  prescriptions.forEach(p => {
    if (p.medicines) {
      p.medicines.forEach(m => currentMeds.add(m.name));
    }
  });

  const queryMeds = [...targetMedicines];
  if (queryMeds.length === 0) {
    queryMeds.push(...currentMeds);
  } else {
    // Add existing patient meds to check interactions with target medicines
    currentMeds.forEach(m => {
      if (!queryMeds.includes(m)) queryMeds.push(m);
    });
  }

  if (queryMeds.length === 0) {
    return {
      message: 'No medicines found in records or prompt to check interactions.',
      checkedMedicines: []
    };
  }

  // 2. Fetch patient clinical context (chronic diseases, allergies, age, liver/kidney profile)
  const patientContext = await getUserComprehensiveContext(userId);

  try {
    const prompt = `You are a clinical pharmacist AI. Analyze potential medical interactions for these medicines:
Medicines: ${JSON.stringify(queryMeds)}

Patient Context:
${patientContext}

Evaluate:
1. Drug-Drug interactions between any of the medicines.
2. Drug-Disease interactions with any of the patient's chronic conditions.
3. Drug-Allergy interactions based on patient allergies.
4. Drug-Food / Drug-Alcohol interactions.
5. Drug-Pregnancy / Drug-Age risks.
6. Drug-Organ interactions (specifically kidney or liver disease).

For each interaction detected, provide:
- Severity level: "Low", "Moderate", "High", or "Life-threatening".
- Detail explanation: why it occurs and potential symptoms.
- Safer alternative medicines or precautions.

Return ONLY a JSON response in the following format:
{
  "highestSeverity": "Low | Moderate | High | Life-threatening",
  "summary": "Brief summary of safety assessment.",
  "interactions": [
    {
      "trigger": "string (e.g. Paracetamol + Ibuprofen or Alcohol + Metformin)",
      "type": "Drug-Drug | Drug-Disease | Drug-Allergy | Drug-Food | Drug-Alcohol | Drug-Pregnancy | Drug-Kidney | Drug-Liver",
      "severity": "Low | Moderate | High | Life-threatening",
      "explanation": "Why this interaction occurs.",
      "symptoms": ["string (potential symptoms to watch for)"],
      "alternatives": ["string (safer alternatives or precautions)"]
    }
  ]
}`;

    const startTime = Date.now();
    const response = await callGeminiWithRetry(() => client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    }));

    const parsed = parseGeminiJSON(response.text);
    const duration = Date.now() - startTime;
    await logAIRequest({
      userId,
      endpoint: '/medicine-interactions',
      geminiRequest: { model: 'gemini-2.5-flash', medicines: queryMeds },
      geminiResponseTime: duration,
      status: 'success'
    });

    return {
      success: true,
      checkedMedicines: queryMeds,
      highestSeverity: parsed.highestSeverity || 'Low',
      summary: parsed.summary || 'No significant interactions detected.',
      interactions: parsed.interactions || []
    };
  } catch (err) {
    await logAIRequest({
      userId,
      endpoint: '/medicine-interactions',
      geminiRequest: { model: 'gemini-2.5-flash', medicines: queryMeds },
      geminiResponseTime: 0,
      status: 'failed',
      error: err
    });
    console.error('Error checking medicine interactions:', err);
    return { error: 'Failed to run medicine interaction check due to AI API error.' };
  }
};
