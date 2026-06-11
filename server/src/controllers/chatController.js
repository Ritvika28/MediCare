import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getOrCreateChat = asyncHandler(async (req, res) => {
  const { doctorId, patientId } = req.body;

  let patient, doctor;
  if (req.user.role === 'patient') {
    patient = await Patient.findOne({ user: req.user._id });
    doctor = await Doctor.findById(doctorId);
  } else {
    doctor = await Doctor.findOne({ user: req.user._id });
    patient = await Patient.findById(patientId);
  }

  if (!patient || !doctor) throw new AppError('Invalid participants', 400);

  const doctorUser = await Doctor.findById(doctor._id).populate('user');
  const patientUser = await Patient.findById(patient._id).populate('user');

  let chat = await Chat.findOne({
    patient: patient._id,
    doctor: doctor._id,
  }).populate('lastMessage');

  if (!chat) {
    chat = await Chat.create({
      participants: [patientUser.user._id, doctorUser.user._id],
      patient: patient._id,
      doctor: doctor._id,
    });
  }

  res.json({ success: true, data: chat });
});

export const getChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ participants: req.user._id })
    .populate('lastMessage')
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName avatar' } })
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName avatar' } })
    .sort('-lastMessageAt');

  res.json({ success: true, data: chats });
});

export const getMessages = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  if (!chat || !chat.participants.some((p) => p.toString() === req.user._id.toString())) {
    throw new AppError('Chat not found', 404);
  }

  const messages = await Message.find({ chat: chat._id })
    .populate('sender', 'firstName lastName avatar')
    .sort('createdAt')
    .limit(100);

  await Message.updateMany({ chat: chat._id, sender: { $ne: req.user._id } }, { isRead: true, readAt: new Date() });

  res.json({ success: true, data: messages });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  if (!chat || !chat.participants.some((p) => p.toString() === req.user._id.toString())) {
    throw new AppError('Chat not found', 404);
  }

  const message = await Message.create({
    chat: chat._id,
    sender: req.user._id,
    content: req.body.content,
    attachments: req.body.attachments,
  });

  chat.lastMessage = message._id;
  chat.lastMessageAt = new Date();
  await chat.save();

  const populated = await message.populate('sender', 'firstName lastName avatar');
  res.status(201).json({ success: true, data: populated });
});
