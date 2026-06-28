import { GoogleGenAI } from '@google/genai';
import { AIChatHistory } from '../models/AIChatHistory.js';
import { Patient } from '../models/Patient.js';
import { searchHealthcare } from './aiService.js';

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
 * Start a dynamic symptom triage follow-up interview session.
 */
export const startSymptomInterview = async (conversationId, symptoms) => {
  const chat = await AIChatHistory.findById(conversationId);
  if (!chat) return { error: 'Conversation session not found.' };

  const client = getGeminiClient();
  if (!client) {
    return { error: 'AI service key missing. Symptom interview cannot be started.' };
  }

  try {
    // Prompt Gemini to analyze the initial symptom and generate 3 clinical follow-up questions
    const prompt = `A patient reports these symptoms: "${symptoms}".
You need to conduct a professional clinical interview. Analyze the symptoms and generate exactly 3 clinical, follow-up questions to help determine the condition, severity, and urgency. 
Do not suggest treatments yet.

Return ONLY a JSON array of strings:
[
  "Question 1 text...",
  "Question 2 text...",
  "Question 3 text..."
]`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    });

    const questions = parseGeminiJSON(response.text);
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format returned by AI.');
    }

    chat.interviewState = 'interviewing';
    chat.interviewSymptoms = symptoms;
    chat.interviewQuestionQueue = questions;
    chat.interviewCollectedInfo = {};
    chat.interviewRound = 0;
    await chat.save();

    const firstQuestion = questions[0];
    return {
      success: true,
      interviewState: 'interviewing',
      round: 0,
      totalRounds: questions.length,
      nextQuestion: firstQuestion
    };
  } catch (err) {
    console.error('Error starting symptom interview:', err);
    return { error: 'Failed to start symptom interview session due to AI error.' };
  }
};

/**
 * Continue a dynamic symptom triage follow-up interview session with user's answer.
 */
export const continueSymptomInterview = async (conversationId, answer, patientCoords = null) => {
  const chat = await AIChatHistory.findById(conversationId);
  if (!chat) return { error: 'Conversation session not found.' };

  if (chat.interviewState !== 'interviewing') {
    return { error: 'No active symptom interview for this conversation.' };
  }

  const client = getGeminiClient();
  if (!client) {
    return { error: 'AI service key missing.' };
  }

  try {
    const queue = chat.interviewQuestionQueue || [];
    const round = chat.interviewRound || 0;
    const currentQuestion = queue[round];

    // Store the answer
    const info = chat.interviewCollectedInfo || {};
    info[currentQuestion] = answer;
    chat.interviewCollectedInfo = info;

    const nextRound = round + 1;
    chat.interviewRound = nextRound;

    // Check if the interview has reached the end of the queue
    if (nextRound >= queue.length) {
      chat.interviewState = 'completed';
      await chat.save();

      // Gather clinical context & generate final assessment
      const collectedAnswersStr = Object.entries(info)
        .map(([q, a]) => `Q: ${q}\nA: ${a}`)
        .join('\n\n');

      const prompt = `You are a clinical triage AI. Evaluate the final assessment based on the symptom interview:
Initial Symptoms: "${chat.interviewSymptoms}"

Collected Follow-up Details:
${collectedAnswersStr}

Evaluate:
1. Urgency Level: "Low", "Moderate", "High", or "Emergency".
2. Possible Conditions: Array of likely conditions with brief explanations.
3. Department: Medical department category (e.g. Cardiology, Dermatology).
4. Specialist: Recommended medical specialist type.
5. Emergency Warnings: Crucial warnings if urgency is "Emergency".

Return ONLY a JSON response in the following format:
{
  "urgencyLevel": "Low | Moderate | High | Emergency",
  "conditions": [
    { "name": "Condition Name", "explanation": "Brief explanation." }
  ],
  "department": "string (e.g. Cardiology)",
  "specialist": "string (e.g. Cardiologist)",
  "emergencyWarning": "string or null"
}`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const triage = parseGeminiJSON(response.text);

      // Perform a real location-based doctor/hospital search based on triage specialist
      let providers = [];
      const lat = patientCoords?.latitude ?? 26.8467; // Fallback to Lucknow if no coords
      const lng = patientCoords?.longitude ?? 80.9462;
      
      try {
        providers = await searchHealthcare({
          latitude: lat,
          longitude: lng,
          category: 'hospital',
          specialty: triage.specialist || triage.department
        });
      } catch (searchErr) {
        console.error('Error finding providers for triage:', searchErr);
      }

      // Reset conversation interviewState to idle for future queries
      chat.interviewState = 'idle';
      await chat.save();

      return {
        success: true,
        interviewState: 'completed',
        triage,
        nearbyProviders: providers
      };
    } else {
      // Continue to next question
      await chat.save();
      const nextQuestion = queue[nextRound];
      return {
        success: true,
        interviewState: 'interviewing',
        round: nextRound,
        totalRounds: queue.length,
        nextQuestion
      };
    }
  } catch (err) {
    console.error('Error continuing symptom interview:', err);
    return { error: 'Failed to continue symptom interview due to AI error.' };
  }
};
