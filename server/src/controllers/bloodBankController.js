import mongoose from 'mongoose';
import { BloodBank } from '../models/BloodBank.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const INDIAN_CITIES = ['Mumbai', 'Delhi', 'Lucknow', 'Pune', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Bhopal', 'Indore'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

async function buildBloodBankSearchFilter(query) {
  const { search, city, state, bloodGroup, hospital: hospitalName } = query;
  const filter = {};
  const orConditions = [];

  if (search?.trim()) {
    const raw = search.trim();
    let detectedBloodGroup = null;

    for (const bg of BLOOD_GROUPS) {
      const normalized = raw.toUpperCase().replace(/\s/g, '');
      if (normalized === bg || normalized === bg.replace('-', '') || normalized.includes(bg)) {
        detectedBloodGroup = bg;
        break;
      }
    }

    if (detectedBloodGroup) {
      filter['bloodGroups.group'] = detectedBloodGroup;
      filter['bloodGroups.unitsAvailable'] = { $gt: 0 };
    } else {
      const rx = new RegExp(raw, 'i');

      for (const c of INDIAN_CITIES) {
        if (raw.toLowerCase().includes(c.toLowerCase())) {
          orConditions.push({ 'address.city': new RegExp(`^${c}$`, 'i') });
        }
      }

      const hospitals = await mongoose.model('Hospital').find({ name: rx }).select('_id');
      const hospitalIds = hospitals.map((h) => h._id);

      orConditions.push(
        { name: rx },
        { 'address.city': rx },
        { 'address.state': rx },
        { 'address.street': rx }
      );
      if (hospitalIds.length) orConditions.push({ hospital: { $in: hospitalIds } });
    }
  }

  if (city?.trim()) filter['address.city'] = new RegExp(city.trim(), 'i');
  if (state?.trim()) filter['address.state'] = new RegExp(state.trim(), 'i');
  if (bloodGroup) {
    filter['bloodGroups.group'] = bloodGroup;
    filter['bloodGroups.unitsAvailable'] = { $gt: 0 };
  }

  if (orConditions.length > 0) filter.$or = orConditions;

  return { filter, hospitalName };
}

async function enrichWithHospitalSearch(bloodBanks, hospitalName) {
  if (!hospitalName?.trim()) return bloodBanks;
  const rx = new RegExp(hospitalName.trim(), 'i');
  return bloodBanks.filter((b) => b.name?.match(rx) || b.hospital?.name?.match(rx));
}

export const getBloodBanks = asyncHandler(async (req, res) => {
  const { lat, lng, limit = 50, radius = 50 } = req.query;
  const { filter, hospitalName } = await buildBloodBankSearchFilter(req.query);

  let bloodBanks = await BloodBank.find(filter).populate('hospital', 'name');
  bloodBanks = await enrichWithHospitalSearch(bloodBanks, hospitalName);

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const hasCoords = !Number.isNaN(userLat) && !Number.isNaN(userLng);
  const radiusKm = parseFloat(radius) || 50;

  let enriched = bloodBanks.map((b) => {
    const obj = b.toObject ? b.toObject() : { ...b };
    if (b.location?.coordinates?.length === 2 && hasCoords) {
      obj.distance = parseFloat(haversineDistance(userLat, userLng, b.location.coordinates[1], b.location.coordinates[0]).toFixed(1));
    } else {
      obj.distance = null;
    }
    return obj;
  });

  if (hasCoords) {
    enriched = enriched.filter((b) => b.distance !== null && b.distance <= radiusKm);
    enriched.sort((a, b) => a.distance - b.distance);
  } else {
    enriched.sort((a, b) => b.rating - a.rating);
  }

  res.json({ success: true, count: enriched.length, data: enriched.slice(0, parseInt(limit)) });
});

export const getNearbyBloodBanks = asyncHandler(async (req, res) => {
  req.query.radius = req.query.maxDistance ? parseInt(req.query.maxDistance, 10) / 1000 : 50;
  return getBloodBanks(req, res);
});

export const getBloodBank = asyncHandler(async (req, res) => {
  const bloodBank = await BloodBank.findById(req.params.id).populate('hospital', 'name');
  if (!bloodBank) throw new AppError('Blood bank not found', 404);
  res.json({ success: true, data: bloodBank });
});

export const registerVolunteer = asyncHandler(async (req, res) => {
  const { bloodBankId } = req.params;
  const { name, bloodGroup, phone, email } = req.body;

  if (!name || !bloodGroup || !phone) {
    throw new AppError('Name, blood group, and phone are required', 400);
  }

  const bloodBank = await BloodBank.findById(bloodBankId);
  if (!bloodBank) throw new AppError('Blood bank not found', 404);

  bloodBank.volunteers.push({ name, bloodGroup, phone, email });
  await bloodBank.save();

  res.status(201).json({ success: true, message: 'Registered as volunteer donor' });
});
