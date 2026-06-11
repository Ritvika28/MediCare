import { Review } from '../models/Review.js';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const updateDoctorRating = async (doctorId) => {
  const stats = await Review.aggregate([
    { $match: { doctor: doctorId, isVisible: true } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Doctor.findByIdAndUpdate(doctorId, {
    rating: stats[0]?.avgRating ? Math.round(stats[0].avgRating * 10) / 10 : 0,
    reviewCount: stats[0]?.count || 0,
  });
};

export const createReview = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile required', 404);

  const existing = await Review.findOne({ patient: patient._id, doctor: req.body.doctorId });
  if (existing) throw new AppError('You have already reviewed this doctor', 400);

  const review = await Review.create({
    patient: patient._id,
    doctor: req.body.doctorId,
    appointment: req.body.appointmentId,
    rating: req.body.rating,
    comment: req.body.comment,
  });

  await updateDoctorRating(req.body.doctorId);
  res.status(201).json({ success: true, data: review });
});

export const getDoctorReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ doctor: req.params.doctorId, isVisible: true })
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName avatar' } })
    .sort('-createdAt');
  res.json({ success: true, data: reviews });
});
