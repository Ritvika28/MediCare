import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { api } from '@/api/axios';
import { Skeleton } from './ui/Skeleton';
import { Clock, Calendar, CheckCircle2 } from 'lucide-react';

export function SlotSelector({ doctorId, onSelectSlot, selectedSlot }) {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Generate 7 days starting from today
  useEffect(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      list.push(addDays(today, i));
    }
    setDates(list);
    setSelectedDate(list[0]);
  }, []);

  // Fetch slots whenever doctorId or selectedDate changes
  useEffect(() => {
    if (!doctorId || !selectedDate) return;

    const fetchSlots = async () => {
      setLoading(true);
      try {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        const res = await api.get(`/doctors/${doctorId}/slots`, {
          params: { date: formattedDate },
        });
        setSlots(res.data.data || []);
      } catch (err) {
        console.error('[SlotSelector] Error loading slots:', err);
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [doctorId, selectedDate]);

  const handleSlotClick = (slot) => {
    if (!slot.isAvailable) return;
    onSelectSlot({
      date: selectedDate,
      time: slot.time,
      start: slot.start,
      end: slot.end,
    });
  };

  return (
    <div className="space-y-4">
      {/* Date Horizontal Selector */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Calendar className="h-4 w-4 text-teal-600" /> Select Appointment Date
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-teal-600">
          {dates.map((date) => {
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            const dayName = format(date, 'EEE');
            const dayNum = format(date, 'd');
            const monthName = format(date, 'MMM');

            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center min-w-[70px] py-2 px-3 rounded-xl border text-center transition duration-200 shrink-0 ${
                  isSelected
                    ? 'bg-teal-600 border-teal-600 text-white shadow-md'
                    : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <span className="text-[10px] uppercase font-semibold opacity-75">{dayName}</span>
                <span className="text-lg font-bold my-0.5">{dayNum}</span>
                <span className="text-[10px] font-semibold">{monthName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots Selector */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
          <Clock className="h-4 w-4 text-teal-600" /> Available Time Slots
        </label>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center p-6 bg-slate-50 dark:bg-slate-850 rounded-xl text-slate-500 border border-dashed dark:border-slate-800">
            <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold">No schedules or slots for this day</p>
            <p className="text-xs text-slate-400 mt-0.5">Please choose another date</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((slot) => {
              const isChosen =
                selectedSlot &&
                selectedSlot.time === slot.time &&
                new Date(selectedSlot.date).toDateString() === selectedDate.toDateString();

              let slotStyle = '';
              if (!slot.isAvailable) {
                // Booked or Expired
                slotStyle = 'bg-rose-50 border-rose-100 text-rose-500 dark:bg-rose-950/20 dark:border-rose-900/30 opacity-60 cursor-not-allowed';
              } else if (isChosen) {
                // Selected
                slotStyle = 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-sm';
              } else {
                // Available
                slotStyle = 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:border-teal-500 hover:text-teal-600 cursor-pointer';
              }

              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.isAvailable}
                  onClick={() => handleSlotClick(slot)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition flex items-center justify-center gap-1.5 ${slotStyle}`}
                >
                  {isChosen && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {slot.time}
                  {!slot.isAvailable && slot.isBooked && (
                    <span className="text-[9px] uppercase font-bold bg-rose-500 text-white px-1 py-0.2 rounded scale-90">Booked</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
