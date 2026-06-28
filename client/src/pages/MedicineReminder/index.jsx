import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Clock, Plus, Pill, Trash2, CheckCircle2, XCircle, AlertCircle,
  Calendar, BarChart3, Edit3, X, ChevronRight, Sparkles
} from 'lucide-react';

const FREQUENCIES = [
  { value: 'once_daily', label: 'Once Daily' },
  { value: 'twice_daily', label: 'Twice Daily' },
  { value: 'thrice_daily', label: 'Thrice Daily' },
  { value: 'custom', label: 'Custom' },
];

const INSTRUCTIONS = [
  { value: 'before_food', label: '🍽️ Before Food' },
  { value: 'after_food', label: '🍽️ After Food' },
  { value: 'with_food', label: '🥗 With Food' },
  { value: 'empty_stomach', label: '🕐 Empty Stomach' },
];

function getTimeDefaults(freq) {
  switch (freq) {
    case 'once_daily': return ['09:00'];
    case 'twice_daily': return ['09:00', '21:00'];
    case 'thrice_daily': return ['08:00', '14:00', '21:00'];
    default: return ['09:00'];
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(t) {
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function adherenceColor(rate) {
  if (rate >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function adherenceBg(rate) {
  if (rate >= 80) return 'from-emerald-500 to-teal-500';
  if (rate >= 50) return 'from-amber-500 to-orange-500';
  return 'from-red-500 to-rose-500';
}

export default function MedicineReminder() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [searchParams] = useSearchParams();
  const prefillMedName = searchParams.get('medicineName');
  const prefillDosage = searchParams.get('dosage');
  const prefillFrequency = searchParams.get('frequency');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    medicineName: '', dosage: '', frequency: 'once_daily',
    times: ['09:00'], instructions: 'after_food',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    if (prefillMedName) {
      setForm(prev => ({
        ...prev,
        medicineName: prefillMedName,
        dosage: prefillDosage || prev.dosage,
        frequency: prefillFrequency || prev.frequency,
        times: prefillFrequency ? getTimeDefaults(prefillFrequency) : prev.times
      }));
      setShowForm(true);
    }
  }, [prefillMedName, prefillDosage, prefillFrequency]);

  const { data: remindersRes, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => api.get('/reminders').then(r => r.data),
  });

  const reminders = remindersRes?.data || [];
  const activeReminders = reminders.filter(r => r.isActive);
  const inactiveReminders = reminders.filter(r => !r.isActive);

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/reminders', data),
    onSuccess: () => { queryClient.invalidateQueries(['reminders']); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/reminders/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries(['reminders']); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/reminders/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['reminders']),
  });

  const logMutation = useMutation({
    mutationFn: ({ id, date, time, status }) => api.post(`/reminders/${id}/log`, { date, time, status }),
    onSuccess: () => queryClient.invalidateQueries(['reminders']),
  });

  function resetForm() {
    setShowForm(false);
    setEditId(null);
    setForm({
      medicineName: '', dosage: '', frequency: 'once_daily',
      times: ['09:00'], instructions: 'after_food',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  }

  function startEdit(r) {
    setEditId(r._id);
    setForm({
      medicineName: r.medicineName, dosage: r.dosage, frequency: r.frequency,
      times: r.times, instructions: r.instructions,
      startDate: new Date(r.startDate).toISOString().split('T')[0],
      endDate: new Date(r.endDate).toISOString().split('T')[0],
    });
    setShowForm(true);
  }

  function handleFreqChange(freq) {
    setForm(prev => ({ ...prev, frequency: freq, times: freq !== 'custom' ? getTimeDefaults(freq) : prev.times }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function logDose(reminderId, time, status) {
    const today = new Date().toISOString().split('T')[0];
    logMutation.mutate({ id: reminderId, date: today, time, status });
  }

  function getTodayStatus(reminder, time) {
    const today = new Date().toISOString().split('T')[0];
    const log = reminder.logs?.find(l => l.date === today && l.time === time);
    return log?.status || null;
  }

  const overallAdherence = activeReminders.length > 0
    ? Math.round(activeReminders.reduce((sum, r) => sum + (r.adherenceRate || 0), 0) / activeReminders.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative rounded-3xl bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <Pill className="h-80 w-80" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Clock className="h-3.5 w-3.5" /> Smart Medication Tracker
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Medicine Reminder</h1>
          <p className="text-purple-100/90 text-sm md:text-base leading-relaxed">
            Never miss a dose. Track your medications, log compliance, and monitor your adherence rate over time.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <Pill className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{activeReminders.length}</p>
              <p className="text-xs font-medium text-slate-500">Active Medicines</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className={`text-2xl font-black ${adherenceColor(overallAdherence)}`}>{overallAdherence}%</p>
              <p className="text-xs font-medium text-slate-500">Overall Adherence</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {activeReminders.reduce((sum, r) => sum + (r.times?.length || 0), 0)}
              </p>
              <p className="text-xs font-medium text-slate-500">Daily Doses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold gap-2">
          <Plus className="h-4 w-4" /> Add Medicine
        </Button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <Card className="border-2 border-violet-200 dark:border-violet-900 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{editId ? 'Edit Medicine' : 'Add New Medicine'}</CardTitle>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X className="h-5 w-5" /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Medicine Name *</label>
                  <input type="text" required value={form.medicineName} onChange={(e) => setForm(p => ({ ...p, medicineName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none transition" placeholder="e.g. Metformin" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Dosage *</label>
                  <input type="text" required value={form.dosage} onChange={(e) => setForm(p => ({ ...p, dosage: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none transition" placeholder="e.g. 500mg / 1 tablet" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Frequency</label>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCIES.map(f => (
                    <button key={f.value} type="button" onClick={() => handleFreqChange(f.value)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${form.frequency === f.value ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-violet-300'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Dose Times</label>
                <div className="flex flex-wrap gap-2">
                  {form.times.map((t, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input type="time" value={t} onChange={(e) => { const newTimes = [...form.times]; newTimes[i] = e.target.value; setForm(p => ({ ...p, times: newTimes })); }}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
                      {form.frequency === 'custom' && form.times.length > 1 && (
                        <button type="button" onClick={() => setForm(p => ({ ...p, times: p.times.filter((_, j) => j !== i) }))}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                  {form.frequency === 'custom' && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, times: [...p.times, '12:00'] }))}
                      className="px-3 py-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 hover:border-violet-400 hover:text-violet-600 transition">
                      + Add Time
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Instructions</label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUCTIONS.map(inst => (
                    <button key={inst.value} type="button" onClick={() => setForm(p => ({ ...p, instructions: inst.value }))}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${form.instructions === inst.value ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-violet-300'}`}>
                      {inst.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
                <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold"
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editId ? 'Update' : 'Add Medicine'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Today's Doses */}
      {activeReminders.length > 0 && (
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-violet-600" /> Today's Doses
            </CardTitle>
            <CardDescription>Mark each dose as taken or skipped</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeReminders.map(reminder => (
              <div key={reminder._id} className="space-y-2">
                {reminder.times.map(time => {
                  const status = getTodayStatus(reminder, time);
                  return (
                    <div key={`${reminder._id}-${time}`}
                      className={`flex items-center justify-between p-4 rounded-xl border transition ${
                        status === 'taken' ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900' :
                        status === 'skipped' ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900' :
                        'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          status === 'taken' ? 'bg-emerald-100 dark:bg-emerald-900/40' :
                          status === 'skipped' ? 'bg-red-100 dark:bg-red-900/40' :
                          'bg-violet-100 dark:bg-violet-900/30'
                        }`}>
                          <Pill className={`h-5 w-5 ${
                            status === 'taken' ? 'text-emerald-600' :
                            status === 'skipped' ? 'text-red-600' :
                            'text-violet-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{reminder.medicineName}</p>
                          <p className="text-xs text-slate-500">{reminder.dosage} · {formatTime(time)} · {INSTRUCTIONS.find(i => i.value === reminder.instructions)?.label || reminder.instructions}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status === 'taken' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 font-bold text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Taken
                          </Badge>
                        ) : status === 'skipped' ? (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-0 font-bold text-xs">
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Skipped
                          </Badge>
                        ) : (
                          <>
                            <button onClick={() => logDose(reminder._id, time, 'taken')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                              disabled={logMutation.isPending}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Taken
                            </button>
                            <button onClick={() => logDose(reminder._id, time, 'skipped')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition"
                              disabled={logMutation.isPending}>
                              <XCircle className="h-3.5 w-3.5" /> Skip
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Reminders List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Medicines ({activeReminders.length})</h2>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-850 animate-pulse border dark:border-slate-800" />
          ))}</div>
        ) : activeReminders.length === 0 ? (
          <Card className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
            <CardContent className="py-12 text-center">
              <Pill className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="font-bold text-slate-800 dark:text-slate-200">No active medicines</p>
              <p className="text-sm text-slate-500 mt-1">Add your first medicine reminder to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeReminders.map(r => (
              <Card key={r._id} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{r.medicineName}</p>
                        <p className="text-xs text-slate-500">{r.dosage}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <Edit3 className="h-4 w-4 text-slate-400" />
                      </button>
                      <button onClick={() => { if (confirm('Delete this reminder?')) deleteMutation.mutate(r._id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {r.times?.map(t => (
                      <Badge key={t} className="bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0 text-[10px] font-bold">
                        <Clock className="h-3 w-3 mr-1" /> {formatTime(t)}
                      </Badge>
                    ))}
                    <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-0 text-[10px] font-bold">
                      {INSTRUCTIONS.find(i => i.value === r.instructions)?.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 font-medium">
                      {formatDate(r.startDate)} → {formatDate(r.endDate)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-16 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden`}>
                        <div className={`h-full rounded-full bg-gradient-to-r ${adherenceBg(r.adherenceRate)}`}
                          style={{ width: `${r.adherenceRate || 0}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${adherenceColor(r.adherenceRate)}`}>{r.adherenceRate || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Reminders */}
      {inactiveReminders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-500">Past Medicines ({inactiveReminders.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inactiveReminders.map(r => (
              <Card key={r._id} className="border border-slate-100 dark:border-slate-800 rounded-2xl opacity-60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{r.medicineName}</p>
                    <p className="text-xs text-slate-400">{r.dosage} · {r.adherenceRate}% adherence</p>
                  </div>
                  <button onClick={() => { if (confirm('Delete this reminder?')) deleteMutation.mutate(r._id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
