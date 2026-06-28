import mongoose from 'mongoose';

const aiMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { _id: true, timestamps: true }
);

const aiChatHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New conversation' },
    messages: [aiMessageSchema],
    isActive: { type: Boolean, default: true },
    interviewState: { type: String, enum: ['idle', 'interviewing', 'completed'], default: 'idle' },
    interviewSymptoms: { type: String, default: '' },
    interviewCollectedInfo: { type: mongoose.Schema.Types.Mixed, default: {} },
    interviewQuestionQueue: [{ type: String }],
    interviewRound: { type: Number, default: 0 },
  },
  { timestamps: true }
);

aiChatHistorySchema.index({ user: 1, updatedAt: -1 });

export const AIChatHistory = mongoose.model('AIChatHistory', aiChatHistorySchema);
