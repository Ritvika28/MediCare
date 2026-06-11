import { AIChatHistory } from '../models/AIChatHistory.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { chatWithAI, suggestDoctorsBySymptoms } from '../services/aiService.js';

export const sendAIMessage = asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;
  if (!message?.trim()) throw new AppError('Message required', 400);

  let conversation;
  if (conversationId) {
    conversation = await AIChatHistory.findOne({ _id: conversationId, user: req.user._id });
    if (!conversation) throw new AppError('Conversation not found', 404);
  } else {
    conversation = await AIChatHistory.create({
      user: req.user._id,
      title: message.slice(0, 50),
      messages: [],
    });
  }

  conversation.messages.push({ role: 'user', content: message });

  const history = conversation.messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
  const aiResponse = await chatWithAI(history, req.user._id);

  conversation.messages.push({ role: 'assistant', content: aiResponse.content });
  if (conversation.messages.length === 2) {
    conversation.title = message.slice(0, 50);
  }
  await conversation.save();

  res.json({
    success: true,
    data: {
      conversationId: conversation._id,
      message: aiResponse.content,
      provider: aiResponse.provider,
    },
  });
});

export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await AIChatHistory.find({ user: req.user._id, isActive: true })
    .select('title updatedAt messages')
    .sort('-updatedAt');
  res.json({ success: true, data: conversations });
});

export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await AIChatHistory.findOne({ _id: req.params.id, user: req.user._id });
  if (!conversation) throw new AppError('Conversation not found', 404);
  res.json({ success: true, data: conversation });
});

export const deleteConversation = asyncHandler(async (req, res) => {
  await AIChatHistory.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isActive: false }
  );
  res.json({ success: true, message: 'Conversation deleted' });
});

export const symptomDoctorSuggest = asyncHandler(async (req, res) => {
  const result = await suggestDoctorsBySymptoms(req.body.symptoms || '');
  res.json({ success: true, data: result });
});
