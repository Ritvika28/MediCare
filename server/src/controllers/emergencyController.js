import { EmergencyRequest } from '../models/EmergencyRequest.js';
import { Patient } from '../models/Patient.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { findNearestEmergencyHospital, createEmergencyRequest as createEmergency } from '../services/emergencyService.js';

export const getNearestEmergency = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) throw new AppError('Latitude and longitude required', 400);

  const result = await findNearestEmergencyHospital(lat, lng);
  if (!result) throw new AppError('No emergency hospital found nearby', 404);

  res.json({ success: true, data: result });
});

export const postEmergencyRequest = asyncHandler(async (req, res) => {
  const result = await createEmergency(req.user._id, req.body);
  res.status(201).json({ success: true, data: result });
});

export const getEmergencyRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ user: req.user._id });
    filter.patient = patient?._id;
  }
  const requests = await EmergencyRequest.find(filter)
    .populate('hospital', 'name phone address')
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName phone' } })
    .sort('-createdAt');
  res.json({ success: true, data: requests });
});

export const updateEmergencyStatus = asyncHandler(async (req, res) => {
  const emergency = await EmergencyRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status,
      notes: req.body.notes,
      resolvedAt: req.body.status === 'resolved' ? new Date() : undefined,
    },
    { new: true }
  );
  if (!emergency) throw new AppError('Request not found', 404);
  res.json({ success: true, data: emergency });
});
