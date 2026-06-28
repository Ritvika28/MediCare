import { GoogleGenAI } from '@google/genai';

let geminiClient;
const getGeminiClient = () => {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
};

/**
 * Perform symptom triage and assessment using Google Gemini.
 * Gemini is the sole clinical reasoning engine for symptom analysis.
 * A rule-based offline fallback is retained for safety when the API key is missing.
 */
export const triageSymptoms = async (symptomsText, options = {}) => {
  const age = options.age ? parseInt(options.age, 10) : 35;
  const sex = options.sex || 'female'; // 'male' or 'female'

  const gemini = getGeminiClient();
  if (!gemini) {
    console.warn('[Triage Fallback] Gemini key missing. Using rule-based local keyword parser.');
    return callLocalRuleFallback(symptomsText, age, sex);
  }

  try {
    const prompt = `Analyze the following symptoms description for a ${age}-year-old ${sex} patient:
"${symptomsText}"

Perform symptom analysis and triage. You must choose from these departments and specialists:
- Cardiology (Cardiologist)
- Neurology (Neurologist)
- Dermatology (Dermatologist)
- Pediatrics (Pediatrician)
- Orthopedics (Orthopedic Surgeon)
- Gastroenterology (Gastroenterologist)
- Ophthalmology (Ophthalmologist)
- Psychiatry (Psychiatrist)
- General Medicine (General Physician)

Determine the urgency level: "Emergency", "High", "Moderate", or "Low".

Return ONLY a JSON response in the following schema:
{
  "recommendedSpecialist": "string",
  "department": "string",
  "urgencyLevel": "string",
  "emergencyWarning": "string (warning text if emergency, empty otherwise)",
  "conditions": ["string (potential conditions)"],
  "confidence": number (between 0.0 and 1.0)
}`;

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const data = JSON.parse(response.text || '{}');
    return {
      recommendedSpecialist: data.recommendedSpecialist || 'General Physician',
      department: data.department || 'General Medicine',
      urgencyLevel: data.urgencyLevel || 'Moderate',
      emergencyWarning: data.emergencyWarning || '',
      conditions: data.conditions || ['Undetermined condition'],
      confidence: data.confidence || 0.8,
    };
  } catch (err) {
    console.error('[Gemini Triage Error]:', err);
    return callLocalRuleFallback(symptomsText, age, sex);
  }
};

const callLocalRuleFallback = (symptomsText, age, sex) => {
  const lower = symptomsText.toLowerCase();
  const isEmergency = /chest pain|heart attack|stroke|severe bleeding|breathing difficulty|shortness of breath|unconscious/i.test(lower);
  let dept = 'General Medicine';
  let spec = 'General Physician';
  let urgency = isEmergency ? 'Emergency' : 'Low';

  if (/heart|chest|cardiac|bp/i.test(lower)) { 
    dept = 'Cardiology'; 
    spec = 'Cardiologist'; 
    urgency = isEmergency ? 'Emergency' : 'High'; 
  } else if (/skin|rash|itch|allergy/i.test(lower)) { 
    dept = 'Dermatology'; 
    spec = 'Dermatologist'; 
    urgency = 'Moderate'; 
  } else if (/bone|joint|fracture|back pain|knee/i.test(lower)) { 
    dept = 'Orthopedics'; 
    spec = 'Orthopedic Surgeon'; 
    urgency = 'Moderate'; 
  } else if (/brain|headache|migraine|seizure|stroke/i.test(lower)) { 
    dept = 'Neurology'; 
    spec = 'Neurologist'; 
    urgency = 'High'; 
  } else if (/stomach|vomit|diarrhea|acid/i.test(lower)) { 
    dept = 'Gastroenterology'; 
    spec = 'Gastroenterologist'; 
    urgency = 'Moderate'; 
  } else if (/child|baby|pediatric/i.test(lower)) { 
    dept = 'Pediatrics'; 
    spec = 'Pediatrician'; 
    urgency = 'Moderate'; 
  } else if (/eye|vision|blind/i.test(lower)) { 
    dept = 'Ophthalmology'; 
    spec = 'Ophthalmologist'; 
    urgency = 'Moderate'; 
  } else if (/anxiety|depression|mental|stress/i.test(lower)) { 
    dept = 'Psychiatry'; 
    spec = 'Psychiatrist'; 
    urgency = 'Moderate'; 
  }

  return {
    recommendedSpecialist: spec,
    department: dept,
    urgencyLevel: urgency,
    emergencyWarning: isEmergency ? '🚨 EMERGENCY WARNING: Your symptoms resemble a life-threatening event. Seek critical emergency care immediately!' : '',
    conditions: [dept + ' condition'],
    confidence: 0.5,
  };
};
