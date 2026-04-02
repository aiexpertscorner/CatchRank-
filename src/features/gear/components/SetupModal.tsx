import React, { useState, useEffect } from 'react';
import { X, Layers, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Card } from '../../../components/ui/Base';
import { gearService } from '../services/gearService';
import { GearItem, GearSetup } from '../../../types';
import { useAuth } from '../../../App';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  editSetup?: GearSetup | null;
}

/**
 * SetupModal
 * Create or edit a gear setup in Mijn Visgear.
 * Loads user's gear items to populate rod/reel/line/lure selectors.
 */
export const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose, editSetup }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [gearLoading, setGearLoading] = useState(false);
  const [allGear, setAllGear] = useState<GearItem[]>([]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    rodId: '',
    reelId: '',
    lineId: '',
    leaderId: '',
    lureId: '',
    notes: '',
  });

  // Load user gear for selectors
  useEffect(() => {
    if (!isOpen || !profile) return;

    setGearLoading(true);
    gearService.getUserGear(profile.uid)
      .then((items) => setAllGear(items))
      .catch((err) => console.error('Load gear error:', err))
      .finally(() => setGearLoading(false));
  }, [isOpen, profile]);

  // Populate form when editing
  useEffect(() => {
    if (editSetup) {
      setForm({
        name: editSetup.name,
        description: editSetup.description ?? '',
        rodId: editSetup.rodId ?? '',
        reelId: editSetup.reelId ?? '',
        lineId: editSetup.lineId ?? '',
        leaderId: editSetup.leaderId ?? '',
        lureId: editSetup.lureId ?? '',
        notes: editSetup.notes ?? '',
      });
    } else {
      setForm({ name: '', description: '', rodId: '', reelId: '', lineId: '', leaderId: '', lureId: '', notes: '' });
    }
  }, [editSetup, isOpen]);

  const gearByCategory = (category: string) =>
    allGear.filter((g) => g.category === category);

  const selectedGearIds = [form.rodId, form.reelId, form.lineId, form.leaderId, form.lureId].filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!form.name.trim()) {
      toast.error('Setup naam is verplicht.');
      return;
    }
    if (selectedGearIds.length === 0) {
      toast.error('Selecteer minimaal één gear item.');
      return;
    }

    setLoading(true);
    try {
      const data: Omit<GearSetup, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        rodId: form.rodId || undefined,
        reelId: form.reelId || undefined,
        lineId: form.lineId || undefined,
        leaderId: form.leaderId || undefined,
        lureId: form.lureId || undefined,
        gearIds: selectedGearIds,
        notes: form.notes.trim() || undefined,
      };

      if (editSetup?.id) {
        await gearService.updateSetup(editSetup.id, data);
        toast.success('Setup bijgewerkt!');
      } else {
        await gearService.createSetup(profile.uid, data);
        toast.success(`Setup "${form.name}" aangemaakt!`);
      }

      onClose();
    } catch (err) {
      console.error('Setup save error:', err);
      toast.error('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const GearSelector = ({
    label,
    category,
    field,
  }: {
    label: string;
    category: string;
    field: 'rodId' | 'reelId' | 'lineId' | 'leaderId' | 'lureId';
  }) => {
    const options = gearByCategory(category);
    return (
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
          {label} <span className="text-text-dim normal-case font-normal">optioneel</span>
        </label>
        <div className="relative">
          <select
            value={form[field]}
            onChange={set(field)}
            className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all appearance-none"
          >
            <option value="">— Niet gekoppeld —</option>
            {options.map((g) => (
              <option key={g.id} value={g.id}>
                {g.brand} {g.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        {options.length === 0 && !gearLoading && (
          <p className="text-[9px] text-text-dim">Geen {label.toLowerCase()} in Mijn Gear. Voeg eerst gear toe.</p>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 px-0 md:px-4"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <Card
              padding="none"
              className="w-full md:max-w-lg bg-surface-card border border-border-subtle shadow-2xl rounded-t-3xl md:rounded-[2rem] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-text-primary">
                    {editSetup ? 'Setup Bewerken' : 'Nieuwe Setup'}
                  </h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] md:max-h-[72vh] overflow-y-auto">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Setup naam *</label>
                  <input
                    value={form.name}
                    onChange={set('name')}
                    placeholder="bijv. Lichte Baars Setup"
                    className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
                    required
                  />
                </div>

                {/* Gear selectors */}
                {gearLoading ? (
                  <div className="flex items-center gap-2 text-text-muted py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Gear laden...</span>
                  </div>
                ) : (
                  <>
                    <GearSelector label="Hengel" category="rod" field="rodId" />
                    <GearSelector label="Molen" category="reel" field="reelId" />
                    <GearSelector label="Lijn" category="line" field="lineId" />
                    <GearSelector label="Voorlijn" category="line" field="leaderId" />
                    <GearSelector label="Kunstaas / Lure" category="lure" field="lureId" />
                  </>
                )}

                {/* Selected summary */}
                {selectedGearIds.length > 0 && (
                  <div className="bg-brand/5 border border-brand/20 rounded-xl p-3">
                    <p className="text-[9px] font-black text-brand uppercase tracking-widest mb-1">Setup bevat</p>
                    <p className="text-xs text-text-secondary">
                      {selectedGearIds.length} gear item{selectedGearIds.length !== 1 ? 's' : ''} geselecteerd
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Notities <span className="text-text-dim normal-case font-normal">optioneel</span></label>
                  <textarea
                    value={form.notes}
                    onChange={set('notes')}
                    placeholder="Doelsoorten, omstandigheden, ervaringen..."
                    rows={2}
                    className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" className="flex-1 h-12 rounded-xl" onClick={onClose}>
                    Annuleer
                  </Button>
                  <Button type="submit" className="flex-1 h-12 rounded-xl font-bold shadow-premium-accent" isLoading={loading}>
                    {editSetup ? 'Opslaan' : 'Setup Aanmaken'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
