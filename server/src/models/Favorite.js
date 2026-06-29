import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entityId: { type: String, required: true },
    entityType: { type: String, enum: ['hospital', 'doctor', 'lab', 'blood_bank', 'pharmacy'], required: true },
    name: { type: String, required: true },
    address: String,
    rating: Number,
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

// Compounded unique index to prevent duplicate favorites per user/entity
favoriteSchema.index({ user: 1, entityId: 1 }, { unique: true });
favoriteSchema.index({ user: 1, entityType: 1 });

export const Favorite = mongoose.model('Favorite', favoriteSchema);
