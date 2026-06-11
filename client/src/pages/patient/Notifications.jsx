import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bell } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
  });

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {data?.unreadCount > 0 && <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>Mark all read</Button>}
      </div>
      <div className="mt-6 space-y-3">
        {data?.data?.map((n) => (
          <Card key={n._id} className={!n.isRead ? 'border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/30' : ''}>
            <CardContent className="flex gap-3 p-4">
              <Bell className="h-5 w-5 shrink-0 text-teal-600" />
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-slate-500">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
