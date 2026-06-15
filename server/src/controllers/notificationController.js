import { Notification } from '../models/Notification.js';
import { Patient } from '../models/Patient.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { syncUserNotifications } from '../services/notificationEngineService.js';

function buildFilter(query, userId) {
  const filter = { user: userId };

  if (query.unread === 'true') filter.isRead = false;
  if (query.read === 'true') filter.isRead = true;
  if (query.type) filter.type = query.type;
  if (query.priority) filter.priority = query.priority;
  if (query.search?.trim()) {
    const rx = new RegExp(query.search.trim(), 'i');
    filter.$or = [{ title: rx }, { message: rx }];
  }

  return filter;
}

function buildSort(query) {
  switch (query.sort) {
    case 'oldest':
      return { createdAt: 1 };
    case 'unread':
      return { isRead: 1, createdAt: -1 };
    case 'priority':
      return { priority: -1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

export const getNotifications = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });

  if (patient) {
    await syncUserNotifications(req.user._id, patient._id, {
      latitude: req.query.latitude || req.query.lat,
      longitude: req.query.longitude || req.query.lng,
    });
  }

  const filter = buildFilter(req.query, req.user._id);
  const sort = buildSort(req.query);
  const limit = parseInt(req.query.limit, 10) || 50;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort(sort).limit(limit),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.json({ success: true, data: notifications, unreadCount });
});

export const getNotificationSummary = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (patient) {
    await syncUserNotifications(req.user._id, patient._id, {
      latitude: req.query.latitude,
      longitude: req.query.longitude,
    });
  }

  const [recent, critical, reminders] = await Promise.all([
    Notification.find({ user: req.user._id }).sort('-createdAt').limit(5),
    Notification.find({ user: req.user._id, priority: 'critical', isRead: false }).sort('-createdAt').limit(5),
    Notification.find({
      user: req.user._id,
      type: { $in: ['medicine', 'period', 'pregnancy', 'assessment'] },
      isRead: false,
    }).sort('-createdAt').limit(5),
  ]);

  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

  res.json({
    success: true,
    data: { recent, critical, reminders, unreadCount },
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new AppError('Notification not found', 404);
  res.json({ success: true, data: notification });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All marked as read' });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!notification) throw new AppError('Notification not found', 404);
  res.json({ success: true, message: 'Notification deleted' });
});

export const deleteAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({ user: req.user._id, isRead: true });
  res.json({ success: true, message: `${result.deletedCount} read notifications deleted` });
});
