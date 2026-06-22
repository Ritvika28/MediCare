import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/axios';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Bell, AlertTriangle, Pill, HeartPulse, Building2, Droplet, FlaskConical,
  Bot, Trash2, CheckCheck, Search, Filter, ArrowUpDown, Eye, BellOff, Clock,
  Sparkles, ShieldAlert,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const TYPE_META = {
  medicine:     { icon: Pill,        label: 'Medicine',      color: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900' },
  period:       { icon: HeartPulse,  label: 'Cycle',         color: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900' },
  pregnancy:    { icon: HeartPulse,  label: 'Pregnancy',     color: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900' },
  analytics:    { icon: Bell,        label: 'Analytics',     color: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900' },
  healthRisk:   { icon: ShieldAlert, label: 'Health Risk',   color: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900' },
  assessment:   { icon: HeartPulse, label: 'Assessment',    color: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900' },
  emergency:    { icon: AlertTriangle, label: 'Emergency',  color: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900' },
  hospital:     { icon: Building2,   label: 'Hospital',      color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900' },
  bloodBank:    { icon: Droplet,     label: 'Blood Bank',    color: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900' },
  lab:          { icon: FlaskConical,label: 'Lab',           color: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900' },
  aiAssistant:  { icon: Bot,         label: 'AI Assistant',  color: 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900' },
  system:       { icon: Bell,        label: 'System',        color: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700' },
};

const PRIORITY_CONFIG = {
  critical: {
    card: 'border-rose-300 dark:border-rose-900/80',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900',
    label: 'Critical',
  },
  high: {
    card: 'border-amber-200 dark:border-amber-900/60',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900',
    label: 'High',
  },
  medium: {
    card: '',
    dot: 'bg-blue-400',
    badge: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900',
    label: 'Medium',
  },
  low: {
    card: 'opacity-85',
    dot: 'bg-slate-300',
    badge: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/30 dark:text-slate-500 dark:border-slate-700',
    label: 'Low',
  },
};

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'unread', label: 'Unread' },
  { id: 'priority', label: 'Priority' },
];

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
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10 pointer-events-none">
          <Bell className="h-72 w-72" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/25 mb-2">
              <Bell className="h-3.5 w-3.5" /> Notification Centre
            </div>
            <h1 className="text-3xl font-black tracking-tight">Notifications</h1>
            <p className="text-slate-400 text-sm">
              {unreadCount > 0
                ? <span className="text-indigo-300 font-bold">{unreadCount} unread</span>
                : 'All caught up'} · {notifications.length} total
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {unreadCount > 0 && (
              <Button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs gap-2 px-4"
              >
                <CheckCheck className="h-4 w-4" />
                {markAll.isPending ? 'Marking…' : 'Mark All Read'}
              </Button>
            )}
            <Button
              onClick={() => deleteRead.mutate()}
              disabled={deleteRead.isPending}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold rounded-xl text-xs gap-2 px-4"
            >
              <Trash2 className="h-4 w-4" />
              {deleteRead.isPending ? 'Clearing…' : 'Clear Read'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Filters & Sort ──────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-4">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by title or message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl text-sm"
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-sm bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-semibold h-9 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Types</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-sm bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-semibold h-9 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-2 flex-wrap">
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
              sort === s.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Notification List ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/10">
          <BellOff className="h-12 w-12 text-slate-300" />
          <p className="font-black text-slate-600 dark:text-slate-400">No notifications</p>
          <p className="text-xs text-slate-400 max-w-xs text-center">
            {search || typeFilter || priorityFilter
              ? 'Try adjusting your filters to see more results.'
              : 'Your health activity notifications will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {notifications.map((n, idx) => {
              const meta = TYPE_META[n.type] || TYPE_META.system;
              const prio = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.medium;
              const Icon = meta.icon;

              return (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.15) }}
                >
                  <Card className={cn(
                    'rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200',
                    !n.isRead && 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10',
                    n.isRead && prio.card,
                  )}>
                    <CardContent className="p-4 flex gap-4">
                      {/* Icon + unread dot */}
                      <div className="relative shrink-0">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', meta.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {!n.isRead && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-950" />
                        )}
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className={cn('font-black text-sm text-slate-800 dark:text-slate-100', !n.isRead && 'text-indigo-900 dark:text-indigo-200')}>{n.title}</p>
                          <span className={cn('inline-flex items-center text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border', prio.badge)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full mr-1 inline-block', prio.dot)} />
                            {prio.label}
                          </span>
                          <span className={cn('inline-flex items-center text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border', meta.color)}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{n.message}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-semibold">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(n.createdAt)}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(n.actionLink || n.link) && (
                            <Link to={n.actionLink || n.link}>
                              <Button size="sm" className="h-7 px-3 text-[10px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
                                <Eye className="h-3 w-3" /> View
                              </Button>
                            </Link>
                          )}
                          {!n.isRead && (
                            <Button
                              size="sm"
                              onClick={() => markRead.mutate(n._id)}
                              disabled={markRead.isPending}
                              className="h-7 px-3 text-[10px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 gap-1"
                            >
                              <CheckCheck className="h-3 w-3" /> Mark read
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => deleteOne.mutate(n._id)}
                            disabled={deleteOne.isPending}
                            className="h-7 w-7 p-0 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 border border-rose-100 dark:border-rose-900"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
