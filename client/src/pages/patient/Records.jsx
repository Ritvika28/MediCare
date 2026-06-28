import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { 
  FileText, Upload, Download, Search, Sparkles, Filter, 
  X, Calendar, Clipboard, HeartPulse, Activity, Pill, Beaker,
  Trash2, Info, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function PatientRecords() {
  const { profile } = useAuth();
  const fileRef = useRef();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  
  const [recordToDelete, setRecordToDelete] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', profile?._id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['profile-records'] });
      queryClient.invalidateQueries({ queryKey: ['health-analytics'] });
      toast('Medical record deleted successfully!', 'success');
    },
    onError: () => {
      toast('Failed to delete medical record. Try again.', 'error');
    }
  });

  const handleDeleteConfirm = () => {
    if (!recordToDelete) return;
    const record = recordToDelete;
    setRecordToDelete(null);
    deleteMutation.mutate(record._id);
  };

  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('lab_report');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data = [], isLoading } = useQuery({
    queryKey: ['records', profile?._id],
    queryFn: () => api.get(`/records/patient/${profile._id}`).then((r) => r.data.data),
    enabled: !!profile?._id,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData) => api.post('/records/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['profile-records'] });
      queryClient.invalidateQueries({ queryKey: ['health-analytics'] });
      toast('Medical record uploaded successfully!', 'success');
      closeModal();
    },
    onError: () => {
      toast('Failed to upload medical record. Please try again.', 'error');
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadTitle(file.name.replace(/\.[^/.]+$/, "")); // Strip extension as default title
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast('Please select a file to upload.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', uploadTitle.trim() || selectedFile.name);
    formData.append('recordType', uploadType);
    formData.append('description', uploadDesc.trim());
    formData.append('recordDate', uploadDate);

    uploadMutation.mutate(formData);
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadTitle('');
    setUploadType('lab_report');
    setUploadDesc('');
    setUploadDate(new Date().toISOString().split('T')[0]);
  };

  // Filter records
  const filteredRecords = data.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (record.description && record.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && record.recordType === activeTab;
  });

  const getRecordIcon = (type) => {
    switch (type) {
      case 'lab_report': return Beaker;
      case 'imaging': return Activity;
      case 'prescription': return Pill;
      case 'discharge_summary': return Clipboard;
      default: return FileText;
    }
  };

  const getRecordTypeLabel = (type) => {
    switch (type) {
      case 'lab_report': return 'Lab Report';
      case 'imaging': return 'Imaging / Scan';
      case 'prescription': return 'Prescription';
      case 'discharge_summary': return 'Discharge Summary';
      default: return 'Other Document';
    }
  };

  const getRecordTypeBadgeColor = (type) => {
    switch (type) {
      case 'lab_report': return 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450';
      case 'imaging': return 'bg-purple-50 text-purple-700 border-purple-250 dark:bg-purple-950/20 dark:text-purple-450';
      case 'prescription': return 'bg-indigo-50 text-indigo-700 border-indigo-250 dark:bg-indigo-950/20 dark:text-indigo-450';
      case 'discharge_summary': return 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-450';
      default: return 'bg-slate-50 text-slate-700 border-slate-250 dark:bg-slate-950/20 dark:text-slate-450';
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <Sparkles className="h-72 w-72" />
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              <HeartPulse className="h-3.5 w-3.5" /> Medical Vault
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Medical Records
            </h1>
            <p className="text-teal-100/90 text-sm md:text-base leading-relaxed">
              Upload and organize clinical reports, diagnostic lab values, prescriptions, and radiology scans securely.
            </p>
          </div>
          <Button onClick={() => setShowUploadModal(true)} className="bg-white text-teal-700 font-bold hover:bg-teal-50 border-0 shadow-lg px-6 shrink-0 py-3 rounded-xl flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload Document
          </Button>
        </div>
      </div>

      {/* Main Filter & Lists */}
      <div className="space-y-6">
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Tabs */}
              <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-thin">
                {[
                  { value: 'all', label: 'All Records' },
                  { value: 'lab_report', label: 'Lab Reports' },
                  { value: 'imaging', label: 'Scans & Imaging' },
                  { value: 'prescription', label: 'Prescriptions' },
                  { value: 'discharge_summary', label: 'Discharge Summaries' },
                  { value: 'other', label: 'Others' }
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => setActiveTab(t.value)}
                    className={`text-xs font-bold px-4 py-2.5 rounded-xl transition shrink-0 ${
                      activeTab === t.value
                        ? 'bg-teal-600 text-white shadow'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-850 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search vault by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-xs rounded-xl focus:ring-teal-500 bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records list */}
        <div className="grid gap-4 md:grid-cols-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse bg-slate-100 dark:bg-slate-850 rounded-2xl border dark:border-slate-800" />
            ))
          ) : filteredRecords.length > 0 ? (
            filteredRecords.map((record) => {
              const IconComp = getRecordIcon(record.recordType);
              return (
                <Card key={record._id} className="transition-all hover:shadow hover:border-teal-500/30 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex flex-col justify-between">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 flex items-center justify-center shrink-0">
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 dark:text-slate-200 text-sm truncate">{record.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[9px] py-0 px-1.5 font-bold uppercase tracking-wider ${getRecordTypeBadgeColor(record.recordType)}`}>
                              {getRecordTypeLabel(record.recordType)}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-semibold">{formatDate(record.recordDate || record.createdAt)}</span>
                          </div>
                          {record.description && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 truncate">{record.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() => setExpandedRecordId(expandedRecordId === record._id ? null : record._id)}
                          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="View AI Analysis"
                        >
                          {expandedRecordId === record._id ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                        </button>
                        <a href={record.fileUrl} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-850 dark:hover:bg-slate-800 cursor-pointer">
                            <Download className="h-4 w-4 text-teal-650" />
                          </Button>
                        </a>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setRecordToDelete(record)}
                          className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* AI Analysis Expanded Section */}
                    {expandedRecordId === record._id && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
                        {record.aiSummary && (
                          <div className="p-3.5 rounded-xl bg-teal-50/30 dark:bg-teal-950/10 border border-teal-100/50 dark:border-teal-950/30">
                            <h4 className="text-xs font-black text-teal-800 dark:text-teal-400 flex items-center gap-1.5 uppercase tracking-wider mb-1.5">
                              <Sparkles className="h-3.5 w-3.5" /> AI Diagnostic Summary
                            </h4>
                            <p className="text-xs font-semibold text-slate-705 dark:text-slate-300 leading-relaxed">
                              {record.aiSummary}
                            </p>
                          </div>
                        )}

                        {record.medicalInsights?.abnormalValues?.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">⚠️ Abnormal/Out of Range Values</span>
                            <div className="flex flex-wrap gap-1.5">
                              {record.medicalInsights.abnormalValues.map((val, idx) => (
                                <Badge key={idx} className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 text-[10px] font-bold py-1 px-2">
                                  {val}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {record.medicalInsights?.findings?.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Findings</span>
                            <ul className="list-disc list-inside space-y-1">
                              {record.medicalInsights.findings.map((f, idx) => (
                                <li key={idx} className="text-xs font-semibold text-slate-700 dark:text-slate-350">{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {record.medicalInsights?.lifestyleAdvice?.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lifestyle & Health Advice</span>
                            <ul className="list-disc list-inside space-y-1">
                              {record.medicalInsights.lifestyleAdvice.map((a, idx) => (
                                <li key={idx} className="text-xs font-semibold text-slate-700 dark:text-slate-350">{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Prescription auto-reminder */}
                        {record.recordType === 'prescription' && record.medicalInsights?.medicines?.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Medicines & Actionable Reminders</span>
                            <div className="space-y-2">
                              {record.medicalInsights.medicines.map((med, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-slate-900 dark:text-white">💊 {med.name}</span>
                                      <Badge variant="outline" className="text-[9px] font-bold">{med.dosage} ({med.frequency})</Badge>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                                      <strong>Purpose</strong>: {med.purpose} · <strong>Side effects</strong>: {med.sideEffects}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => navigate(`/patient/medicine-reminder?medicineName=${encodeURIComponent(med.name)}&dosage=${encodeURIComponent(med.dosage)}&frequency=${encodeURIComponent(med.frequency)}`)}
                                    className="bg-teal-650 hover:bg-teal-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 w-full sm:w-auto cursor-pointer"
                                  >
                                    ➕ Set Reminder
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full">
              <EmptyState 
                icon={FileText} 
                title={searchQuery || activeTab !== 'all' ? "No matching records found" : "Medical vault is empty"} 
                description={searchQuery || activeTab !== 'all' ? "Refine filters or clear search query." : "Upload your medical reports, scan transcripts, and history documents."} 
                actionLabel="Upload First File" 
                onAction={() => setShowUploadModal(true)} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-teal-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Upload Medical Document</h3>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {/* File input */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Document File</span>
                {selectedFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-teal-200 bg-teal-50/20 dark:border-teal-900/40">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-4">{selectedFile.name}</span>
                    <button type="button" onClick={() => setSelectedFile(null)} className="text-rose-500 hover:text-rose-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileRef.current?.click()} 
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-teal-500 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20"
                  >
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Click to browse or drop file</p>
                    <p className="text-[10px] text-slate-405 mt-0.5">Supports PDF, JPG, JPEG, PNG (max 10MB)</p>
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} />
              </div>

              {/* Title */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Document Title</span>
                <Input
                  type="text"
                  placeholder="e.g. Blood Test CBC Report"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="text-xs rounded-xl"
                  required
                />
              </div>

              {/* Category Type */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Record Category</span>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-slate-850 dark:text-slate-100 outline-none transition cursor-pointer"
                >
                  <option value="lab_report">Lab Report (e.g. Blood, Urine, Thyroid)</option>
                  <option value="imaging">Imaging / Scan (e.g. X-Ray, MRI, CT, Ultrasound)</option>
                  <option value="prescription">Prescription Receipt</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="other">Other Clinical Document</option>
                </select>
              </div>

              {/* Record Date */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Record Date</span>
                <Input
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  className="text-xs rounded-xl"
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Description / Notes (Optional)</span>
                <textarea
                  rows={2}
                  placeholder="Additional notes about findings..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-2.5 focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              {/* Submit CTAs */}
              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" onClick={closeModal} className="flex-1 rounded-xl py-2 font-bold text-xs">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!selectedFile || uploadMutation.isPending} 
                  className="flex-1 rounded-xl py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Save to Vault'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-6 w-6 animate-pulse" />
              <h3 className="text-base font-extrabold">Delete Medical Document?</h3>
            </div>
            <p className="text-xs font-semibold text-slate-650 dark:text-slate-405 leading-relaxed">
              Are you sure you want to delete <strong>{recordToDelete.title}</strong>? This will permanently remove it from your medical history timeline.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setRecordToDelete(null)} className="rounded-xl text-xs font-bold">
                Cancel
              </Button>
              <Button onClick={handleDeleteConfirm} className="bg-rose-650 hover:bg-rose-700 text-white rounded-xl text-xs font-bold">
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
