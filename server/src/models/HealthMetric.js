import mongoose from 'mongoose';

const healthMetricSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  metricType: {
    type: String,
    required: true,
    enum: [
      'bmi', 'bmr', 'body_fat', 'calorie', 'ideal_weight', 'water_intake',
      'period_tracker', 'pregnancy_tracker', 'heart_health', 'diabetes_risk',
      'blood_pressure', 'blood_sugar', 'cholesterol', 'kidney_health',
      'liver_health', 'stress_assessment', 'pcos_risk', 'sleep_assessment',
    ],
  },
  value: { type: mongoose.Schema.Types.Mixed },
  score: { type: Number },
  riskLevel: { type: String },
  metadata: {
    inputs: mongoose.Schema.Types.Mixed,
    outputs: mongoose.Schema.Types.Mixed,
    resultSummary: String,
    recommendations: [String],
    historyId: mongoose.Schema.Types.ObjectId,
  },
}, { timestamps: true });

healthMetricSchema.index({ patientId: 1, metricType: 1, createdAt: -1 });
healthMetricSchema.index({ userId: 1, createdAt: -1 });

export const HealthMetric = mongoose.model('HealthMetric', healthMetricSchema);
