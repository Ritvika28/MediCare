import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    query: { type: String, required: true, trim: true },
    entityType: { type: String, enum: ['all', 'hospital', 'doctor', 'lab', 'blood_bank', 'pharmacy', 'clinic'] },
    city: String,
    specialty: String,
    count: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// Indexes to speed up queries by user and sorting by date/frequency
searchHistorySchema.index({ user: 1, query: 1 }, { unique: true });
searchHistorySchema.index({ user: 1, updatedAt: -1 });

export const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
