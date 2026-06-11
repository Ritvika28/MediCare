import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Star } from 'lucide-react';

export default function AdminAnalytics() {
  const { data: performance } = useQuery({
    queryKey: ['doctor-performance'],
    queryFn: () => api.get('/analytics/doctors/performance').then((r) => r.data.data),
  });

  const { data: logs } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => api.get('/analytics/logs/activity').then((r) => r.data.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top Doctors</CardTitle></CardHeader>
          <CardContent>
            {performance?.map((doc, i) => (
              <div key={doc._id} className="flex items-center justify-between border-b py-3 last:border-0 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-300">#{i + 1}</span>
                  <div>
                    <p className="font-medium">Dr. {doc.user?.firstName} {doc.user?.lastName}</p>
                    <p className="text-sm text-slate-500">{doc.specialization}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-medium">{doc.rating}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Activity Logs</CardTitle></CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {logs?.map((log) => (
              <div key={log._id} className="border-b py-2 text-sm last:border-0 dark:border-slate-800">
                <p className="font-medium">{log.action}</p>
                <p className="text-xs text-slate-500">{log.user?.email} · {new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
