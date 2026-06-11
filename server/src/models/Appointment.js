import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    scheduledAt: { type: Date, required: true },
    appointmentDate: { type: Date },
    endAt: Date,
    duration: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show'],
      default: 'pending',
    },
    type: {
      type: String,
      enum: ['physical', 'video', 'audio', 'chat', 'regular', 'follow_up', 'emergency'],
      default: 'physical',
    },
    meetingLink: String,
    reason: { type: String, maxlength: 500 },
    symptoms: [String],
    notes: String,
    cancellationReason: String,
    isEmergency: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    medicineSuggestions: [String],
  },
  { timestamps: true }
);

appointmentSchema.pre('save', function (next) {
  if (this.patient && !this.patientId) this.patientId = this.patient;
  if (this.doctor && !this.doctorId) this.doctorId = this.doctor;
  if (this.hospital && !this.hospitalId) this.hospitalId = this.hospital;
  if (this.department && !this.departmentId) this.departmentId = this.department;
  if (this.scheduledAt && !this.appointmentDate) this.appointmentDate = this.scheduledAt;
  if (this.type === 'regular') this.type = 'physical';
  next();
});

appointmentSchema.index({ patient: 1, scheduledAt: -1 });
appointmentSchema.index({ doctor: 1, scheduledAt: -1 });
appointmentSchema.index({ hospitalId: 1 });
appointmentSchema.index({ status: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
