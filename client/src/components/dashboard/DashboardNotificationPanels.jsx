import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Bell, AlertTriangle, Pill, Clock } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const PRIORITY_VARIANT = {
  critical: 'destructive',
  high: 'warning',
  medium: 'secondary',
  low: 'outline',
};

function NotificationList({ items, emptyText, icon: Icon, iconClass }) {
  if (!items?.length) {
    return <p className="text-xs text-slate-400 text-center py-6">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((n) => (
        <Link
          key={n._id}
          to={n.actionLink || n.link || '/patient/notifications'}
          className={`block rounded-xl border p-3 transition hover:border-teal-500/30 ${!n.isRead ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900' : 'border-slate-100 dark:border-slate-800'}`}
        >
          <div className="flex gap-2 items-start">
            <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconClass}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{n.title}</p>
                <Badge variant={PRIORITY_VARIANT[n.priority] || 'secondary'} className="text-[9px] px-1.5 py-0">
                  {n.priority || 'medium'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatDateTime(n.createdAt)}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function DashboardNotificationPanels({ latitude, longitude, hasLocation }) {
  const { data, isLoading } = useQuery({
    queryKey: ['notification-summary', latitude, longitude],
    queryFn: () => api.get('/notifications/summary', {
      params: hasLocation ? { latitude, longitude } : {},
    }).then((r) => r.data.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-teal-600" /> Recent Notifications
            {data?.unreadCount > 0 && (
              <Badge variant="success" className="ml-auto text-[10px]">{data.unreadCount} unread</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationList items={data?.recent} emptyText="No notifications yet" icon={Bell} iconClass="text-teal-600" />
          <Link to="/patient/notifications" className="block text-center text-xs font-bold text-teal-600 mt-3 hover:underline">
            View All Notifications
          </Link>
        </CardContent>
      </Card>

      <Card className="border-rose-100 dark:border-rose-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" /> Critical Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationList items={data?.critical} emptyText="No critical alerts" icon={AlertTriangle} iconClass="text-rose-600" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Pill className="h-4 w-4 text-indigo-600" /> Health Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationList items={data?.reminders} emptyText="No active health reminders" icon={Pill} iconClass="text-indigo-600" />
        </CardContent>
      </Card>
    </div>
  );
}
