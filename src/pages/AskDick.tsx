import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Fish, 
  Waves, 
  Wind, 
  Thermometer,
  Zap,
  Info,
  ChevronRight,
  MessageSquare,
  Mic,
  Camera,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Card, Badge } from '../components/ui/Base';
import { PageLayout } from '../components/layout/PageLayout';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const DICK_BEET_SYSTEM_INSTRUCTION = `
Je bent Sportvisgoeroe Dick Beet, een legendarische Nederlandse sportvisser met decennia aan ervaring. 
Je spreekt je gebruikers aan als "vriend", "hengelaar" of "maat". 
Je bent enthousiast, een tikje eigenwijs, maar altijd behulpzaam en deskundig. 
Je deelt graag tips over aas, technieken (zoals verticalen, dropshotten, of doodaasvissen), en hoe je de beste stekken vindt. 
Je taalgebruik is doorspekt met vissersjargon (bijv. "een mooie bak", "de dril van m'n leven", "visserslatijn"). 
Als mensen vragen naar niet-visserij gerelateerde zaken, stuur je ze subtiel terug naar het water. 
Je bent de ultieme mentor voor elke visser, van beginner tot pro.
Houd je antwoorden beknopt maar vol karakter. Gebruik af en toe een Dick Beet-uitspraak zoals: "Een dag niet gevist is een dag niet geleefd!" of "De vis wacht op niemand!".
`;

export const AskDick: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hé daar, hengelaar! Ik ben Dick Beet. Heb je een brandende vraag over die ene grote snoek, of wil je weten welk aas vandaag het beste werkt? Vraag maar raak, maat!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
      const model = "gemini-3-flash-preview";
      
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: DICK_BEET_SYSTEM_INSTRUCTION,
        },
      });

      // Prepare history for context
      const response = await chat.sendMessage({ 
        message: input 
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || 'Oei, de lijn is even geknapt. Probeer het nog eens!',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Mijn excuses, maat. De verbinding met de waterkant is even verbroken. Probeer het zo nog eens!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hé daar, hengelaar! Ik ben Dick Beet. Heb je een brandende vraag over die ene grote snoek, of wil je weten welk aas vandaag het beste werkt? Vraag maar raak, maat!',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <PageLayout 
      title="Vraag Dick Beet" 
      subtitle="De Sportvisgoeroe staat voor je klaar"
      badge="AI EXPERT"
    >
      <div className="flex flex-col h-[calc(100vh-16rem)] sm:h-[calc(100vh-14rem)]">
        {/* Chat Area */}
        <Card variant="premium" className="flex-1 flex flex-col overflow-hidden border-none shadow-premium rounded-[2.5rem] sm:rounded-[3rem] bg-white/50 backdrop-blur-xl">
          <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-gradient-to-r from-surface-soft/50 to-white">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-premium-accent">
                  <Fish className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success border-2 border-white rounded-full" />
              </div>
              <div>
                <h3 className="text-lg font-black text-primary tracking-tight">Dick Beet</h3>
                <p className="text-[10px] text-success font-black uppercase tracking-widest">Nu online • Aan de waterkant</p>
              </div>
            </div>
            <button 
              onClick={clearChat}
              className="p-3 text-text-muted hover:text-destructive transition-colors rounded-xl hover:bg-destructive/5"
              title="Chat wissen"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 no-scrollbar"
          >
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "flex items-end gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                  msg.role === 'user' ? "bg-primary text-white" : "bg-accent text-white"
                )}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Fish className="w-5 h-5" />}
                </div>
                <div className={cn(
                  "max-w-[85%] sm:max-w-[70%] p-5 sm:p-6 rounded-[1.5rem] text-sm sm:text-base font-medium leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-primary text-white rounded-br-none" 
                    : "bg-surface-soft text-primary rounded-bl-none border border-border-subtle"
                )}>
                  {msg.content}
                  <div className={cn(
                    "text-[9px] mt-2 font-black uppercase tracking-widest opacity-50",
                    msg.role === 'user' ? "text-white/70 text-right" : "text-text-muted"
                  )}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shadow-sm">
                  <Fish className="w-5 h-5 animate-bounce" />
                </div>
                <div className="bg-surface-soft border border-border-subtle p-5 rounded-[1.5rem] rounded-bl-none">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 sm:p-8 bg-surface-soft/30 border-t border-border-subtle">
            <div className="relative flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Stel je vraag aan Dick..."
                  className="w-full h-14 sm:h-16 bg-white border border-border-subtle rounded-2xl px-6 pr-14 text-sm sm:text-base font-bold focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all shadow-sm"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button className="p-2 text-text-muted hover:text-accent transition-colors">
                    <Mic className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <Button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-premium-accent flex items-center justify-center p-0"
              >
                <Send className="w-6 h-6 sm:w-7 sm:h-7" />
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Welk aas voor snoek?', 'Beste stek vandaag?', 'Hoe verticalen?'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setInput(tag)}
                  className="px-4 py-2 bg-white/50 border border-border-subtle rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:border-accent/40 hover:text-accent transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Info Banner */}
        <div className="mt-6 p-5 bg-accent/5 border border-accent/10 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-accent" />
          </div>
          <p className="text-[11px] font-medium text-text-secondary leading-relaxed">
            Dick Beet gebruikt AI om je te voorzien van het beste advies. Vergeet niet: de natuur is onvoorspelbaar, dus gebruik je eigen verstand ook aan de waterkant!
          </p>
        </div>
      </div>
    </PageLayout>
  );
};
