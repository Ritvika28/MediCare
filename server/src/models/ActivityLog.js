import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resource: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ level: 1 });
activityLogSchema.index({ user: 1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
