import React, { useEffect, useState } from 'react';
import { 
  X, 
  MapPin, 
  Camera,
  Info,
  Save,
  Navigation,
  Anchor,
  Globe,
  Lock
} from 'lucide-react';
import { Button, Card } from './ui/Base';
import { Input, Textarea, Select, Checkbox } from './ui/Inputs';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { Spot } from '../types';
import { cn } from '../lib/utils';

interface SpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (spotId: string) => void;
  editingSpot?: Spot;
}

export const SpotModal: React.FC<SpotModalProps> = ({ isOpen, onClose, onSuccess, editingSpot }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: editingSpot?.name || '',
    waterType: editingSpot?.waterType || 'canal',
    waterBodyName: editingSpot?.waterBodyName || '',
    description: editingSpot?.description || '',
    visibility: editingSpot?.visibility || 'private'
  });

  useEffect(() => {
    if (editingSpot) {
      setFormData({
        name: editingSpot.name,
        waterType: editingSpot.waterType || 'canal',
        waterBodyName: editingSpot.waterBodyName || '',
        description: editingSpot.description || '',
        visibility: editingSpot.visibility || 'private'
      });
    } else {
      setFormData({
        name: '',
        waterType: 'canal',
        waterBodyName: '',
        description: '',
        visibility: 'private'
      });
    }
  }, [editingSpot, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!formData.name) {
      toast.error('Naam is verplicht');
      return;
    }

    setLoading(true);
    try {
      const spotData = {
        ...formData,
        userId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || '',
        updatedAt: serverTimestamp(),
        coordinates: { lat: 52.3676, lng: 4.9041 }, // Placeholder for now
        isPrivate: formData.visibility === 'private' // Backward compatibility
      };

      if (editingSpot?.id) {
        await updateDoc(doc(db, 'spots', editingSpot.id), spotData);
        toast.success('Stek bijgewerkt!');
      } else {
        const docRef = await addDoc(collection(db, 'spots'), {
          ...spotData,
          createdAt: serverTimestamp(),
          stats: {
            totalCatches: 0,
            totalSessions: 0,
            topSpecies: [],
            avgRating: 0,
            ratingCount: 0
          }
        });
        toast.success('Stek toegevoegd!');
        if (onSuccess) onSuccess(docRef.id);
      }
      
      onClose();
    } catch (error) {
      console.error('Save spot error:', error);
      toast.error('Fout bij opslaan stek.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
        className="relative w-full max-w-lg bg-surface border border-border-subtle rounded-[2.5rem] shadow-premium overflow-hidden"
      >
        <div className="p-8 border-b border-border-subtle flex items-center justify-between bg-gradient-to-r from-surface-soft/50 to-white">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-accent/10 rounded-[1.25rem] flex items-center justify-center shadow-inner">
              <MapPin className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-primary tracking-tight">{editingSpot ? 'Stek Bewerken' : 'Nieuwe Stek'}</h3>
              <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.3em]">Beheer je visplekken • GPS Tracking</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 rounded-2xl hover:bg-surface-soft flex items-center justify-center text-text-muted hover:text-primary transition-all hover:rotate-90 duration-300"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Naam van de stek</label>
            <Input 
              placeholder="Bijv. De Kromme Mijdrecht"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              icon={<Anchor className="w-6 h-6 text-accent" />}
              className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg px-6"
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Type Water</label>
              <Select 
                value={formData.waterType}
                onChange={(e) => setFormData({ ...formData, waterType: e.target.value })}
                options={[
                  { value: 'canal', label: 'Kanaal' },
                  { value: 'lake', label: 'Plas / Meer' },
                  { value: 'river', label: 'Rivier' },
                  { value: 'polder', label: 'Polder' },
                  { value: 'pond', label: 'Vijver' },
                  { value: 'sea', label: 'Zee' }
                ]}
                className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Zichtbaarheid</label>
              <Select 
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                options={[
                  { value: 'private', label: 'Privé (Alleen ik)' },
                  { value: 'friends', label: 'Vrienden' },
                  { value: 'public', label: 'Openbaar' }
                ]}
                className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Naam Water (Optioneel)</label>
            <Input 
              placeholder="Bijv. Amsterdam-Rijnkanaal"
              value={formData.waterBodyName}
              onChange={(e) => setFormData({ ...formData, waterBodyName: e.target.value })}
              icon={<Navigation className="w-6 h-6 text-accent" />}
              className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg px-6"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Beschrijving / Notities</label>
            <Textarea 
              placeholder="Bijv. Goede plek voor snoekbaars bij de brug..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="rounded-[2rem] bg-surface-soft/30 border-border-subtle focus:border-accent font-medium text-lg p-6"
            />
          </div>

          <div className="p-8 bg-water/5 border border-water/10 rounded-[2.5rem] flex gap-6 items-center">
            <div className="w-14 h-14 bg-water/10 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-sm">
              <Navigation className="w-7 h-7 text-water" />
            </div>
            <p className="text-sm text-text-secondary leading-relaxed font-medium">
              Je huidige GPS locatie wordt automatisch opgeslagen bij deze stek zodat je hem later makkelijk terugvindt op de kaart.
            </p>
          </div>
        </form>

        <div className="p-8 bg-surface-soft/30 border-t border-border-subtle flex gap-6">
          <Button variant="ghost" className="flex-1 h-18 text-text-muted hover:text-primary font-bold text-lg rounded-2xl" onClick={onClose}>Annuleren</Button>
          <Button 
            className="flex-[2] h-18 text-2xl rounded-2xl shadow-premium-accent font-bold transition-all hover:-translate-y-1"
            onClick={handleSubmit}
            loading={loading}
            icon={<Save className="w-8 h-8" />}
          >
            Stek Opslaan
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
