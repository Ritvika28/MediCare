import { Lab } from '../models/Lab.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { haversineDistanceKm } from '../services/locationService.js';
import { fetchNearbyHealthcareFromOverpass } from '../services/overpassService.js';


const INDIAN_CITIES = ['Mumbai', 'Delhi', 'Lucknow', 'Pune', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Bhopal', 'Indore'];

const TEST_KEYWORDS = {
  mri: { name: 'MRI', category: 'mri' },
  ct: { name: 'CT', category: 'ct_scan' },
  cbc: { name: 'CBC', category: 'blood_test' },
  blood: { name: 'Blood', category: 'blood_test' },
  diabetes: { name: 'Diabetes', category: 'blood_test' },
  hba1c: { name: 'HbA1c', category: 'blood_test' },
  lipid: { name: 'Lipid', category: 'blood_test' },
  ultrasound: { name: 'Ultrasound', category: 'ultrasound' },
  'x-ray': { name: 'X-Ray', category: 'x_ray' },
  xray: { name: 'X-Ray', category: 'x_ray' },
};

function buildLabSearchFilter(query) {
  const { search, city, state, name, test, testCategory } = query;
  const filter = {};
  const orConditions = [];

  if (search?.trim()) {
    const raw = search.trim();
    const rx = new RegExp(raw, 'i');

    for (const c of INDIAN_CITIES) {
      if (raw.toLowerCase().includes(c.toLowerCase())) {
        orConditions.push({ 'address.city': new RegExp(`^${c}$`, 'i') });
      }
    }

    for (const [key, val] of Object.entries(TEST_KEYWORDS)) {
      if (raw.toLowerCase().includes(key)) {
        orConditions.push({ 'testsAvailable.name': new RegExp(val.name, 'i') });
        orConditions.push({ 'testsAvailable.category': val.category });
      }
    }

    orConditions.push(
      { name: rx },
      { 'address.city': rx },
      { 'address.state': rx },
      { 'address.street': rx },
      { 'testsAvailable.name': rx },
      { 'testsAvailable.category': rx }
    );
  } else {
    if (city) filter['address.city'] = new RegExp(city.trim(), 'i');
    if (state) filter['address.state'] = new RegExp(state.trim(), 'i');
    if (name) filter.name = new RegExp(name.trim(), 'i');
  }

  if (testCategory) filter['testsAvailable.category'] = testCategory;
  if (test) filter['testsAvailable.name'] = new RegExp(test.trim(), 'i');

  if (orConditions.length > 0) filter.$or = orConditions;

  return filter;
}

export const getLabs = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 50, maxPrice, minRating, openNow, page = 1, limit = 20 } = req.query;

  const filter = buildLabSearchFilter(req.query);
  const labs = await Lab.find(filter);

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const hasCoords = !Number.isNaN(userLat) && !Number.isNaN(userLng);
  const radiusKm = parseFloat(radius) || 50;

  let enriched = labs.map((l) => {
    const obj = l.toObject ? l.toObject() : { ...l };
    if (l.location?.coordinates?.length === 2 && hasCoords) {
      obj.distance = parseFloat(haversineDistanceKm(userLat, userLng, l.location.coordinates[1], l.location.coordinates[0]).toFixed(1));
    } else {
      obj.distance = null;
    }
    return obj;
  });

  if (hasCoords) {
    enriched = enriched.filter((l) => l.distance !== null && l.distance <= radiusKm);
    const overpassLabs = await fetchNearbyHealthcareFromOverpass(userLat, userLng, 'laboratory', radiusKm * 1000);
    const dbNames = new Set(enriched.map((l) => l.name?.toLowerCase()));
    const uniqueOverpass = overpassLabs.filter((o) => !dbNames.has(o.name?.toLowerCase()));
    enriched = [...enriched, ...uniqueOverpass];
  }

  if (minRating) {
    const rate = parseFloat(minRating);
    enriched = enriched.filter((l) => l.rating >= rate);
  }

  if (openNow === 'true') {
    enriched = enriched.filter((l) => l.isOpenNow);
  }

  if (maxPrice) {
    const price = parseFloat(maxPrice);
    enriched = enriched.filter((l) => l.testsAvailable?.some((t) => t.price <= price));
  }

  if (hasCoords) {
    enriched.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  } else {
    enriched.sort((a, b) => b.rating - a.rating);
  }

  const total = enriched.length;
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 20;
  const start = (p - 1) * l;
  const paginatedData = enriched.slice(start, start + l);

  res.json({
    success: true,
    count: paginatedData.length,
    data: paginatedData,
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) || 1 },
  });
});

export const getNearbyLabs = asyncHandler(async (req, res) => {
  return getLabs(req, res);
});

export const getLab = asyncHandler(async (req, res) => {
  const lab = await Lab.findById(req.params.id);
  if (!lab) throw new AppError('Lab not found', 404);
  res.json({ success: true, data: lab });
});
