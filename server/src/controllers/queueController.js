import { asyncHandler } from '../utils/asyncHandler.js';
import { syncDoctorQueue, getOrCreateQueue } from '../services/queueService.js';
import { AppError } from '../utils/AppError.js';

export const getDoctorQueue = asyncHandler(async (req, res) => {
  const queue = await syncDoctorQueue(req.params.doctorId);
  res.json({ success: true, data: queue });
});

export const updateQueue = asyncHandler(async (req, res) => {
  const queue = await syncDoctorQueue(req.params.doctorId);
  if (req.body.status) {
    const item = queue.appointments.id(req.body.appointmentId);
    if (item) item.status = req.body.status;
    await queue.save();
  }
  const updated = await syncDoctorQueue(req.params.doctorId);
  res.json({ success: true, data: updated });
});
