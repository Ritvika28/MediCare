import mongoose from 'mongoose';

const medicalHistorySchema = new mongoose.Schema(
  {
    condition: String,
    diagnosis: String,
    treatment: String,
    diagnosedAt: Date,
    notes: String,
  },
  { _id: true }
);

const patientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' },
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    allergies: [String],
    medicalHistory: [medicalHistorySchema],
    insuranceProvider: String,
    insuranceNumber: String,
  },
  { timestamps: true }
);


export const Patient = mongoose.model('Patient', patientSchema);
