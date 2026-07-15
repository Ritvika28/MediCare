import { GoogleGenAI } from '@google/genai';
import { Patient } from '../models/Patient.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { Prescription } from '../models/Prescription.js';
import { Reminder } from '../models/Reminder.js';
import { HealthMetric } from '../models/HealthMetric.js';
import { HealthTwin } from '../models/HealthTwin.js';
import { HealthPrediction } from '../models/HealthPrediction.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { callGeminiWithRetry } from './aiService.js';
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
 * Generate a comprehensive, chronological health journey timeline.
 */
export const generateHealthTimeline = async (userId) => {
  const patient = await Patient.findOne({ user: userId }).lean();
  if (!patient) return { error: 'Patient profile not found.' };

  const client = getGeminiClient();
  if (!client) {
    return { error: 'AI service key missing. Timeline cannot be generated.' };
  }

  // Fetch chronological clinical records
  const [records, prescriptions, reminders, metrics, twin, predictions, assessment] = await Promise.all([
    MedicalRecord.find({ patient: patient._id }).sort('recordDate').lean(),
    Prescription.find({ patient: patient._id }).sort('createdAt').lean(),
    Reminder.find({ patient: patient._id }).sort('createdAt').lean(),
    HealthMetric.find({ patientId: patient._id }).sort('createdAt').lean(),
    HealthTwin.findOne({ userId }).sort('-createdAt').lean(),
    HealthPrediction.find({ userId }).lean(),
    HealthAssessment.findOne({ patient: patient._id }).sort('-createdAt').lean()
  ]);

  const events = [];

  // 1. Add Medical History Diagnosis events
  if (patient.medicalHistory) {
    patient.medicalHistory.forEach(h => {
      events.push({
        date: h.diagnosedDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // default to 1yr ago
        type: 'diagnosis',
        title: `Condition Diagnosed: ${h.condition}`,
        details: `Status: ${h.status || 'Active'}. Notes: ${h.notes || 'None'}`
      });
    });
  }

  // 2. Add Medical Records (Reports)
  records.forEach(r => {
    events.push({
      date: r.recordDate || r.createdAt,
      type: 'report',
      title: `Uploaded: ${r.title}`,
      details: `Type: ${r.recordType.replace('_', ' ')}. AI Summary: ${r.aiSummary || r.description || 'Verified vault document.'}`
    });
  });

  // 3. Add Prescriptions
  prescriptions.forEach(p => {
    events.push({
      date: p.createdAt,
      type: 'prescription',
      title: `Prescribed: Diagnosis - ${p.diagnosis}`,
      details: `By Doctor/Clinic. Medicines: ${p.medicines?.map(m => m.name).join(', ') || 'N/A'}`
    });
  });

  // 4. Add Medicine Reminders
  reminders.forEach(r => {
    events.push({
      date: r.createdAt,
      type: 'medication',
      title: `Medication Activated: ${r.medicineName}`,
      details: `Dosage: ${r.dosage} | Frequency: ${r.frequency}`
    });
  });

  // 5. Add Health Metrics entries
  metrics.forEach(m => {
    events.push({
      date: m.createdAt,
      type: 'metric',
      title: `Vitals Update: ${m.metricType.toUpperCase()}`,
      details: `${m.metadata?.resultSummary || `Value: ${m.value}`}`
    });
  });

  // Sort events chronologically (ascending)
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Format date strings
  const formattedEvents = events.map(e => ({
    ...e,
    dateString: new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }));

  // Step 5: Ask Gemini to summarize this health journey
  try {
    const prompt = `You are a medical health journey supervisor. Review the patient's chronological timeline of events and write a clinical health twin journey summary.
Timeline Events:
${JSON.stringify(formattedEvents.slice(-20), null, 2)}

Patient Demographic context:
- Name: ${patient.user?.firstName || ''} ${patient.user?.lastName || ''}
- Age/Gender: ${patient.gender || 'Not specified'}
- Current Twin Health Score: ${twin ? twin.healthTwinScore : (assessment ? assessment.healthScore : 'N/A')}/100
- Strong Areas: ${twin ? twin.strongAreas?.join(', ') : 'N/A'}
- Risk Areas: ${twin ? twin.riskAreas?.join(', ') : 'N/A'}

Write:
1. Overall journey progress summary (progressSummary).
2. Key clinical trends (trends).
3. Positive health achievements (achievements).
4. Critical concerns (concerns).
5. Recommended next steps or action items (recommendedActions).

Return ONLY a JSON response in the following format:
{
  "progressSummary": "string",
  "trends": "string",
  "achievements": ["string"],
  "concerns": ["string"],
  "recommendedActions": ["string"]
}`;

    const startTime = Date.now();
    const response = await callGeminiWithRetry(() => client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    }));

    const summary = parseGeminiJSON(response.text);

    const duration = Date.now() - startTime;
    await logAIRequest({
      userId,
      endpoint: '/health-timeline',
      geminiRequest: { model: 'gemini-2.5-flash' },
      geminiResponseTime: duration,
      status: 'success'
    });

    return {
      success: true,
      events: formattedEvents,
      summary
    };
  } catch (err) {
    console.error('Error generating timeline summary:', err);
    await logAIRequest({
      userId,
      endpoint: '/health-timeline',
      geminiRequest: { model: 'gemini-2.5-flash' },
      geminiResponseTime: 0,
      status: 'failed',
      error: err
    });
    return {
      success: true,
      events: formattedEvents,
      summary: {
        progressSummary: 'Timeline retrieved. Journey summary unavailable due to AI rate limits.',
        trends: 'No significant trends parsed.',
        achievements: [],
        concerns: [],
        recommendedActions: ['Consult your physician for health monitoring.']
      }
    };
  }
};
