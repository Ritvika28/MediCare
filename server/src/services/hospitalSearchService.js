import { Hospital } from '../models/Hospital.js';
import { Department } from '../models/Department.js';
import { Doctor } from '../models/Doctor.js';
import { enrichHospitalsWithDistance } from './locationService.js';

/** Maps user-facing keywords to Hospital.facilities schema keys */
export const FACILITY_KEYWORDS = {
  icu: 'ICU',
  'intensive care': 'ICU',
  mri: 'MRI',
  'mri scan': 'MRI',
  ct: 'CTScan',
  ctscan: 'CTScan',
  'ct scan': 'CTScan',
  ventilator: 'Ventilator',
  dialysis: 'Dialysis',
  bloodbank: 'BloodBank',
  'blood bank': 'BloodBank',
  emergency: 'Emergency',
  nicu: 'NICU',
  'operation theatre': 'OperationTheatre',
  'operation theater': 'OperationTheatre',
  ot: 'OperationTheatre',
  ambulance: 'Ambulance',
  pharmacy: 'Pharmacy',
  lab: 'Lab',
  laboratory: 'Lab',
};

/** Maps search tokens to department/specialty names */
export const SPECIALTY_KEYWORDS = {
  cardiology: 'Cardiology',
  cardiologist: 'Cardiology',
  cardiac: 'Cardiology',
  neurology: 'Neurology',
  neurologist: 'Neurology',
  dermatology: 'Dermatology',
  dermatologist: 'Dermatology',
  orthopedics: 'Orthopedics',
  orthopedic: 'Orthopedics',
  orthopaedic: 'Orthopedics',
  pediatrics: 'Pediatrics',
  pediatric: 'Pediatrics',
  paediatric: 'Pediatrics',
  'general medicine': 'General Medicine',
  physician: 'General Medicine',
  gastroenterology: 'Gastroenterology',
  ophthalmology: 'Ophthalmology',
  psychiatry: 'Psychiatry',
};

/** Known Indian cities for combined-query parsing */
export const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Lucknow', 'Pune', 'Bangalore', 'Bengaluru',
  'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Bhopal',
  'Indore', 'Nagpur', 'Surat', 'Kanpur', 'Patna', 'Chandigarh',
];

/** Hospital chain / name keywords */
export const HOSPITAL_NAME_KEYWORDS = [
  'Apollo', 'Fortis', 'AIIMS', 'Max', 'Manipal', 'Narayana',
  'Medanta', 'Lilavati', 'Kokilaben', 'Columbia', 'Global',
  'MediCare', 'Care', 'Memorial', 'Super',
];

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parse a free-text query like "Lucknow MRI" or "Delhi ICU" into structured tokens.
 */
export const parseSearchQuery = (raw = '') => {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const result = {
    rawText: text,
    remainingText: text,
    cities: [],
    states: [],
    facilities: [],
    specialties: [],
    hospitalNames: [],
  };

  if (!text) return result;

  for (const city of INDIAN_CITIES) {
    if (lower.includes(city.toLowerCase())) {
      result.cities.push(city);
      result.remainingText = result.remainingText.replace(new RegExp(city, 'i'), '').trim();
    }
  }

  for (const [key, facilityKey] of Object.entries(FACILITY_KEYWORDS)) {
    if (lower.includes(key) && !result.facilities.includes(facilityKey)) {
      result.facilities.push(facilityKey);
      result.remainingText = result.remainingText.replace(new RegExp(key, 'i'), '').trim();
    }
  }

  for (const [key, specialty] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (lower.includes(key) && !result.specialties.includes(specialty)) {
      result.specialties.push(specialty);
      result.remainingText = result.remainingText.replace(new RegExp(key, 'i'), '').trim();
    }
  }

  for (const name of HOSPITAL_NAME_KEYWORDS) {
    if (lower.includes(name.toLowerCase()) && !result.hospitalNames.includes(name)) {
      result.hospitalNames.push(name);
      result.remainingText = result.remainingText.replace(new RegExp(name, 'i'), '').trim();
    }
  }

  result.remainingText = result.remainingText.replace(/\s+/g, ' ').trim();
  return result;
};

/**
 * Build MongoDB filter for hospital search.
 */
export const buildHospitalSearchFilter = async ({
  search,
  city,
  state,
  facilities,
}) => {
  const filter = { isActive: true };
  const parsed = search ? parseSearchQuery(search) : null;

  const facilityList = [
    ...(facilities ? facilities.split(',').map((f) => f.trim()).filter(Boolean) : []),
    ...(parsed?.facilities || []),
  ];
  const uniqueFacilities = [...new Set(facilityList)];
  uniqueFacilities.forEach((fac) => {
    filter[`facilities.${fac}`] = true;
  });

  const cityFilter = city && city !== 'All' ? city : null;
  const cities = [
    ...(cityFilter ? [cityFilter] : []),
    ...(parsed?.cities || []),
  ];
  const uniqueCities = [...new Set(cities)];

  if (uniqueCities.length === 1) {
    filter['address.city'] = new RegExp(`^${escapeRegex(uniqueCities[0])}$`, 'i');
  } else if (uniqueCities.length > 1) {
    filter['address.city'] = { $in: uniqueCities.map((c) => new RegExp(`^${escapeRegex(c)}$`, 'i')) };
  }

  if (state) {
    filter['address.state'] = new RegExp(state.trim(), 'i');
  }

  const searchConditions = [];
  const matchedHospitalIds = new Set();

  const freeText = parsed ? (parsed.remainingText || '') : (search?.trim() || '');
  const nameTokens = [
    ...(parsed?.hospitalNames || []),
    ...(freeText ? [freeText] : []),
  ].filter(Boolean);

  if (nameTokens.length > 0) {
    for (const token of nameTokens) {
      const rx = new RegExp(token.trim(), 'i');
      searchConditions.push(
        { name: rx },
        { description: rx },
        { 'address.street': rx },
        { 'address.city': rx },
        { 'address.state': rx },
        { hospitalCode: rx }
      );
    }
  } else if (search?.trim() && !parsed) {
    const searchRegex = new RegExp(search.trim(), 'i');
    searchConditions.push(
      { name: searchRegex },
      { description: searchRegex },
      { 'address.street': searchRegex },
      { 'address.city': searchRegex },
      { 'address.state': searchRegex },
      { hospitalCode: searchRegex }
    );
  }

  const specialtyTerms = [...(parsed?.specialties || [])];
  if (freeText) specialtyTerms.push(freeText);

  if (specialtyTerms.length > 0) {
    const doctorQuery = { $or: [] };
    specialtyTerms.forEach((spec) => {
      doctorQuery.$or.push({ specialization: new RegExp(spec, 'i') });
    });
    if (freeText) {
      const rx = new RegExp(freeText, 'i');
      doctorQuery.$or.push({ specialization: rx }, { qualification: rx });
    }
    const doctors = await Doctor.find(doctorQuery).select('hospitalId hospital');
    doctors.forEach((d) => {
      const hId = d.hospitalId || d.hospital;
      if (hId) matchedHospitalIds.add(hId.toString());
    });
  }

  const deptTerms = [...specialtyTerms];
  if (deptTerms.length > 0) {
    const deptOr = deptTerms.map((t) => ({ name: new RegExp(t, 'i') }));
    const departments = await Department.find({ $or: deptOr }).select('hospitalId');
    departments.forEach((d) => {
      if (d.hospitalId) matchedHospitalIds.add(d.hospitalId.toString());
    });
  }

  if (matchedHospitalIds.size > 0) {
    searchConditions.push({ _id: { $in: [...matchedHospitalIds] } });
  }

  if (searchConditions.length > 0) {
    filter.$or = searchConditions;
  }

  return filter;
};

/**
 * Search hospitals with optional distance enrichment and sorting.
 */
export const searchHospitals = async ({
  search,
  city,
  state,
  facilities,
  lat,
  lng,
  sortBy = 'rating',
  page = 1,
  limit = 10,
  maxDistanceMeters,
}) => {
  const filter = await buildHospitalSearchFilter({ search, city, state, facilities });

  let sortOption = '-rating';
  if (sortBy === 'beds') sortOption = '-availableBeds';

  let hospitals = await Hospital.find(filter).populate('departments').sort(sortOption).lean();

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const hasCoords = !Number.isNaN(userLat) && !Number.isNaN(userLng);

  if (hasCoords) {
    const maxDist = maxDistanceMeters != null ? parseFloat(maxDistanceMeters) : Infinity;
    hospitals = enrichHospitalsWithDistance(hospitals, userLat, userLng, maxDist);
    if (sortBy === 'distance' || sortBy === 'nearby' || !sortBy || sortBy === 'rating') {
      hospitals.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
  }

  const total = hospitals.length;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;
  const paginatedHospitals = hospitals.slice(skip, skip + limitNum);

  return {
    hospitals: paginatedHospitals,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};
