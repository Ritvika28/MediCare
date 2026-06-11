import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { useLocation } from '@/hooks/useLocation';
import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationCard } from '@/components/RecommendationCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIAssistant() {
  const { location, hasLocation } = useLocation({ requestOnMount: true });
  const recommendMutation = useRecommendations();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm HealthAssist. Describe your symptoms and I can suggest a department, hospital, and doctor." },
  ]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const bottomRef = useRef();

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

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const sendMutation = useMutation({
    mutationFn: (message) => api.post('/ai/chat', { message, conversationId }),
    onSuccess: (res) => {
      setConversationId(res.data.data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.data.message }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;
    const msg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    sendMutation.mutate(msg);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">AI Health Assistant</h1>
        <p className="text-sm text-slate-500">Symptom analyzer · Doctor suggestions · Not medical advice</p>
      </div>
      {recommendMutation.data && <RecommendationCard recommendation={recommendMutation.data} />}
      <Card className="flex flex-1 flex-col overflow-hidden min-h-[400px]">
        <CardContent className="flex flex-1 flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-teal-600" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {sendMutation.isPending && (
              <div className="flex gap-2 text-sm text-slate-500"><Bot className="h-4 w-4 animate-pulse" /> Thinking...</div>
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Symptoms or health question..." className="flex-1" />
            <Button type="button" variant="outline" onClick={analyzeSymptoms} disabled={recommendMutation.isPending} title="Analyze symptoms">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button type="submit" disabled={sendMutation.isPending}><Send className="h-4 w-4" /></Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
