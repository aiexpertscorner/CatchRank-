import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Camera,
  History,
  MapPin,
  X,
  FileEdit,
  ChevronRight,
  Zap,
  Fish,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { QuickCatchModal } from '../QuickCatchModal';
import Logo from '../Logo';

interface QuickActionMenuProps {
  className?: string;
}

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { 
      id: 'catch', 
      label: 'Nieuwe Vangst', 
      icon: Camera, 
      color: 'bg-accent', 
      description: 'Leg je vangst direct vast',
      xp: '+10 XP'
    },
    { 
      id: 'session', 
      label: 'Nieuwe Sessie', 
      icon: History, 
      color: 'bg-primary', 
      description: 'Start een live vissessie',
      xp: '+25 XP'
    },
    { 
      id: 'spot', 
      label: 'Nieuwe Stek', 
      icon: MapPin, 
      color: 'bg-water', 
      description: 'Sla een nieuwe visplek op',
      xp: '+5 XP'
    },
    { 
      id: 'gear', 
      label: 'Nieuwe Gear', 
      icon: ShoppingBag, 
      color: 'bg-blue-500', 
      description: 'Voeg materiaal toe aan je kist',
      xp: '+5 XP'
    },
    { 
      id: 'draft', 
      label: 'Hervat Concept', 
      icon: FileEdit, 
      color: 'bg-warning', 
      description: 'Maak je laatste log af',
      xp: 'Voltooi'
    },
  ];

  const handleAction = (id: string) => {
    setIsOpen(false);
    switch (id) {
      case 'catch':
        setIsQuickCatchOpen(true);
        break;
      case 'session':
        navigate('/sessions');
        break;
      case 'spot':
        navigate('/spots');
        break;
      case 'gear':
        navigate('/gear');
        break;
      case 'draft':
        navigate('/catches?filter=draft');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Toggle Button - Premium Floating Action Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-premium transition-all active:scale-90 z-50 group relative overflow-hidden",
            isOpen ? "bg-primary text-white" : "bg-accent text-white hover:shadow-premium-accent/40"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className={cn("w-8 h-8 transition-all duration-500 relative z-10", isOpen ? "rotate-[135deg]" : "rotate-0")} />
        </button>

        {/* Portal for Menu and Backdrop */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                {/* Backdrop - High-end Blur */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />

                {/* Menu Content - Foldable Bottom Sheet */}
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                  drag="y"
                  dragConstraints={{ top: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 100) setIsOpen(false);
                  }}
                  className="relative bg-surface rounded-t-[2.5rem] shadow-[0_-20px_80px_rgba(0,0,0,0.4)] overflow-hidden border-t border-border-subtle pb-safe touch-none"
                >
                  {/* Drag Handle - Visual cue for "foldable" */}
                  <div className="w-12 h-1 bg-border-subtle/40 rounded-full mx-auto mt-3 mb-1" />
                  
                  {/* Header Section - Premium Branding */}
                  <div className="px-5 pt-4 pb-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Logo size="sm" withText={true} className="shrink-0" />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-4 h-4 rounded-md bg-accent/10 flex items-center justify-center">
                            <Zap className="w-2.5 h-2.5 text-accent" />
                          </div>
                          <span className="text-[9px] font-black text-accent uppercase tracking-[0.2em] whitespace-nowrap">Snel Loggen</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="w-9 h-9 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-primary transition-all active:scale-90 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-xl font-black text-primary tracking-tight leading-tight mt-2 px-0.5">
                      Wat gaan we <span className="text-accent italic">vangen?</span>
                    </h4>
                  </div>

                  {/* Actions Grid - Tactile and High-Contrast */}
                  <div className="px-4 py-3 grid grid-cols-1 gap-2">
                    {actions.map((action, index) => (
                      <motion.button
                        key={action.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 + 0.1 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleAction(action.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface-soft/60 hover:bg-surface-card hover:border-border-subtle transition-all group text-left relative overflow-hidden border border-border-subtle/30"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all group-hover:scale-110 duration-300 shrink-0 relative overflow-hidden",
                          action.color
                        )}>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50" />
                          <action.icon className="w-5 h-5 relative z-10" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-base font-black text-text-primary group-hover:text-accent transition-colors tracking-tight">
                              {action.label}
                            </p>
                            <div className="flex items-center gap-1 bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                              <Zap className="w-2 h-2 text-accent" />
                              <span className="text-[9px] font-black text-accent uppercase tracking-wider">
                                {action.xp}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] font-medium text-text-muted truncate">{action.description}</p>
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-text-muted group-hover:bg-accent group-hover:text-white transition-all border border-border-subtle/50 group-hover:border-accent shrink-0">
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>

                        {action.id === 'draft' && (
                          <div className="absolute top-0 right-0 w-1.5 h-full bg-warning/70 animate-pulse" />
                        )}
                      </motion.button>
                    ))}
                  </div>

                  {/* Footer Quote */}
                  <div className="px-5 py-4 bg-gradient-to-b from-transparent to-surface-soft/30 text-center">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-surface-card rounded-2xl border border-border-subtle/60">
                      <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <Fish className="w-3 h-3 text-accent" />
                      </div>
                      <p className="text-[10px] font-bold text-text-muted">
                        "Geen vis is te groot voor <span className="text-accent font-black">CatchRank</span>!"
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>

      <QuickCatchModal 
        isOpen={isQuickCatchOpen} 
        onClose={() => setIsQuickCatchOpen(false)} 
      />
    </>
  );
};
