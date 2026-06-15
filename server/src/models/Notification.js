import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'medicine',
        'period',
        'pregnancy',
        'analytics',
        'healthRisk',
        'assessment',
        'emergency',
        'hospital',
        'bloodBank',
        'lab',
        'aiAssistant',
        'system',
        // legacy types kept for existing records
        'appointment_reminder',
        'appointment_confirmed',
        'appointment_cancelled',
        'prescription_ready',
        'review_request',
        'chat',
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    isRead: { type: Boolean, default: false },
    actionLink: String,
    link: String,
    metadata: mongoose.Schema.Types.Mixed,
    data: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });
notificationSchema.index({ user: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ user: 1, 'metadata.dedupeKey': 1 }, { sparse: true });

export const Notification = mongoose.model('Notification', notificationSchema);
