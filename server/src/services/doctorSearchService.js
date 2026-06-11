import mongoose from 'mongoose';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { Hospital } from '../models/Hospital.js';

export const searchDoctors = async (params) => {
  const {
    search,
    doctorName,
    hospitalName,
    hospitalId,
    departmentId,
    specialization,
    city,
    minExperience,
    maxFee,
    minRating,
    availabilityToday,
    gender,
    language,
    sort,
    page = 1,
    limit = 10,
  } = params;

  const query = {};

  // Active and verified by default (unless admin requests otherwise)
  query.isActive = true;
  query.isVerified = true;

  // Filter by doctor name or general search
  if (doctorName || search) {
    const namePattern = doctorName || search;
    const users = await User.find({
      $or: [
        { firstName: new RegExp(namePattern, 'i') },
        { lastName: new RegExp(namePattern, 'i') },
      ],
    }).select('_id');
    const userIds = users.map((u) => u._id);
    query.user = { $in: userIds };
  }

  // Filter by specialization
  if (specialization) {
    query.specialization = new RegExp(specialization, 'i');
  }

  // Filter by department
  if (departmentId) {
    query.departmentId = departmentId;
  }

  // Filter by gender
  if (gender) {
    query.gender = gender;
  }

  // Filter by language
  if (language) {
    query.languages = { $in: [language] };
  }

  // Filter by experience
  if (minExperience) {
    query.experienceYears = { $gte: parseInt(minExperience, 10) };
  }

  // Filter by fee
  if (maxFee) {
    const feeLimit = parseInt(maxFee, 10);
    query.$or = [
      { consultationFee: { $lte: feeLimit } },
      { onlineConsultationFee: { $lte: feeLimit } },
    ];
  }

  // Filter by rating
  if (minRating) {
    query.averageRating = { $gte: parseFloat(minRating) };
  }

  // Filter by hospital ID directly
  if (hospitalId) {
    query.hospitalId = hospitalId;
  }

  // Filter by hospital name or city
  const hospitalFilter = {};
  if (hospitalName) {
    hospitalFilter.name = new RegExp(hospitalName, 'i');
  }
  if (city) {
    hospitalFilter['address.city'] = new RegExp(city, 'i');
  }

  if (Object.keys(hospitalFilter).length > 0) {
    const hospitals = await Hospital.find(hospitalFilter).select('_id');
    const hospitalIds = hospitals.map((h) => h._id);
    
    if (query.hospitalId) {
      // Intersection check
      if (!hospitalIds.map(String).includes(String(query.hospitalId))) {
        return { doctors: [], total: 0 };
      }
    } else {
      query.hospitalId = { $in: hospitalIds };
    }
  }

  // Filter by availability today
  if (availabilityToday === 'true') {
    const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    const activeSchedules = await mongoose.model('Schedule').find({
      dayOfWeek: today,
      isActive: true,
    }).select('doctorId');
    const docIds = activeSchedules.map((s) => s.doctorId);
    
    if (query._id) {
      // intersect if query._id is already set
      const existingIds = Array.isArray(query._id.$in) ? query._id.$in.map(String) : [String(query._id)];
      const intersected = docIds.map(String).filter(id => existingIds.includes(id));
      query._id = { $in: intersected };
    } else {
      query._id = { $in: docIds };
    }
  }

  // Build query
  let dbQuery = Doctor.find(query)
    .populate('user', 'firstName lastName avatar phone email')
    .populate('departmentId', 'name icon description')
    .populate('hospitalId', 'name logo coverImage address rating reviewCount');

  // Sorting
  if (sort === 'experience') {
    dbQuery = dbQuery.sort({ experienceYears: -1 });
  } else if (sort === 'rating') {
    dbQuery = dbQuery.sort({ averageRating: -1 });
  } else if (sort === 'fee') {
    dbQuery = dbQuery.sort({ consultationFee: 1 });
  } else {
    // Default sorting by rating descending
    dbQuery = dbQuery.sort({ averageRating: -1 });
  }

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;
  dbQuery = dbQuery.skip(skip).limit(limitNum);

  const [doctors, total] = await Promise.all([
    dbQuery,
    Doctor.countDocuments(query),
  ]);

  return { doctors, total };
};
