import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  ChevronLeft, 
  Trash2, 
  MessageSquare, 
  Zap, 
  Fish, 
  Target, 
  Layers, 
  Anchor, 
  Waves, 
  Thermometer, 
  Wind, 
  Sun, 
  Moon, 
  ArrowRight,
  Info,
  MoreVertical,
  Share2,
  Bookmark
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'sonner';

/**
 * Ask Dick (AI) Screen
 * Part of the 'tools' feature module.
 * AI-powered assistant for fishing advice using Gemini.
 */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AskDick() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hoi! Ik ben Dick, je persoonlijke vis-assistent. Waar kan ik je vandaag mee helpen? Vraag me gerust om advies over stekken, technieken, materiaal of het weer.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: input,
        config: {
          systemInstruction: "Je bent Dick, een ervaren en enthousiaste sportvisser en expert op het gebied van vissen in Nederland. Je geeft praktisch, slim en deskundig advies aan andere vissers. Je bent vriendelijk, no-nonsense en gebruikt af en toe vaktermen. Je antwoordt altijd in het Nederlands. Je bent onderdeel van de CatchRank app.",
        },
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "Sorry, ik kon geen antwoord genereren. Probeer het nog eens.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      toast.error("Er ging iets mis bij het ophalen van het antwoord.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Weet je zeker dat je de chat wilt wissen?')) {
      setMessages([messages[0]]);
    }
  };

  const suggestedQuestions = [
    "Wat is het beste aas voor snoekbaars?",
    "Hoe vis ik met een dropshot montage?",
    "Wat zijn de beste stekken in Amsterdam?",
    "Welke hengel heb ik nodig voor zeebaars?",
  ];

  return (
    <PageLayout>
      <PageHeader 
        title="Ask Dick (AI)" 
        subtitle="Je persoonlijke vis-expert"
        actions={
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-text-muted hover:text-danger">
            <Trash2 className="w-4 h-4 mr-2" />
            Wis Chat
          </Button>
        }
      />

      <div className="flex flex-col h-[calc(100vh-280px)] max-h-[800px] mb-32 px-2 md:px-0">
        <Card className="flex-1 flex flex-col border border-border-subtle bg-surface-card rounded-[2.5rem] shadow-premium overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  msg.role === 'assistant' ? 'bg-brand text-bg-main' : 'bg-surface-soft text-text-primary border border-border-subtle'
                }`}>
                  {msg.role === 'assistant' ? <Sparkles className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`max-w-[85%] md:max-w-[70%] space-y-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'assistant' 
                      ? 'bg-surface-soft text-text-primary rounded-tl-none border border-border-subtle' 
                      : 'bg-brand text-bg-main font-medium rounded-tr-none shadow-lg shadow-brand/20'
                  }`}>
                    {msg.content}
                  </div>
                  <p className="text-[9px] font-black text-text-dim uppercase tracking-widest px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand text-bg-main flex items-center justify-center shadow-lg animate-pulse">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="bg-surface-soft border border-border-subtle p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-4 py-2 bg-surface-soft border border-border-subtle rounded-xl text-xs font-bold text-text-secondary hover:text-brand hover:border-brand transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-surface-soft/50 border-t border-border-subtle">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                placeholder="Vraag Dick om advies..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-surface-card border border-border-subtle rounded-2xl pl-6 pr-14 py-4 text-sm text-text-primary focus:outline-none focus:border-brand transition-all shadow-inner"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`absolute right-2 p-3 rounded-xl transition-all ${
                  input.trim() && !isLoading 
                    ? 'bg-brand text-bg-main shadow-lg shadow-brand/20 hover:scale-105 active:scale-95' 
                    : 'bg-surface-soft text-text-dim cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[9px] font-black text-text-dim uppercase tracking-widest text-center mt-3">
              Dick kan fouten maken. Controleer altijd de lokale regelgeving.
            </p>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
