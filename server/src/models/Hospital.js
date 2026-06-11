import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true },
    type: { type: String, enum: ['general', 'icu', 'private', 'emergency'], default: 'general' },
    beds: { type: Number, default: 1 },
    occupiedBeds: { type: Number, default: 0 },
    floor: Number,
    isAvailable: { type: Boolean, default: true },
  },
  { _id: true }
);

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hospitalCode: { type: String, required: true, unique: true, trim: true },
    logo: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    description: { type: String, default: '' },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    phone: String,
    email: String,
    website: String,
    type: { type: String, enum: ['main', 'branch', 'clinic'], default: 'main' },
    facilities: {
      ICU: { type: Boolean, default: false },
      Ambulance: { type: Boolean, default: false },
      Emergency: { type: Boolean, default: false },
      Pharmacy: { type: Boolean, default: false },
      Lab: { type: Boolean, default: false },
      MRI: { type: Boolean, default: false },
      CTScan: { type: Boolean, default: false },
      BloodBank: { type: Boolean, default: false },
      Dialysis: { type: Boolean, default: false },
      Ventilator: { type: Boolean, default: false },
    },
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
    images: [String],
    rooms: [roomSchema],
    totalBeds: { type: Number, default: 0 },
    availableBeds: { type: Number, default: 0 },
    emergencyServices: { type: Boolean, default: true },
    emergencyAvailable: { type: Boolean, default: true },
    operatingHours: String,
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

hospitalSchema.virtual('hospitalName').get(function () {
  return this.name;
});

hospitalSchema.virtual('latitude').get(function () {
  return this.location?.coordinates?.[1];
});

hospitalSchema.virtual('longitude').get(function () {
  return this.location?.coordinates?.[0];
});

hospitalSchema.virtual('city').get(function () {
  return this.address?.city;
});

hospitalSchema.virtual('state').get(function () {
  return this.address?.state;
});

hospitalSchema.virtual('totalDoctors').get(function () {
  return this.doctors?.length || 0;
});

hospitalSchema.virtual('totalDepartments').get(function () {
  return this.departments?.length || 0;
});

hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ name: 'text', 'address.city': 'text' });
hospitalSchema.index({ isActive: 1, rating: -1 });

export const Hospital = mongoose.model('Hospital', hospitalSchema);
