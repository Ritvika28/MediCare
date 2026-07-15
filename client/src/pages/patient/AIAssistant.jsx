import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/axios';
import { useLocation } from '@/hooks/useLocation';
import { useToast } from '@/components/ui/Toast';
import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationCard } from '@/components/RecommendationCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Bot, Send, User, Sparkles, Plus, Trash2,
  ShieldAlert, History, Copy, Check, RotateCcw, Paperclip,
  Activity, CheckCircle, Calendar, ChevronRight, Clock, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';

const EMERGENCY_KEYWORDS = [
  'heart attack', 'chest pain', 'difficulty breathing', 'shortness of breath',
  'severe bleeding', 'unconscious', 'stroke', 'suicidal', 'poison', 'accident',
  'choking', 'seizure', 'broken bone', 'paralysis'
];

const QUICK_PROMPTS = [
  { text: "I have a headache and fever", icon: "🤒" },
  { text: "My knee joints are hurting", icon: "🦴" },
  { text: "I have red skin rashes", icon: "🔴" },
  { text: "I have severe chest pain", icon: "🚨" }
];

// --- Report Comparison Card Component ---
function ReportComparisonCard({ data }) {
  const results = data?.results || [];
  if (results.length === 0) return null;

  return (
    <div className="mt-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 text-slate-855 dark:text-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
        <Activity className="h-4.5 w-4.5 text-teal-600 animate-pulse" />
        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Report Comparison & Trends</h4>
      </div>
      {results.map((res, i) => (
        <div key={i} className="space-y-3">
          <div className="inline-block px-2.5 py-1 text-[9px] font-black rounded-lg bg-teal-100 text-teal-800 uppercase dark:bg-teal-950/40 dark:text-teal-400">
            Subtype: {res.subtype?.toUpperCase()}
          </div>
          <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-350">{res.comparisonSummary}</p>
          
          {res.comparisonHistory?.length > 0 && (
            <div className="grid gap-2">
              {res.comparisonHistory.map((param, j) => (
                <div key={j} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 gap-2">
                  <div>
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-350">{param.parameter}</span>
                    <span className={`ml-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${
                      param.trend === 'improving' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450' :
                      param.trend === 'deteriorating' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455' :
                      'bg-slate-100 text-slate-650 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                      {param.trend}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {param.values?.map((val, k) => (
                      <span key={k} className="text-[10px] font-bold bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border dark:border-slate-800">
                        {val.date}: <strong>{val.value} {val.unit}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {res.comparisonInsights && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold leading-relaxed text-amber-700 dark:text-amber-400">
              💡 <strong>Clinical Insights</strong>: {res.comparisonInsights}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Medicine Interaction Card Component ---
function MedicineInteractionCard({ data }) {
  const interactions = data?.interactions || [];
  const severity = data?.highestSeverity || 'Low';

  const severityColors = {
    'Low': 'bg-slate-100 border-slate-200 text-slate-750 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300',
    'Moderate': 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
    'High': 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',
    'Life-threatening': 'bg-rose-600/15 border-rose-600/30 text-rose-700 dark:text-rose-400 font-extrabold animate-pulse'
  };

  return (
    <div className="mt-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 text-slate-850 dark:text-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
        <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Medicine Safety Review</h4>
      </div>
      
      <div className={`p-3 rounded-xl border flex flex-col justify-center ${severityColors[severity] || severityColors.Low}`}>
        <span className="text-xs font-extrabold">Safety Status: {severity.toUpperCase()} RISK DETECTED</span>
        <p className="text-[10px] opacity-90 mt-0.5">{data?.summary || 'Review complete.'}</p>
      </div>

      {interactions.length > 0 && (
        <div className="space-y-3">
          {interactions.map((int, i) => (
            <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 space-y-2">
              <div className="flex items-center justify-between border-b dark:border-slate-900 pb-1.5">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{int.trigger}</span>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900">
                  {int.type} ({int.severity})
                </span>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-slate-500">{int.explanation}</p>
              {int.symptoms?.length > 0 && (
                <div className="text-[10px] text-slate-400 font-semibold">
                  ⚠️ <strong>Potential Symptoms</strong>: {int.symptoms.join(', ')}
                </div>
              )}
              {int.alternatives?.length > 0 && (
                <div className="p-2.5 rounded-lg bg-teal-550/5 border border-teal-500/10 text-[10px] font-bold text-teal-700 dark:text-teal-400">
                  💡 <strong>Safer Options/Precautions</strong>: {int.alternatives.join(' | ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Symptom Interview Card Component ---
function SymptomInterviewCard({ data, onAnswer }) {
  const { interviewState, triage, nextQuestion, round, totalRounds, nearbyProviders } = data || {};

  if (interviewState === 'interviewing') {
    const quickAnswers = ["Yes", "No", "Mild", "Severe", "A few hours ago", "A few days ago"];
    return (
      <div className="mt-3 p-4 rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50/20 dark:bg-teal-950/10 space-y-4 text-slate-800 dark:text-slate-200">
        <div className="flex items-center justify-between border-b dark:border-slate-850 pb-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4.5 w-4.5 text-teal-650 animate-pulse" />
            <h4 className="text-xs font-black uppercase text-teal-700 dark:text-teal-400">Triage Assessment Interview</h4>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Round {round + 1} of {totalRounds}</span>
        </div>
        <p className="text-xs md:text-sm font-black text-slate-900 dark:text-white leading-relaxed">{nextQuestion}</p>
        <div className="flex flex-wrap gap-1.5">
          {quickAnswers.map((ans, idx) => (
            <button
              key={idx}
              onClick={() => onAnswer(ans)}
              className="px-3 py-1.5 rounded-full border border-teal-200 bg-white hover:bg-teal-50 dark:border-teal-900 dark:bg-slate-950 text-[10px] font-extrabold text-teal-700 dark:text-teal-400 transition cursor-pointer"
            >
              {ans}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (interviewState === 'completed' && triage) {
    const triageColors = {
      'Low': 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-850',
      'Moderate': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400',
      'High': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400',
      'Emergency': 'bg-rose-55 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-455 animate-pulse'
    };

    return (
      <div className="mt-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 text-slate-850 dark:text-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Symptom Assessment Results</h4>
        </div>
        
        <div className={`p-3 rounded-xl border flex flex-col justify-center ${triageColors[triage.urgencyLevel] || triageColors.Low}`}>
          <strong className="text-xs">Urgency Rating: {triage.urgencyLevel?.toUpperCase()}</strong>
          <p className="text-[10px] opacity-90 mt-0.5">Please consult a specialist based on these findings.</p>
        </div>

        {triage.emergencyWarning && (
          <div className="p-3 rounded-xl bg-red-600/15 border border-red-650/30 text-xs font-bold text-red-600 dark:text-red-400 flex items-start gap-2 leading-relaxed">
            <span className="text-lg">🚨</span>
            <div>
              <strong>Emergency Warning</strong>
              <p className="text-[10px] font-semibold mt-0.5">{triage.emergencyWarning}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Likely Conditions</span>
            <div className="grid gap-2 mt-1.5">
              {triage.conditions?.map((cond, i) => (
                <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-semibold leading-relaxed">
                  <strong>{cond.name}</strong>: <span className="text-slate-500">{cond.explanation}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
              <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{triage.department}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Specialist Recommendation</span>
              <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{triage.specialist}</p>
            </div>
          </div>
        </div>

        {nearbyProviders?.length > 0 && (
          <div className="pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matching Network Facilities Nearby</span>
            <div className="grid gap-2 mt-1.5 max-h-48 overflow-y-auto">
              {nearbyProviders.slice(0, 3).map((fac, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-teal-500/5 border border-teal-200/50 dark:border-teal-900/50 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white">{fac.name}</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">{fac.address || 'India'}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-400 px-2 py-0.5 rounded-lg whitespace-nowrap">
                    {fac.distanceKm?.toFixed(1)} km
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// --- Health Timeline Card Component ---
function HealthTimelineCard({ data }) {
  const events = data?.events || [];
  const summary = data?.summary || {};

  return (
    <div className="mt-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 text-slate-850 dark:text-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
        <Calendar className="h-4.5 w-4.5 text-indigo-500" />
        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Chronological Health Timeline</h4>
      </div>

      {summary.progressSummary && (
        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs font-semibold leading-relaxed text-slate-650 dark:text-slate-350 space-y-2">
          <p>🎯 <strong>Journey Summary</strong>: {summary.progressSummary}</p>
          {summary.trends && <p>📈 <strong>Trends Detected</strong>: {summary.trends}</p>}
        </div>
      )}

      {events.length > 0 && (
        <div className="relative border-l border-slate-250 dark:border-slate-800 ml-2.5 pl-4 space-y-4 pt-2">
          {events.slice(-6).map((evt, i) => (
            <div key={i} className="relative">
              <span className="absolute -left-[21.5px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-indigo-650 shadow border border-white dark:border-slate-900" />
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400">{evt.dateString}</span>
                <p className="text-xs font-black text-slate-850 dark:text-white">{evt.title}</p>
                <p className="text-[10px] font-semibold text-slate-500 leading-relaxed">{evt.details}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIAssistant() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { location, hasLocation } = useLocation({ requestOnMount: true });
  const recommendMutation = useRecommendations();
  
  const chatFileRef = useRef(null);

  const chatUploadMutation = useMutation({
    mutationFn: (formData) => api.post('/records/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onMutate: () => {
      setMessages((prev) => [...prev, { 
        role: 'user', 
        content: '📎 *Uploading medical report for AI analysis...*',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    },
    onSuccess: (res) => {
      const record = res.data.data;
      
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['profile-records'] });
      queryClient.invalidateQueries({ queryKey: ['health-analytics'] });

      const reportInsights = record.medicalInsights || {};
      const abnormalList = reportInsights.abnormalValues && reportInsights.abnormalValues.length > 0 
        ? `\n\n⚠️ **Abnormal/Out-of-Range Values Detected**:\n` + reportInsights.abnormalValues.map(v => `* ${v}`).join('\n')
        : '';
        
      const specialistRec = reportInsights.suggestedSpecialist 
        ? `\n\n🎯 **Recommended specialist to consult**: **${reportInsights.suggestedSpecialist}**`
        : '';

      const content = `### 📋 Document Uploaded successfully!\n` +
        `**Title**: ${record.title}\n` +
        `**Category**: ${record.recordType.replace('_', ' ').toUpperCase()}\n\n` +
        `✨ **AI Clinical Summary**:\n${record.aiSummary || 'Document verified and stored in patient vault.'}` +
        `${abnormalList}` +
        `${specialistRec}\n\n` +
        `You can find the full file and download link in your [Medical Vault](/patient/records).`;

      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      
      toast('Report uploaded and analyzed successfully!', 'success');
    },
    onError: () => {
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Failed to upload and parse the document. Please verify the file is readable and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      toast('Failed to upload medical report.', 'error');
    }
  });

  const handleChatFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ""));
    formData.append('recordType', file.name.endsWith('.pdf') ? 'lab_report' : 'imaging');
    formData.append('description', 'Uploaded via AI Chat Assistant');

    chatUploadMutation.mutate(formData);
    e.target.value = '';
  };
  
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: "Hello! I'm **HealthAssist**, your personal AI health companion powered by MediCare.\n\nDescribe your symptoms and I'll help identify what you might be experiencing, suggest relevant medical specialists, and guide you on next steps.\n\n⚠️ For life-threatening emergencies, always call **112** or visit the **Emergency Hub** immediately.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  ]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const bottomRef = useRef();

  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogDetails, setErrorDialogDetails] = useState({ title: '', message: '', errorType: '', recommendedAction: '', retryable: false });
  const [aiStatus, setAiStatus] = useState('available');

  // Fetch past conversations list
  const { data: conversationsRes, refetch: refetchConversations } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => api.get('/ai/conversations').then(r => r.data),
  });

  const conversations = conversationsRes?.data || [];

  // Fetch single conversation details when selected
  const fetchConvMutation = useMutation({
    mutationFn: (id) => api.get(`/ai/conversations/${id}`).then(r => r.data),
    onSuccess: (res) => {
      const conv = res.data;
      setConversationId(conv._id);
      if (conv.messages?.length > 0) {
        setMessages(conv.messages.map(m => ({
          ...m,
          timestamp: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
        
        // Scan for emergency keywords in past messages to show alert if needed
        const hasEmergency = conv.messages.some(m => 
          m.role === 'user' && 
          EMERGENCY_KEYWORDS.some(kw => m.content.toLowerCase().includes(kw))
        );
        setShowEmergencyAlert(hasEmergency);
      }
    }
  });

  // Delete conversation
  const deleteConvMutation = useMutation({
    mutationFn: (id) => api.delete(`/ai/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-conversations']);
      if (conversationId) {
        handleNewChat();
      }
    }
  });

  const analyzeSymptoms = () => {
    if (!input.trim()) return;
    recommendMutation.mutate({
      symptoms: input.trim(),
      ...(hasLocation && {
        latitude: location.latitude,
        longitude: location.longitude,
      }),
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, recommendMutation.isPending]);

  const sendMutation = useMutation({
    mutationFn: (message) => api.post('/ai/chat', { 
      message, 
      conversationId,
      ...(hasLocation && { latitude: location.latitude, longitude: location.longitude })
    }),
    onSuccess: (res) => {
      setConversationId(res.data.data.conversationId);
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: res.data.data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      refetchConversations();
    },
    onError: (error) => {
      const errData = error.response?.data;
      if (errData && errData.success === false) {
        setErrorDialogDetails({
          title: errData.title || 'AI Service Error',
          message: errData.description || errData.message || 'I encountered an issue processing your request. Please try again.',
          errorType: errData.errorCode || errData.errorType || 'UNKNOWN_ERROR',
          recommendedAction: errData.recommendedAction || '',
          retryable: errData.retryable ?? false
        });
        
        if (errData.errorCode === 'QUOTA_EXCEEDED') {
          setAiStatus('limited');
        } else if (errData.errorCode === 'RATE_LIMITED') {
          setAiStatus('high_load');
        } else {
          setAiStatus('offline');
        }
      } else {
        const isOffline = !navigator.onLine || error.message?.includes('Network Error');
        setErrorDialogDetails({
          title: isOffline ? 'No Internet Connection' : 'AI Service Temporarily Unavailable',
          message: isOffline 
            ? 'We couldn’t connect to the AI service. Check your internet connection and try again.'
            : 'Gemini is currently unavailable. Please try again in a few minutes.',
          errorType: isOffline ? 'NETWORK_ERROR' : 'SERVICE_DOWN',
          recommendedAction: isOffline ? 'Verify your local network setup.' : 'Please wait and try again shortly.',
          retryable: true
        });
        setAiStatus('offline');
      }
      setShowErrorDialog(true);
    },
  });

  const handleSend = (e) => {
    e?.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;
    
    const msg = input.trim();
    const isEmergency = EMERGENCY_KEYWORDS.some(kw => msg.toLowerCase().includes(kw));
    if (isEmergency) {
      setShowEmergencyAlert(true);
    }

    setMessages((prev) => [...prev, { 
      role: 'user', 
      content: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInput('');
    sendMutation.mutate(msg);
  };

  const handleQuickPrompt = (promptText) => {
    const isEmergency = EMERGENCY_KEYWORDS.some(kw => promptText.toLowerCase().includes(kw));
    if (isEmergency) {
      setShowEmergencyAlert(true);
    }

    setMessages((prev) => [...prev, { 
      role: 'user', 
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    sendMutation.mutate(promptText);
  };

  const handleNewChat = () => {
    setConversationId(null);
    setShowEmergencyAlert(false);
    setMessages([
      { 
        role: 'assistant', 
        content: "Hello! I'm **HealthAssist**, your personal AI health companion powered by MediCare.\n\nDescribe your symptoms and I'll help identify what you might be experiencing, suggest relevant medical specialists, and guide you on next steps.\n\n⚠️ For life-threatening emergencies, always call **112** or visit the **Emergency Hub** immediately.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleClearChat = () => {
    if (conversationId) {
      deleteConvMutation.mutate(conversationId);
    } else {
      handleNewChat();
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const submitAnswerDirectly = (ans) => {
    if (sendMutation.isPending) return;
    setMessages((prev) => [...prev, { 
      role: 'user', 
      content: ans,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    sendMutation.mutate(ans);
  };

  const renderMessageContent = (content) => {
    if (!content) return null;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        const textWithoutJson = content.replace(/```json\s*([\s\S]*?)\s*```/, '').trim();
        
        return (
          <div className="space-y-2">
            {textWithoutJson && renderMarkdown(textWithoutJson)}
            {parsed.cardType === 'reportComparison' && <ReportComparisonCard data={parsed.data} />}
            {parsed.cardType === 'medicineInteraction' && <MedicineInteractionCard data={parsed.data} />}
            {parsed.cardType === 'symptomInterview' && (
              <SymptomInterviewCard 
                data={parsed.data} 
                onAnswer={submitAnswerDirectly} 
              />
            )}
            {parsed.cardType === 'healthTimeline' && <HealthTimelineCard data={parsed.data} />}
          </div>
        );
      } catch (err) {
        console.error('Failed to parse message card JSON:', err);
      }
    }
    
    return renderMarkdown(content);
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc my-1 text-xs md:text-sm font-medium">
            {parseInlineMarkdown(line.substring(2))}
          </li>
        );
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-xs md:text-sm font-black mt-3 mb-1 text-slate-800 dark:text-slate-200">{parseInlineMarkdown(line.substring(4))}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-sm md:text-base font-black mt-3.5 mb-1.5 text-slate-800 dark:text-slate-200">{parseInlineMarkdown(line.substring(3))}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-base md:text-lg font-black mt-4 mb-2 text-slate-850 dark:text-white">{parseInlineMarkdown(line.substring(2))}</h1>;
      }
      if (line.trim() === '---') {
        return <hr key={idx} className="my-3 border-slate-250 dark:border-slate-800" />;
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="mb-1 text-xs md:text-sm leading-relaxed font-medium">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  const parseInlineMarkdown = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-extrabold text-teal-850 dark:text-teal-300">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6 overflow-hidden">
      {/* Sidebar Panel for past conversations */}
      <Card className="hidden md:flex w-72 flex-col shrink-0 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          <Button onClick={handleNewChat} className="bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold gap-2 w-full py-2.5 cursor-pointer">
            <Plus className="h-4 w-4" /> Start New Chat
          </Button>
          <Button onClick={handleClearChat} variant="outline" className="border-slate-200 dark:border-slate-850 text-slate-600 hover:text-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold gap-2 w-full py-2 cursor-pointer">
            <RotateCcw className="h-3.5 w-3.5" /> Reset Current Conversation
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 animate-fade-in">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1">
            <History className="h-3.5 w-3.5" /> Recent Consultations
          </p>
          {conversations.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8 italic">No past chats yet</p>
          ) : (
            conversations.map(conv => {
              const active = conv._id === conversationId;
              return (
                <div key={conv._id} className={`group flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer ${
                  active ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400'
                }`} onClick={() => fetchConvMutation.mutate(conv._id)}>
                  <span className="text-xs truncate max-w-[170px]">{conv.title || 'Conversation'}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteConvMutation.mutate(conv._id); }} 
                    className="opacity-0 group-hover:opacity-100 hover:text-red-655 transition p-1 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Main Conversation Window */}
      <div className="flex-1 flex flex-col h-full gap-4 min-w-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-855 dark:text-white flex flex-wrap items-center gap-2.5">
              <Bot className="h-6 w-6 text-teal-650 animate-pulse" /> AI Health Assistant
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                aiStatus === 'available' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                aiStatus === 'high_load' ? 'bg-amber-55 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450' :
                aiStatus === 'limited' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455' :
                'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  aiStatus === 'available' ? 'bg-emerald-500 animate-pulse' :
                  aiStatus === 'high_load' ? 'bg-amber-500 animate-pulse' :
                  aiStatus === 'limited' ? 'bg-rose-500' :
                  'bg-slate-400'
                }`} />
                {aiStatus === 'available' ? 'AI Available' :
                 aiStatus === 'high_load' ? 'High Load' :
                 aiStatus === 'limited' ? 'Daily Limit Reached' :
                 'Offline'}
              </span>
            </h1>
            <p className="text-xs text-slate-450 mt-0.5">Symptom analysis, professional doctor routing, and urgent care detection</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleClearChat} className="md:hidden bg-transparent border border-slate-200 text-slate-650 rounded-xl text-xs font-bold">
              Reset
            </Button>
            <Button onClick={handleNewChat} className="md:hidden bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold gap-2">
              <Plus className="h-4 w-4" /> New Chat
            </Button>
          </div>
        </div>

        {/* Emergency Alert Banner */}
        {showEmergencyAlert && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-300 dark:border-rose-900 flex items-start gap-3 shadow-sm animate-pulse">
            <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-455 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Potential Medical Emergency Detected</p>
              <p className="text-xs text-rose-650 dark:text-rose-300 leading-relaxed font-semibold">
                If you or someone nearby is experiencing critical symptoms like acute chest pain, major injury, breathing distress, or fainting, do not wait for AI guidance.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <Link to="/patient/emergency-hub">
                  <Button className="bg-red-650 hover:bg-red-750 text-white text-[10px] font-extrabold px-3 py-1 rounded-lg">
                    🚨 Go to Emergency Hub
                  </Button>
                </Link>
                <a href="tel:102">
                  <Button variant="outline" className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-405 text-[10px] font-extrabold px-3 py-1 rounded-lg bg-white dark:bg-slate-950">
                    📞 Call 102 Ambulance
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {recommendMutation.data && <RecommendationCard recommendation={recommendMutation.data} />}

        <Card className="flex flex-1 flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-950">
          <CardContent className="flex flex-1 flex-col p-0 overflow-hidden">
            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse animate-slide-in-right' : 'animate-slide-in-left'}`}
                >
                  <div className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full ${
                    msg.role === 'user' ? 'bg-teal-650 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-850 shadow-sm'
                  }`}>
                    {msg.role === 'user' ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5 text-teal-650" />}
                  </div>
                  <div className={`group relative max-w-[75%] rounded-2xl px-4 py-3 text-xs md:text-sm font-medium leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-teal-655 text-white' 
                      : msg.content.includes('🚨 EMERGENCY WARNING') 
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                  }`}>
                    {/* Message contents formatted as markdown & structured cards */}
                    <div className="pr-5 space-y-2">
                      {renderMessageContent(msg.content)}
                    </div>
                    
                    {/* Timestamp & copy wrapper */}
                    <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-black/5 dark:border-white/5">
                      <span className={`text-[9px] font-semibold block ${msg.role === 'user' ? 'text-teal-200' : 'text-slate-400'}`}>
                        {msg.timestamp}
                      </span>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => copyToClipboard(msg.content, i)}
                          className="opacity-0 group-hover:opacity-100 transition duration-150 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                          title="Copy response text"
                        >
                          {copiedId === i ? <Check className="h-3 w-3 text-emerald-650" /> : <Copy className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing Dot Bouncing Animation */}
              {sendMutation.isPending && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-850">
                    <Bot className="h-4.5 w-4.5 text-teal-650 animate-pulse" />
                  </div>
                  <div className="flex space-x-1.5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-16 items-center justify-center shadow-sm">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-teal-650 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-teal-800 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Prompts pills */}
            {messages.length <= 2 && !sendMutation.isPending && (
              <div className="px-4 py-2 bg-slate-50/30 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-850">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Try asking or saying:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(qp.text)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-slate-650 hover:text-teal-655 dark:text-slate-350 dark:hover:text-teal-400 hover:border-teal-400 hover:bg-teal-50/10 transition cursor-pointer shadow-xs"
                    >
                      <span>{qp.icon}</span>
                      <span>{qp.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input form */}
            <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-200/80 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/20">
              <input
                ref={chatFileRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleChatFileChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => chatFileRef.current?.click()}
                disabled={chatUploadMutation.isPending || sendMutation.isPending}
                title="Upload & analyze a medical report (PDF or Image)"
                className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-500 hover:text-teal-600 cursor-pointer shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type symptoms (e.g. chest pain, stomach ache) or ask a health query..."
                className="flex-1 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-teal-600 focus:border-teal-600 text-xs md:text-sm py-2.5 outline-none"
                disabled={sendMutation.isPending}
              />
              <Button
                type="button"
                variant="outline"
                onClick={analyzeSymptoms}
                disabled={recommendMutation.isPending || !input.trim()}
                title="Analyze symptoms & map specialists"
                className="rounded-xl border-slate-200 dark:border-slate-800 text-teal-600 hover:text-teal-700 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button type="submit" disabled={sendMutation.isPending || !input.trim()} className="bg-teal-650 hover:bg-teal-705 text-white rounded-xl cursor-pointer">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {showErrorDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                errorDialogDetails.errorType === 'QUOTA_EXCEEDED' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' :
                errorDialogDetails.errorType === 'RATE_LIMIT' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' :
                errorDialogDetails.errorType === 'AUTH_ERROR' ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20' :
                'bg-slate-100 text-slate-650 dark:bg-slate-900 dark:text-slate-400'
              }`}>
                {errorDialogDetails.errorType === 'QUOTA_EXCEEDED' ? <ShieldAlert className="h-6 w-6" /> :
                 errorDialogDetails.errorType === 'RATE_LIMIT' ? <Clock className="h-6 w-6" /> :
                 errorDialogDetails.errorType === 'NETWORK_ERROR' ? <AlertTriangle className="h-6 w-6" /> :
                 <Bot className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white">{errorDialogDetails.title}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Error Code: {errorDialogDetails.errorType}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs md:text-sm font-semibold leading-relaxed text-slate-500">{errorDialogDetails.message}</p>
              {errorDialogDetails.recommendedAction && (
                <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/5 p-2.5 rounded-xl border border-teal-500/10">
                  💡 <strong>Recommended Action</strong>: {errorDialogDetails.recommendedAction}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowErrorDialog(false); setAiStatus('available'); }} className="rounded-xl px-4 py-2 text-xs font-bold">
                Close
              </Button>
              {errorDialogDetails.retryable && (
                <Button 
                  onClick={() => {
                    setShowErrorDialog(false);
                    setAiStatus('available');
                    if (messages.length > 0) {
                      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                      if (lastUserMsg) {
                        sendMutation.mutate(lastUserMsg.content);
                      }
                    }
                  }} 
                  className="bg-teal-650 hover:bg-teal-700 text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" /> Retry
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
