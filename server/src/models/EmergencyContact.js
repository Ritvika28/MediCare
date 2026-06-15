import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  relationship: { type: String, default: 'Family' },
  isPrimary: { type: Boolean, default: false },
  notifyOnSOS: { type: Boolean, default: true },
}, { timestamps: true });

export const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);
