import React, { useState } from 'react';
import { 
  X, 
  Play, 
  MapPin, 
  Waves,
  Navigation,
  Clock
} from 'lucide-react';
import { Button, Card } from './ui/Base';
import { Input } from './ui/Inputs';
import { motion } from 'motion/react';
import { loggingService } from '../services/loggingService';
import { useAuth } from '../App';
import { toast } from 'sonner';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionModal: React.FC<SessionModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState('');

  const handleStartSession = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // In a real app, you'd get the actual lat/lng
      const sessionId = await loggingService.startSession(profile.uid, { 
        lat: 52.3676, 
        lng: 4.9041, 
        name: locationName || 'Huidige Locatie' 
      });
      
      toast.success('Sessie gestart!', {
        description: 'Veel succes aan de waterkant!'
      });
      onClose();
    } catch (error) {
      console.error('Start session error:', error);
      toast.error('Fout bij starten van sessie.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-surface border border-border-subtle rounded-[2.5rem] shadow-premium overflow-hidden"
      >
        <div className="p-8 border-b border-border-subtle flex items-center justify-between bg-gradient-to-r from-surface-soft/50 to-white">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-accent/10 rounded-[1.25rem] flex items-center justify-center shadow-inner">
              <Clock className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-primary tracking-tight">Nieuwe Sessie</h3>
              <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.3em]">Start je visdag • Live tracking</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 rounded-2xl hover:bg-surface-soft flex items-center justify-center text-text-muted hover:text-primary transition-all hover:rotate-90 duration-300"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="p-10 space-y-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Waar ga je vissen?</label>
              <Input 
                placeholder="Bijv. Amstel, Ouderkerk"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                icon={<MapPin className="w-6 h-6 text-accent" />}
                className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg px-6"
              />
            </div>
            <div className="flex gap-4 p-6 bg-accent/5 border border-accent/10 rounded-[1.5rem]">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5 text-accent" />
              </div>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                Je GPS locatie wordt automatisch gekoppeld voor nauwkeurige weerdata en statistieken.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-8 bg-surface-soft/50 border border-border-subtle rounded-[2rem] flex flex-col items-center gap-4 text-center group hover:border-water/30 transition-all cursor-pointer">
              <div className="w-16 h-16 bg-water/10 rounded-[1.25rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm">
                <Waves className="w-8 h-8 text-water" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1.5">Water Type</p>
                <p className="text-base font-bold text-primary">Zoetwater</p>
              </div>
            </div>
            <div className="p-8 bg-surface-soft/50 border border-border-subtle rounded-[2rem] flex flex-col items-center gap-4 text-center group hover:border-accent/30 transition-all cursor-pointer">
              <div className="w-16 h-16 bg-accent/10 rounded-[1.25rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm">
                <Navigation className="w-8 h-8 text-accent" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1.5">Methode</p>
                <p className="text-base font-bold text-primary">Kantvissen</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-surface-soft/30 border-t border-border-subtle">
          <Button 
            className="w-full h-18 text-2xl rounded-2xl shadow-premium-accent font-bold transition-all hover:-translate-y-1"
            onClick={handleStartSession}
            loading={loading}
            icon={<Play className="w-8 h-8 fill-current" />}
          >
            Sessie Starten
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
