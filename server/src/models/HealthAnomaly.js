import mongoose from 'mongoose';

const healthAnomalySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  metricType: { type: String, required: true }, // e.g. 'blood_sugar', 'blood_pressure', 'sleep', 'stress', 'bmi', 'hydration', 'heart_health'
  anomalyType: { type: String, required: true }, // e.g. 'spike', 'drop', 'streak', 'sudden_increase', 'sudden_decrease', 'sleep_collapse'
  value: { type: mongoose.Schema.Types.Mixed },
  previousValue: { type: mongoose.Schema.Types.Mixed },
  deviation: { type: Number },
  severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'moderate' },
  message: { type: String, required: true },
  status: { type: String, enum: ['active', 'resolved', 'acknowledged'], default: 'active' }
}, { timestamps: true });

healthAnomalySchema.index({ userId: 1, createdAt: -1 });
healthAnomalySchema.index({ userId: 1, status: 1 });

export const HealthAnomaly = mongoose.model('HealthAnomaly', healthAnomalySchema);
