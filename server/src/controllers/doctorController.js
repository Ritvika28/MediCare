import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { Review } from '../models/Review.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import { searchDoctors, searchDoctorsNearby } from '../services/doctorSearchService.js';

export const getDoctors = asyncHandler(async (req, res) => {
  const hasCoords = req.query.latitude || req.query.lat;
  const { doctors, total } = hasCoords
    ? await searchDoctorsNearby(req.query)
    : await searchDoctors(req.query);

  res.json({
    success: true,
    data: doctors,
    pagination: {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
      total,
    },
  });
});

export const getDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
    .populate('user', 'firstName lastName avatar phone email')
    .populate('department', 'name description')
    .populate('hospital', 'name address phone logo coverImage facilities rating reviewCount');

  if (!doctor) throw new AppError('Doctor not found', 404);

  const reviews = await Review.find({ doctor: doctor._id, isVisible: true })
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName' } })
    .sort('-createdAt')
    .limit(10);

  res.json({ success: true, data: { doctor, reviews } });
});

export const updateDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw new AppError('Doctor profile not found', 404);

  const allowed = ['specialization', 'experience', 'consultationFee', 'bio', 'education', 'languages', 'schedule', 'blockedDates'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) doctor[key] = req.body[key];
  });
  await doctor.save();

  if (req.body.firstName || req.body.lastName || req.body.phone || req.body.avatar) {
    await User.findByIdAndUpdate(req.user._id, {
      ...(req.body.firstName && { firstName: req.body.firstName }),
      ...(req.body.lastName && { lastName: req.body.lastName }),
      ...(req.body.phone && { phone: req.body.phone }),
      ...(req.body.avatar && { avatar: req.body.avatar }),
    });
  }

  res.json({ success: true, data: doctor });
});

export const getAvailableSlots = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw new AppError('Doctor not found', 404);

  const slots = await calculateAvailableSlots(doctor._id, req.query.date);
  res.json({ success: true, data: slots });
});

// Admin
export const createDoctor = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, ...doctorData } = req.body;

  const user = await User.create({
    email,
    password: password || 'ChangeMe123!',
    firstName,
    lastName,
    phone,
    role: 'doctor',
  });

  const doctor = await Doctor.create({ user: user._id, ...doctorData });
  const populated = await doctor.populate('user', 'firstName lastName email');

  res.status(201).json({ success: true, data: populated });
});

export const adminUpdateDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('user', 'firstName lastName email');
  if (!doctor) throw new AppError('Doctor not found', 404);
  res.json({ success: true, data: doctor });
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw new AppError('Doctor not found', 404);
  await User.findByIdAndUpdate(doctor.user, { isActive: false });
  await doctor.deleteOne();
  res.json({ success: true, message: 'Doctor removed' });
});

export const verifyDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
  if (!doctor) throw new AppError('Doctor not found', 404);
  res.json({ success: true, data: doctor });
});
