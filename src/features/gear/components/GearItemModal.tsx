import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  X, Package, ChevronDown, ChevronUp, Info,
  Link2, Minus, Plus, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Card } from '../../../components/ui/Base';
import { gearService } from '../services/gearService';
import { productFeedServicePatch } from '../services/productFeedService.patch';
import { suggestSectionId, getSuggestedRequirementKeys } from '../services/completenessService';
import { GearItem, GearCategory, GEAR_CATEGORY_LABELS } from '../../../types';
import type {
  TackleboxItem, OwnershipStatus, ItemCondition, ItemUnit, ProductCatalogItem,
} from '../../../types';
import { useAuth } from '../../../App';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

/* ==========================================================================
   Constants
   ========================================================================== */

const POPULAR_BRANDS = [
  'Shimano', 'Daiwa', 'Abu Garcia', 'Rapala', 'Westin', 'Fox', 'Nash',
  'Korda', 'Berkley', 'Savage Gear', 'Illex', 'Strike Pro', 'BKK',
  'Mustad', 'Owner', 'CC Moore', 'Mainline', 'Dynamite Baits', 'Starbaits',
  'Ridgemonkey', 'Avid Carp', 'Solar', 'Spro',
];

const OWNERSHIP_OPTIONS: Array<{
  value: OwnershipStatus; label: string; description: string; color: string;
}> = [
  { value: 'owned',   label: 'Heb ik',    description: 'Ik bezit dit item',                color: 'text-success border-success/40 bg-success/10' },
  { value: 'want',    label: 'Wil ik',    description: 'Op mijn verlanglijst',              color: 'text-brand border-brand/40 bg-brand/10' },
  { value: 'reserve', label: 'Reserve',   description: 'Als reserveonderdeel',              color: 'text-text-secondary border-border-subtle bg-surface-soft' },
  { value: 'replace', label: 'Vervangen', description: 'Heb ik maar moet vervangen worden', color: 'text-orange-400 border-orange-400/40 bg-orange-400/10' },
];

const CONDITION_OPTIONS: Array<{ value: ItemCondition; label: string }> = [
  { value: 'goed',      label: 'Goed — werkt prima' },
  { value: 'redelijk',  label: 'Redelijk — nog bruikbaar' },
  { value: 'vervangen', label: 'Moet vervangen worden' },
];

const DISCIPLINE_OPTIONS = [
  { value: 'karper',      label: 'Karper',      emoji: '🐟' },
  { value: 'roofvis',     label: 'Roofvis',     emoji: '🦈' },
  { value: 'witvis',      label: 'Witvis',       emoji: '🎣' },
  { value: 'nachtvissen', label: 'Nachtvissen',  emoji: '🌙' },
];

const UNIT_OPTIONS: Array<{ value: ItemUnit; label: string }> = [
  { value: 'stuks',  label: 'st.' },
  { value: 'meter',  label: 'm'   },
  { value: 'kg',     label: 'kg'  },
  { value: 'gram',   label: 'g'   },
  { value: 'liter',  label: 'L'   },
  { value: 'rol',    label: 'rol' },
];

const SECTION_OPTIONS = [
  { value: 'rods_reels',         label: 'Hengels & Reels' },
  { value: 'terminal_tackle',    label: 'Terminal Tackle' },
  { value: 'hookbaits',          label: 'Haakaas' },
  { value: 'bait_liquids',       label: 'Voer & Liquids' },
  { value: 'bite_detection',     label: 'Bite Detection' },
  { value: 'landing_care',       label: 'Landing & Viszorg' },
  { value: 'shelter_sleep',      label: 'Shelter & Sleep' },
  { value: 'cooking_comfort',    label: 'Koken & Comfort' },
  { value: 'transport_power',    label: 'Transport & Power' },
  { value: 'clothing_safety',    label: 'Kleding & Veiligheid' },
  { value: 'leaders_terminal',   label: 'Leaders & Terminal' },
  { value: 'lure_families',      label: 'Kunstaasfamilies' },
  { value: 'unhook_safety',      label: 'Onthaak & Veiligheid' },
  { value: 'measure_document',   label: 'Meten & Documenteren' },
  { value: 'bags_mobility',      label: 'Tassen & Mobiliteit' },
  { value: 'comfort_vision',     label: 'Comfort & Zicht' },
  { value: 'line_storage',       label: 'Lijn & Spoel' },
];

const CATEGORY_OPTIONS: { value: GearCategory; label: string }[] = (
  Object.entries(GEAR_CATEGORY_LABELS) as [GearCategory, string][]
).map(([value, label]) => ({ value, label }));

/* ==========================================================================
   Props
   ========================================================================== */

interface GearItemModalProps {
  isOpen:         boolean;
  onClose:        () => void;
  editItem?:      TackleboxItem | GearItem | null;
  prefillData?:   Partial<TackleboxItem>;
  /** Pre-fill all fields from a catalog product (from QuickAddProductSearch) */
  prefillFromProduct?: ProductCatalogItem;
}

/* ==========================================================================
   Form state
   ========================================================================== */

interface FormState {
  name:             string;
  brand:            string;
  customBrand:      string;
  category:         GearCategory;
  model:            string;
  purchasePrice:    string;
  isFavorite:       boolean;
  notes:            string;
  ownershipStatus:  OwnershipStatus;
  condition:        ItemCondition;
  disciplineTags:   string[];
  sectionId:        string;
  requirementKeys:  string[];
  quantityOwned:    number;
  quantityWanted:   number;
  unit:             ItemUnit;
  linkedProductId:  string;
}

const DEFAULT_FORM: FormState = {
  name: '', brand: '', customBrand: '', category: 'rod',
  model: '', purchasePrice: '', isFavorite: false, notes: '',
  ownershipStatus: 'owned', condition: 'goed',
  disciplineTags: [], sectionId: '', requirementKeys: [],
  quantityOwned: 1, quantityWanted: 1, unit: 'stuks',
  linkedProductId: '',
};

/* ==========================================================================
   Quantity Stepper
   ========================================================================== */

function QuantityStepper({
  value,
  unit,
  onValueChange,
  onUnitChange,
  label,
}: {
  value:          number;
  unit:           ItemUnit;
  onValueChange:  (v: number) => void;
  onUnitChange:   (u: ItemUnit) => void;
  label:          string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {/* Stepper */}
        <div className="flex items-center border border-border-subtle rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => onValueChange(Math.max(1, value - 1))}
            className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-soft transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="w-12 h-10 flex items-center justify-center bg-surface-soft">
            <span className="text-sm font-black text-text-primary">{value}</span>
          </div>
          <button
            type="button"
            onClick={() => onValueChange(value + 1)}
            className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-brand hover:bg-brand/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Unit */}
        <div className="relative flex-1">
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value as ItemUnit)}
            className="w-full bg-surface-soft border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand transition-all appearance-none"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        </div>

        {/* Quick presets */}
        <div className="flex gap-1">
          {[2, 5, 10, 20].filter((n) => n !== value).slice(0, 2).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onValueChange(n)}
              className="w-8 h-10 rounded-lg bg-surface-soft border border-border-subtle text-[10px] font-black text-text-muted hover:text-brand hover:border-brand/30 transition-all"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Catalog match suggestions (shown under name input while typing)
   ========================================================================== */

function CatalogSuggestions({
  suggestions,
  loading,
  onSelect,
}: {
  suggestions: ProductCatalogItem[];
  loading:     boolean;
  onSelect:    (p: ProductCatalogItem) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-1 py-1.5 text-text-muted">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-[10px]">Zoeken in catalogus…</span>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-black text-brand uppercase tracking-widest flex items-center gap-1">
        <Link2 className="w-2.5 h-2.5" />
        Gevonden in catalogus — tik om alle gegevens in te vullen
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {suggestions.map((p) => {
          const id = (p as any).id ?? '';
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(p)}
              className="flex-shrink-0 flex items-center gap-2 px-2.5 py-2 rounded-xl bg-brand/8 border border-brand/20 hover:bg-brand/15 transition-all max-w-[180px]"
            >
              {p.imageURL && (
                <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={p.imageURL}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-brand leading-tight truncate">
                  {p.brand && <span className="text-text-dim">{p.brand} </span>}
                  {p.name.slice(0, 28)}
                </p>
                {p.price != null && (
                  <p className="text-[9px] text-text-muted">€{p.price.toFixed(2)}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   Main component
   ========================================================================== */

export const GearItemModal: React.FC<GearItemModalProps> = ({
  isOpen,
  onClose,
  editItem,
  prefillData,
  prefillFromProduct,
}) => {
  const { profile }         = useAuth();
  const [loading, setLoading]           = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCustomBrand, setShowCustomBrand] = useState(false);
  const [form, setForm]     = useState<FormState>(DEFAULT_FORM);

  // Catalog matching
  const [catalogSuggestions, setCatalogSuggestions] = useState<ProductCatalogItem[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [linkedProduct, setLinkedProduct] = useState<ProductCatalogItem | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Fill form from a catalog product ────────────────────────────────
  const fillFromCatalogProduct = useCallback((product: ProductCatalogItem) => {
    const isCustomBrand = !!product.brand && !POPULAR_BRANDS.includes(product.brand);
    setForm((prev) => ({
      ...prev,
      name:            product.name,
      brand:           isCustomBrand ? '__custom__' : (product.brand ?? ''),
      customBrand:     isCustomBrand ? (product.brand ?? '') : '',
      category:        (product.category as GearCategory) ?? prev.category,
      sectionId:       (product as any).sectionId ?? prev.sectionId,
      requirementKeys: (product as any).requirementKeys ?? prev.requirementKeys,
      linkedProductId: (product as any).id ?? (product as any)._id ?? '',
    }));
    setShowCustomBrand(isCustomBrand);
    setLinkedProduct(product);
    setCatalogSuggestions([]);
  }, []);

  // ── Reset on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setLinkedProduct(null);
    setCatalogSuggestions([]);

    if (prefillFromProduct) {
      fillFromCatalogProduct(prefillFromProduct);
      return;
    }

    if (editItem) {
      const item = editItem as TackleboxItem;
      const isCustomBrand = !!item.brand && !POPULAR_BRANDS.includes(item.brand);
      setForm({
        name:             item.name ?? '',
        brand:            isCustomBrand ? '__custom__' : (item.brand ?? ''),
        customBrand:      isCustomBrand ? item.brand : '',
        category:         (item.category as GearCategory) ?? 'rod',
        model:            item.model ?? '',
        purchasePrice:    item.purchasePrice ? String(item.purchasePrice) : '',
        isFavorite:       item.isFavorite ?? false,
        notes:            item.notes ?? '',
        ownershipStatus:  (item.ownershipStatus as OwnershipStatus) ?? 'owned',
        condition:        item.condition ?? 'goed',
        disciplineTags:   item.disciplineTags ?? [],
        sectionId:        item.sectionId ?? '',
        requirementKeys:  item.requirementKeys ?? [],
        quantityOwned:    item.quantityOwned ?? 1,
        quantityWanted:   item.quantityWanted ?? 1,
        unit:             item.unit ?? 'stuks',
        linkedProductId:  item.linkedProductId ?? '',
      });
      setShowCustomBrand(isCustomBrand);
      setShowAdvanced(!!(item.sectionId || item.requirementKeys?.length));
    } else if (prefillData) {
      const isCustomBrand = !!prefillData.brand && !POPULAR_BRANDS.includes(prefillData.brand!);
      setForm({
        ...DEFAULT_FORM,
        name:            prefillData.name ?? '',
        brand:           isCustomBrand ? '__custom__' : (prefillData.brand ?? ''),
        customBrand:     isCustomBrand ? (prefillData.brand ?? '') : '',
        category:        (prefillData.category as GearCategory) ?? 'rod',
        ownershipStatus: (prefillData.ownershipStatus as OwnershipStatus) ?? 'owned',
        disciplineTags:  prefillData.disciplineTags ?? [],
        sectionId:       prefillData.sectionId ?? '',
        requirementKeys: prefillData.requirementKeys ?? [],
        quantityOwned:   prefillData.quantityOwned ?? 1,
        unit:            prefillData.unit ?? 'stuks',
        linkedProductId: prefillData.linkedProductId ?? '',
      });
      setShowCustomBrand(isCustomBrand);
    } else {
      setForm(DEFAULT_FORM);
      setShowCustomBrand(false);
      setShowAdvanced(false);
    }
  }, [isOpen, editItem, prefillData, prefillFromProduct]);

  // ── Auto-suggest sectionId ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || editItem || linkedProduct) return;
    const suggested = suggestSectionId(form.category, form.disciplineTags);
    setForm((prev) => ({ ...prev, sectionId: suggested, requirementKeys: [] }));
  }, [form.category, form.disciplineTags, isOpen, editItem, linkedProduct]);

  // ── Live catalog matching while typing name ──────────────────────────
  const handleNameChange = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
    if (linkedProduct) { setLinkedProduct(null); }
    clearTimeout(searchTimer.current);
    setCatalogSuggestions([]);

    if (value.trim().length < 3) { setMatchLoading(false); return; }

    setMatchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const found = await productFeedServicePatch.searchProducts(value, undefined, 20);
        setCatalogSuggestions(found.slice(0, 4));
      } catch {
        /* silent */
      } finally {
        setMatchLoading(false);
      }
    }, 400);
  }, [linkedProduct]);

  // ── Derived ──────────────────────────────────────────────────────────
  const resolvedBrand      = form.brand === '__custom__' ? form.customBrand : form.brand;
  const isOwned            = form.ownershipStatus === 'owned' || form.ownershipStatus === 'reserve';
  const showQuantityWanted = form.ownershipStatus === 'want';
  const suggestedReqKeys   = getSuggestedRequirementKeys(form.sectionId, form.category);

  // ── Helpers ──────────────────────────────────────────────────────────
  const set = <K extends keyof FormState>(field: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleDiscipline = (d: string) =>
    setForm((prev) => ({
      ...prev,
      disciplineTags: prev.disciplineTags.includes(d)
        ? prev.disciplineTags.filter((x) => x !== d)
        : [...prev.disciplineTags, d],
    }));

  const toggleRequirementKey = (key: string) =>
    setForm((prev) => ({
      ...prev,
      requirementKeys: prev.requirementKeys.includes(key)
        ? prev.requirementKeys.filter((k) => k !== key)
        : [...prev.requirementKeys, key],
    }));

  // ── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.name.trim()) { toast.error('Naam is verplicht.'); return; }

    setLoading(true);
    try {
      const catalogSnapshot = linkedProduct ? {
        name:         linkedProduct.name,
        brand:        linkedProduct.brand,
        imageURL:     linkedProduct.imageURL,
        price:        linkedProduct.price,
        affiliateURL: linkedProduct.affiliateURL,
        sectionId:    (linkedProduct as any).sectionId,
      } : undefined;

      const data: Omit<TackleboxItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        name:            form.name.trim(),
        brand:           resolvedBrand.trim() || '',
        category:        form.category,
        model:           form.model.trim() || undefined,
        purchasePrice:   form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        isFavorite:      form.isFavorite,
        notes:           form.notes.trim() || undefined,
        ownershipStatus: form.ownershipStatus,
        condition:       isOwned ? form.condition : undefined,
        disciplineTags:  form.disciplineTags,
        sectionId:       form.sectionId || undefined,
        requirementKeys: form.requirementKeys.length > 0 ? form.requirementKeys : undefined,
        quantityOwned:   isOwned ? form.quantityOwned : 0,
        quantityWanted:  showQuantityWanted ? form.quantityWanted : undefined,
        unit:            form.unit,
        linkedProductId: form.linkedProductId || undefined,
        catalogSnapshot,
        linkedCatchIds:    (editItem as any)?.linkedCatchIds ?? [],
        linkedSessionIds:  (editItem as any)?.linkedSessionIds ?? [],
        linkedSetupIds:    (editItem as any)?.linkedSetupIds ?? [],
        usageCount:        (editItem as any)?.usageCount ?? 0,
      };

      if (editItem?.id) {
        await gearService.updateGearItem(editItem.id, data as any);
        toast.success('Gear bijgewerkt!');
      } else {
        await gearService.addGearItem(profile.uid, data as any);
        toast.success(
          linkedProduct
            ? `${form.name} toegevoegd via catalogus!`
            : `${form.name} toegevoegd aan Tacklebox!`
        );
      }
      onClose();
    } catch (err) {
      console.error('Gear save error:', err);
      toast.error('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
              <div className="flex items-center justify-between p-5 border-b border-border-subtle flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text-primary">
                      {editItem ? 'Gear Bewerken' : 'Gear Toevoegen'}
                    </h2>
                    {linkedProduct && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Link2 className="w-2.5 h-2.5 text-brand" />
                        <span className="text-[9px] text-brand font-black uppercase tracking-widest">
                          Uit catalogus
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="p-5 space-y-4 max-h-[82vh] md:max-h-[76vh] overflow-y-auto"
              >

                {/* 1. Ownership */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Status *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {OWNERSHIP_OPTIONS.map((opt) => (
                      <button
                        key={opt.value} type="button"
                        onClick={() => setForm((p) => ({ ...p, ownershipStatus: opt.value }))}
                        className={cn(
                          'flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-all',
                          form.ownershipStatus === opt.value
                            ? opt.color
                            : 'bg-surface-soft text-text-muted border-border-subtle hover:border-brand/30'
                        )}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                        <span className="text-[9px] text-text-dim leading-tight">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Category */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Type *</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value} type="button"
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

                {/* 3. Discipline */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                    Discipline <span className="text-text-dim normal-case font-normal">optioneel</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DISCIPLINE_OPTIONS.map((d) => {
                      const active = form.disciplineTags.includes(d.value);
                      return (
                        <button
                          key={d.value} type="button" onClick={() => toggleDiscipline(d.value)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                            active ? 'bg-brand text-bg-main border-brand' : 'bg-surface-soft text-text-muted border-border-subtle hover:border-brand/30'
                          )}
                        >
                          <span>{d.emoji}</span><span>{d.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Name + live catalog suggestions */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Naam *</label>
                  {linkedProduct && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand/8 border border-brand/20">
                      {linkedProduct.imageURL && (
                        <img src={linkedProduct.imageURL} alt="" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-brand truncate">{linkedProduct.name}</p>
                        <p className="text-[9px] text-text-muted">Gekoppeld aan catalogus</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setLinkedProduct(null); setForm((p) => ({ ...p, linkedProductId: '' })); }}
                        className="text-text-dim hover:text-text-muted"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {!linkedProduct && (
                    <>
                      <input
                        value={form.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="bijv. Korda Dark Matter Popup 15mm"
                        className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
                        required
                      />
                      <CatalogSuggestions
                        suggestions={catalogSuggestions}
                        loading={matchLoading}
                        onSelect={fillFromCatalogProduct}
                      />
                    </>
                  )}
                </div>

                {/* 5. Brand */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                    Merk <span className="text-text-dim normal-case font-normal">optioneel</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.brand}
                      onChange={(e) => {
                        setShowCustomBrand(e.target.value === '__custom__');
                        setForm((p) => ({ ...p, brand: e.target.value }));
                      }}
                      className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all appearance-none"
                    >
                      <option value="">— Geen / Onbekend —</option>
                      {POPULAR_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                      <option value="__custom__">Ander merk…</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  </div>
                  {showCustomBrand && (
                    <input
                      value={form.customBrand}
                      onChange={set('customBrand')}
                      placeholder="Voer merknaam in"
                      className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all mt-2"
                    />
                  )}
                </div>

                {/* 6. Quantity */}
                <QuantityStepper
                  value={showQuantityWanted ? form.quantityWanted : form.quantityOwned}
                  unit={form.unit}
                  label={showQuantityWanted ? 'Gewenst aantal' : 'Aantal'}
                  onValueChange={(v) => setForm((p) =>
                    showQuantityWanted
                      ? { ...p, quantityWanted: v }
                      : { ...p, quantityOwned: v }
                  )}
                  onUnitChange={(u) => setForm((p) => ({ ...p, unit: u }))}
                />

                {/* 7. Condition (owned only) */}
                {isOwned && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Conditie</label>
                    <div className="relative">
                      <select
                        value={form.condition} onChange={set('condition')}
                        className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all appearance-none"
                      >
                        {CONDITION_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* 8. Setup koppeling (advanced) */}
                <div className="border border-border-subtle rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-soft hover:bg-surface-card transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                        Setup koppeling
                      </span>
                      {form.sectionId && (
                        <span className="text-[9px] font-black text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-lg">
                          {SECTION_OPTIONS.find((s) => s.value === form.sectionId)?.label ?? form.sectionId}
                        </span>
                      )}
                    </div>
                    {showAdvanced ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </button>

                  {showAdvanced && (
                    <div className="p-4 space-y-4 border-t border-border-subtle">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Setup blok</label>
                        <div className="relative">
                          <select
                            value={form.sectionId} onChange={set('sectionId')}
                            className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all appearance-none"
                          >
                            <option value="">— Auto (aanbevolen) —</option>
                            {SECTION_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        </div>
                      </div>
                      {suggestedReqKeys.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                            Rol in setup <span className="text-text-dim normal-case font-normal">wat dekt dit item?</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {suggestedReqKeys.map(({ key, label }) => {
                              const active = form.requirementKeys.includes(key);
                              return (
                                <button
                                  key={key} type="button" onClick={() => toggleRequirementKey(key)}
                                  className={cn(
                                    'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all',
                                    active ? 'bg-brand text-bg-main border-brand' : 'bg-surface-soft text-text-muted border-border-subtle hover:border-brand/30'
                                  )}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 9. Optional: Model + Price + Notes */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                      Model <span className="text-text-dim normal-case font-normal">optioneel</span>
                    </label>
                    <input
                      value={form.model} onChange={set('model')}
                      placeholder="bijv. 2500 HG-F, 10lb, 15mm"
                      className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                      Aankoopprijs <span className="text-text-dim normal-case font-normal">optioneel, €</span>
                    </label>
                    <input
                      value={form.purchasePrice} onChange={set('purchasePrice')}
                      placeholder="bijv. 9.50"
                      type="number" step="0.01" min="0"
                      className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                      Notities <span className="text-text-dim normal-case font-normal">optioneel</span>
                    </label>
                    <textarea
                      value={form.notes} onChange={set('notes')}
                      placeholder="Aankoopdatum, ervaringen, kleur/smaak…"
                      rows={2}
                      className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all resize-none"
                    />
                  </div>
                </div>

                {/* 10. Favorite toggle */}
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
                <div className="flex gap-3 pt-1 pb-safe">
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
