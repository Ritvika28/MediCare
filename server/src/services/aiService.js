import OpenAI from 'openai';
import { Doctor } from '../models/Doctor.js';
import { Hospital } from '../models/Hospital.js';
import { Department } from '../models/Department.js';
import { HealthPrediction } from '../models/HealthPrediction.js';
import { HealthForecast } from '../models/HealthForecast.js';
import { HealthAnomaly } from '../models/HealthAnomaly.js';
import { HealthTwin } from '../models/HealthTwin.js';

const SYSTEM_PROMPT = `You are HealthAssist, a professional healthcare information assistant for a hospital management platform.
Provide helpful, accurate general health information. Always remind users that you are not a substitute for professional medical advice.
For emergencies, tell users to call emergency services immediately.
You can help with: general health questions, hospital information, doctor suggestions, and symptom-based guidance (with disclaimers).
Keep responses concise, empathetic, and well-structured.

You have access to the patient's calculated ML Health Intelligence metrics in the system context. Use these metrics (disease risk predictions, biological age, stability index, anomalies) to give personalized, context-aware answers.`;

export const getUserMLContext = async (userId) => {
  if (!userId) return '';
  try {
    const [predictions, forecast, anomalies, healthTwin] = await Promise.all([
      HealthPrediction.find({ userId }).lean(),
      HealthForecast.findOne({ userId }).sort('-createdAt').lean(),
      HealthAnomaly.find({ userId, status: 'active' }).sort('-createdAt').limit(5).lean(),
      HealthTwin.findOne({ userId }).sort('-createdAt').lean()
    ]);

    let context = '\n\nPatient ML Vitals & Intelligence Data:\n';
    if (healthTwin) {
      context += `- Health Twin Score: ${healthTwin.healthTwinScore}/100, Health Age: ${healthTwin.healthAge} years, Biological Age Estimate: ${healthTwin.biologicalAgeEstimate} years, Stability Index: ${healthTwin.healthStabilityIndex}%\n`;
      context += `- Strong Areas: ${healthTwin.strongAreas?.join(', ') || 'None'}\n`;
      context += `- Risk Areas: ${healthTwin.riskAreas?.join(', ') || 'None'}\n`;
      context += `- Lifestyle Improvement Opportunities: ${healthTwin.improvementOpportunities?.join(', ') || 'None'}\n`;
    }
    if (predictions.length) {
      context += `- Calculated Disease Risks:\n`;
      predictions.forEach(p => {
        context += `  * ${p.predictionType}: ${p.score}% risk (${p.riskLevel})\n`;
      });
    }
    if (forecast) {
      context += `- Projected Future Trajectory:\n`;
      forecast.forecasts?.forEach(f => {
        context += `  * ${f.days}-Day Health Score Forecast: ${f.score}/100 - ${f.description}\n`;
      });
    }
    if (anomalies.length) {
      context += `- Active Vitals Anomalies:\n`;
      anomalies.forEach(a => {
        context += `  * ${a.message} (Severity: ${a.severity})\n`;
      });
    }
    return context;
  } catch (err) {
    console.error('Error fetching user ML context for AI assistant:', err);
    return '';
  }
};

const EMERGENCY_KEYWORDS = [
  'chest pain', 'severe bleeding', 'stroke', 'unconscious',
  'breathing difficulty', 'difficulty breathing', 'shortness of breath',
  'seizure', 'heart attack', 'suicide', 'suicidal', 'poisoning', 'poison',
  'paralysis', 'choking', ' cardiac arrest',
];

const SYMPTOM_DEPT_MAP = [
  { keys: ['heart', 'chest', 'bp', 'cardio', 'palpitation', 'breathless'], dept: 'Cardiology', specialist: 'Cardiologist' },
  { keys: ['skin', 'rash', 'itch', 'acne', 'allergy', 'eczema'], dept: 'Dermatology', specialist: 'Dermatologist' },
  { keys: ['bone', 'joint', 'fracture', 'back pain', 'knee', 'spine', 'ortho'], dept: 'Orthopedics', specialist: 'Orthopedic Surgeon' },
  { keys: ['brain', 'headache', 'migraine', 'dizzy', 'seizure', 'neurolog', 'numbness'], dept: 'Neurology', specialist: 'Neurologist' },
  { keys: ['stomach', 'vomit', 'acid', 'diarrhea', 'gastric', 'abdomen', 'nausea'], dept: 'Gastroenterology', specialist: 'Gastroenterologist' },
  { keys: ['child', 'baby', 'pediatric', 'kid', 'infant'], dept: 'Pediatrics', specialist: 'Pediatrician' },
  { keys: ['eye', 'vision', 'blind', 'ophthal', 'sight'], dept: 'Ophthalmology', specialist: 'Ophthalmologist' },
  { keys: ['anxiety', 'depression', 'mental', 'stress', 'panic'], dept: 'Psychiatry', specialist: 'Psychiatrist' },
  { keys: ['cough', 'fever', 'cold', 'flu', 'throat', 'sore throat'], dept: 'General Medicine', specialist: 'General Physician' },
];

const FIRST_AID_MAP = {
  burn: ['Cool with running water 15–20 min', 'Remove tight items near burn', 'Cover with clean cloth', 'Seek hospital for large/deep burns'],
  'chest pain': ['Call 102/112 immediately', 'Sit upright, loosen clothing', 'Aspirin 325mg if not allergic', 'Do NOT drive yourself'],
  fever: ['Rest and hydrate', 'Paracetamol per label', 'Sponge with lukewarm water', 'See doctor if >3 days or >103°F'],
  headache: ['Rest in quiet dark room', 'Hydrate', 'OTC pain relief if appropriate', 'Seek care if sudden/severe/worst-ever'],
  'stomach pain': ['Avoid heavy food', 'Sip clear fluids', 'Note vomiting/blood', 'Urgent care if severe/right-side pain'],
  diabetes: ['Check blood sugar', 'Hydrate', 'Follow meal plan', 'Seek help if glucose very high/low or ketones'],
  'blood pressure': ['Sit calmly 5 min', 'Avoid salt/caffeine', 'Take prescribed meds', 'ER if >180/120 with symptoms'],
};

function getFirstAid(symptomsText) {
  const lower = (symptomsText || '').toLowerCase();
  for (const [key, steps] of Object.entries(FIRST_AID_MAP)) {
    if (lower.includes(key)) return { condition: key, steps };
  }
  return null;
}

const BODY_PARTS = ['head', 'chest', 'abdomen', 'back', 'knee', 'leg', 'arm', 'eye', 'ear', 'throat', 'skin', 'joint'];

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
      .populate('departmentId', 'name')
      .select('specialization experience rating consultationFee')
      .limit(30),
  ]);

  return `
Available Departments: ${departments.map((d) => d.name).join(', ')}
Available Doctors: ${doctors
    .map(
      (d) =>
        `Dr. ${d.user?.firstName} ${d.user?.lastName} - ${d.specialization} (${d.departmentId?.name || 'General'}) - Rating: ${d.rating}/5`
    )
    .join('\n')}
`;
};

function extractConversationState(userMessages) {
  const state = {
    symptoms: null,
    duration: null,
    severity: null,
    bodyPart: null,
    age: null,
  };

  if (userMessages.length >= 1) state.symptoms = userMessages[0].content;

  const followUps = userMessages.slice(1);
  for (const msg of followUps) {
    const lower = msg.content.toLowerCase();
    if (/\d+\s*(year|yr|yrs|month|week|day|hour)/i.test(msg.content) || /since|for \d|days|weeks|months/i.test(lower)) {
      if (!state.duration) state.duration = msg.content;
    } else if (/mild|moderate|severe|\b[1-9]|10\/10|scale/i.test(lower)) {
      if (!state.severity) state.severity = msg.content;
    } else if (/\b\d{1,3}\b/.test(msg.content) && parseInt(msg.content, 10) <= 120) {
      if (!state.age) state.age = msg.content;
    } else {
      for (const part of BODY_PARTS) {
        if (lower.includes(part) && !state.bodyPart) {
          state.bodyPart = part;
          break;
        }
      }
    }
  }

  // Positional assignment for structured flow
  if (userMessages.length >= 2 && !state.duration) state.duration = userMessages[1].content;
  if (userMessages.length >= 3 && !state.severity) state.severity = userMessages[2].content;
  if (userMessages.length >= 4 && !state.bodyPart) {
    const text = userMessages[3].content.toLowerCase();
    state.bodyPart = BODY_PARTS.find((p) => text.includes(p)) || userMessages[3].content;
  }
  if (userMessages.length >= 5 && !state.age) state.age = userMessages[4].content;

  return state;
}

function mapSymptomsToDepartment(symptomsText) {
  const lower = (symptomsText || '').toLowerCase();
  for (const entry of SYMPTOM_DEPT_MAP) {
    if (entry.keys.some((k) => lower.includes(k))) {
      return { dept: entry.dept, specialist: entry.specialist };
    }
  }
  return { dept: 'General Medicine', specialist: 'General Physician' };
}

function getNextQuestion(state, userMessageCount) {
  if (userMessageCount === 1) {
    return `I have noted your symptoms: **"${state.symptoms}"**.\n\nHow long have you been experiencing these symptoms? (e.g., 2 days, 1 week, 3 months)`;
  }
  if (userMessageCount === 2) {
    return `Thank you. Duration noted as **"${state.duration}"**.\n\nHow would you describe the severity? (mild, moderate, severe, or a scale of 1–10)`;
  }
  if (userMessageCount === 3) {
    return `Severity noted as **"${state.severity}"**.\n\nWhich body part or area is primarily affected? (e.g., head, chest, abdomen, knee)`;
  }
  if (userMessageCount === 4) {
    return `Body area noted: **"${state.bodyPart}"**.\n\nWhat is your age? This helps tailor the recommendation.`;
  }
  return null;
}

async function buildLocalAssessment(state, mlSummary = '') {
  const { dept, specialist } = mapSymptomsToDepartment(state.symptoms);
  const [doctors, hospitals, firstAid] = await Promise.all([
    Doctor.find({ isVerified: true, specialization: new RegExp(specialist.split(' ')[0], 'i') })
      .populate('user', 'firstName lastName')
      .populate('hospitalId', 'name address')
      .sort('-rating')
      .limit(3),
    Hospital.find({ specialties: new RegExp(dept, 'i'), isActive: { $ne: false } })
      .select('name address rating specialties')
      .sort('-rating')
      .limit(3),
    Promise.resolve(getFirstAid(state.symptoms)),
  ]);

  const doctorList = doctors.length
    ? doctors.map((d) => `- **Dr. ${d.user?.firstName} ${d.user?.lastName}** (${d.specialization}) at ${d.hospitalId?.name || 'Partner Hospital'} — ₹${d.consultationFee}`).join('\n')
    : '- Search for verified specialists in the Find Doctors section';

  const hospitalList = hospitals.length
    ? hospitals.map((h) => `- **${h.name}** — ${h.address?.city || ''} (Rating ${h.rating || 'N/A'}/5)`).join('\n')
    : '- Use Find Hospitals to locate nearby facilities';

  const firstAidBlock = firstAid
    ? `\n### First Aid Guidance (${firstAid.condition})\n${firstAid.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
    : '';

  const urgency = /severe|8|9|10|intense| unbearable/i.test(state.severity || '')
    ? '⚠️ **Urgency: High** — Consider visiting an emergency department if symptoms worsen.'
    : '**Urgency: Moderate** — Schedule a consultation within 24–48 hours.';

  const healthTwinBlock = mlSummary ? `\n### Personalized Health Context\n${mlSummary}\n` : '';

  return `## HealthAssist Assessment

### Summary
- **Symptoms**: ${state.symptoms}
- **Duration**: ${state.duration || 'Not specified'}
- **Severity**: ${state.severity || 'Not specified'}
- **Affected Area**: ${state.bodyPart || 'Not specified'}
- **Age**: ${state.age || 'Not specified'}
${firstAidBlock}${healthTwinBlock}
### Recommendation
- **Suggested Department**: ${dept}
- **Recommended Specialist**: ${specialist}
- ${urgency}

### Recommended Doctors
${doctorList}

### Nearby Hospitals (${dept})
${hospitalList}

### Next Steps
1. View a **${specialist}** profile via Find Doctors
2. Use **Find Hospitals** to locate nearby ${dept} facilities
3. For emergencies, call **102** or visit the Emergency Hub

---
**Disclaimer**: This is an AI-assisted triage guide, not a medical diagnosis. Always consult a qualified healthcare provider.`;
}

export const chatWithAI = async (messages, userId) => {
  const client = getOpenAI();
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
  const lowerMsg = lastUserMessage.toLowerCase();

  if (EMERGENCY_KEYWORDS.some((kw) => lowerMsg.includes(kw))) {
    return {
      content: `🚨 **EMERGENCY WARNING**

Your message suggests a potentially life-threatening condition.

**Immediate actions:**
1. Call **102** (ambulance) or **112** (national emergency)
2. Go to the nearest hospital emergency department
3. Do not wait for online advice

Open the **Emergency Hub** in this app for nearest hospitals.

---
**Disclaimer**: This is an automated emergency alert. Seek immediate professional medical help.`,
      provider: 'local_fallback',
    };
  }

  const state = extractConversationState(userMessages);
  const mlContext = await getUserMLContext(userId);

  if (!client) {
    const firstAid = getFirstAid(lastUserMessage);
    if (userMessages.length === 1 && firstAid) {
      const steps = firstAid.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      return {
        content: `### First Aid: ${firstAid.condition}\n${steps}\n\nI'll ask a few follow-up questions to recommend the right specialist.\n\nHow long have you had these symptoms?`,
        provider: 'local_fallback',
      };
    }
    const nextQ = getNextQuestion(state, userMessages.length);
    if (nextQ) {
      return { content: nextQ, provider: 'local_fallback' };
    }
    const assessment = await buildLocalAssessment(state, mlContext);
    return { content: assessment, provider: 'local_fallback' };
  }

  const context = await getHospitalContext();
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nHospital Context:\n${context}\nPatient ML Context:\n${mlContext}` },
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
  const { dept: specialization } = mapSymptomsToDepartment(symptoms);

  const doctors = await Doctor.find({ isVerified: true, specialization: new RegExp(specialization, 'i') })
    .populate('user', 'firstName lastName avatar')
    .populate('departmentId', 'name')
    .populate('hospitalId', 'name')
    .sort('-rating')
    .limit(5);

  return { specialization, doctors };
};
