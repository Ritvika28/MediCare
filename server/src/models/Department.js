import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: 'Activity' },
    description: { type: String, maxlength: 1000 },
    headDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    floor: String,
    phone: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentSchema.index({ hospitalId: 1, name: 1 }, { unique: true });
departmentSchema.index({ hospitalId: 1 });
departmentSchema.index({ name: 'text' });

export const Department = mongoose.model('Department', departmentSchema);
