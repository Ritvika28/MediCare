import mongoose from 'mongoose';

const recommendedHospitalSchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: false },
  name: { type: String },
  address: { type: String },
  city: { type: String },
  score: { type: Number, required: true },
  reasons: [{ type: String }],
  distance: { type: Number }
}, { _id: false });

const recommendedDoctorSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  score: { type: Number, required: true },
  reasons: [{ type: String }]
}, { _id: false });

const recommendedLabSchema = new mongoose.Schema({
  name: { type: String, required: true },
  distance: { type: Number },
  rating: { type: Number },
  address: { type: String },
  score: { type: Number },
  reasons: [{ type: String }]
}, { _id: false });

const recommendedBloodBankSchema = new mongoose.Schema({
  name: { type: String, required: true },
  distance: { type: Number },
  address: { type: String },
  score: { type: Number },
  reasons: [{ type: String }]
}, { _id: false });

const hospitalRecommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recommendedHospitals: [recommendedHospitalSchema],
  recommendedDoctors: [recommendedDoctorSchema],
  recommendedLabs: [recommendedLabSchema],
  recommendedBloodBanks: [recommendedBloodBankSchema],
}, { timestamps: true });

hospitalRecommendationSchema.index({ userId: 1, createdAt: -1 });

export const HospitalRecommendation = mongoose.model('HospitalRecommendation', hospitalRecommendationSchema);
