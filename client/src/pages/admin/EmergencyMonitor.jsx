import { useQuery } from '@tanstack/react-query';
import { emergencyService } from '@/services/emergencyService';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function EmergencyMonitor() {
  const { data, refetch } = useQuery({
    queryKey: ['emergency-requests'],
    queryFn: () => emergencyService.getRequests(),
    refetchInterval: 15000,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Emergency Monitor</h1>
        <button onClick={() => refetch()} className="text-sm text-teal-600">Refresh</button>
      </div>
      <div className="mt-6 space-y-3">
        {data?.data?.map((req) => (
          <Card key={req._id} className="border-red-100 dark:border-red-900">
            <CardContent className="flex items-start gap-4 p-4">
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{req.type} — {req.status}</p>
                <p className="text-sm text-slate-500">{req.description}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDateTime(req.createdAt)}</p>
              </div>
              <Badge variant={req.status === 'pending' ? 'destructive' : 'secondary'}>{req.status}</Badge>
            </CardContent>
          </Card>
        ))}
        {!data?.data?.length && <p className="text-slate-500">No active emergency requests</p>}
      </div>
    </div>
  );
}
