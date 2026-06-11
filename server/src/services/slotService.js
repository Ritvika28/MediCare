import { Appointment } from '../models/Appointment.js';

export const calculateAvailableSlots = async (doctor, dateString) => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();

  const daySchedule = doctor.schedule.filter((s) => s.dayOfWeek === dayOfWeek);
  const isBlocked = doctor.blockedDates.some(
    (b) => new Date(b.date).toDateString() === date.toDateString()
  );

  if (isBlocked || !daySchedule.length) {
    return [];
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const booked = await Appointment.find({
    doctor: doctor._id,
    scheduledAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed'] },
  });

  const slots = [];
  for (const sched of daySchedule) {
    const [startH, startM] = sched.startTime.split(':').map(Number);
    const [endH, endM] = sched.endTime.split(':').map(Number);
    
    let current = new Date(date);
    current.setHours(startH, startM, 0, 0);
    
    const end = new Date(date);
    end.setHours(endH, endM, 0, 0);

    const now = new Date();

    while (current < end) {
      const slotEnd = new Date(current.getTime() + sched.slotDuration * 60000);
      const isBooked = booked.some(
        (a) => new Date(a.scheduledAt).getTime() === current.getTime()
      );
      
      const timeString = current.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      // A slot is available if it's not booked and is in the future
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

  return slots;
};
