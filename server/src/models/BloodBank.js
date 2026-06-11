import mongoose from 'mongoose';

const bloodStockSchema = new mongoose.Schema({
  group: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  unitsAvailable: { type: Number, default: 0, min: 0 }
}, { _id: false });

const volunteerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  phone: { type: String, required: true },
  email: String,
  lastDonatedAt: Date
}, { timestamps: true });

const bloodBankSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
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
  bloodGroups: [bloodStockSchema],
  emergencyContact: { type: String, required: true },
  timings: { type: String, default: '24x7' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  volunteers: [volunteerSchema]
}, { timestamps: true });

bloodBankSchema.index({ location: '2dsphere' });
bloodBankSchema.index({ 'address.city': 1 });

export const BloodBank = mongoose.model('BloodBank', bloodBankSchema);
