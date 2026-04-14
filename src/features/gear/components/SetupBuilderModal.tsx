import React, { useState, useEffect, useMemo } from 'react';
import {
  X, ChevronRight, ChevronLeft, Check, AlertCircle,
  Plus, Fish, Loader2, Trophy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Base';
import { toast } from 'sonner';
import { useAuth } from '../../../App';
import type {
  TackleboxItem, SetupTemplate, SetupSection,
  SetupRequirement, CompletenessResult, SessionSetup,
} from '../../../types';
import { templateService } from '../services/templateService';
import {
  computeCompleteness,
  getReadinessLabel,
  groupMissingBySectionId,
  isRequirementCovered,
} from '../services/completenessService';
import { setupService, DISCIPLINE_LABELS, DISCIPLINE_ICONS } from '../services/setupService';

/* ==========================================================================
   Types & helpers
   ========================================================================== */

type Step = 1 | 2 | 3;

interface SetupBuilderModalProps {
  isOpen:       boolean;
  onClose:      () => void;
  ownedGear:    TackleboxItem[];
  onCreated:    (setup: SessionSetup) => void;
  editSetup?:   SessionSetup | null;
}

/** Returns which TackleboxItem covers a requirement (first match wins). */
function getCoveringItem(
  req:   SetupRequirement,
  items: TackleboxItem[]
): TackleboxItem | null {
  const active = items.filter(
    (i) => i.ownershipStatus === 'own' || i.ownershipStatus === 'reserve'
  );

  return (
    active.find((item) => item.requirementKeys?.includes(req.requirementKey)) ??
    active.find((item) => item.sectionId === req.sectionId) ??
    // category-level fallback
    active.find((item) => {
      const map: Record<string, string[]> = {
        rod:       ['rods_reels'],
        reel:      ['rods_reels'],
        line:      ['line_storage', 'leaders_terminal', 'terminal_tackle'],
        lure:      ['lure_families'],
        hook:      ['terminal_tackle', 'leaders_terminal'],
        bait:      ['hookbaits', 'bait_liquids'],
        accessory: ['bite_detection','landing_care','shelter_sleep','cooking_comfort',
                    'transport_power','clothing_safety','bags_mobility',
                    'measure_document','unhook_safety','comfort_vision','leaders_terminal'],
      };
      return (map[item.category] ?? []).includes(req.sectionId);
    }) ??
    null
  );
}

/* ==========================================================================
   Step 1 — Template picker
   ========================================================================== */

const TEMPLATE_DISCIPLINE_EMOJI: Record<string, string> = {
  karper:  '🐟',
  roofvis: '🦈',
  witvis:  '🎣',
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  korte_nacht:   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  weekender:     'bg-blue-500/10  text-blue-400  border-blue-500/20',
  struinen:      'bg-brand/10     text-brand     border-brand/20',
  polder_ondiep: 'bg-green-500/10 text-green-400 border-green-500/20',
};

function TemplatePicker({
  templates,
  selected,
  onSelect,
  loading,
}: {
  templates:  SetupTemplate[];
  selected:   string;
  onSelect:   (id: string) => void;
  loading:    boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Templates laden…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary leading-relaxed">
        Kies een startpunt. De template bepaalt welke items essentieel zijn voor jouw sessie.
      </p>

      {templates.map((t) => {
        const isSelected = selected === t.id;
        const tagColor   = SESSION_TYPE_COLORS[t.sessionType] ?? 'bg-surface-soft text-text-muted border-border-subtle';
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={cn(
              'w-full text-left p-4 rounded-2xl border transition-all',
              isSelected
                ? 'bg-brand/10 border-brand/50 shadow-lg shadow-brand/10'
                : 'bg-surface-soft border-border-subtle hover:border-brand/30'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
                isSelected ? 'bg-brand/20' : 'bg-surface-card'
              )}>
                {TEMPLATE_DISCIPLINE_EMOJI[t.discipline] ?? '🎣'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    'text-sm font-bold',
                    isSelected ? 'text-brand' : 'text-text-primary'
                  )}>
                    {t.title}
                  </span>
                  <span className={cn(
                    'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border',
                    tagColor
                  )}>
                    {DISCIPLINE_LABELS[t.discipline] ?? t.discipline}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                  {t.description}
                </p>
                <p className="text-[10px] text-text-dim mt-1">
                  ~{t.estimatedItems} items
                </p>
              </div>

              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                isSelected ? 'bg-brand border-brand' : 'border-border-subtle'
              )}>
                {isSelected && <Check className="w-3 h-3 text-bg-main" />}
              </div>
            </div>
          </button>
        );
      })}

      {/* Free setup option */}
      <button
        type="button"
        onClick={() => onSelect('vrij')}
        className={cn(
          'w-full text-left p-4 rounded-2xl border transition-all',
          selected === 'vrij'
            ? 'bg-brand/10 border-brand/50'
            : 'bg-surface-soft border-border-subtle hover:border-brand/30'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-xl',
            selected === 'vrij' ? 'bg-brand/20' : 'bg-surface-card'
          )}>
            ⚙️
          </div>
          <div className="flex-1">
            <span className={cn(
              'text-sm font-bold',
              selected === 'vrij' ? 'text-brand' : 'text-text-primary'
            )}>
              Vrije Setup
            </span>
            <p className="text-[11px] text-text-muted">
              Geen template — bouw vrij met eigen naam en items.
            </p>
          </div>
          <div className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
            selected === 'vrij' ? 'bg-brand border-brand' : 'border-border-subtle'
          )}>
            {selected === 'vrij' && <Check className="w-3 h-3 text-bg-main" />}
          </div>
        </div>
      </button>
    </div>
  );
}

/* ==========================================================================
   Step 2 — Gear review per section
   ========================================================================== */

function SectionCard({
  section,
  requirements,
  ownedGear,
  onAddMissing,
}: {
  section:      SetupSection;
  requirements: SetupRequirement[];
  ownedGear:    TackleboxItem[];
  onAddMissing: (req: SetupRequirement) => void;
}) {
  const essentials = requirements.filter((r) => r.priority === 'essential');
  const recommended = requirements.filter((r) => r.priority === 'recommended');
  const covered = requirements.filter((r) => isRequirementCovered(r, ownedGear));
  const allEssentialsCovered = essentials.every((r) => isRequirementCovered(r, ownedGear));

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden',
      allEssentialsCovered ? 'border-border-subtle' : 'border-orange-500/30'
    )}>
      {/* Section header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        allEssentialsCovered ? 'bg-surface-soft' : 'bg-orange-500/5'
      )}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
            {section.label}
          </span>
        </div>
        <span className={cn(
          'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg',
          allEssentialsCovered
            ? 'bg-success/10 text-success border border-success/20'
            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
        )}>
          {covered.length}/{requirements.filter((r) => r.priority !== 'optional').length}
        </span>
      </div>

      {/* Requirements list */}
      <div className="divide-y divide-border-subtle/50">
        {[...essentials, ...recommended].map((req) => {
          const coveringItem = getCoveringItem(req, ownedGear);
          const isCovered = !!coveringItem;

          return (
            <div key={req.id} className="flex items-start gap-3 px-4 py-3">
              {/* Status icon */}
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                isCovered
                  ? 'bg-success/20 text-success'
                  : req.priority === 'essential'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-surface-soft text-text-dim border border-border-subtle'
              )}>
                {isCovered
                  ? <Check className="w-3 h-3" />
                  : <AlertCircle className="w-3 h-3" />
                }
              </div>

              {/* Requirement info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    'text-[11px] font-bold',
                    isCovered ? 'text-text-secondary' : 'text-text-primary'
                  )}>
                    {req.label}
                  </span>
                  {req.priority === 'essential' && !isCovered && (
                    <span className="text-[8px] font-black uppercase tracking-widest text-orange-400 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded">
                      Essentieel
                    </span>
                  )}
                  {req.priority === 'recommended' && (
                    <span className="text-[8px] font-black uppercase tracking-widest text-text-dim bg-surface-soft border border-border-subtle px-1.5 py-0.5 rounded">
                      Aanbevolen
                    </span>
                  )}
                </div>

                {isCovered ? (
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {coveringItem!.brand && `${coveringItem!.brand} `}{coveringItem!.name}
                    {coveringItem!.ownershipStatus === 'reserve' && (
                      <span className="ml-1 text-text-dim">(reserve)</span>
                    )}
                  </p>
                ) : req.rationale ? (
                  <p className="text-[10px] text-text-dim mt-0.5 leading-relaxed">
                    {req.rationale}
                  </p>
                ) : null}
              </div>

              {/* Add button for missing items */}
              {!isCovered && (
                <button
                  type="button"
                  onClick={() => onAddMissing(req)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand/10 text-brand border border-brand/20 text-[9px] font-black uppercase tracking-widest hover:bg-brand/20 transition-colors flex-shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  Voeg toe
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   Step 3 — Review & save
   ========================================================================== */

function CompletenessRing({
  pct,
  size = 80,
}: {
  pct:  number;
  size?: number;
}) {
  const r      = (size - 8) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color  = pct === 100 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#f97316';

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-surface-soft" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

/* ==========================================================================
   Main component
   ========================================================================== */

export const SetupBuilderModal: React.FC<SetupBuilderModalProps> = ({
  isOpen,
  onClose,
  ownedGear,
  onCreated,
  editSetup,
}) => {
  const { profile } = useAuth();

  // ── Step state ──────────────────────────────────────────────────────────
  const [step, setStep]                   = useState<Step>(1);
  const [selectedTemplateId, setTemplate] = useState<string>('carp_korte_nacht_v1');
  const [setupName, setSetupName]         = useState('');
  const [notes, setNotes]                 = useState('');
  const [saving, setSaving]               = useState(false);

  // ── Data state ──────────────────────────────────────────────────────────
  const [templates, setTemplates]         = useState<SetupTemplate[]>([]);
  const [requirements, setRequirements]   = useState<SetupRequirement[]>([]);
  const [sections, setSections]           = useState<SetupSection[]>([]);
  const [dataLoading, setDataLoading]     = useState(false);

  // ── Missing item add flow ────────────────────────────────────────────────
  // When user taps "Voeg toe" on a missing requirement, we open GearItemModal
  // pre-filled with the requirement. We expose a callback for parent to wire up.
  const [pendingAddReq, setPendingAddReq] = useState<SetupRequirement | null>(null);

  // ── Load templates once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setDataLoading(true);
    templateService.getAllTemplates()
      .then(setTemplates)
      .catch(() => toast.error('Fout bij laden templates'))
      .finally(() => setDataLoading(false));
  }, [isOpen]);

  // ── Load requirements when template changes ──────────────────────────────
  useEffect(() => {
    if (!isOpen || !selectedTemplateId || selectedTemplateId === 'vrij') {
      setRequirements([]);
      setSections([]);
      return;
    }
    templateService.getTemplateBundle(selectedTemplateId)
      .then((bundle) => {
        if (bundle) {
          setRequirements(bundle.requirements);
          setSections(bundle.sections);
        }
      })
      .catch(() => {});
  }, [selectedTemplateId, isOpen]);

  // ── Reset when modal opens ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (editSetup) {
      setStep(2);
      setTemplate(editSetup.templateId ?? 'carp_korte_nacht_v1');
      setSetupName(editSetup.name ?? '');
      setNotes(editSetup.notes ?? '');
    } else {
      setStep(1);
      setTemplate('carp_korte_nacht_v1');
      setSetupName('');
      setNotes('');
    }
  }, [isOpen, editSetup]);

  // ── Auto-fill setup name from template ──────────────────────────────────
  useEffect(() => {
    if (setupName || editSetup) return;
    const t = templates.find((t) => t.id === selectedTemplateId);
    if (t) setSetupName(t.title);
  }, [selectedTemplateId, templates]);

  // ── Live completeness ───────────────────────────────────────────────────
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  const completenessResult: CompletenessResult | null = useMemo(() => {
    if (!selectedTemplate || selectedTemplateId === 'vrij') return null;
    return computeCompleteness(selectedTemplate, requirements, ownedGear);
  }, [selectedTemplate, requirements, ownedGear]);

  const readiness = completenessResult ? getReadinessLabel(completenessResult) : null;

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!profile) return;
    if (!setupName.trim()) { toast.error('Geef je setup een naam.'); return; }

    setSaving(true);
    try {
      const discipline = selectedTemplate?.discipline ?? 'karper';

      const id = await setupService.createSessionSetup(profile.uid, {
        name:                setupName.trim(),
        discipline,
        templateId:          selectedTemplateId !== 'vrij' ? selectedTemplateId : undefined,
        sessionType:         selectedTemplate?.sessionType,
        notes:               notes.trim() || undefined,
        completenessResult:  completenessResult ?? undefined,
      });

      const saved: SessionSetup = {
        id,
        userId:     profile.uid,
        name:       setupName.trim(),
        discipline,
        templateId: selectedTemplateId !== 'vrij' ? selectedTemplateId : undefined,
        sessionType: selectedTemplate?.sessionType,
        notes:      notes.trim() || undefined,
        slots:      [],
        completeness: completenessResult?.overallPct ?? 0,
        completenessDetail: completenessResult
          ? {
              essentialsPct:  completenessResult.essentialsPct,
              recommendedPct: completenessResult.recommendedPct,
              overallPct:     completenessResult.overallPct,
            }
          : undefined,
        missingKeys: completenessResult?.missingItems.map((m) => m.requirementKey) ?? [],
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };

      toast.success(`"${setupName}" aangemaakt!`);
      onCreated(saved);
      onClose();
    } catch (err) {
      console.error('Setup save error:', err);
      toast.error('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2 sections with requirements ───────────────────────────────────
  const sectionsWithReqs = useMemo(() =>
    sections.map((s) => ({
      section: s,
      reqs:    requirements.filter((r) => r.sectionId === s.id),
    })).filter((x) => x.reqs.length > 0),
    [sections, requirements]
  );

  // ── Step labels ─────────────────────────────────────────────────────────
  const stepLabels = ['Template', 'Gear check', 'Opslaan'];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Full-screen sheet on mobile, centered on desktop */}
          <motion.div
            className="fixed inset-0 md:inset-4 md:max-w-xl md:mx-auto md:my-auto md:h-auto z-50 flex flex-col"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="bg-surface-card border border-border-subtle rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col h-full md:max-h-[90vh]">

              {/* ── Header ───────────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border-subtle flex-shrink-0">
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    {editSetup ? 'Setup Bewerken' : 'Nieuwe Sessie Setup'}
                  </h2>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Stap {step}/3 — {stepLabels[step - 1]}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Step progress bar ────────────────────────────────────── */}
              <div className="flex gap-1 px-5 py-2 flex-shrink-0">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-300',
                      s <= step ? 'bg-brand' : 'bg-surface-soft'
                    )}
                  />
                ))}
              </div>

              {/* ── Step content ─────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-5 py-4">

                {/* Step 1: Template picker */}
                {step === 1 && (
                  <TemplatePicker
                    templates={templates}
                    selected={selectedTemplateId}
                    onSelect={setTemplate}
                    loading={dataLoading}
                  />
                )}

                {/* Step 2: Gear review per section */}
                {step === 2 && (
                  <div className="space-y-3">
                    {/* Completeness header */}
                    {completenessResult && readiness && (
                      <div className={cn(
                        'flex items-center gap-4 p-4 rounded-2xl border',
                        completenessResult.isSessionReady
                          ? 'bg-success/5 border-success/20'
                          : 'bg-orange-500/5 border-orange-500/20'
                      )}>
                        <CompletenessRing pct={completenessResult.essentialsPct} size={56} />
                        <div>
                          <p className={cn(
                            'text-sm font-bold',
                            completenessResult.isSessionReady ? 'text-success' : 'text-orange-400'
                          )}>
                            {readiness.emoji} {readiness.label}
                          </p>
                          <p className="text-[11px] text-text-muted">
                            {completenessResult.coveredRequirements}/{completenessResult.totalRequirements} essentials + aanbevolen gedekt
                          </p>
                          {completenessResult.missingItems.filter((m) => m.priority === 'essential').length > 0 && (
                            <p className="text-[11px] text-orange-400 mt-0.5">
                              {completenessResult.missingItems.filter((m) => m.priority === 'essential').length} essentials ontbreken
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedTemplateId === 'vrij' ? (
                      <div className="text-center py-12 text-text-muted">
                        <Fish className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Vrije setup — geen requirements.</p>
                        <p className="text-[11px] mt-1 text-text-dim">
                          Ga naar stap 3 om een naam te kiezen en op te slaan.
                        </p>
                      </div>
                    ) : sectionsWithReqs.length === 0 && !dataLoading ? (
                      <div className="flex items-center justify-center py-12 text-text-muted">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        <span className="text-sm">Requirements laden…</span>
                      </div>
                    ) : (
                      sectionsWithReqs.map(({ section, reqs }) => (
                        <SectionCard
                          key={section.id}
                          section={section}
                          requirements={reqs}
                          ownedGear={ownedGear}
                          onAddMissing={setPendingAddReq}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Step 3: Review & save */}
                {step === 3 && (
                  <div className="space-y-5">

                    {/* Big completeness ring */}
                    {completenessResult && readiness && (
                      <div className="flex flex-col items-center py-4">
                        <div className="relative">
                          <CompletenessRing pct={completenessResult.essentialsPct} size={100} />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn(
                              'text-xl font-black',
                              completenessResult.isSessionReady ? 'text-success' : 'text-orange-400'
                            )}>
                              {completenessResult.essentialsPct}%
                            </span>
                          </div>
                        </div>
                        <p className={cn(
                          'text-sm font-bold mt-2',
                          completenessResult.isSessionReady ? 'text-success' : 'text-orange-400'
                        )}>
                          {readiness.emoji} {readiness.label}
                        </p>
                        {completenessResult.isSessionReady && (
                          <p className="text-[11px] text-text-muted mt-1">
                            Alle essentials gedekt — klaar voor de sessie!
                          </p>
                        )}
                        {completenessResult.missingItems.length > 0 && (
                          <p className="text-[11px] text-orange-400 mt-1">
                            {completenessResult.missingItems.filter((m) => m.priority === 'essential').length} essentials ontbreken.
                            Je kunt ze later aanvullen via Sessiecheck.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Setup name */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                        Naam van je setup *
                      </label>
                      <input
                        value={setupName}
                        onChange={(e) => setSetupName(e.target.value)}
                        placeholder="bijv. Mijn Karper Nacht Set"
                        className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
                        autoFocus
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                        Notities <span className="text-text-dim normal-case font-normal">optioneel</span>
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Doelsoorten, locatie, omstandigheden..."
                        rows={3}
                        className="w-full bg-surface-soft border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all resize-none"
                      />
                    </div>

                    {/* Summary */}
                    <div className="bg-surface-soft rounded-2xl p-4 space-y-2">
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Samenvatting</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-text-dim">Template</span>
                          <p className="font-bold text-text-secondary">
                            {selectedTemplateId === 'vrij' ? 'Vrije Setup' : selectedTemplate?.title ?? '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-text-dim">Discipline</span>
                          <p className="font-bold text-text-secondary">
                            {DISCIPLINE_LABELS[selectedTemplate?.discipline ?? ''] ?? 'Vrij'}
                          </p>
                        </div>
                        {completenessResult && (
                          <>
                            <div>
                              <span className="text-text-dim">Essentials</span>
                              <p className="font-bold text-text-secondary">
                                {completenessResult.essentialsPct}%
                              </p>
                            </div>
                            <div>
                              <span className="text-text-dim">Missers</span>
                              <p className="font-bold text-orange-400">
                                {completenessResult.missingItems.filter((m) => m.priority === 'essential').length} essentieel
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer navigation ─────────────────────────────────────── */}
              <div className="flex gap-3 px-5 py-4 border-t border-border-subtle flex-shrink-0">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 h-12 rounded-xl"
                    onClick={() => setStep((s) => (s - 1) as Step)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Terug
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 h-12 rounded-xl"
                    onClick={onClose}
                  >
                    Annuleer
                  </Button>
                )}

                {step < 3 ? (
                  <Button
                    type="button"
                    className="flex-1 h-12 rounded-xl font-bold"
                    onClick={() => setStep((s) => (s + 1) as Step)}
                    disabled={!selectedTemplateId}
                  >
                    Verder
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="flex-1 h-12 rounded-xl font-bold shadow-premium-accent"
                    onClick={handleSave}
                    isLoading={saving}
                  >
                    <Trophy className="w-4 h-4 mr-1.5" />
                    Setup Opslaan
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
