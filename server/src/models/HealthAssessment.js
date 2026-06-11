import mongoose from 'mongoose';

const healthAssessmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  answers: {
    age: { type: Number, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    height: { type: Number, required: true }, // in cm
    weight: { type: Number, required: true }, // in kg
    smoking: { type: String, enum: ['never', 'former', 'light', 'heavy'], required: true },
    alcohol: { type: String, enum: ['never', 'occasional', 'regular'], required: true },
    diabetes: { type: Boolean, default: false },
    bloodPressure: { type: String, enum: ['normal', 'prehypertension', 'stage1', 'stage2'], required: true },
    exercise: { type: String, enum: ['none', 'occasional', 'active'], required: true },
    sleep: { type: Number, required: true }, // hours per night
    stress: { type: String, enum: ['low', 'moderate', 'high'], required: true },
    familyHistory: [{ type: String }] // e.g. ["heart_disease", "diabetes", "hypertension"]
  },
  riskScore: { type: Number, required: true, min: 0, max: 100 }, // Calculated risk percentage
  healthScore: { type: Number, required: true, min: 0, max: 100 }, // Calculated wellness score
  lifestyleAdvice: [{ type: String }],
  recommendedDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
  recommendedHospitals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }]
}, { timestamps: true });

healthAssessmentSchema.index({ patient: 1, createdAt: -1 });

export const HealthAssessment = mongoose.model('HealthAssessment', healthAssessmentSchema);
