import mongoose from 'mongoose';

const chatHistorySchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional if it is a group/system/AI chat
  chatSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  message: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'document', 'system'], default: 'text' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

chatHistorySchema.index({ sender: 1, createdAt: -1 });
chatHistorySchema.index({ chatSession: 1 });

export const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);
