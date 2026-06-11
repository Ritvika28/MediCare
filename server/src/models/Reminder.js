import mongoose from 'mongoose';

const complianceLogSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  time: { type: String, required: true }, // Format: HH:MM
  status: { type: String, enum: ['taken', 'skipped', 'missed'], default: 'missed' }
}, { _id: true });

const reminderSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  medicineName: { type: String, required: true, trim: true },
  dosage: { type: String, required: true, trim: true }, // e.g., "1 pill", "5ml"
  frequency: { type: String, enum: ['once_daily', 'twice_daily', 'thrice_daily', 'custom'], required: true },
  times: [{ type: String, required: true }], // array of times, e.g., ["09:00", "21:00"]
  instructions: { type: String, enum: ['before_food', 'after_food', 'with_food', 'empty_stomach'], default: 'after_food' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  logs: [complianceLogSchema],
  adherenceRate: { type: Number, default: 0, min: 0, max: 100 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

reminderSchema.index({ patient: 1, startDate: -1 });

export const Reminder = mongoose.model('Reminder', reminderSchema);
