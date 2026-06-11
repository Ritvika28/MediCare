import { Reminder } from '../models/Reminder.js';
import { Patient } from '../models/Patient.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Get all reminders for patient
export const getReminders = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const reminders = await Reminder.find({ patient: patient._id }).sort('-createdAt');
  res.json({ success: true, data: reminders });
});

// Create new medicine reminder
export const createReminder = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const reminder = await Reminder.create({
    patient: patient._id,
    medicineName: req.body.medicineName,
    dosage: req.body.dosage,
    frequency: req.body.frequency,
    times: req.body.times,
    instructions: req.body.instructions || 'after_food',
    startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
    endDate: req.body.endDate ? new Date(req.body.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
  });

  res.status(201).json({ success: true, data: reminder });
});

// Update reminder
export const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) throw new AppError('Reminder not found', 404);

  // Update fields
  if (req.body.medicineName) reminder.medicineName = req.body.medicineName;
  if (req.body.dosage) reminder.dosage = req.body.dosage;
  if (req.body.frequency) reminder.frequency = req.body.frequency;
  if (req.body.times) reminder.times = req.body.times;
  if (req.body.instructions) reminder.instructions = req.body.instructions;
  if (req.body.startDate) reminder.startDate = new Date(req.body.startDate);
  if (req.body.endDate) reminder.endDate = new Date(req.body.endDate);
  if (req.body.isActive !== undefined) reminder.isActive = req.body.isActive;

  await reminder.save();
  res.json({ success: true, data: reminder });
});

// Delete reminder
export const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findByIdAndDelete(req.params.id);
  if (!reminder) throw new AppError('Reminder not found', 404);

  res.json({ success: true, message: 'Reminder deleted' });
});

// Log compliance (taken, skipped, missed)
export const logCompliance = asyncHandler(async (req, res) => {
  const { date, time, status } = req.body;
  if (!date || !time || !status) throw new AppError('Date, time, and status are required', 400);

  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) throw new AppError('Reminder not found', 404);

  // Check if log already exists for this date and time
  const existingLogIndex = reminder.logs.findIndex((l) => l.date === date && l.time === time);

  if (existingLogIndex > -1) {
    reminder.logs[existingLogIndex].status = status;
  } else {
    reminder.logs.push({ date, time, status });
  }

  // Calculate adherence rate
  const totalLogs = reminder.logs.length;
  const takenLogs = reminder.logs.filter((l) => l.status === 'taken').length;
  reminder.adherenceRate = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 0;

  await reminder.save();

  res.json({ success: true, data: reminder });
});
