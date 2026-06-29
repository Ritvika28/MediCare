import { Hospital } from '../models/Hospital.js';
import { Department } from '../models/Department.js';
import { Doctor } from '../models/Doctor.js';
import { BedAvailability } from '../models/BedAvailability.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { enrichHospitalsWithDistance } from '../services/locationService.js';
import { reverseGeocode, forwardGeocode } from '../services/geocodeService.js';
import { fetchNearbyHospitalsFromOverpass } from '../services/overpassService.js';
import { searchHospitals, buildHospitalSearchFilter } from '../services/hospitalSearchService.js';
import { getRouteDirections } from '../services/openRouteService.js';
import { unifiedSearchHealthcare } from '../services/searchEngineService.js';

export const getHospitals = asyncHandler(async (req, res) => {
  const {
    search,
    query,
    city,
    lat,
    latitude,
    lng,
    longitude,
    radius,
    maxDistance,
    facilities,
    rating,
    verified,
    emergency,
    specialty,
    page = 1,
    limit = 20
  } = req.query;

  const searchQueryStr = search || query || '';
  const searchLat = lat || latitude;
  const searchLng = lng || longitude;
  const searchRadiusKm = radius ? parseFloat(radius) : (maxDistance ? parseFloat(maxDistance) / 1000 : 10);

  const results = await unifiedSearchHealthcare({
    query: searchQueryStr,
    latitude: parseFloat(searchLat),
    longitude: parseFloat(searchLng),
    radius: searchRadiusKm,
    city: city !== 'All' ? city : undefined,
    entityType: 'hospital',
    filters: {
      facilities,
      rating,
      verified: verified === 'true' || verified === true,
      emergency: emergency === 'true' || emergency === true,
      specialty
    }
  }, req.user?._id);

  const total = results.results.length;
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 20;
  const start = (p - 1) * l;
  const paginatedData = results.results.slice(start, start + l);

  res.json({
    success: true,
    data: paginatedData,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l) || 1,
    userLocation: {
      latitude: results.latitude,
      longitude: results.longitude,
      city: results.city
    }
  });
});

export const getNearbyHospitals = asyncHandler(async (req, res) => {
  const {
    search,
    query,
    city,
    lat,
    latitude,
    lng,
    longitude,
    radius,
    maxDistance,
    facilities,
    rating,
    verified,
    emergency,
    specialty
  } = req.query;

  const searchQueryStr = search || query || '';
  const searchLat = lat || latitude;
  const searchLng = lng || longitude;
  const searchRadiusKm = radius ? parseFloat(radius) : (maxDistance ? parseFloat(maxDistance) / 1000 : 10);

  const results = await unifiedSearchHealthcare({
    query: searchQueryStr,
    latitude: parseFloat(searchLat),
    longitude: parseFloat(searchLng),
    radius: searchRadiusKm,
    city: city !== 'All' ? city : undefined,
    entityType: 'hospital',
    filters: {
      facilities,
      rating,
      verified: verified === 'true' || verified === true,
      emergency: emergency === 'true' || emergency === true,
      specialty
    }
  }, req.user?._id);

  res.json({
    success: true,
    userLocation: {
      latitude: results.latitude,
      longitude: results.longitude,
      city: results.city,
    },
    data: results.results,
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
      {
        $or: [
          { departmentId: req.query.departmentId },
          { department: req.query.departmentId },
        ],
      },
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

export const getRoute = asyncHandler(async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;
  if (!startLat || !startLng || !endLat || !endLng) {
    throw new AppError('startLat, startLng, endLat, and endLng are required', 400);
  }
  const data = await getRouteDirections(startLat, startLng, endLat, endLng);
  res.json({ success: true, data });
});

export const geocode = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query) throw new AppError('query is required', 400);
  const data = await forwardGeocode(query);
  res.json({ success: true, data });
});

export const reverseGeocodeRoute = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) throw new AppError('lat and lng are required', 400);
  const data = await reverseGeocode(lat, lng);
  res.json({ success: true, data });
});

