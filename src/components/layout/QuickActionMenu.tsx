import React, { useState } from 'react';
import { 
  Plus, 
  Camera, 
  History, 
  MapPin, 
  X, 
  FileEdit,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Base';
import { QuickCatchModal } from '../QuickCatchModal';

interface QuickActionMenuProps {
  className?: string;
  onAction?: (action: string) => void;
}

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);

  const actions = [
    { id: 'catch', label: 'Nieuwe Vangst', icon: Camera, color: 'bg-accent', description: 'Leg je vangst direct vast' },
    { id: 'session', label: 'Nieuwe Sessie', icon: History, color: 'bg-primary', description: 'Start een live vissessie' },
    { id: 'spot', label: 'Nieuwe Stek', icon: MapPin, color: 'bg-water', description: 'Sla een nieuwe visplek op' },
    { id: 'draft', label: 'Hervat Concept', icon: FileEdit, color: 'bg-warning', description: 'Maak je laatste log af' },
  ];

  const handleAction = (id: string) => {
    setIsOpen(false);
    if (id === 'catch') {
      setIsQuickCatchOpen(true);
    }
    // Other actions would navigate or open other modals
  };

  return (
    <>
      <div className={cn("relative z-50", className)}>
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md"
              />

              {/* Menu */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="absolute bottom-24 right-0 md:right-auto md:left-0 w-80 bg-surface rounded-[2.5rem] shadow-2xl overflow-hidden border border-border-subtle z-[60]"
              >
                <div className="p-8 border-b border-border-subtle bg-surface-soft/50">
                  <h4 className="text-2xl font-black text-text-primary tracking-tight">Snel Actie</h4>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-2">Wat wil je doen?</p>
                </div>
                <div className="p-3 space-y-1">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      className="w-full flex items-center gap-5 p-5 rounded-[1.5rem] hover:bg-surface-soft transition-all group text-left"
                    >
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-300", action.color)}>
                        <action.icon className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-black text-text-primary group-hover:text-accent transition-colors tracking-tight">{action.label}</p>
                        <p className="text-xs font-medium text-text-muted truncate">{action.description}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:bg-accent group-hover:text-white">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Toggle Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-premium transition-all active:scale-95 z-50 group",
            isOpen ? "bg-primary text-white" : "bg-accent text-white hover:shadow-premium-accent/40"
          )}
        >
          <Plus className={cn("w-10 h-10 transition-all duration-500", isOpen ? "rotate-[135deg]" : "rotate-0")} />
        </button>
      </div>

      <QuickCatchModal 
        isOpen={isQuickCatchOpen} 
        onClose={() => setIsQuickCatchOpen(false)} 
      />
    </>
  );
};
