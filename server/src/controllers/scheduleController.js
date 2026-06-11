import { Schedule } from '../models/Schedule.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const createSchedule = asyncHandler(async (req, res) => {
  const { doctorId, hospitalId, dayOfWeek, startTime, endTime, slotDuration, blockedDates } = req.body;

  if (!doctorId || !hospitalId || dayOfWeek === undefined || !startTime || !endTime) {
    throw new AppError('doctorId, hospitalId, dayOfWeek, startTime, and endTime are required', 400);
  }

  let schedule = await Schedule.findOne({ doctorId, hospitalId, dayOfWeek });

  if (schedule) {
    schedule.startTime = startTime;
    schedule.endTime = endTime;
    if (slotDuration !== undefined) schedule.slotDuration = slotDuration;
    if (blockedDates !== undefined) schedule.blockedDates = blockedDates;
    await schedule.save();
  } else {
    schedule = await Schedule.create({
      doctorId,
      hospitalId,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
      blockedDates
    });
  }

  res.status(201).json({ success: true, data: schedule });
});

export const getDoctorSchedules = asyncHandler(async (req, res) => {
  const schedules = await Schedule.find({ doctorId: req.params.doctorId });
  res.json({ success: true, data: schedules });
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);
  if (!schedule) throw new AppError('Schedule not found', 404);
  await schedule.deleteOne();
  res.json({ success: true, message: 'Schedule removed' });
});
