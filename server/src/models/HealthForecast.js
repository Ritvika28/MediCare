import mongoose from 'mongoose';

const forecastSchema = new mongoose.Schema({
  days: { type: Number, enum: [7, 30, 90], required: true },
  score: { type: Number, required: true },
  description: { type: String },
  potentialRisks: [{ type: String }],
  projectedImprovements: [{ type: String }]
}, { _id: false });

const healthForecastSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  forecasts: [forecastSchema]
}, { timestamps: true });

healthForecastSchema.index({ userId: 1, createdAt: -1 });

export const HealthForecast = mongoose.model('HealthForecast', healthForecastSchema);
