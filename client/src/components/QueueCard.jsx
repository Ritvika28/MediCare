import { Users, Clock } from 'lucide-react';
import { Card, CardContent } from './ui/Card';

export function QueueCard({ doctor, queue }) {
  const wait = doctor?.waitingTime || queue?.averageWaitTime || 15;
  const count = doctor?.currentQueue || queue?.currentQueue || 0;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-full bg-blue-50 p-3 dark:bg-blue-950">
          <Users className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-slate-500">Current Queue</p>
          <p className="text-xl font-bold">{count} patients</p>
          <p className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" /> Est. wait: {wait} min
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
