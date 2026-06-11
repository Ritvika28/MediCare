import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    slotDuration: { type: Number, default: 30 },
  },
  { _id: true }
);

const blockedDateSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    reason: String,
  },
  { _id: true }
);

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    specialization: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true },
    qualification: { type: String, trim: true },
    experience: { type: Number, default: 0, min: 0 },
    consultationFee: { type: Number, default: 0, min: 0 },
    onlineConsultationFee: { type: Number, default: 0, min: 0 },
    bio: { type: String, maxlength: 2000 },
    education: [{ degree: String, institution: String, year: Number }],
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    schedule: [timeSlotSchema],
    availableSlots: [timeSlotSchema],
    blockedDates: [blockedDateSchema],
    languages: { type: [String], default: ['English', 'Hindi'] },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
    consultationModes: { type: [String], enum: ['physical', 'video', 'audio', 'chat'], default: ['physical', 'video'] },
    averageConsultationTime: { type: Number, default: 30 },
    currentQueue: { type: Number, default: 0 },
    waitingTime: { type: Number, default: 0 },
    supportsTelemedicine: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

doctorSchema.pre('save', function (next) {
  if (this.hospitalId && !this.hospital) this.hospital = this.hospitalId;
  if (this.hospital && !this.hospitalId) this.hospitalId = this.hospital;
  if (this.departmentId && !this.department) this.department = this.departmentId;
  if (this.department && !this.departmentId) this.departmentId = this.department;
  if (!this.availableSlots?.length && this.schedule?.length) {
    this.availableSlots = this.schedule;
  }
  next();
});

doctorSchema.virtual('appointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'doctor',
});

doctorSchema.virtual('firstName').get(function () {
  return this.user?.firstName || '';
});

doctorSchema.virtual('lastName').get(function () {
  return this.user?.lastName || '';
});

doctorSchema.virtual('avatar').get(function () {
  return this.user?.avatar || '';
});

doctorSchema.virtual('averageRating').get(function () {
  return this.rating;
});

doctorSchema.virtual('totalReviews').get(function () {
  return this.reviewCount;
});

doctorSchema.virtual('experienceYears').get(function () {
  return this.experience;
});

doctorSchema.virtual('registrationNumber').get(function () {
  return this.licenseNumber;
});

doctorSchema.virtual('availableDays').get(function () {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (!this.schedule || this.schedule.length === 0) return [];
  const uniqueDays = [...new Set(this.schedule.map((s) => s.dayOfWeek))];
  return uniqueDays.sort().map((d) => days[d]);
});

doctorSchema.index({ specialization: 1 });
doctorSchema.index({ departmentId: 1 });
doctorSchema.index({ hospitalId: 1 });
doctorSchema.index({ rating: -1 });
doctorSchema.index({ isVerified: 1 });

export const Doctor = mongoose.model('Doctor', doctorSchema);
