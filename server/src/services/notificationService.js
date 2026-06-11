import { Notification } from '../models/Notification.js';

export const createNotification = async ({ userId, type, title, message, data, link }) => {
  return Notification.create({
    user: userId,
    type,
    title,
    message,
    data,
    link,
  });
};

export const notifyAppointmentUpdate = async (userId, appointment, status) => {
  const titles = {
    confirmed: 'Appointment Confirmed',
    rejected: 'Appointment Rejected',
    cancelled: 'Appointment Cancelled',
    completed: 'Appointment Completed',
  };
  return createNotification({
    userId,
    type: `appointment_${status}`,
    title: titles[status] || 'Appointment Update',
    message: `Your appointment on ${new Date(appointment.scheduledAt).toLocaleDateString()} has been ${status}.`,
    data: { appointmentId: appointment._id },
    link: '/patient/appointments',
  });
};
