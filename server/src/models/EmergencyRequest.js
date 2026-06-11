import mongoose from 'mongoose';

const emergencyRequestSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    type: { type: String, enum: ['ambulance', 'emergency_alert'], default: 'ambulance' },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
      address: String,
    },
    description: String,
    status: {
      type: String,
      enum: ['pending', 'dispatched', 'in_transit', 'arrived', 'resolved', 'cancelled'],
      default: 'pending',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'high' },
    assignedHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    routeUrl: String,
    contactNotified: { type: Boolean, default: false },
    resolvedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

emergencyRequestSchema.pre('save', function (next) {
  if (this.patient && !this.patientId) this.patientId = this.patient;
  if (this.hospital && !this.hospitalId) this.hospitalId = this.hospital;
  if (this.hospitalId && !this.hospital) this.hospital = this.hospitalId;
  if (this.assignedHospital && !this.hospitalId) this.hospitalId = this.assignedHospital;
  next();
});

emergencyRequestSchema.index({ status: 1, createdAt: -1 });
emergencyRequestSchema.index({ location: '2dsphere' });

export const EmergencyRequest = mongoose.model('EmergencyRequest', emergencyRequestSchema);
