import mongoose from 'mongoose';

const healthCalculatorHistorySchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  calculatorType: {
    type: String,
    enum: [
      'bmi', 'bmr', 'body_fat', 'calorie', 'ideal_weight', 'water_intake',
      'period_tracker', 'pregnancy_tracker', 'heart_health', 'diabetes_risk',
      'blood_pressure', 'blood_sugar', 'cholesterol', 'kidney_health',
      'liver_health', 'stress_assessment', 'pcos_risk', 'sleep_assessment',
    ],
    required: true,
  },
  inputs: { type: mongoose.Schema.Types.Mixed, required: true },
  outputs: { type: mongoose.Schema.Types.Mixed, required: true },
  resultSummary: { type: String, required: true },
  status: { type: String },
  recommendations: [{ type: String }],
}, { timestamps: true });

healthCalculatorHistorySchema.index({ patient: 1, calculatorType: 1, createdAt: -1 });
healthCalculatorHistorySchema.index({ patient: 1, createdAt: -1 });

export const HealthCalculatorHistory = mongoose.model('HealthCalculatorHistory', healthCalculatorHistorySchema);
