import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, unique: true },
    appointments: [
      {
        patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
        position: Number,
        estimatedWait: Number,
        status: { type: String, enum: ['waiting', 'in_consultation', 'completed'], default: 'waiting' },
      },
    ],
    currentQueue: { type: Number, default: 0 },
    averageWaitTime: { type: Number, default: 15 },
  },
  { timestamps: true }
);

export const Queue = mongoose.model('Queue', queueSchema);
