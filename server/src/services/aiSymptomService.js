import { Department } from '../models/Department.js';
import { Doctor } from '../models/Doctor.js';
import { Hospital } from '../models/Hospital.js';
import { haversineDistance } from './locationService.js';
import { triageSymptoms } from './geminiTriageService.js';
import { chatWithAI } from './aiService.js';

export const analyzeSymptoms = async (symptomsText = '', options = {}) => {
  const triage = await triageSymptoms(symptomsText, options);
  return {
    departmentName: triage.department,
    recommendedSpecialist: triage.recommendedSpecialist,
    urgencyLevel: triage.urgencyLevel,
    emergencyWarning: triage.emergencyWarning,
    confidence: triage.confidence,
    conditions: triage.conditions,
    disclaimer: 'AI suggestions are not a substitute for professional medical diagnosis.',
  };
};

export const getRecommendations = async ({ symptoms, latitude, longitude, hospitalId }) => {
  const analysis = await analyzeSymptoms(symptoms, { lat: latitude, lng: longitude });
  let hospitals = [];

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);

  if (hospitalId) {
    const h = await Hospital.findById(hospitalId).populate('departments');
    if (h) hospitals = [h];
  } else if (hasCoords) {
    hospitals = await Hospital.find({
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 50000,
        },
      },
    }).limit(5);
  } else {
    hospitals = await Hospital.find({ isActive: true }).sort('-rating').limit(5);
  }

  if (!hospitals.length) {
    hospitals = await Hospital.find({ isActive: true }).limit(3);
  }

  const recommendedHospital = hospitals[0];
  if (!recommendedHospital) {
    return { analysis, recommendedHospital: null, recommendedDepartment: null, recommendedDoctor: null };
  }

  const departments = await Department.find({
    hospitalId: recommendedHospital._id,
    name: new RegExp(analysis.departmentName, 'i'),
    isActive: true,
  });

  let recommendedDepartment = departments[0];
  if (!recommendedDepartment) {
    recommendedDepartment = await Department.findOne({ hospitalId: recommendedHospital._id, isActive: true });
  }

  const doctorFilter = { isVerified: true };
  if (recommendedDepartment) {
    doctorFilter.$and = [
      { $or: [{ hospitalId: recommendedHospital._id }, { hospital: recommendedHospital._id }] },
      { $or: [{ departmentId: recommendedDepartment._id }, { department: recommendedDepartment._id }] },
    ];
  } else {
    doctorFilter.$or = [{ hospitalId: recommendedHospital._id }, { hospital: recommendedHospital._id }];
  }

  let doctors = await Doctor.find(doctorFilter)
    .populate('user', 'firstName lastName avatar')
    .sort('-rating')
    .limit(5);

  if (!doctors.length) {
    doctors = await Doctor.find({
      isVerified: true,
      $or: [{ hospitalId: recommendedHospital._id }, { hospital: recommendedHospital._id }],
    })
      .populate('user', 'firstName lastName avatar')
      .sort('-rating')
      .limit(5);
  }

  const recommendedDoctor = doctors[0] || null;

  let aiInsight = null;
  try {
    const aiRes = await chatWithAI(
      [{ role: 'user', content: `Symptoms: ${symptoms}. Briefly suggest care steps and which type of doctor to see.` }],
      null
    );
    aiInsight = aiRes.content;
  } catch {
    aiInsight = null;
  }

  if (hasCoords && recommendedHospital.location?.coordinates) {
    const [hLng, hLat] = recommendedHospital.location.coordinates;
    recommendedHospital._doc = recommendedHospital._doc || {};
    recommendedHospital._doc.distance = haversineDistance(lat, lng, hLat, hLng);
  }

  return {
    analysis,
    aiInsight,
    recommendedHospital,
    recommendedDepartment,
    recommendedDoctor,
    alternativeDoctors: doctors.slice(1, 4),
    nearbyHospitals: hospitals.slice(0, 3),
  };
};
