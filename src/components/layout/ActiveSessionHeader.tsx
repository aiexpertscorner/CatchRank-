import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Pause, 
  Play, 
  Square, 
  Plus,
  Clock,
  ChevronRight,
  Fish,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '../../contexts/SessionContext';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { QuickCatchModal } from '../QuickCatchModal';
import { useNavigate } from 'react-router-dom';

export const ActiveSessionHeader: React.FC = () => {
  const { activeSession, endActiveSession, pauseActiveSession, resumeActiveSession } = useSession();
  const [elapsedTime, setElapsedTime] = useState<string>('');
  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeSession || !activeSession.startedAt) return;

    const updateTimer = () => {
      const start = activeSession.startedAt.toDate();
      const diff = new Date().getTime() - start.getTime();
      
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setElapsedTime(
        `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  if (!activeSession) return null;

  return (
    <>
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2 md:gap-4 bg-surface-card/80 backdrop-blur-md border border-accent/30 rounded-2xl px-3 py-1.5 md:px-5 md:py-2 shadow-premium-accent/10 group"
      >
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500",
            activeSession.status === 'live' 
              ? "bg-accent shadow-accent/20" 
              : "bg-surface-elevated border border-border-subtle"
          )}>
            <Fish className={cn(
              "w-5 h-5 transition-all duration-500", 
              activeSession.status === 'live' 
                ? "text-black fill-current animate-[pulse_2s_infinite]" 
                : "text-text-muted"
            )} />
          </div>
          
          <div className="hidden sm:block">
            <div className="flex items-center gap-2 mb-0.5">
              <p className={cn(
                "text-[9px] font-black uppercase tracking-[0.2em] leading-none",
                activeSession.status === 'live' ? "text-accent" : "text-text-muted"
              )}>
                {activeSession.status === 'live' ? 'Live Sessie Actief' : 'Sessie Gepauzeerd'}
              </p>
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-soft rounded-full border border-border-subtle">
                <Clock className="w-2.5 h-2.5 text-accent" />
                <span className="text-[9px] font-bold text-text-primary tabular-nums">
                  {elapsedTime}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 group/title">
              <h4 className="text-sm font-bold text-primary truncate max-w-[140px] leading-none tracking-tight">
                {activeSession.title || 'Naamloze Sessie'}
              </h4>
              <LayoutDashboard className="w-3 h-3 text-text-muted group-hover/title:text-accent transition-colors" />
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-border-subtle/50 mx-1 hidden sm:block" />

        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="hidden lg:flex items-center gap-2 bg-surface-soft px-3 py-1.5 rounded-xl border border-border-subtle/50">
            <Fish className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-black text-primary">
              {activeSession.linkedCatchIds?.length || 0}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {activeSession.status === 'live' ? (
              <button 
                onClick={pauseActiveSession}
                className="w-9 h-9 flex items-center justify-center bg-surface-elevated hover:bg-surface-soft rounded-xl border border-border-subtle transition-all text-text-secondary hover:text-primary active:scale-90"
                title="Pauzeer sessie"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={resumeActiveSession}
                className="w-9 h-9 flex items-center justify-center bg-accent hover:bg-accent-strong rounded-xl transition-all text-black shadow-lg active:scale-90"
                title="Hervat sessie"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}

            <button 
              onClick={() => setIsQuickCatchOpen(true)}
              className="w-9 h-9 flex items-center justify-center bg-brand hover:bg-brand-strong rounded-xl transition-all text-white shadow-lg shadow-brand/20 active:scale-90 group/btn"
              title="Vangst loggen"
            >
              <Plus className="w-5 h-5 group-hover/btn:rotate-90 transition-transform duration-300" />
            </button>

            <button 
              onClick={endActiveSession}
              className="w-9 h-9 flex items-center justify-center bg-danger/10 hover:bg-danger/20 rounded-xl border border-danger/20 transition-all text-danger active:scale-90"
              title="Sessie beëindigen"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      </motion.div>

      <QuickCatchModal 
        isOpen={isQuickCatchOpen} 
        onClose={() => setIsQuickCatchOpen(false)} 
        sessionId={activeSession.id}
      />
    </>
  );
};
