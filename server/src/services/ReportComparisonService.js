import { GoogleGenAI } from '@google/genai';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { Patient } from '../models/Patient.js';

let geminiClient;
const getGeminiClient = () => {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
};

/**
 * Clean markdown JSON wrappers if returned by the model.
 */
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
 * Detect report subtype (e.g. CBC, Lipid Profile, Thyroid, Kidney, Liver) from text using Gemini.
 */
export const detectReportSubtype = async (extractedText) => {
  const client = getGeminiClient();
  if (!client || !extractedText) return 'general';

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following medical report text and classify it into one of these specific subtypes: "CBC", "lipid", "thyroid", "kidney", "liver", "blood_sugar", "urine", or "general". Return only the single matching word in lowercase (e.g. "cbc" or "lipid").
Text:
"${extractedText.slice(0, 2000)}"`,
    });
    return response.text?.trim().toLowerCase() || 'general';
  } catch (err) {
    console.error('Error detecting report subtype:', err);
    return 'general';
  }
};

/**
 * Extract structured test name value pairs from medical report OCR text.
 */
export const extractTestValues = async (extractedText, subtype) => {
  const client = getGeminiClient();
  if (!client || !extractedText) return {};

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract all key medical/clinical test parameters, their numeric values, and standard reference units from this medical report.
Report type/subtype: ${subtype}
Text:
"${extractedText}"

Return ONLY a JSON object mapping the lowercase standard name of the test parameter to an object containing the numeric "value" (number) and "unit" (string), for example:
{
  "hemoglobin": { "value": 13.5, "unit": "g/dL" },
  "cholesterol": { "value": 240, "unit": "mg/dL" }
}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    });

    return parseGeminiJSON(response.text);
  } catch (err) {
    console.error('Error extracting test values:', err);
    return {};
  }
};

/**
 * Compare multiple medical records for the same patient and generate dynamic trend analysis.
 */
export const compareMedicalReports = async (userId, reportIds = []) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) return { error: 'Patient profile not found.' };

  const client = getGeminiClient();
  if (!client) {
    return { error: 'AI service key missing. Comparison cannot be performed.' };
  }

  // Step 1: Fetch matching records
  let query = { patient: patient._id };
  if (reportIds.length > 0) {
    query._id = { $in: reportIds };
  } else {
    query.recordType = 'lab_report';
  }

  const records = await MedicalRecord.find(query).sort('recordDate').lean();
  if (records.length < 2) {
    return {
      message: 'Need at least 2 reports to perform comparative analysis.',
      count: records.length
    };
  }

  // Step 2: Auto-detect subtypes and extract test values if missing
  const enrichedRecords = [];
  for (const record of records) {
    let updated = false;
    let reportSubtype = record.reportSubtype;
    let testValues = record.testValues;

    if (!reportSubtype && record.extractedText) {
      reportSubtype = await detectReportSubtype(record.extractedText);
      updated = true;
    }
    if ((!testValues || Object.keys(testValues).length === 0) && record.extractedText) {
      testValues = await extractTestValues(record.extractedText, reportSubtype || 'general');
      updated = true;
    }

    if (updated) {
      await MedicalRecord.updateOne(
        { _id: record._id },
        { $set: { reportSubtype, testValues } }
      );
    }

    enrichedRecords.push({
      ...record,
      reportSubtype: reportSubtype || 'general',
      testValues: testValues || {}
    });
  }

  // Step 3: Group by subtype
  const groups = {};
  enrichedRecords.forEach(r => {
    const sub = r.reportSubtype;
    if (!groups[sub]) groups[sub] = [];
    groups[sub].push(r);
  });

  const comparisonResults = [];

  // Step 4: Compare each subtype group chronologically
  for (const [subtype, groupRecords] of Object.entries(groups)) {
    if (groupRecords.length < 2) continue;

    // Build timeline context for Gemini
    const chronologicalData = groupRecords.map(r => ({
      recordId: r._id,
      title: r.title,
      date: r.recordDate ? r.recordDate.toISOString().split('T')[0] : 'Unknown Date',
      testValues: r.testValues
    }));

    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI Clinical Analyst. Analyze the following chronological timeline of medical reports for subtype "${subtype}" and compare values over time.
Timeline Data:
${JSON.stringify(chronologicalData, null, 2)}

Detect:
1. Significant trends (improving, deteriorating, or stable) for each primary test parameter.
2. Comparison history metrics mapping test name to timeline values.
3. Plain-english overall comparison summary.
4. Actionable clinical comparison insights/recommendations.

Return ONLY a JSON response in the following format:
{
  "comparisonSummary": "Overall summary of report changes in plain english.",
  "comparisonInsights": "Actionable recommendations or concerns based on trends.",
  "comparisonHistory": [
    {
      "parameter": "string (e.g. Hemoglobin)",
      "trend": "improving | deteriorating | stable",
      "values": [
        { "date": "YYYY-MM-DD", "value": number, "unit": "string" }
      ]
    }
  ]
}`,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const parsedInsights = parseGeminiJSON(response.text);

      // Save comparison insights to the latest record in the group
      const latestRecord = groupRecords[groupRecords.length - 1];
      await MedicalRecord.updateOne(
        { _id: latestRecord._id },
        {
          $set: {
            comparisonHistory: parsedInsights.comparisonHistory || [],
            comparisonSummary: parsedInsights.comparisonSummary || '',
            comparisonInsights: parsedInsights.comparisonInsights || ''
          }
        }
      );

      comparisonResults.push({
        subtype,
        latestRecordId: latestRecord._id,
        latestRecordTitle: latestRecord.title,
        comparisonSummary: parsedInsights.comparisonSummary,
        comparisonInsights: parsedInsights.comparisonInsights,
        comparisonHistory: parsedInsights.comparisonHistory
      });
    } catch (err) {
      console.error(`Error comparing reports for subtype ${subtype}:`, err);
    }
  }

  return {
    success: true,
    results: comparisonResults
  };
};
