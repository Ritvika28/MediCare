import mongoose from 'mongoose';

const bedAvailabilitySchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, unique: true },
    icuBeds: { type: Number, default: 0 },
    icuAvailable: { type: Number, default: 0 },
    emergencyBeds: { type: Number, default: 0 },
    emergencyAvailable: { type: Number, default: 0 },
    generalBeds: { type: Number, default: 0 },
    generalAvailable: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const BedAvailability = mongoose.model('BedAvailability', bedAvailabilitySchema);
