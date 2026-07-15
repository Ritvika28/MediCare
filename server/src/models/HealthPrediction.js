import mongoose from 'mongoose';

const healthPredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  predictionType: { 
    type: String, 
    required: true,
    enum: [
      'diabetes', 
      'hypertension', 
      'heart_disease', 
      'kidney_disease', 
      'liver_disease', 
      'obesity', 
      'pcos', 
      'sleep_disorder', 
      'mental_stress_risk'
    ]
  },
  score: { type: Number, required: true }, // 0 to 100 percentage
  riskLevel: { type: String, enum: ['Low', 'Moderate', 'High', 'Critical'], required: true },
  confidence: { type: Number, required: true }, // 0 to 100 confidence level
  contributingFactors: [{ type: String }],
  recommendations: [{ type: String }],
  explanations: {
    positive: [{ feature: String, value: Number }],
    negative: [{ feature: String, value: Number }]
  },
}, { timestamps: true });

healthPredictionSchema.index({ userId: 1, predictionType: 1, createdAt: -1 });

export const HealthPrediction = mongoose.model('HealthPrediction', healthPredictionSchema);
