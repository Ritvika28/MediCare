// Trigger restart
import 'dotenv/config';
console.log('GEMINI_API_KEY loaded:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(0, 15) + '...' : 'undefined');
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import { Message } from './models/Message.js';
import { Chat } from './models/Chat.js';
import jwt from 'jsonwebtoken';
import { User } from './models/User.js';

const PORT = process.env.PORT || 5000;

const start = async () => {
  configureCloudinary();
  await connectDB();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Unauthorized'));
      socket.userId = user._id.toString();
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('join_chat', (chatId) => socket.join(`chat:${chatId}`));

    socket.on('send_message', async ({ chatId, content }) => {
      try {
        const message = await Message.create({
          chat: chatId,
          sender: socket.userId,
          content,
        });
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });
        const populated = await message.populate('sender', 'firstName lastName avatar');
        io.to(`chat:${chatId}`).emit('new_message', populated);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });
  });

  app.set('io', io);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} is already in use. Stop the other process first:`);
      console.error(`  lsof -ti :${PORT} | xargs kill -9\n`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API health: http://localhost:${PORT}/api/health`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
