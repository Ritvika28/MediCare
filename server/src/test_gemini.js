import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

console.log('Loaded GEMINI_API_KEY:', process.env.GEMINI_API_KEY);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello, this is a test of the Gemini API. Response with "OK".',
    });
    console.log('Success! Response:', response.text);
  } catch (error) {
    console.error('Error occurred:');
    console.error(error);
  }
}

run();
