import { Schedule } from '../models/Schedule.js';
import { Appointment } from '../models/Appointment.js';
import { Doctor } from '../models/Doctor.js';

export const calculateAvailableSlots = async (doctorId, dateString) => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return [];

  // Fetch all schedules for this doctor on this day of the week
  const daySchedules = await Schedule.find({
    doctorId,
    dayOfWeek,
    isActive: true,
  });

  // Check if date is blocked on the doctor level
  const isDoctorBlocked = doctor.blockedDates?.some(
    (b) => new Date(b.date).toDateString() === date.toDateString()
  );

  if (isDoctorBlocked || !daySchedules.length) {
    return [];
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch booked appointments
  const booked = await Appointment.find({
    doctor: doctorId,
    scheduledAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed'] },
  });

  const slots = [];
  const now = new Date();

  for (const sched of daySchedules) {
    // Check if the specific date is blocked in this schedule
    const isScheduleBlocked = sched.blockedDates?.some(
      (bd) => new Date(bd).toDateString() === date.toDateString()
    );
    if (isScheduleBlocked) continue;

    const [startH, startM] = sched.startTime.split(':').map(Number);
    const [endH, endM] = sched.endTime.split(':').map(Number);

    let current = new Date(date);
    current.setHours(startH, startM, 0, 0);

    const end = new Date(date);
    end.setHours(endH, endM, 0, 0);

    const duration = sched.slotDuration || doctor.slotDuration || 30;

    while (current < end) {
      const slotEnd = new Date(current.getTime() + duration * 60000);
      
      const isBooked = booked.some(
        (a) => new Date(a.scheduledAt).getTime() === current.getTime()
      );

      const timeString = current.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      slots.push({
        time: timeString,
        start: new Date(current),
        end: slotEnd,
        isBooked,
        isAvailable: !isBooked && current > now,
      });

      current = slotEnd;
    }
  }

  // Sort slots chronologically
  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
};
