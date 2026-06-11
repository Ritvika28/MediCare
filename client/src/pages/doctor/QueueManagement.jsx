import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { QueueCard } from '@/components/QueueCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function QueueManagement() {
  const { profile } = useAuth();

  const { data: queueData } = useQuery({
    queryKey: ['queue', profile?._id],
    queryFn: () => api.get(`/queue/${profile._id}`).then((r) => r.data.data),
    enabled: !!profile?._id,
    refetchInterval: 30000,
  });

  const queue = queueData;

  return (
    <div>
      <h1 className="text-2xl font-bold">Queue Management</h1>
      <p className="text-slate-500">Today's patient queue and wait predictions</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <QueueCard doctor={profile} queue={queue} />
        <Card>
          <CardHeader><CardTitle>Waiting List</CardTitle></CardHeader>
          <CardContent>
            {queue?.appointments?.length ? queue.appointments.map((item) => (
              <div key={item._id || item.position} className="flex justify-between border-b py-3 dark:border-slate-800">
                <span>Position #{item.position}</span>
                <Badge>~{item.estimatedWait} min</Badge>
              </div>
            )) : <p className="text-sm text-slate-500">No patients in queue</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
