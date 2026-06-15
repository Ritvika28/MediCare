import { Doctor } from '../models/Doctor.js';
import { Hospital } from '../models/Hospital.js';

const SYMPTOM_DEPT_MAP = [
  { keys: ['chest pain', 'heart attack', 'cardiac', 'palpitation', 'bp', 'blood pressure', 'arrhythmia', 'breathless', 'shortness of breath'], dept: 'Cardiology', specialist: 'Cardiologist', urgency: 'Emergency' },
  { keys: ['skin', 'rash', 'itch', 'acne', 'allergy', 'eczema', 'psoriasis', 'hives', 'dermatitis'], dept: 'Dermatology', specialist: 'Dermatologist', urgency: 'Moderate' },
  { keys: ['bone', 'joint', 'fracture', 'back pain', 'knee', 'spine', 'ortho', 'arthritis', 'sprain'], dept: 'Orthopedics', specialist: 'Orthopedic Surgeon', urgency: 'Moderate' },
  { keys: ['brain', 'headache', 'migraine', 'dizzy', 'seizure', 'neurolog', 'numbness', 'stroke', 'paralysis'], dept: 'Neurology', specialist: 'Neurologist', urgency: 'High' },
  { keys: ['stomach', 'vomit', 'acid', 'diarrhea', 'gastric', 'abdomen', 'nausea', 'bloating', 'indigestion'], dept: 'Gastroenterology', specialist: 'Gastroenterologist', urgency: 'Moderate' },
  { keys: ['child', 'baby', 'pediatric', 'kid', 'infant', 'immunization', 'growth check'], dept: 'Pediatrics', specialist: 'Pediatrician', urgency: 'Moderate' },
  { keys: ['eye', 'vision', 'blind', 'ophthal', 'sight', 'cataract', 'glaucoma'], dept: 'Ophthalmology', specialist: 'Ophthalmologist', urgency: 'Moderate' },
  { keys: ['anxiety', 'depression', 'mental', 'stress', 'panic', 'psychiatry', 'mood swing'], dept: 'Psychiatry', specialist: 'Psychiatrist', urgency: 'Moderate' },
  { keys: ['cough', 'fever', 'cold', 'flu', 'throat', 'sore throat', 'sinus', 'head cold'], dept: 'General Medicine', specialist: 'General Physician', urgency: 'Low' },
];

const EMERGENCY_KEYWORDS = [
  'chest pain', 'severe bleeding', 'stroke', 'unconscious',
  'breathing difficulty', 'difficulty breathing', 'shortness of breath',
  'seizure', 'heart attack', 'suicide', 'suicidal', 'poisoning', 'poison',
  'paralysis', 'choking', 'cardiac arrest',
];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const analyzeSymptoms = async (symptomsText, location = {}) => {
  const lowerText = (symptomsText || '').toLowerCase();
  const lat = parseFloat(location.latitude || location.lat);
  const lng = parseFloat(location.longitude || location.lng);
  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);

  // Check emergency keywords first
  const isEmergency = EMERGENCY_KEYWORDS.some(kw => lowerText.includes(kw));

  let matchedDept = 'General Medicine';
  let matchedSpecialist = 'General Physician';
  let urgencyLevel = isEmergency ? 'Emergency' : 'Low';

  for (const entry of SYMPTOM_DEPT_MAP) {
    if (entry.keys.some(k => lowerText.includes(k))) {
      matchedDept = entry.dept;
      matchedSpecialist = entry.specialist;
      urgencyLevel = isEmergency ? 'Emergency' : entry.urgency;
      break;
    }
  }

  let emergencyWarning = '';
  if (isEmergency) {
    emergencyWarning = '🚨 EMERGENCY WARNING: Your symptoms resemble a life-threatening event. Seek critical emergency care immediately!';
  }

  // Find nearby hospitals matching department/specialty
  const hospitals = await Hospital.find({ 
    specialties: new RegExp(matchedDept, 'i'),
    isActive: { $ne: false }
  }).lean();

  const doctors = await Doctor.find({
    specialization: new RegExp(matchedSpecialist.split(' ')[0], 'i'),
    isActive: true,
    isVerified: true
  })
  .populate('user', 'firstName lastName avatar')
  .populate('hospitalId', 'name location')
  .populate('hospital', 'name location')
  .lean();

  // Enrich & Sort by distance if location provided
  let hospitalList = hospitals.map(h => {
    let distance = null;
    const coords = h.location?.coordinates;
    if (hasCoords && coords && coords.length >= 2) {
      distance = parseFloat(haversineKm(lat, lng, coords[1], coords[0]).toFixed(1));
    }
    return {
      _id: h._id,
      name: h.name,
      rating: h.rating,
      address: h.address,
      distance
    };
  });

  if (hasCoords) {
    hospitalList.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  } else {
    hospitalList.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  let doctorList = doctors.map(d => {
    let distance = null;
    const hosp = d.hospitalId || d.hospital;
    const coords = hosp?.location?.coordinates;
    if (hasCoords && coords && coords.length >= 2) {
      distance = parseFloat(haversineKm(lat, lng, coords[1], coords[0]).toFixed(1));
    }
    return {
      _id: d._id,
      name: `Dr. ${d.user?.firstName || ''} ${d.user?.lastName || ''}`,
      specialization: d.specialization,
      rating: d.rating,
      experience: d.experience,
      consultationFee: d.consultationFee,
      avatar: d.user?.avatar,
      hospitalName: hosp?.name || 'MediCare Partner Clinic',
      distance
    };
  });

  if (hasCoords) {
    doctorList.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  } else {
    doctorList.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return {
    recommendedSpecialist: matchedSpecialist,
    department: matchedDept,
    urgencyLevel,
    emergencyWarning,
    nearbyDoctors: doctorList.slice(0, 3),
    nearbyHospitals: hospitalList.slice(0, 3)
  };
};
