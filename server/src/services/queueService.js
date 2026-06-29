import { Queue } from '../models/Queue.js';
import { Doctor } from '../models/Doctor.js';

export const getOrCreateQueue = async (doctorId) => {
  let queue = await Queue.findOne({ doctorId });
  if (!queue) {
    queue = await Queue.create({ doctorId, appointments: [], currentQueue: 0 });
  }
  return queue;
};

export const syncDoctorQueue = async (doctorId) => {
  const doctor = await Doctor.findById(doctorId);
  const avgTime = doctor?.averageConsultationTime || 30;

  const queue = await Queue.findOneAndUpdate(
    { doctorId },
    { appointments: [], currentQueue: 0, averageWaitTime: avgTime },
    { upsert: true, new: true }
  );

  await Doctor.findByIdAndUpdate(doctorId, {
    currentQueue: 0,
    waitingTime: 0,
  });

  return queue;
};

export const predictWaitTime = (queueLength, avgConsultationTime = 30) => {
  return queueLength * avgConsultationTime;
};
