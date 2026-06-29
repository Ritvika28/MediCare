import { Notification } from '../models/Notification.js';

export const createNotification = async ({ userId, type, title, message, data, link, priority = 'medium', actionLink, metadata }) => {
  return Notification.create({
    user: userId,
    type,
    title,
    message,
    data,
    link: link || actionLink,
    actionLink: actionLink || link,
    priority,
    metadata,
  });
};

