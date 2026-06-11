import { Hospital } from '../models/Hospital.js';
import { Department } from '../models/Department.js';
import { Doctor } from '../models/Doctor.js';
import { BedAvailability } from '../models/BedAvailability.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { enrichHospitalsWithDistance } from '../services/locationService.js';
import { reverseGeocode } from '../services/geocodeService.js';
import { fetchNearbyHospitalsFromGoogle } from '../services/placesService.js';
import { fetchNearbyHospitalsFromOverpass } from '../services/overpassService.js';

export const getHospitals = asyncHandler(async (req, res) => {
  const filter = { isActive: true };

  // City filter
  if (req.query.city) {
    filter['address.city'] = new RegExp(req.query.city, 'i');
  }

  // Facility filters (comma-separated list, e.g. ICU,Ambulance)
  if (req.query.facilities) {
    const facilityList = req.query.facilities.split(',');
    facilityList.forEach((fac) => {
      filter[`facilities.${fac.trim()}`] = true;
    });
  }

  // Search keyword (hospital name or description)
  if (req.query.search) {
    filter.$or = [
      { name: new RegExp(req.query.search, 'i') },
      { description: new RegExp(req.query.search, 'i') },
      { 'address.street': new RegExp(req.query.search, 'i') },
      { 'address.city': new RegExp(req.query.search, 'i') }
    ];
  }

  let query = Hospital.find(filter).populate('departments');

  if (req.query.sort === 'rating') {
    query = query.sort('-rating');
  } else {
    query = query.sort('-rating'); // default sorting
  }

  let hospitals = await query;

  if (req.query.lat && req.query.lng) {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      hospitals = enrichHospitalsWithDistance(hospitals, lat, lng);
      if (req.query.sortBy === 'distance') {
        hospitals.sort((a, b) => a.distance - b.distance);
      }
    }
  }

  res.json({ success: true, data: hospitals });
});

export const getNearbyHospitals = asyncHandler(async (req, res) => {
  const latitude = parseFloat(req.query.latitude ?? req.query.lat);
  const longitude = parseFloat(req.query.longitude ?? req.query.lng);
  const maxDistance = parseInt(req.query.maxDistance, 10) || 50000;

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new AppError('latitude and longitude query parameters are required', 400);
  }

  console.log('[Nearby] User coordinates:', latitude, longitude);
  console.log('[Nearby] Max distance (m):', maxDistance);

  const userLocation = await reverseGeocode(latitude, longitude);
  console.log('[Nearby] Reverse geocode:', userLocation);

  const allInDb = await Hospital.find({ isActive: true });
  let networkHospitals = enrichHospitalsWithDistance(allInDb, latitude, longitude, maxDistance);
  console.log('[Nearby] Network hospitals within range:', networkHospitals.length);

  let results = [...networkHospitals];

  const needsGoogle =
    process.env.GOOGLE_MAPS_API_KEY &&
    (networkHospitals.length === 0 || process.env.NEARBY_ALWAYS_INCLUDE_GOOGLE === 'true');

  if (needsGoogle) {
    const googleHospitals = await fetchNearbyHospitalsFromGoogle(
      latitude,
      longitude,
      Math.min(maxDistance, 50000)
    );
    const networkNames = new Set(networkHospitals.map((h) => h.name?.toLowerCase()));
    const uniqueGoogle = googleHospitals.filter(
      (g) => !networkNames.has(g.name?.toLowerCase())
    );
    results = [...networkHospitals, ...uniqueGoogle].sort((a, b) => a.distance - b.distance);
    console.log('[Nearby] Added Google places:', uniqueGoogle.length);
  } else {
    const overpassHospitals = await fetchNearbyHospitalsFromOverpass(
      latitude,
      longitude,
      Math.min(maxDistance, 50000)
    );
    const networkNames = new Set(networkHospitals.map((h) => h.name?.toLowerCase()));
    const uniqueOverpass = overpassHospitals.filter(
      (o) => !networkNames.has(o.name?.toLowerCase())
    );
    results = [...networkHospitals, ...uniqueOverpass].sort((a, b) => a.distance - b.distance);
    console.log('[Nearby] Added Overpass places:', uniqueOverpass.length);
  }

  if (networkHospitals.length === 0 && results.length === 0) {
    console.log('[Nearby] No hospitals within range — not returning distant seeded data');
  }

  console.log('[Nearby] Total results:', results.length);

  res.json({
    success: true,
    userLocation: {
      latitude,
      longitude,
      city: userLocation?.city || '',
      state: userLocation?.state || '',
      country: userLocation?.country || '',
      displayName: userLocation?.displayName || '',
    },
    data: results,
  });
});

export const getHospital = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.params.id).populate('departments');
  if (!hospital) throw new AppError('Hospital not found', 404);

  const [departments, doctors, beds] = await Promise.all([
    Department.find({ hospitalId: hospital._id, isActive: true }),
    Doctor.find({
      isVerified: true,
      $or: [{ hospitalId: hospital._id }, { hospital: hospital._id }],
    })
      .populate('user', 'firstName lastName avatar')
      .populate('departmentId', 'name'),
    BedAvailability.findOne({ hospitalId: hospital._id }),
  ]);

  res.json({
    success: true,
    data: {
      hospital,
      departments,
      doctors,
      bedAvailability: beds,
      doctorCount: doctors.length,
    },
  });
});

export const getHospitalDoctors = asyncHandler(async (req, res) => {
  const filter = {
    isVerified: true,
    $or: [{ hospitalId: req.params.id }, { hospital: req.params.id }],
  };
  if (req.query.departmentId) {
    filter.$and = [
      { $or: [{ departmentId: req.query.departmentId }, { department: req.query.departmentId }] },
    ];
  }
  if (req.query.specialization) {
    filter.specialization = new RegExp(req.query.specialization, 'i');
  }

  const doctors = await Doctor.find(filter)
    .populate('user', 'firstName lastName avatar phone')
    .populate('departmentId', 'name')
    .sort('-rating');

  res.json({ success: true, data: doctors });
});

export const compareHospitals = asyncHandler(async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean);
  if (ids.length < 2) throw new AppError('Provide at least 2 hospital ids via ?ids=id1,id2', 400);

  const hospitals = await Hospital.find({ _id: { $in: ids } });
  const beds = await BedAvailability.find({ hospitalId: { $in: ids } });
  const departments = await Department.find({ hospitalId: { $in: ids } });

  const comparison = hospitals.map((h) => ({
    hospital: h,
    beds: beds.find((b) => b.hospitalId.toString() === h._id.toString()),
    departmentCount: departments.filter((d) => d.hospitalId.toString() === h._id.toString()).length,
  }));

  res.json({ success: true, data: comparison });
});

export const createHospital = asyncHandler(async (req, res) => {
  const coords = req.body.longitude && req.body.latitude
    ? [parseFloat(req.body.longitude), parseFloat(req.body.latitude)]
    : req.body.location?.coordinates;

  const hospital = await Hospital.create({
    ...req.body,
    location: coords ? { type: 'Point', coordinates: coords } : undefined,
    emergencyAvailable: req.body.emergencyAvailable ?? true,
  });

  await BedAvailability.create({
    hospitalId: hospital._id,
    icuBeds: 10,
    icuAvailable: 3,
    emergencyBeds: 20,
    emergencyAvailable: 8,
    generalBeds: hospital.totalBeds || 50,
    generalAvailable: hospital.availableBeds || 20,
  });

  res.status(201).json({ success: true, data: hospital });
});

export const updateHospital = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!hospital) throw new AppError('Hospital not found', 404);
  res.json({ success: true, data: hospital });
});

export const manageRooms = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.params.id);
  if (!hospital) throw new AppError('Hospital not found', 404);

  if (req.body.action === 'add') hospital.rooms.push(req.body.room);
  else if (req.body.action === 'update' && req.body.roomId) {
    const room = hospital.rooms.id(req.body.roomId);
    if (room) Object.assign(room, req.body.room);
  }

  hospital.totalBeds = hospital.rooms.reduce((sum, r) => sum + r.beds, 0);
  hospital.availableBeds = hospital.rooms.reduce((sum, r) => sum + (r.beds - r.occupiedBeds), 0);
  await hospital.save();

  res.json({ success: true, data: hospital });
});
