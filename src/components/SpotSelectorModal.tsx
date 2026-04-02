import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Check, 
  Navigation,
  Search,
  Plus
} from 'lucide-react';
import { Button, Card, Badge } from './ui/Base';
import { Input } from './ui/Inputs';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Spot } from '../types';
import { useAuth } from '../App';
import { cn } from '../lib/utils';

interface SpotSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (spot: Spot) => void;
  currentSpotId?: string;
}

export const SpotSelectorModal: React.FC<SpotSelectorModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect,
  currentSpotId
}) => {
  const { profile } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      fetchSpots();
    }
  }, [isOpen, profile]);

  const fetchSpots = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'spots'), where('userId', '==', profile.uid));
      const snapshot = await getDocs(q);
      setSpots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Spot)));
    } catch (error) {
      console.error('Fetch spots error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpots = spots.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.waterType.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md bg-surface border-t sm:border border-border-subtle rounded-t-[2.5rem] sm:rounded-[3rem] shadow-premium overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Mobile Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-border-subtle rounded-full opacity-50" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 sm:p-8 border-b border-border-subtle flex items-center justify-between bg-gradient-to-r from-surface-soft/50 to-white sticky top-0 z-10">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-accent/10 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center shadow-inner">
              <MapPin className="w-5 h-5 sm:w-7 sm:h-7 text-accent" />
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-black text-primary tracking-tight">Kies een Stek</h3>
              <p className="text-[8px] sm:text-[10px] text-text-muted font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Wissel van locatie</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl hover:bg-surface-soft flex items-center justify-center transition-all text-text-muted hover:text-primary hover:rotate-90 duration-300"
          >
            <X className="w-5 h-5 sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 sm:p-8 border-b border-border-subtle bg-surface-soft/30">
          <Input 
            placeholder="Zoek op naam of water..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4 sm:w-5 h-5 text-text-muted" />}
            className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-surface border-border-subtle font-bold"
          />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar flex-1 space-y-3">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted font-bold">Stekken laden...</p>
            </div>
          ) : filteredSpots.length > 0 ? (
            filteredSpots.map((spot) => (
              <Card 
                key={spot.id}
                onClick={() => onSelect(spot)}
                className={cn(
                  "p-4 sm:p-5 bg-surface-card border rounded-2xl flex items-center justify-between group cursor-pointer transition-all active:scale-95",
                  currentSpotId === spot.id ? "border-accent bg-accent/5" : "border-border-subtle hover:border-accent/30"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                    currentSpotId === spot.id ? "bg-accent text-black" : "bg-surface-soft text-text-muted"
                  )}>
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-primary">{spot.name}</h5>
                    <p className="text-[10px] sm:text-xs text-text-muted flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {spot.waterType}
                    </p>
                  </div>
                </div>
                {currentSpotId === spot.id ? (
                  <Badge variant="success" className="bg-accent text-black border-none">Actief</Badge>
                ) : (
                  <Check className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Card>
            ))
          ) : (
            <div className="py-20 text-center">
              <MapPin className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
              <p className="text-text-secondary font-medium">Geen stekken gevonden.</p>
              <Button variant="ghost" className="mt-4 text-accent font-bold">Nieuwe stek toevoegen +</Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 bg-surface-soft/30 border-t border-border-subtle pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8">
          <Button 
            variant="secondary" 
            className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black"
            onClick={onClose}
          >
            Sluiten
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
