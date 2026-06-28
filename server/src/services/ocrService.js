import { GoogleGenAI } from '@google/genai';

let geminiClient;
const getGeminiClient = () => {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
};

/**
 * Perform OCR using Google Gemini Vision (with retry) or Google Cloud Vision fallback.
 * Handles images and PDF contents directly using Gemini's native multimodal capabilities.
 * @param {Buffer} fileBuffer File buffer
 * @param {string} mimeType Mime type of the file
 * @returns {Promise<string>} The extracted raw text
 */
export const performOCR = async (fileBuffer, mimeType) => {
  const base64Content = fileBuffer.toString('base64');
  const gemini = getGeminiClient();

  // Attempt Gemini Vision OCR with retry
  if (gemini) {
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini OCR] Transcribing text from mimeType: ${mimeType} (attempt ${attempt + 1})`);
        const response = await gemini.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Extract and transcribe all text from this medical document verbatim. Only output the transcribed text, nothing else.' },
                {
                  inlineData: {
                    mimeType,
                    data: base64Content,
                  },
                },
              ],
            },
          ],
          config: {
            temperature: 0.1,
          },
        });

        const text = response.text;
        if (text) {
          console.log('[Gemini OCR] Extracted text successfully');
          return text;
        }
      } catch (err) {
        const status = err.status || err.httpStatusCode || err.code;
        const isRetryable = status === 429 || status === 503 || err.message?.includes('fetch failed');

        if (!isRetryable || attempt === maxRetries) {
          console.error(`[Gemini OCR Error] Vision extraction failed after ${attempt + 1} attempts:`, err.message || err);
          break;
        }

        const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[Gemini OCR Retry] Attempt ${attempt + 1} failed (${status}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // Fallback to Google Cloud Vision REST API if Gemini key is missing or failed (for images only)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey && mimeType.startsWith('image/')) {
    try {
      const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
      const payload = {
        requests: [
          {
            image: { content: base64Content },
            features: [{ type: 'TEXT_DETECTION' }],
          },
        ],
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const annotation = data.responses?.[0]?.textAnnotations?.[0];
        if (annotation?.description) {
          console.log('[Google Vision OCR Fallback] Extracted text successfully');
          return annotation.description;
        }
      }
    } catch (err) {
      console.error('[Google Vision OCR Fallback] Error:', err);
    }
  }

  // No fake fallback text — return a clear error message
  console.error('[OCR] All extraction methods failed for mimeType:', mimeType);
  throw new Error(`Unable to extract text from uploaded ${mimeType === 'application/pdf' ? 'PDF' : 'document'}. Please ensure the GEMINI_API_KEY is configured and the file is readable.`);
};

/**
 * Use Google Gemini to perform structured clinical analysis on report or prescription text.
 */
export const analyzeReportText = async (extractedText, recordType) => {
  const gemini = getGeminiClient();
  if (!gemini) {
    console.warn('[Report Analysis Fallback] Gemini key missing. Using static report summary mock.');
    return {
      summary: 'Report uploaded. Gemini API key is missing to perform advanced clinical analysis.',
      clinicalSummary: 'Document verified and stored in patient vault.',
      abnormalValues: [],
      normalValues: [],
      medicines: [],
      diseases: [],
      riskExplanation: 'Not available without API key.',
      lifestyleAdvice: ['Maintain a balanced healthy diet.'],
      dietSuggestions: ['Eat fresh fruits and vegetables.'],
      exerciseSuggestions: ['30 minutes of walking daily.'],
      suggestedSpecialist: 'General Physician',
      urgencyLevel: 'Low',
      followUpTests: [],
      questionsForDoctor: ['Ask about overall status.'],
      healthScoreImpact: 0,
      metrics: [],
    };
  }

  const isPrescription = recordType === 'prescription';
  
  if (!extractedText || extractedText.trim().length < 5) {
    console.warn('[Report Analysis] Extracted text is empty or too short. Generating best-effort analysis based on type.');
    extractedText = `No text could be extracted from this document. It is labeled as a ${recordType}.`;
  }

  const prompt = isPrescription 
    ? `Analyze the following prescription text and extract medicine information.
Text:
"${extractedText}"

Extract:
1. Medicines: Array of objects containing: name, purpose, dosage (e.g. 1 pill, 5ml), frequency (e.g. once_daily, twice_daily, thrice_daily), times (e.g. ["09:00"], ["08:00", "20:00"]), duration, purpose, sideEffects, precautions, missedDoseGuidance.
2. Doctor Name
3. Hospital/Clinic Name
4. Follow-up Date (if any, in YYYY-MM-DD format)

Return ONLY a JSON response in the following format:
{
  "doctor": "string (Doctor Name)",
  "hospital": "string (Hospital/Clinic Name)",
  "followUpDate": "string (YYYY-MM-DD or null)",
  "medicines": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "once_daily | twice_daily | thrice_daily | custom",
      "times": ["HH:MM"],
      "duration": "string",
      "purpose": "string",
      "sideEffects": "string",
      "precautions": "string",
      "missedDoseGuidance": "string"
    }
  ]
}`
    : `Analyze the following medical report text (e.g. CBC, Lipid Profile, Liver Panel, Kidney function tests, ECG, MRI, X-Ray, urinalysis).
Text:
"${extractedText}"

Extract:
1. A patient-friendly explanation in plain language (summary).
2. A clinical/professional medical summary (clinicalSummary).
3. List of abnormal/out-of-range value strings (abnormalValues).
4. List of normal/in-range value strings (normalValues).
5. Explanations of any medicines mentioned.
6. Explanations of any diseases/conditions diagnosed.
7. Risk explanation (e.g. cardiovascular risk, diabetic complications).
8. Patient lifestyle advice.
9. Diet suggestions.
10. Exercise suggestions.
11. Suggested medical specialist to consult (e.g. Cardiologist, Nephrologist).
12. Urgency level ("Low" | "Moderate" | "High" | "Emergency").
13. Recommended follow-up tests or screens.
14. Specific questions the patient should ask their doctor.
15. Estimated wellness/health score impact (number between -20 and +10).
16. Quantifiable health metrics found in the report. Each metric object MUST contain:
  - type: Must be one of: "bmi" | "blood_pressure" | "blood_sugar" | "cholesterol" | "kidney_health" | "liver_health"
  - value: The primary numeric value (e.g. for blood_sugar, the glucose value; for cholesterol, total cholesterol).
  - outputs: An object representing the output structure matching the metric:
    - for bmi: { "bmi": number, "classification": "underweight | normal | overweight | obese" }
    - for blood_pressure: { "systolic": number, "diastolic": number, "status": "normal | elevated | stage1 | stage2" }
    - for blood_sugar: { "value": number, "status": "normal | prediabetes | diabetes" }
    - for cholesterol: { "total": number, "status": "normal | borderline | high" }
    - for kidney_health: { "egfr": number, "status": "normal | mild_reduction | moderate_reduction | severe_reduction | kidney_failure" }
    - for liver_health: { "fib4Score": number, "status": "low_risk | intermediate_risk | high_risk" }
  - resultSummary: A short description (e.g. "Cholesterol: 240 mg/dL (High)")

Return ONLY a JSON response in the following format:
{
  "summary": "string",
  "clinicalSummary": "string",
  "abnormalValues": ["string"],
  "normalValues": ["string"],
  "medicines": [
    {
      "name": "string",
      "purpose": "string",
      "dosage": "string",
      "sideEffects": "string",
      "warnings": "string"
    }
  ],
  "diseases": ["string"],
  "riskExplanation": "string",
  "lifestyleAdvice": ["string"],
  "dietSuggestions": ["string"],
  "exerciseSuggestions": ["string"],
  "suggestedSpecialist": "string",
  "urgencyLevel": "Low | Moderate | High | Emergency",
  "followUpTests": ["string"],
  "questionsForDoctor": ["string"],
  "healthScoreImpact": number,
  "metrics": [
    {
      "type": "bmi | blood_pressure | blood_sugar | cholesterol | kidney_health | liver_health",
      "value": number,
      "outputs": {},
      "resultSummary": "string"
    }
  ]
}`;

  try {
    const modelName = 'gemini-2.5-flash';

    const response = await gemini.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      // Clean markdown code blocks if present
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }
    console.log('[Gemini Report Analysis] Successfully analyzed text and generated structured data');
    return parsed;
  } catch (err) {
    console.error('[Gemini Report Analysis Error]:', err);
    return {
      summary: 'Failed to generate summary due to API error.',
      clinicalSummary: 'An error occurred while communicating with Gemini.',
      abnormalValues: [],
      normalValues: [],
      medicines: [],
      diseases: [],
      riskExplanation: 'Error processing report.',
      lifestyleAdvice: [],
      dietSuggestions: [],
      exerciseSuggestions: [],
      suggestedSpecialist: 'General Physician',
      urgencyLevel: 'Low',
      followUpTests: [],
      questionsForDoctor: [],
      healthScoreImpact: 0,
      metrics: [],
    };
  }
};
