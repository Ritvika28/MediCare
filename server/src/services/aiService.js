import OpenAI from 'openai';
import { Doctor } from '../models/Doctor.js';
import { Department } from '../models/Department.js';

const SYSTEM_PROMPT = `You are HealthAssist, a professional healthcare information assistant for a hospital management platform.
Provide helpful, accurate general health information. Always remind users that you are not a substitute for professional medical advice.
For emergencies, tell users to call emergency services immediately.
You can help with: general health questions, hospital information, doctor suggestions, and symptom-based guidance (with disclaimers).
Keep responses concise, empathetic, and well-structured.`;

let openai;

const getOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

export const getHospitalContext = async () => {
  const [departments, doctors] = await Promise.all([
    Department.find({ isActive: true }).select('name description').limit(20),
    Doctor.find({ isVerified: true })
      .populate('user', 'firstName lastName')
      .populate('department', 'name')
      .select('specialization experience rating consultationFee')
      .limit(30),
  ]);

  return `
Available Departments: ${departments.map((d) => d.name).join(', ')}
Available Doctors: ${doctors
    .map(
      (d) =>
        `Dr. ${d.user?.firstName} ${d.user?.lastName} - ${d.specialization} (${d.department?.name || 'General'}) - Rating: ${d.rating}/5`
    )
    .join('\n')}
`;
};

export const chatWithAI = async (messages, userId) => {
  const client = getOpenAI();
  const context = await getHospitalContext();

  if (!client) {
    return {
      content:
        'AI service is not configured. Please set OPENAI_API_KEY. For now: For emergencies call 911. Our hospital offers 24/7 emergency services.',
      provider: 'fallback',
    };
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nHospital Context:\n${context}` },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_tokens: 800,
    temperature: 0.7,
  });

  return {
    content: response.choices[0]?.message?.content || 'I could not generate a response.',
    provider: 'openai',
  };
};

export const suggestDoctorsBySymptoms = async (symptoms) => {
  const symptomMap = {
    heart: 'Cardiology',
    chest: 'Cardiology',
    skin: 'Dermatology',
    bone: 'Orthopedics',
    child: 'Pediatrics',
    eye: 'Ophthalmology',
    brain: 'Neurology',
    stomach: 'Gastroenterology',
    mental: 'Psychiatry',
  };

  const lower = symptoms.toLowerCase();
  let specialization = 'General Medicine';
  for (const [key, spec] of Object.entries(symptomMap)) {
    if (lower.includes(key)) {
      specialization = spec;
      break;
    }
  }

  const doctors = await Doctor.find({ isVerified: true, specialization: new RegExp(specialization, 'i') })
    .populate('user', 'firstName lastName avatar')
    .populate('department', 'name')
    .sort('-rating')
    .limit(5);

  return { specialization, doctors };
};
