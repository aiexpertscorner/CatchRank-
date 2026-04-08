import React, { useState, useEffect } from 'react';
import { X, Camera, Package, Tag, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Card } from '../../../components/ui/Base';
import { gearService } from '../services/gearService';
import { GearItem, GearCategory, GEAR_CATEGORY_LABELS } from '../../../types';
import { useAuth } from '../../../App';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

interface GearItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: GearItem | null;
  prefillData?: Partial<GearItem>;
}

const CATEGORY_OPTIONS: { value: GearCategory; label: string }[] = (
  Object.entries(GEAR_CATEGORY_LABELS) as [GearCategory, string][]
).map(([value, label]) => ({ value, label }));

const POPULAR_BRANDS = [
  'Shimano', 'Daiwa', 'Abu Garcia', 'Rapala', 'Westin',
  'Fox', 'Nash', 'Korda', 'Berkley', 'Savage Gear',
  'Illex', 'Strike Pro', 'BKK', 'Mustad', 'Owner',
];

/**
 * GearItemModal
 * Add or edit a gear item in Mijn Visgear.
 * Mobile-first bottom-sheet style on small screens.
 */
export const GearItemModal: React.FC<GearItemModalProps> = ({ isOpen, onClose, editItem, prefillData }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    brand: '',
    customBrand: '',
    category: 'rod' as GearCategory,
    model: '',
    description: '',
    photoURL: '',
    purchasePrice: '',
    isFavorite: false,
    notes: '',
  });

  const [showCustomBrand, setShowCustomBrand] = useState(false);

  useEffect(() => {
    if (editItem) {
      const isCustomBrand = !POPULAR_BRANDS.includes(editItem.brand);
      setForm({
        name: editItem.name,
        brand: isCustomBrand ? '__custom__' : editItem.brand,
        customBrand: isCustomBrand ? editItem.brand : '',
        category: editItem.category,
        model: editItem.model ?? '',
        description: editItem.description ?? '',
        photoURL: editItem.photoURL ?? '',
        purchasePrice: editItem.purchasePrice ? String(editItem.purchasePrice) : '',
        isFavorite: editItem.isFavorite,
        notes: editItem.notes ?? '',
      });
      setShowCustomBrand(isCustomBrand);
    } else if (prefillData) {
      const isCustomBrand = !!prefillData.brand && !POPULAR_BRANDS.includes(prefillData.brand);
      setForm({
        name: prefillData.name ?? '',
        brand: isCustomBrand ? '__custom__' : (prefillData.brand ?? ''),
        customBrand: isCustomBrand ? (prefillData.brand ?? '') : '',
        category: prefillData.category ?? 'rod',
        model: '',
        description: '',
        photoURL: prefillData.photoURL ?? '',
        purchasePrice: '',
        isFavorite: false,
        notes: '',
      });
      setShowCustomBrand(isCustomBrand);
    } else {
      setForm({
        name: '',
        brand: '',
        customBrand: '',
        category: 'rod',
        model: '',
        description: '',
        photoURL: '',
        purchasePrice: '',
        isFavorite: false,
        notes: '',
      });
      setShowCustomBrand(false);
    }
  }, [editItem, prefillData, isOpen]);

  const resolvedBrand = form.brand === '__custom__' ? form.customBrand : form.brand;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!form.name.trim()) {
      toast.error('Naam is verplicht.');
      return;
    }
    if (!resolvedBrand.trim()) {
      toast.error('Merk is verplicht.');
      return;
    }

    setLoading(true);
    try {
      const data: Omit<GearItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        name: form.name.trim(),
        brand: resolvedBrand.trim(),
        category: form.category,
        model: form.model.trim() || undefined,
        description: form.description.trim() || undefined,
        photoURL: form.photoURL.trim() || undefined,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        isFavorite: form.isFavorite,
        notes: form.notes.trim() || undefined,
        linkedCatchIds: [],
        linkedSessionIds: [],
        linkedSetupIds: [],
      };

      if (editItem?.id) {
        await gearService.updateGearItem(editItem.id, data);
        toast.success('Gear bijgewerkt!');
      } else {
        await gearService.addGearItem(profile.uid, data);
        toast.success(`${form.name} toegevoegd aan Mijn Visgear!`);
      }

      onClose();
    } catch (err) {
      console.error('Gear save error:', err);
      toast.error('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal — bottom sheet on mobile, centered on desktop */}
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
                    <Package className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-text-primary">
                    {editItem ? 'Gear Bewerken' : 'Gear Toevoegen'}
                  </h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] md:max-h-[70vh] overflow-y-auto">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Type gear</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, category: opt.value }))}
                        className={cn(
                          'py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border',
                          form.category === opt.value
                            ? 'bg-brand text-bg-main border-brand shadow-lg shadow-brand/20'
                            : 'bg-surface-soft text-text-muted border-border-subtle hover:border-brand/30'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Naam *</label>
                  <input
                    value={form.name}
                    onChange={set('name')}
                    placeholder={`bijv. Zodias 7'0" ML`}
                    className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
                    required
                  />
                </div>

                {/* Brand */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Merk *</label>
                  <div className="relative">
                    <select
                      value={form.brand}
                      onChange={(e) => {
                        const val = e.target.value;
                        setShowCustomBrand(val === '__custom__');
                        setForm((p) => ({ ...p, brand: val }));
                      }}
                      className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all appearance-none"
                    >
                      <option value="">Selecteer merk</option>
                      {POPULAR_BRANDS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__custom__">Ander merk...</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  </div>
                  {showCustomBrand && (
                    <input
                      value={form.customBrand}
                      onChange={set('customBrand')}
                      placeholder="Voer merk in"
                      className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all mt-2"
                    />
                  )}
                </div>

                {/* Model (optional) */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Model <span className="text-text-dim normal-case font-normal">optioneel</span></label>
                  <input
                    value={form.model}
                    onChange={set('model')}
                    placeholder="bijv. 2500 HG-F"
                    className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
                  />
                </div>

                {/* Photo URL */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Foto URL <span className="text-text-dim normal-case font-normal">optioneel</span></label>
                  <input
                    value={form.photoURL}
                    onChange={set('photoURL')}
                    placeholder="https://..."
                    type="url"
                    className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
                  />
                </div>

                {/* Purchase price */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Aankoopprijs <span className="text-text-dim normal-case font-normal">optioneel, in €</span></label>
                  <input
                    value={form.purchasePrice}
                    onChange={set('purchasePrice')}
                    placeholder="bijv. 149.95"
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Notities <span className="text-text-dim normal-case font-normal">optioneel</span></label>
                  <textarea
                    value={form.notes}
                    onChange={set('notes')}
                    placeholder="Bijzonderheden, aankoopdatum, ervaringen..."
                    rows={2}
                    className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all resize-none"
                  />
                </div>

                {/* Favorite toggle */}
                <div
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                    form.isFavorite
                      ? 'bg-brand/10 border-brand/30 text-brand'
                      : 'bg-surface-soft border-border-subtle text-text-muted hover:border-brand/20'
                  )}
                  onClick={() => setForm((p) => ({ ...p, isFavorite: !p.isFavorite }))}
                >
                  <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all', form.isFavorite ? 'bg-brand border-brand' : 'border-text-muted')}>
                    {form.isFavorite && <span className="text-bg-main text-xs font-black">✓</span>}
                  </div>
                  <span className="text-sm font-bold">Toevoegen aan Favorieten</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" className="flex-1 h-12 rounded-xl" onClick={onClose}>
                    Annuleer
                  </Button>
                  <Button type="submit" className="flex-1 h-12 rounded-xl font-bold shadow-premium-accent" isLoading={loading}>
                    {editItem ? 'Opslaan' : 'Toevoegen'}
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
