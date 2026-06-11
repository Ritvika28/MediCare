import mongoose from 'mongoose';

const facilitySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. "ICU", "MRI Scan", "Blood Bank"
  description: String,
  type: { type: String, default: 'medical' }, // 'medical', 'amenity', 'diagnostic'
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true }
}, { timestamps: true });

facilitySchema.index({ hospital: 1 });

export const Facility = mongoose.model('Facility', facilitySchema);
