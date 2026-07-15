import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

console.log('Loaded GEMINI_API_KEY:', process.env.GEMINI_API_KEY);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const list = await ai.models.list();
    console.log('Success! List object:', JSON.stringify(list, null, 2));
  } catch (error) {
    console.error('Error occurred:');
    console.error(error);
  }
}

run();
