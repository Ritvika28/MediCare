import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday, 6 = Saturday
    startTime: { type: String, required: true }, // e.g. "09:00"
    endTime: { type: String, required: true },   // e.g. "17:00"
    slotDuration: { type: Number, default: 30 }, // duration in minutes
    blockedDates: [{ type: Date }], // specific calendar dates where slots are disabled
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

scheduleSchema.index({ doctorId: 1, dayOfWeek: 1 });
scheduleSchema.index({ hospitalId: 1 });

export const Schedule = mongoose.model('Schedule', scheduleSchema);
