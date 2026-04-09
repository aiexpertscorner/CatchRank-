import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Plus, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Base';
import { GearItem, GearSetupV2, GearSetupSlot } from '../../../types';
import {
  DISCIPLINE_SLOT_TEMPLATES,
  DISCIPLINE_LABELS,
  setupService,
  computeCompleteness,
} from '../services/setupService';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

interface SetupBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedGear: GearItem[];
  onCreated: (setup: GearSetupV2) => void;
  editSetup?: GearSetupV2 | null;
}

type Discipline = 'karper' | 'roofvis' | 'witvis' | 'nachtvissen' | 'vrij';

/* -------------------------------------------------------------------------- */
/* Discipline config                                                           */
/* -------------------------------------------------------------------------- */

const DISCIPLINES: Array<{ id: Discipline; emoji: string; slotCount: number }> = [
  { id: 'karper',      emoji: '🐟', slotCount: DISCIPLINE_SLOT_TEMPLATES.karper.length },
  { id: 'roofvis',     emoji: '🦈', slotCount: DISCIPLINE_SLOT_TEMPLATES.roofvis.length },
  { id: 'witvis',      emoji: '🎣', slotCount: DISCIPLINE_SLOT_TEMPLATES.witvis.length },
  { id: 'nachtvissen', emoji: '🌙', slotCount: DISCIPLINE_SLOT_TEMPLATES.nachtvissen.length },
  { id: 'vrij',        emoji: '⚙️', slotCount: 0 },
];

/* -------------------------------------------------------------------------- */
/* Slot type options for free discipline                                       */
/* -------------------------------------------------------------------------- */

const FREE_SLOT_TYPES: Array<{ key: string; label: string }> = [
  { key: 'rod',        label: 'Hengel' },
  { key: 'reel',       label: 'Molen' },
  { key: 'line',       label: 'Lijn' },
  { key: 'lure',       label: 'Kunstaas' },
  { key: 'bait',       label: 'Aas' },
  { key: 'rig',        label: 'Rig' },
  { key: 'hooklink',   label: 'Onderlijn' },
  { key: 'bite_alarm', label: 'Bite Alarm' },
  { key: 'bivvy',      label: 'Bivvy' },
  { key: 'accessory',  label: 'Accessoire' },
  { key: 'other',      label: 'Overig' },
];

/* -------------------------------------------------------------------------- */
/* Slot gear picker — filter owned gear by slot type                          */
/* -------------------------------------------------------------------------- */

function getGearForSlot(slotKey: string, ownedGear: GearItem[]): GearItem[] {
  const MAP: Record<string, string[]> = {
    rod:        ['rod'],
    reel:       ['reel'],
    mainLine:   ['line'],
    line:       ['line'],
    hooklink:   ['line', 'accessory'],
    rig:        ['accessory'],
    bait:       ['bait'],
    groundbait: ['bait'],
    lure:       ['lure'],
    bite_alarm: ['accessory'],
    rod_pod:    ['accessory'],
    bivvy:      ['accessory'],
    sleepSystem:['accessory'],
    lighting:   ['accessory'],
  };
  const categories = MAP[slotKey] ?? [];
  if (categories.length === 0) return ownedGear;
  return ownedGear.filter((g) => categories.includes(g.category));
}

/* -------------------------------------------------------------------------- */
/* Completeness bar                                                            */
/* -------------------------------------------------------------------------- */

function CompletenessBar({ slots }: { slots: GearSetupSlot[] }) {
  const pct = computeCompleteness(slots);
  const required = slots.filter((s) => s.required).length;
  const filled = slots.filter((s) => s.required && (s.gearItemId || s.productId || s.notes)).length;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-text-muted">Volledigheid</span>
        <span className={cn(pct === 100 ? 'text-success' : 'text-brand')}>
          {filled}/{required} verplicht · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-soft overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct === 100 ? 'bg-success' : 'bg-brand'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                              */
/* -------------------------------------------------------------------------- */

export const SetupBuilderModal: React.FC<SetupBuilderModalProps> = ({
  isOpen,
  onClose,
  ownedGear,
  onCreated,
  editSetup,
}) => {
  const [step, setStep] = useState<1 | 2>(editSetup ? 2 : 1);
  const [discipline, setDiscipline] = useState<Discipline>(
    (editSetup?.discipline as Discipline) ?? 'karper'
  );
  const [name, setName] = useState(editSetup?.name ?? '');
  const [slots, setSlots] = useState<GearSetupSlot[]>(
    editSetup?.slots ?? []
  );
  const [notes, setNotes] = useState(editSetup?.notes ?? '');
  const [saving, setSaving] = useState(false);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editSetup) {
        setStep(2);
        setDiscipline((editSetup.discipline as Discipline) ?? 'karper');
        setName(editSetup.name ?? '');
        setSlots(editSetup.slots ?? []);
        setNotes(editSetup.notes ?? '');
      } else {
        setStep(1);
        setDiscipline('karper');
        setName('');
        setSlots([]);
        setNotes('');
      }
    }
  }, [isOpen, editSetup]);

  const handleDisciplineSelect = (d: Discipline) => {
    setDiscipline(d);
    setSlots(setupService.getSlotsForDiscipline(d));
    setStep(2);
  };

  const updateSlot = (idx: number, updates: Partial<GearSetupSlot>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...updates } : s)));
  };

  const addFreeSlot = () => {
    setSlots((prev) => [
      ...prev,
      { slotKey: 'other', label: 'Nieuw slot', required: false },
    ]);
  };

  const removeFreeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const data: Omit<GearSetupV2, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: '', // filled by service
        name: name.trim(),
        discipline,
        slots,
        notes: notes.trim() || undefined,
      };

      // If editing, update; otherwise create
      if (editSetup?.id) {
        await setupService.updateSetup(editSetup.id, { name: data.name, slots, notes: data.notes, discipline });
        onCreated({ ...editSetup, ...data, id: editSetup.id });
      } else {
        // userId will be injected by the parent — pass a placeholder
        // Parent should call setupService.createSetup(userId, data) directly
        onCreated(data as GearSetupV2);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

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

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-end md:justify-center z-50"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="w-full md:max-w-lg bg-surface-card border border-border-subtle rounded-t-3xl md:rounded-3xl md:mb-8 overflow-hidden max-h-[92dvh] flex flex-col">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-border-subtle" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <div>
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                    {step === 1 ? 'Stap 1 van 2' : 'Stap 2 van 2'}
                  </p>
                  <h2 className="text-lg font-bold text-text-primary">
                    {step === 1
                      ? 'Kies discipline'
                      : editSetup
                        ? 'Setup bewerken'
                        : `Nieuw ${DISCIPLINE_LABELS[discipline]} Setup`}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-4">
                {/* ── Step 1: Discipline picker ── */}
                {step === 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    {DISCIPLINES.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleDisciplineSelect(d.id)}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border-subtle bg-surface-soft hover:border-brand/40 hover:bg-brand/5 transition-all text-left group"
                      >
                        <span className="text-3xl">{d.emoji}</span>
                        <div>
                          <p className="text-sm font-bold text-text-primary group-hover:text-brand transition-colors text-center">
                            {DISCIPLINE_LABELS[d.id]}
                          </p>
                          <p className="text-[9px] text-text-muted uppercase tracking-widest text-center mt-0.5">
                            {d.id === 'vrij' ? 'Zelf slots kiezen' : `${d.slotCount} slots`}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-dim group-hover:text-brand transition-colors" />
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Step 2: Slot builder ── */}
                {step === 2 && (
                  <div className="space-y-5">
                    {/* Back button */}
                    {!editSetup && (
                      <button
                        onClick={() => setStep(1)}
                        className="text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-brand transition-colors flex items-center gap-1"
                      >
                        ← Discipline wijzigen
                      </button>
                    )}

                    {/* Setup name */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                        Setup naam *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`Mijn ${DISCIPLINE_LABELS[discipline]} setup`}
                        className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all"
                        maxLength={60}
                      />
                    </div>

                    {/* Completeness bar */}
                    {slots.length > 0 && <CompletenessBar slots={slots} />}

                    {/* Slots */}
                    <div className="space-y-3">
                      {slots.map((slot, idx) => {
                        const gearOptions = getGearForSlot(slot.slotKey, ownedGear);
                        const isFree = discipline === 'vrij';

                        return (
                          <div
                            key={`${slot.slotKey}-${idx}`}
                            className="rounded-xl border border-border-subtle bg-surface-soft p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {slot.gearItemId && (
                                  <Check className="w-3.5 h-3.5 text-success" />
                                )}
                                <span className="text-xs font-bold text-text-primary">
                                  {isFree ? (
                                    <input
                                      type="text"
                                      value={slot.label}
                                      onChange={(e) => updateSlot(idx, { label: e.target.value })}
                                      className="bg-transparent border-b border-border-subtle text-xs font-bold text-text-primary focus:outline-none focus:border-brand w-32"
                                      placeholder="Slot naam"
                                    />
                                  ) : (
                                    slot.label
                                  )}
                                </span>
                                {slot.required && (
                                  <span className="text-[8px] font-black text-brand uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-brand/10">
                                    Verplicht
                                  </span>
                                )}
                              </div>
                              {isFree && (
                                <button
                                  onClick={() => removeFreeSlot(idx)}
                                  className="text-text-dim hover:text-error transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Gear dropdown */}
                            <select
                              value={slot.gearItemId ?? ''}
                              onChange={(e) => updateSlot(idx, { gearItemId: e.target.value || undefined })}
                              className="w-full bg-surface-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand transition-all appearance-none"
                            >
                              <option value="">— Kies uit Mijn Gear —</option>
                              {gearOptions.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.brand ? `${g.brand} ` : ''}{g.name}
                                </option>
                              ))}
                            </select>

                            {/* Notes per slot */}
                            <input
                              type="text"
                              value={slot.notes ?? ''}
                              onChange={(e) => updateSlot(idx, { notes: e.target.value || undefined })}
                              placeholder="Notitie (optioneel)"
                              className="w-full bg-surface-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-secondary focus:outline-none focus:border-brand transition-all"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Add slot (vrij discipline) */}
                    {discipline === 'vrij' && (
                      <button
                        onClick={addFreeSlot}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border-subtle text-text-muted hover:border-brand/40 hover:text-brand transition-all text-xs font-bold"
                      >
                        <Plus className="w-4 h-4" />
                        Slot toevoegen
                      </button>
                    )}

                    {/* Setup notes */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                        Setup notities (optioneel)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Bijv. zware stroom setup, diep water..."
                        rows={2}
                        className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all resize-none"
                      />
                    </div>

                    {/* Save */}
                    <Button
                      onClick={handleSave}
                      disabled={!canSave || saving}
                      className="w-full h-12 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-premium-accent"
                    >
                      {saving ? 'Opslaan...' : editSetup ? 'Setup opslaan' : 'Setup aanmaken'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
