import mongoose from 'mongoose';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { Hospital } from '../models/Hospital.js';

const SPECIALIZATION_ALIASES = {
  cardiologist: 'Cardiology',
  neurologist: 'Neurology',
  dermatologist: 'Dermatology',
  pediatrician: 'Pediatrics',
  orthopedist: 'Orthopedics',
  orthopedic: 'Orthopedics',
  gastroenterologist: 'Gastroenterology',
  ophthalmologist: 'Ophthalmology',
  psychiatrist: 'Psychiatry',
  pulmonologist: 'Pulmonology',
  physician: 'General Medicine',
};

export const searchDoctors = async (params) => {
  const {
    search,
    doctorName,
    name,
    hospitalName,
    hospitalId,
    departmentId,
    specialization,
    city,
    state,
    minExperience,
    maxFee,
    minRating,
    availabilityToday,
    gender,
    language,
    consultationMode,
    sort,
    page = 1,
    limit = 10,
  } = params;

  const query = { isActive: true, isVerified: true };
  const andConditions = [];

  const nameQuery = search || doctorName || name;
  if (nameQuery) {
    const trimmed = nameQuery.trim();
    let specFromAlias = null;
    for (const [alias, spec] of Object.entries(SPECIALIZATION_ALIASES)) {
      if (trimmed.toLowerCase().includes(alias)) {
        specFromAlias = spec;
        break;
      }
    }

    if (specFromAlias) {
      query.specialization = new RegExp(specFromAlias, 'i');
    } else {
      const searchRegex = new RegExp(trimmed, 'i');
      const users = await User.find({
        $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
      }).select('_id');
      const userIds = users.map((u) => u._id);

      const hospitals = await Hospital.find({ name: searchRegex }).select('_id');
      const hospitalIds = hospitals.map((h) => h._id);

      andConditions.push({
        $or: [
          { user: { $in: userIds } },
          { specialization: searchRegex },
          { qualification: searchRegex },
          { hospitalId: { $in: hospitalIds } },
          { hospital: { $in: hospitalIds } },
        ],
      });
    }
  }

  if (specialization) {
    query.specialization = new RegExp(specialization.trim(), 'i');
  }

  if (departmentId) {
    andConditions.push({
      $or: [{ departmentId }, { department: departmentId }],
    });
  }

  if (gender) query.gender = gender;
  if (language) query.languages = { $in: [language] };
  if (minExperience) query.experience = { $gte: parseInt(minExperience, 10) };
  if (minRating) query.rating = { $gte: parseFloat(minRating) };

  if (maxFee) {
    const feeLimit = parseInt(maxFee, 10);
    andConditions.push({
      $or: [
        { consultationFee: { $lte: feeLimit } },
        { onlineConsultationFee: { $lte: feeLimit } },
      ],
    });
  }

  if (consultationMode === 'video' || consultationMode === 'audio') {
    query.consultationModes = { $in: [consultationMode] };
  } else if (consultationMode === 'physical') {
    query.consultationModes = { $in: ['physical'] };
  }

  if (hospitalId) {
    andConditions.push({
      $or: [{ hospitalId }, { hospital: hospitalId }],
    });
  }

  const hospitalFilter = {};
  if (hospitalName) hospitalFilter.name = new RegExp(hospitalName.trim(), 'i');
  if (city) hospitalFilter['address.city'] = new RegExp(city.trim(), 'i');
  if (state) hospitalFilter['address.state'] = new RegExp(state.trim(), 'i');

  if (Object.keys(hospitalFilter).length > 0) {
    const hospitals = await Hospital.find(hospitalFilter).select('_id');
    const hospitalIds = hospitals.map((h) => h._id.toString());

    if (hospitalId) {
      if (!hospitalIds.includes(String(hospitalId))) {
        return { doctors: [], total: 0 };
      }
    } else {
      andConditions.push({
        $or: [
          { hospitalId: { $in: hospitalIds } },
          { hospital: { $in: hospitalIds } },
        ],
      });
    }
  }

  if (availabilityToday === 'true') {
    const today = new Date().getDay();
    const activeSchedules = await mongoose.model('Schedule').find({
      dayOfWeek: today,
      isActive: true,
    }).select('doctorId');
    const docIds = activeSchedules.map((s) => s.doctorId);
    query._id = { $in: docIds };
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  let dbQuery = Doctor.find(query)
    .populate('user', 'firstName lastName avatar phone email')
    .populate('departmentId', 'name icon description')
    .populate('department', 'name icon description')
    .populate('hospitalId', 'name logo coverImage address rating reviewCount')
    .populate('hospital', 'name logo coverImage address rating reviewCount');

  if (sort === 'experience') dbQuery = dbQuery.sort({ experience: -1 });
  else if (sort === 'fee') dbQuery = dbQuery.sort({ consultationFee: 1 });
  else dbQuery = dbQuery.sort({ rating: -1 });

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;
  dbQuery = dbQuery.skip(skip).limit(limitNum);

  const [doctors, total] = await Promise.all([dbQuery, Doctor.countDocuments(query)]);

  return { doctors, total };
};
