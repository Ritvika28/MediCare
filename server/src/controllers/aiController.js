import { AIChatHistory } from '../models/AIChatHistory.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { chatWithAI, suggestDoctorsBySymptoms, getFirstAidGuidance as fetchFirstAid } from '../services/aiService.js';
import { detectEmergencySymptoms, generateAINotification } from '../services/notificationEngineService.js';
import { handleGeminiError } from '../utils/geminiErrorHandler.js';
import { cloudinary } from '../config/cloudinary.js';
import mongoose from 'mongoose';
import { getAverageResponseTime } from '../utils/aiLogger.js';
import { GoogleGenAI } from '@google/genai';

export const sendAIMessage = asyncHandler(async (req, res) => {
  const { message, conversationId, latitude, longitude } = req.body;
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
  
  let aiResponse;
  try {
    aiResponse = await chatWithAI(history, req.user._id, { latitude, longitude, conversationId: conversation._id });
  } catch (err) {
    const { status, payload } = handleGeminiError(err, req.user._id, 'gemini-2.5-flash');
    return res.status(status).json(payload);
  }

  if (detectEmergencySymptoms(message)) {
    await generateAINotification(req.user._id, message, true);
  }

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

export const healthCheck = asyncHandler(async (req, res) => {
  // 1. Check Gemini Status
  let geminiStatus = 'offline';
  let geminiError = null;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'healthcheck',
      });
      if (response && response.text) {
        geminiStatus = 'online';
      }
    }
  } catch (err) {
    geminiError = err.message || err;
  }

  // 2. Check Cloudinary Status
  let cloudinaryStatus = 'offline';
  let cloudinaryError = null;
  try {
    const pingResult = await cloudinary.api.ping();
    if (pingResult && pingResult.status === 'ok') {
      cloudinaryStatus = 'online';
    }
  } catch (err) {
    cloudinaryError = err.message || err;
  }

  // 3. Check MongoDB Status
  const mongoStatus = mongoose.connection.readyState === 1 ? 'online' : 'offline';

  // 4. Gather Loaded Env Vars metadata (masked)
  const envVars = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    MONGODB_URI: process.env.MONGODB_URI ? 'configured' : 'missing',
    JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'missing',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'missing',
    SMTP_HOST: process.env.SMTP_HOST ? 'configured' : 'missing',
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'missing',
  };

  res.json({
    success: true,
    data: {
      uptimeSeconds: Math.round(process.uptime()),
      averageResponseTimeMs: getAverageResponseTime(),
      services: {
        gemini: {
          status: geminiStatus,
          error: geminiError,
        },
        cloudinary: {
          status: cloudinaryStatus,
          error: cloudinaryError,
        },
        mongodb: {
          status: mongoStatus,
        },
      },
      loadedEnvironmentVariables: envVars,
    },
  });
});

export const getFirstAidGuidance = asyncHandler(async (req, res) => {
  const { condition } = req.body;
  if (!condition) throw new AppError('Condition name required', 400);

  const result = await fetchFirstAid(condition);
  res.json({ success: true, data: result });
});
