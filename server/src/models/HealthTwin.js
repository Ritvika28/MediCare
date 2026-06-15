import mongoose from 'mongoose';

const radarDataSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  score: { type: Number, required: true }
}, { _id: false });

const riskDistSchema = new mongoose.Schema({
  risk: { type: String, required: true },
  score: { type: Number, required: true }
}, { _id: false });

const healthTwinSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  healthAge: { type: Number, required: true },
  biologicalAgeEstimate: { type: Number, required: true },
  healthStabilityIndex: { type: Number, required: true }, // 0 to 100
  radarData: [radarDataSchema],
  riskDistribution: [riskDistSchema],
  strongAreas: [{ type: String }],
  riskAreas: [{ type: String }],
  improvementOpportunities: [{ type: String }],
  healthTwinScore: { type: Number, required: true } // 0 to 100
}, { timestamps: true });

healthTwinSchema.index({ userId: 1, createdAt: -1 });

export const HealthTwin = mongoose.model('HealthTwin', healthTwinSchema);
