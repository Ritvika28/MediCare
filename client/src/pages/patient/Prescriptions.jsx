import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { 
  FileText, Upload, Download, Search, Sparkles, Filter, 
  X, Calendar, Clipboard, HeartPulse, Activity, Pill, Beaker,
  Trash2, ShieldCheck, CreditCard, Award, Eye, Clock, Info, Check,
  ChevronDown, ChevronUp, Plus
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function PatientPrescriptions() {
  const { profile } = useAuth();
  const fileRef = useRef();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeMainTab, setActiveMainTab] = useState('vault'); // 'vault' or 'doctor'
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' or 'timeline'
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  
  // OCR states
  const [ocrStatus, setOcrStatus] = useState('idle'); // 'idle', 'scanning', 'complete'
  const [ocrProgress, setOcrProgress] = useState([]);
  
  // Upload form state
  const [formData, setFormData] = useState({
    title: '',
    doctor: '',
    hospital: '',
    recordDate: new Date().toISOString().split('T')[0],
    recordType: 'prescription',
    description: '',
    tags: '',
    detectedMedicines: ''
  });

  // Deletion Undo states
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [lastDeletedRecord, setLastDeletedRecord] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  // Queries
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['records', profile?._id],
    queryFn: () => api.get(`/records/patient/${profile._id}`).then((r) => r.data.data),
    enabled: !!profile?._id,
  });

  const { data: docPrescriptions = [], isLoading: docPrescriptionsLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => api.get('/prescriptions').then((r) => r.data.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (fd) => api.post('/records/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['records', profile?._id] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['profile-records'] });
      queryClient.invalidateQueries({ queryKey: ['health-analytics'] });
      toast('Document uploaded to Prescription Vault!', 'success');
      closeModal();
    },
    onError: () => {
      toast('Failed to upload document.', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['records', profile?._id] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['profile-records'] });
      queryClient.invalidateQueries({ queryKey: ['health-analytics'] });
    },
  });

  // Filter vault documents
  const vaultRecords = records.filter(r => {
    // Only display categories matching Vault Categories
    const validVaultTypes = ['prescription', 'bill', 'insurance', 'lab_report', 'vaccination'];
    if (!validVaultTypes.includes(r.recordType)) return false;

    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (r.doctor && r.doctor.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (r.hospital && r.hospital.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (r.tags && r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (activeCategoryTab === 'all') return matchesSearch;
    return matchesSearch && r.recordType === activeCategoryTab;
  });

  // Sort vault documents
  const sortedVaultRecords = [...vaultRecords].sort((a, b) => {
    const dateA = new Date(a.recordDate || a.createdAt);
    const dateB = new Date(b.recordDate || b.createdAt);
    if (sortOption === 'newest') return dateB - dateA;
    if (sortOption === 'oldest') return dateA - dateB;
    return a.title.localeCompare(b.title);
  });

  // Stats calculation
  const totalReports = vaultRecords.length;
  const uniqueDoctors = new Set(vaultRecords.map(r => r.doctor).filter(Boolean)).size;
  const uniqueHospitals = new Set(vaultRecords.map(r => r.hospital).filter(Boolean)).size;
  const totalMeds = vaultRecords.reduce((acc, curr) => acc + (curr.detectedMedicines?.length || 0), 0);

  // File loading and mock OCR trigger
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    startMockOcr(file.name);
  };

  const startMockOcr = (fileName) => {
    setOcrStatus('scanning');
    setOcrProgress([]);

    const steps = [
      { text: 'Scanning document layout...', delay: 500 },
      { text: 'Extracting text blocks & signatures...', delay: 1200 },
      { text: '✓ Doctor detected: Dr. Sarah Connor', delay: 2000 },
      { text: '✓ Hospital detected: City General Trauma Hospital', delay: 2800 },
      { text: '✓ Medicines detected: Amoxicillin, Pantoprazole, Paracetamol', delay: 3500 }
    ];

    steps.forEach((step, i) => {
      setTimeout(() => {
        setOcrProgress(prev => [...prev, step.text]);
        if (i === steps.length - 1) {
          setOcrStatus('complete');
          setFormData({
            title: `Prescription from Dr. Sarah Connor`,
            doctor: 'Dr. Sarah Connor',
            hospital: 'City General Trauma Hospital',
            recordDate: new Date().toISOString().split('T')[0],
            recordType: 'prescription',
            description: 'Auto-extracted prescription containing antibiotics and pain relief medicines.',
            tags: 'prescription, ocr, auto-extracted',
            detectedMedicines: 'Amoxicillin, Pantoprazole, Paracetamol'
          });
        }
      }, step.delay);
    });
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('title', formData.title.trim());
    fd.append('doctor', formData.doctor.trim());
    fd.append('hospital', formData.hospital.trim());
    fd.append('recordDate', formData.recordDate);
    fd.append('recordType', formData.recordType);
    fd.append('description', formData.description.trim());
    fd.append('tags', formData.tags);
    fd.append('detectedMedicines', formData.detectedMedicines);

    uploadMutation.mutate(fd);
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setOcrStatus('idle');
    setOcrProgress([]);
    setFormData({
      title: '', doctor: '', hospital: '',
      recordDate: new Date().toISOString().split('T')[0],
      recordType: 'prescription', description: '', tags: '', detectedMedicines: ''
    });
  };

  const handleDeleteRequest = (record) => {
    setRecordToDelete(record);
  };

  const handleDeleteConfirm = () => {
    if (!recordToDelete) return;
    const record = recordToDelete;
    setRecordToDelete(null);
    setLastDeletedRecord(record);

    // Optimistic cache update
    const previous = queryClient.getQueryData(['records', profile?._id]) || [];
    queryClient.setQueryData(['records', profile?._id], previous.filter(r => r._id !== record._id));
    toast('Prescription record deleted.', 'success');

    const timer = setTimeout(() => {
      deleteMutation.mutate(record._id);
      setLastDeletedRecord(null);
      setUndoTimer(null);
    }, 5000);

    setUndoTimer(timer);
  };

  const handleUndoDelete = () => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
    }
    if (lastDeletedRecord) {
      queryClient.invalidateQueries(['records']);
      setLastDeletedRecord(null);
      toast('Restored document to vault!', 'info');
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'prescription': return Pill;
      case 'bill': return CreditCard;
      case 'insurance': return ShieldCheck;
      case 'lab_report': return Beaker;
      case 'vaccination': return Award;
      default: return FileText;
    }
  };

  const getCategoryBadgeColor = (cat) => {
    switch (cat) {
      case 'prescription': return 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-450';
      case 'bill': return 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-450';
      case 'insurance': return 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450';
      case 'lab_report': return 'bg-cyan-50 text-cyan-700 border-cyan-250 dark:bg-cyan-950/20 dark:text-cyan-450';
      case 'vaccination': return 'bg-purple-50 text-purple-700 border-purple-250 dark:bg-purple-950/20 dark:text-purple-450';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative rounded-3xl bg-gradient-to-br from-rose-700 via-pink-600 to-red-650 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <Pill className="h-80 w-80 rotate-12" />
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-rose-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" /> Secure Archive
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Prescription Vault
            </h1>
            <p className="text-rose-100/90 text-sm md:text-base leading-relaxed">
              Scan, upload, and organize medical prescriptions, clinical bills, insurance proofs, and vaccine logs with AI-powered metadata auto-extraction.
            </p>
          </div>
          <Button onClick={() => setShowUploadModal(true)} className="bg-white text-rose-700 font-bold hover:bg-rose-50 border-0 shadow-lg px-6 shrink-0 py-3 rounded-xl flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload Document
          </Button>
        </div>
      </div>

      {/* Statistics counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: totalReports, icon: FileText, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' },
          { label: 'Attending Doctors', value: uniqueDoctors, icon: HeartPulse, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' },
          { label: 'Hospitals Visited', value: uniqueHospitals, icon: Clipboard, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
          { label: 'Extracted Medicines', value: totalMeds, icon: Pill, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/20' },
        ].map((stat, i) => (
          <Card key={i} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className={`p-2.5 rounded-xl ${stat.color} shrink-0`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main navigation tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveMainTab('vault')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeMainTab === 'vault' ? 'border-rose-600 text-rose-600 dark:text-rose-450' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          My Uploaded Vault
        </button>
        <button
          onClick={() => setActiveMainTab('doctor')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeMainTab === 'doctor' ? 'border-rose-600 text-rose-600 dark:text-rose-450' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Clinical Prescriptions
        </button>
      </div>

      {activeMainTab === 'vault' ? (
        <div className="space-y-6">
          {/* Filters, Search & Layout Control */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Categories */}
                <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-thin">
                  {[
                    { value: 'all', label: 'All Vault Files' },
                    { value: 'prescription', label: 'Prescriptions' },
                    { value: 'bill', label: 'Medical Bills' },
                    { value: 'insurance', label: 'Insurances' },
                    { value: 'lab_report', label: 'Lab Reports' },
                    { value: 'vaccination', label: 'Vaccines' }
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => setActiveCategoryTab(t.value)}
                      className={`text-xs font-bold px-3.5 py-2 rounded-xl transition shrink-0 ${
                        activeCategoryTab === t.value
                          ? 'bg-rose-600 text-white shadow'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-850 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Controls */}
                <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto justify-end">
                  <div className="relative flex-1 sm:w-64 min-w-[200px]">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search by title, doctor, hospital..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950"
                    />
                  </div>

                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="alphabetical">A-Z Title</option>
                  </select>

                  <div className="flex bg-slate-50 dark:bg-slate-950 border dark:border-slate-850 rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => setLayoutMode('grid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        layoutMode === 'grid' ? 'bg-white dark:bg-slate-900 text-rose-650 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setLayoutMode('timeline')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        layoutMode === 'timeline' ? 'bg-white dark:bg-slate-900 text-rose-650 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Timeline
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {undoTimer && (
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 text-rose-850 dark:text-rose-400 text-xs font-bold shadow-sm animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4 text-rose-650 shrink-0" />
                Document "{lastDeletedRecord?.title}" was deleted.
              </span>
              <button 
                onClick={handleUndoDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition text-xs font-black"
              >
                Undo
              </button>
            </div>
          )}

          {/* List display */}
          {recordsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse bg-slate-100 dark:bg-slate-850 rounded-2xl border dark:border-slate-800" />
              ))}
            </div>
          ) : sortedVaultRecords.length > 0 ? (
            layoutMode === 'grid' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {sortedVaultRecords.map(doc => {
                  const Icon = getCategoryIcon(doc.recordType);
                  return (
                    <Card key={doc._id} className="border border-slate-200/80 dark:border-slate-800 hover:border-rose-500/20 transition hover:shadow-sm rounded-2xl flex flex-col justify-between">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start gap-3.5">
                          <div className={`p-2.5 rounded-xl ${getCategoryBadgeColor(doc.recordType)} shrink-0`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white truncate">{doc.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-0 text-[9px] uppercase font-bold py-0.5">
                                {doc.recordType.replace('_', ' ')}
                              </Badge>
                              <span className="text-[10px] text-slate-400 font-semibold">{formatDate(doc.recordDate || doc.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Metadata fields */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-550 dark:text-slate-400">
                          {doc.doctor && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Doctor</span>
                              <span className="truncate block">{doc.doctor}</span>
                            </div>
                          )}
                          {doc.hospital && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Clinic/Hospital</span>
                              <span className="truncate block">{doc.hospital}</span>
                            </div>
                          )}
                        </div>

                        {doc.description && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                            {doc.description}
                          </p>
                        )}

                        {/* Extracted medicines and Reminder button */}
                        {doc.detectedMedicines?.length > 0 && (
                          <div className="p-3 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-950/30 rounded-xl space-y-2">
                            <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Extracted Medicines</span>
                            <div className="flex flex-wrap gap-1.5">
                              {doc.detectedMedicines.map((med, idx) => (
                                <Badge key={idx} className="bg-white dark:bg-slate-900 border border-rose-100 text-rose-700 dark:border-rose-950 text-[10px] font-bold py-1 px-2 flex items-center gap-1">
                                  <span>💊 {med}</span>
                                  <button
                                    onClick={() => navigate(`/patient/medicine-reminder?medicineName=${encodeURIComponent(med)}`)}
                                    className="hover:bg-rose-50 rounded-full p-0.5 ml-1 transition"
                                    title="Add Daily Reminder"
                                  >
                                    <Plus className="h-3 w-3 text-rose-600" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tags list */}
                        {doc.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {doc.tags.map((tag, idx) => (
                              <span key={idx} className="text-[10px] text-slate-450 font-bold bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded-md">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* AI Analysis Expanded Section */}
                        {expandedRecordId === doc._id && (
                          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-200 text-left">
                            {doc.aiSummary && (
                              <div className="p-3.5 rounded-xl bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-950/30">
                                <h4 className="text-xs font-black text-rose-800 dark:text-rose-455 flex items-center gap-1.5 uppercase tracking-wider mb-1.5">
                                  <Sparkles className="h-3.5 w-3.5" /> AI Clinical Summary
                                </h4>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {doc.aiSummary}
                                </p>
                              </div>
                            )}

                            {doc.medicalInsights?.abnormalValues?.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">⚠️ Abnormal Values Detected</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {doc.medicalInsights.abnormalValues.map((val, idx) => (
                                    <Badge key={idx} className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 text-[10px] font-bold py-1 px-2">
                                      {val}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {doc.medicalInsights?.medicines?.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Detailed Dosage Instructions</span>
                                <div className="space-y-2">
                                  {doc.medicalInsights.medicines.map((med, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-850 flex flex-col gap-2">
                                      <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">💊 {med.name}</span>
                                        <Button
                                          size="sm"
                                          onClick={() => navigate(`/patient/medicine-reminder?medicineName=${encodeURIComponent(med.name)}&dosage=${encodeURIComponent(med.dosage)}&frequency=${encodeURIComponent(med.frequency)}`)}
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] px-2.5 py-1 rounded-lg shrink-0 cursor-pointer"
                                        >
                                          ➕ Set Reminder
                                        </Button>
                                      </div>
                                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                                        <strong>Dosage</strong>: {med.dosage} ({med.frequency}) · <strong>Purpose</strong>: {med.purpose}
                                      </p>
                                      {med.sideEffects && (
                                        <p className="text-[10px] text-slate-400 font-semibold">
                                          ⚠️ <strong>Side effects</strong>: {med.sideEffects} · <strong>Precautions</strong>: {med.precautions}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>

                      <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-850 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedRecordId(expandedRecordId === doc._id ? null : doc._id)}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-rose-400 hover:bg-rose-50/10 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {expandedRecordId === doc._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          AI Insights
                        </button>
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-1.5 rounded-xl cursor-pointer">
                            <Eye className="h-4.5 w-4.5" /> View / Download
                          </Button>
                        </a>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteRequest(doc)}
                          className="rounded-xl text-rose-500 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              // Timeline Layout
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
                {sortedVaultRecords.map(doc => {
                  const Icon = getCategoryIcon(doc.recordType);
                  return (
                    <div key={doc._id} className="relative group">
                      <span className={`absolute -left-[37px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-slate-950 ${getCategoryBadgeColor(doc.recordType)} shadow-sm transition`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="p-4 bg-white dark:bg-slate-900 border dark:border-slate-850 rounded-xl space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">{formatDate(doc.recordDate || doc.createdAt)}</span>
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mt-0.5">{doc.title}</h4>
                            <p className="text-xs text-slate-500">
                              {doc.doctor ? `Dr. ${doc.doctor}` : ''} {doc.hospital ? `· ${doc.hospital}` : ''}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline" className="rounded-xl p-2 h-auto">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                            <Button size="sm" variant="ghost" className="rounded-xl p-2 h-auto text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteRequest(doc)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <Card className="border border-slate-100 dark:border-slate-800">
              <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <FileText className="h-12 w-12 text-slate-300 animate-bounce" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-350">Prescription Vault is Empty</h3>
                <p className="text-xs text-slate-455 max-w-sm">
                  Upload files like prescription orders, vaccine certificates, and laboratory scan slips to compile medical statistics.
                </p>
                <Button onClick={() => setShowUploadModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold px-6">
                  Add Document
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Doctor prescriptions tab
        <div className="space-y-4">
          {docPrescriptionsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse bg-slate-105 rounded-xl" />
            ))
          ) : docPrescriptions.length > 0 ? (
            docPrescriptions.map(rx => (
              <Card key={rx._id} className="border border-slate-205 dark:border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-extrabold text-sm text-slate-800 dark:text-white">Dr. {rx.doctor?.user?.firstName} {rx.doctor?.user?.lastName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(rx.createdAt)}</p>
                      {rx.diagnosis && <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">Diagnosis: {rx.diagnosis}</p>}
                      <ul className="mt-3 space-y-1">
                        {rx.medications?.map((m, i) => (
                          <li key={i} className="text-xs font-medium text-slate-655 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
                            <span><strong>{m.name}</strong> — {m.dosage} ({m.frequency})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px] font-bold uppercase">{rx.status}</Badge>
                      {rx.pdfUrl && (
                        <a href={rx.pdfUrl} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1"><Download className="h-3.5 w-3.5" /> PDF</Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border border-slate-100 dark:border-slate-800">
              <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                <Info className="h-10 w-10 text-slate-300" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350">No Clinical Prescriptions</h3>
                <p className="text-xs text-slate-455">Doctor consultations will automatically list prescriptions here.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Document Upload Modal with Mock OCR */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Upload to Vault</h3>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* File input */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Select Prescription File</span>
                {selectedFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/20 dark:border-rose-900/40">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-4">{selectedFile.name}</span>
                    <button type="button" onClick={() => setSelectedFile(null)} className="text-rose-500 hover:text-rose-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileRef.current?.click()} 
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-rose-500 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20"
                  >
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Browse document to start scan</p>
                    <p className="text-[10px] text-slate-455 mt-0.5">PDF or Image up to 10MB (includes Auto OCR parser)</p>
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} />
              </div>

              {/* OCR Scanning log status */}
              {ocrStatus === 'scanning' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border dark:border-slate-850 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 animate-spin text-rose-600" />
                      Analyzing file...
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Mock AI-OCR Engine</span>
                  </div>
                  <div className="space-y-1">
                    {ocrProgress.map((prog, idx) => (
                      <p key={idx} className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3 shrink-0" /> {prog}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {ocrStatus === 'complete' && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 text-emerald-800 dark:text-emerald-450 text-[11px] font-bold flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 animate-bounce shrink-0" />
                  Successfully auto-extracted document fields and medicines! Review metadata below.
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Document Title</span>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Clinic Prescription May 2026"
                  value={formData.title}
                  onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Doctor */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Physician Name</span>
                  <Input
                    type="text"
                    placeholder="Dr. Sarah Connor"
                    value={formData.doctor}
                    onChange={(e) => setFormData(p => ({ ...p, doctor: e.target.value }))}
                    className="text-xs rounded-xl"
                  />
                </div>
                {/* Hospital */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Hospital/Clinic</span>
                  <Input
                    type="text"
                    placeholder="General Trauma Hospital"
                    value={formData.hospital}
                    onChange={(e) => setFormData(p => ({ ...p, hospital: e.target.value }))}
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category selector */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Document Category</span>
                  <select
                    value={formData.recordType}
                    onChange={(e) => setFormData(p => ({ ...p, recordType: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-slate-850 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="prescription">Prescription</option>
                    <option value="bill">Medical Bill</option>
                    <option value="insurance">Insurance Document</option>
                    <option value="lab_report">Lab Report</option>
                    <option value="vaccination">Vaccination Record</option>
                  </select>
                </div>
                {/* Date */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Record Date</span>
                  <Input
                    type="date"
                    required
                    value={formData.recordDate}
                    onChange={(e) => setFormData(p => ({ ...p, recordDate: e.target.value }))}
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Medicines detected (OCR info) */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Detected Medicines (Comma-separated)</span>
                <Input
                  type="text"
                  placeholder="Amoxicillin, Pantoprazole (Optional)"
                  value={formData.detectedMedicines}
                  onChange={(e) => setFormData(p => ({ ...p, detectedMedicines: e.target.value }))}
                  className="text-xs rounded-xl"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Search Tags (Comma-separated)</span>
                <Input
                  type="text"
                  placeholder="prescription, cardiac, monthly"
                  value={formData.tags}
                  onChange={(e) => setFormData(p => ({ ...p, tags: e.target.value }))}
                  className="text-xs rounded-xl"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Notes / Description</span>
                <textarea
                  rows={2}
                  placeholder="Add custom notes..."
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} className="flex-1 rounded-xl py-2 text-xs font-bold">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="flex-1 rounded-xl py-2 bg-rose-650 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  {uploadMutation.isPending ? 'Saving to Vault...' : 'Save to Vault'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-rose-600">
              <Info className="h-6 w-6 animate-pulse" />
              <h3 className="text-base font-extrabold">Delete Vault Document?</h3>
            </div>
            <p className="text-xs font-semibold text-slate-650 dark:text-slate-405 leading-relaxed">
              Are you sure you want to delete <strong>{recordToDelete.title}</strong>? This cannot be undone once the undo window expires.
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
