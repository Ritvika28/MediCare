import mongoose from 'mongoose';

const emergencyNotificationLogSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: true },
    type: { type: String, enum: ['sms', 'email', 'whatsapp', 'push'], required: true },
    emergencyType: { type: String, required: true }, // e.g. 'ambulance', 'emergency_alert'
    latitude: Number,
    longitude: Number,
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    deliveryStatus: { type: String, enum: ['success', 'failed'], required: true },
    success: { type: Boolean, required: true },
    retryCount: { type: Number, default: 0 },
    errorMessage: String,
  },
  { timestamps: true }
);

export const EmergencyNotificationLog = mongoose.model('EmergencyNotificationLog', emergencyNotificationLogSchema);
