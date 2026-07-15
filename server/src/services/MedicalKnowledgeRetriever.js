import { GoogleGenAI } from '@google/genai';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { Patient } from '../models/Patient.js';
import { callGeminiWithRetry } from './aiService.js';
import { logAIRequest } from '../utils/aiLogger.js';

let geminiClient;
const getGeminiClient = () => {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
};

/**
 * Retrieve patient medical reports matching query keywords or chronological order.
 */
export const retrieveRelevantReports = async (userId, queryText = '') => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) return [];

  const queryKeywords = (queryText || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // Fetch all reports of patient
  const records = await MedicalRecord.find({ patient: patient._id }).sort('-recordDate').lean();

  if (queryKeywords.length === 0) {
    // Return top 5 most recent reports if no query words
    return records.slice(0, 5);
  }

  // Filter based on keyword relevance
  const matched = records.filter(r => {
    const textToSearch = `${r.title} ${r.description || ''} ${r.extractedText || ''} ${r.recordType} ${r.doctor || ''} ${r.hospital || ''}`.toLowerCase();
    return queryKeywords.some(kw => textToSearch.includes(kw));
  });

  // Fallback to top 3 recent if no matches found
  return matched.length > 0 ? matched.slice(0, 5) : records.slice(0, 3);
};

/**
 * Answer patient questions using RAG strictly bounded to their uploaded report context.
 */
export const answerQnAOverReports = async (userId, queryText) => {
  const client = getGeminiClient();
  if (!client) {
    return { error: 'AI service key missing. Q&A cannot be performed.' };
  }

  const reports = await retrieveRelevantReports(userId, queryText);
  if (reports.length === 0) {
    return {
      answer: 'You have not uploaded any medical reports to your vault yet. Please upload reports first.',
      sourceReports: []
    };
  }

  // Build text context
  const contextBlock = reports.map((r, i) => {
    return `[REPORT #${i + 1}]
Title: ${r.title}
Category: ${r.recordType}
Date: ${r.recordDate ? r.recordDate.toISOString().split('T')[0] : 'N/A'}
Doctor: ${r.doctor || 'N/A'}
Hospital: ${r.hospital || 'N/A'}
Extracted Transcribed Text:
"${r.extractedText || 'No text extracted.'}"
----------------------------------------`;
  }).join('\n\n');

  try {
    const prompt = `You are a clinical assistant answering patient questions about their uploaded medical documents.
You must answer the question using ONLY the provided medical report context.

STRICT RULES:
1. Ground your answers strictly in the provided report text.
2. If the reports do not contain the answer, or if there is no mention of the queried parameter, reply exactly with: "This report does not contain that information."
3. Do NOT make assumptions, guess, or extrapolate beyond what is verbatim in the reports context.
4. Keep the explanation concise and patient-friendly.

Reports Context:
${contextBlock}

User Question: "${queryText}"`;

    const startTime = Date.now();
    const response = await callGeminiWithRetry(() => client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1
      }
    }));

    const duration = Date.now() - startTime;
    await logAIRequest({
      userId,
      endpoint: '/report-qna',
      geminiRequest: { model: 'gemini-2.5-flash', query: queryText },
      geminiResponseTime: duration,
      status: 'success'
    });

    return {
      success: true,
      answer: response.text?.trim() || 'No answer generated.',
      sourceReports: reports.map(r => ({
        id: r._id,
        title: r.title,
        date: r.recordDate
      }))
    };
  } catch (err) {
    await logAIRequest({
      userId,
      endpoint: '/report-qna',
      geminiRequest: { model: 'gemini-2.5-flash', query: queryText },
      geminiResponseTime: 0,
      status: 'failed',
      error: err
    });
    console.error('Error in Q&A over reports:', err);
    return { error: 'Failed to complete Q&A due to AI service error.' };
  }
};
