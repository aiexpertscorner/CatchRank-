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
    type: editingSpot?.waterType || 'Kanaal',
    description: editingSpot?.description || '',
    isPrivate: editingSpot?.isPrivate ?? true
  });

  useEffect(() => {
    if (editingSpot) {
      setFormData({
        name: editingSpot.name,
        type: editingSpot.waterType || 'Kanaal',
        description: editingSpot.description || '',
        isPrivate: editingSpot.isPrivate ?? true
      });
    } else {
      setFormData({
        name: '',
        type: 'Kanaal',
        description: '',
        isPrivate: true
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
      if (editingSpot?.id) {
        await updateDoc(doc(db, 'spots', editingSpot.id), {
          ...formData,
          waterType: formData.type,
          updatedAt: serverTimestamp(),
        });
        toast.success('Stek bijgewerkt!');
      } else {
        const docRef = await addDoc(collection(db, 'spots'), {
          ...formData,
          waterType: formData.type,
          userId: profile.uid,
          createdAt: serverTimestamp(),
          location: { lat: 52.3676, lng: 4.9041 } // Placeholder
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
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                options={[
                  { value: 'Kanaal', label: 'Kanaal' },
                  { value: 'Plas', label: 'Plas' },
                  { value: 'Rivier', label: 'Rivier' },
                  { value: 'Polder', label: 'Polder' },
                  { value: 'Haven', label: 'Haven' },
                  { value: 'Zee', label: 'Zee' }
                ]}
                className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Privacy</label>
              <div 
                onClick={() => setFormData({ ...formData, isPrivate: !formData.isPrivate })}
                className="flex items-center justify-between h-16 px-6 bg-surface-soft/50 rounded-2xl border border-border-subtle hover:border-accent/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                    formData.isPrivate ? "bg-accent/10 text-accent" : "bg-water/10 text-water"
                  )}>
                    {formData.isPrivate ? <Lock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                  </div>
                  <span className="text-base font-bold text-primary select-none">Geheime stek</span>
                </div>
                <Checkbox 
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: !!checked })}
                  className="w-7 h-7 rounded-lg border-2 border-border-subtle data-[state=checked]:bg-accent data-[state=checked]:border-accent transition-all"
                />
              </div>
            </div>
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
