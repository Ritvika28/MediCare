import { Hospital } from '../models/Hospital.js';
import { Doctor } from '../models/Doctor.js';
import { Lab } from '../models/Lab.js';
import { BloodBank } from '../models/BloodBank.js';
import { haversineDistanceKm } from './locationService.js';


function summarize(items, lat, lng, nameField = 'name') {
  const withDistance = items
    .map((item) => {
      const coords = item.location?.coordinates;
      if (!coords || coords.length < 2) return null;
      const [lngC, latC] = coords;
      const distance = parseFloat(haversineDistanceKm(lat, lng, latC, lngC).toFixed(1));
      return { name: item[nameField] || item.user?.firstName, distance };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);

  return {
    count: withDistance.length,
    nearestDistance: withDistance[0]?.distance ?? null,
    nearestName: withDistance[0]?.name ?? null,
  };
}

export async function getNearbyHealthcareSummary(latitude, longitude, radiusKm = 50) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return {
      hasLocation: false,
      hospitals: { count: 0, nearestDistance: null, nearestName: null },
      doctors: { count: 0, nearestDistance: null, nearestName: null },
      labs: { count: 0, nearestDistance: null, nearestName: null },
      bloodBanks: { count: 0, nearestDistance: null, nearestName: null },
    };
  }

  const [hospitals, doctors, labs, bloodBanks] = await Promise.all([
    Hospital.find({ isActive: true }).select('name location').lean(),
    Doctor.find({ isActive: true, isVerified: true })
      .populate('user', 'firstName lastName')
      .populate('hospitalId', 'name location')
      .select('specialization hospitalId hospital')
      .lean(),
    Lab.find({}).select('name location').lean(),
    BloodBank.find({}).select('name location').lean(),
  ]);

  const hospitalItems = hospitals.filter((h) => {
    const coords = h.location?.coordinates;
    if (!coords) return false;
    const d = haversineDistanceKm(lat, lng, coords[1], coords[0]);
    return d <= radiusKm;
  });

  const doctorItems = doctors
    .map((d) => {
      const hospital = d.hospitalId || d.hospital;
      const coords = hospital?.location?.coordinates;
      if (!coords) return null;
      const distance = haversineDistanceKm(lat, lng, coords[1], coords[0]);
      if (distance > radiusKm) return null;
      return {
        name: d.user ? `Dr. ${d.user.firstName} ${d.user.lastName}` : d.specialization,
        location: { coordinates: coords },
        distance,
      };
    })
    .filter(Boolean);

  const labItems = labs.filter((l) => {
    const coords = l.location?.coordinates;
    if (!coords) return false;
    return haversineDistanceKm(lat, lng, coords[1], coords[0]) <= radiusKm;
  });

  const bankItems = bloodBanks.filter((b) => {
    const coords = b.location?.coordinates;
    if (!coords) return false;
    return haversineDistanceKm(lat, lng, coords[1], coords[0]) <= radiusKm;
  });

  const doctorSummary = doctorItems.length
    ? {
        count: doctorItems.length,
        nearestDistance: parseFloat(Math.min(...doctorItems.map((d) => d.distance)).toFixed(1)),
        nearestName: doctorItems.sort((a, b) => a.distance - b.distance)[0]?.name ?? null,
      }
    : { count: 0, nearestDistance: null, nearestName: null };

  return {
    hasLocation: true,
    radiusKm,
    hospitals: summarize(hospitalItems, lat, lng),
    doctors: doctorSummary,
    labs: summarize(labItems, lat, lng),
    bloodBanks: summarize(bankItems, lat, lng),
  };
}
