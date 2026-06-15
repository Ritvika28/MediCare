import mongoose from 'mongoose';

const healthCalculatorHistorySchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  calculatorType: {
    type: String,
    enum: [
      'bmi', 'bmr', 'body_fat', 'calorie', 'ideal_weight', 'water_intake',
      'pregnancy_due_date', 'period_tracker', 'pregnancy_tracker', 'heart_health', 'diabetes_risk'
    ],
    required: true
  },
  inputs: { type: mongoose.Schema.Types.Mixed, required: true },
  outputs: { type: mongoose.Schema.Types.Mixed, required: true },
  resultSummary: { type: String, required: true }
}, { timestamps: true });

healthCalculatorHistorySchema.index({ patient: 1, calculatorType: 1, createdAt: -1 });

export const HealthCalculatorHistory = mongoose.model('HealthCalculatorHistory', healthCalculatorHistorySchema);
