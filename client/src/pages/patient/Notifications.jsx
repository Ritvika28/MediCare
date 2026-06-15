import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/axios';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Bell, AlertTriangle, Pill, HeartPulse, Building2, Droplet, FlaskConical, Bot, Trash2, CheckCheck, Search,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const TYPE_ICONS = {
  medicine: Pill,
  period: HeartPulse,
  pregnancy: HeartPulse,
  analytics: Bell,
  healthRisk: AlertTriangle,
  assessment: HeartPulse,
  emergency: AlertTriangle,
  hospital: Building2,
  bloodBank: Droplet,
  lab: FlaskConical,
  aiAssistant: Bot,
  system: Bell,
};

const PRIORITY_CLASS = {
  critical: 'border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900',
  high: 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20',
  medium: '',
  low: 'opacity-80',
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const params = {
    ...(typeFilter && { type: typeFilter }),
    ...(priorityFilter && { priority: priorityFilter }),
    ...(search && { search }),
    sort,
    limit: 50,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => api.get('/notifications', { params }).then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteOne = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteRead = useMutation({
    mutationFn: () => api.delete('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-slate-500">{data?.unreadCount ?? 0} unread</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data?.unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => deleteRead.mutate()} disabled={deleteRead.isPending}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete read
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search notifications..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border px-3 text-sm dark:bg-slate-950 dark:border-slate-800">
          <option value="">All types</option>
          {['medicine', 'period', 'pregnancy', 'analytics', 'healthRisk', 'emergency', 'hospital', 'bloodBank', 'lab', 'aiAssistant', 'system'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-xl border px-3 text-sm dark:bg-slate-950 dark:border-slate-800">
          <option value="">All priorities</option>
          {['critical', 'high', 'medium', 'low'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{ id: 'newest', label: 'Newest' }, { id: 'oldest', label: 'Oldest' }, { id: 'unread', label: 'Unread' }, { id: 'priority', label: 'Priority' }].map((s) => (
          <button key={s.id} onClick={() => setSort(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${sort === s.id ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-600'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No notifications match your filters.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            return (
              <Card key={n._id} className={`${!n.isRead ? 'border-teal-200 dark:border-teal-900' : ''} ${PRIORITY_CLASS[n.priority] || ''}`}>
                <CardContent className="flex gap-3 p-4">
                  <Icon className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{n.title}</p>
                      <Badge variant={n.priority === 'critical' ? 'destructive' : n.priority === 'high' ? 'warning' : 'secondary'}>{n.priority}</Badge>
                      <Badge variant="outline">{n.type}</Badge>
                      {!n.isRead && <Badge variant="success">Unread</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-2">{formatDateTime(n.createdAt)}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(n.actionLink || n.link) && (
                        <Link to={n.actionLink || n.link}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      )}
                      {!n.isRead && (
                        <Button size="sm" variant="outline" onClick={() => markRead.mutate(n._id)} disabled={markRead.isPending}>Mark read</Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => deleteOne.mutate(n._id)} disabled={deleteOne.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
