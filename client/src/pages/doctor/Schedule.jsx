import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorSchedule() {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState([{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30 }]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/doctors/profile/me', { schedule }),
    onSuccess: () => toast('Schedule saved', 'success'),
  });

  const addSlot = () => setSchedule([...schedule, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30 }]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Manage Schedule</h1>
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Weekly Availability</CardTitle>
          <Button variant="outline" size="sm" onClick={addSlot}>Add Slot</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedule.map((slot, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <select
                value={slot.dayOfWeek}
                onChange={(e) => {
                  const s = [...schedule];
                  s[i].dayOfWeek = parseInt(e.target.value);
                  setSchedule(s);
                }}
                className="rounded-lg border px-2 dark:border-slate-700 dark:bg-slate-900"
              >
                {DAYS.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
              </select>
              <Input type="time" value={slot.startTime} onChange={(e) => { const s = [...schedule]; s[i].startTime = e.target.value; setSchedule(s); }} />
              <Input type="time" value={slot.endTime} onChange={(e) => { const s = [...schedule]; s[i].endTime = e.target.value; setSchedule(s); }} />
              <Input type="number" value={slot.slotDuration} onChange={(e) => { const s = [...schedule]; s[i].slotDuration = parseInt(e.target.value); setSchedule(s); }} />
            </div>
          ))}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save Schedule</Button>
        </CardContent>
      </Card>
    </div>
  );
}
