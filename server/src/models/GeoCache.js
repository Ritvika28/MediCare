import mongoose from 'mongoose';

const geoCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['geocoding', 'reverse-geocoding', 'routing', 'overpass', 'autocomplete', 'search'], index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    expireAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

// Compound index to speed up retrieval by key and type
geoCacheSchema.index({ key: 1, type: 1 }, { unique: true });

export const GeoCache = mongoose.model('GeoCache', geoCacheSchema);
