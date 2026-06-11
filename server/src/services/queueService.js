import { Queue } from '../models/Queue.js';
import { Appointment } from '../models/Appointment.js';
import { Doctor } from '../models/Doctor.js';

export const getOrCreateQueue = async (doctorId) => {
  let queue = await Queue.findOne({ doctorId });
  if (!queue) {
    queue = await Queue.create({ doctorId, appointments: [], currentQueue: 0 });
  }
  return queue;
};

export const syncDoctorQueue = async (doctorId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const pending = await Appointment.find({
    doctor: doctorId,
    scheduledAt: { $gte: today, $lt: tomorrow },
    status: { $in: ['pending', 'confirmed'] },
  }).sort('scheduledAt');

  const doctor = await Doctor.findById(doctorId);
  const avgTime = doctor?.averageConsultationTime || 30;

  const appointments = pending.map((apt, i) => ({
    appointmentId: apt._id,
    patientId: apt.patient,
    position: i + 1,
    estimatedWait: i * avgTime,
    status: 'waiting',
  }));

  const queue = await Queue.findOneAndUpdate(
    { doctorId },
    { appointments, currentQueue: appointments.length, averageWaitTime: avgTime },
    { upsert: true, new: true }
  );

  await Doctor.findByIdAndUpdate(doctorId, {
    currentQueue: appointments.length,
    waitingTime: appointments.length * avgTime,
  });

  return queue;
};

export const predictWaitTime = (queueLength, avgConsultationTime = 30) => {
  return queueLength * avgConsultationTime;
};
