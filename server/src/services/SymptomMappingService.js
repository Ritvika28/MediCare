import { Doctor } from '../models/Doctor.js';
import { Hospital } from '../models/Hospital.js';
import { triageSymptoms } from './geminiTriageService.js';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const analyzeSymptoms = async (symptomsText, location = {}) => {
  const lat = parseFloat(location.latitude || location.lat);
  const lng = parseFloat(location.longitude || location.lng);
  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);

  // Use dynamic triage reasoning engine
  const triage = await triageSymptoms(symptomsText, { lat, lng });

  const matchedDept = triage.department;
  const matchedSpecialist = triage.recommendedSpecialist;
  const urgencyLevel = triage.urgencyLevel;
  const emergencyWarning = triage.emergencyWarning;

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
