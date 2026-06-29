import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

reviewSchema.index({ doctor: 1, createdAt: -1 });
reviewSchema.index({ patient: 1, doctor: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
