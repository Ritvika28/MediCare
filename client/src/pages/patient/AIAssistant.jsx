import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/axios';
import { useLocation } from '@/hooks/useLocation';
import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationCard } from '@/components/RecommendationCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Bot, Send, User, Sparkles, Plus, Trash2,
  ShieldAlert, History, Copy, Check, RotateCcw 
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

export default function AIAssistant() {
  const queryClient = useQueryClient();
  const { location, hasLocation } = useLocation({ requestOnMount: true });
  const recommendMutation = useRecommendations();
  
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
    mutationFn: (message) => api.post('/ai/chat', { message, conversationId }),
    onSuccess: (res) => {
      setConversationId(res.data.data.conversationId);
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: res.data.data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      refetchConversations();
    },
    onError: () => {
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
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
            <h1 className="text-2xl font-black text-slate-850 dark:text-white flex items-center gap-2">
              <Bot className="h-6 w-6 text-teal-600 animate-pulse" /> AI Health Assistant
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
                    {/* Message contents formatted as markdown */}
                    <div className="pr-5">
                      {renderMarkdown(msg.content)}
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
    </div>
  );
}
