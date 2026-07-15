import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['blood_test', 'mri', 'ct_scan', 'x_ray', 'ultrasound'], required: true },
  price: { type: Number, required: true, min: 0 },
  durationHours: { type: Number, default: 24 } // hours to get report
}, { _id: true });

const labSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: {
    street: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: String
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  contactNumber: { type: String, required: true },
  testsAvailable: [testSchema],
  operatingHours: { type: String, default: '8:00 AM - 8:00 PM' },
  isOpenNow: { type: Boolean, default: true },
  NABL: { type: Boolean, default: false },
  verified: { type: Boolean, default: false }
}, { timestamps: true });

labSchema.index({ location: '2dsphere' });
labSchema.index({ 'address.city': 1 });
labSchema.index({ 'address.state': 1 });
labSchema.index({ NABL: 1 });
labSchema.index({ verified: 1 });
labSchema.index({ 'testsAvailable.category': 1 });

export const Lab = mongoose.model('Lab', labSchema);
