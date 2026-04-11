import React, { useMemo, useState } from 'react';
import {
  X, Check, AlertCircle, Plus, ShoppingBag,
  Trophy, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Base';
import type {
  TackleboxItem, SetupTemplate, SetupRequirement,
  SetupSection, SessionSetup, CompletenessResult,
} from '../../../types';
import {
  computeCompleteness,
  getReadinessLabel,
  isRequirementCovered,
} from '../services/completenessService';
import { DISCIPLINE_ICONS, SESSION_TYPE_LABELS } from '../services/setupService';

/* ==========================================================================
   Types
   ========================================================================== */

export interface SessionCheckSheetProps {
  isOpen:         boolean;
  onClose:        () => void;
  setup:          SessionSetup;
  template?:      SetupTemplate;
  requirements:   SetupRequirement[];
  sections:       SetupSection[];
  tackleboxItems: TackleboxItem[];
  onAddToGear:    (req: SetupRequirement) => void;
  onFindProducts: (req: SetupRequirement) => void;
}

type PriorityFilter = 'all' | 'essential' | 'missing';

/* ==========================================================================
   Helpers
   ========================================================================== */

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
   Completeness ring (reused from SetupBuilderModal)
   ========================================================================== */

function Ring({ pct, size = 72 }: { pct: number; size?: number }) {
  const r     = (size - 8) / 2;
  const circ  = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color  = pct === 100 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#f97316';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="currentColor" strokeWidth={5} className="text-surface-soft" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
    </svg>
  );
}

/* ==========================================================================
   Requirement row
   ========================================================================== */

function RequirementRow({
  req,
  coveringItem,
  onAddToGear,
  onFindProducts,
}: {
  req:            SetupRequirement;
  coveringItem:   TackleboxItem | null;
  onAddToGear:    () => void;
  onFindProducts: () => void;
}) {
  const covered = !!coveringItem;
  const isEssential = req.priority === 'essential';

  return (
    <div className={cn(
      'flex items-start gap-3 py-3 px-4',
      !covered && isEssential && 'bg-orange-500/3'
    )}>
      {/* Status dot */}
      <div className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        covered
          ? 'bg-success/15 text-success'
          : isEssential
            ? 'bg-orange-500/15 text-orange-400'
            : 'bg-surface-soft text-text-dim border border-border-subtle'
      )}>
        {covered
          ? <Check className="w-2.5 h-2.5" />
          : <AlertCircle className="w-2.5 h-2.5" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(
            'text-[12px] font-bold',
            covered ? 'text-text-secondary' : 'text-text-primary'
          )}>
            {req.label}
          </span>
          {isEssential && !covered && (
            <span className="text-[8px] font-black uppercase tracking-widest text-orange-400 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded">
              Essentieel
            </span>
          )}
          {req.priority === 'recommended' && !covered && (
            <span className="text-[8px] font-black uppercase tracking-widest text-text-dim bg-surface-soft border border-border-subtle px-1.5 py-0.5 rounded">
              Aanbevolen
            </span>
          )}
        </div>

        {covered ? (
          <p className="text-[10px] text-text-muted mt-0.5">
            <span className="text-success">✓</span>{' '}
            {coveringItem!.brand && `${coveringItem!.brand} `}{coveringItem!.name}
            {coveringItem!.ownershipStatus === 'reserve' && (
              <span className="ml-1 text-text-dim italic">(reserve)</span>
            )}
          </p>
        ) : req.rationale ? (
          <p className="text-[10px] text-text-dim mt-0.5 leading-relaxed">
            {req.rationale}
          </p>
        ) : null}

        {/* CTAs for missing items */}
        {!covered && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={onAddToGear}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand/10 text-brand border border-brand/20 text-[9px] font-black uppercase tracking-widest hover:bg-brand/20 transition-colors"
            >
              <Plus className="w-2.5 h-2.5" />
              Voeg toe
            </button>
            <button
              onClick={onFindProducts}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-soft text-text-muted border border-border-subtle text-[9px] font-black uppercase tracking-widest hover:border-brand/30 hover:text-brand transition-colors"
            >
              <ShoppingBag className="w-2.5 h-2.5" />
              Zoek product
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Section group
   ========================================================================== */

function SectionGroup({
  section,
  requirements,
  tackleboxItems,
  filter,
  onAddToGear,
  onFindProducts,
}: {
  section:        SetupSection;
  requirements:   SetupRequirement[];
  tackleboxItems: TackleboxItem[];
  filter:         PriorityFilter;
  onAddToGear:    (req: SetupRequirement) => void;
  onFindProducts: (req: SetupRequirement) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const filtered = requirements.filter((r) => {
    if (r.priority === 'optional') return false;
    if (filter === 'essential') return r.priority === 'essential';
    if (filter === 'missing') return !isRequirementCovered(r, tackleboxItems);
    return true;
  });

  if (filtered.length === 0) return null;

  const coveredCount = filtered.filter((r) => isRequirementCovered(r, tackleboxItems)).length;
  const allCovered   = coveredCount === filtered.length;

  return (
    <div className="border border-border-subtle rounded-2xl overflow-hidden">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 transition-colors',
          allCovered ? 'bg-success/5' : 'bg-surface-soft'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
            {section.label}
          </span>
          <span className={cn(
            'text-[9px] font-black px-2 py-0.5 rounded-lg border',
            allCovered
              ? 'bg-success/10 text-success border-success/20'
              : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
          )}>
            {coveredCount}/{filtered.length}
          </span>
        </div>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-text-muted" />
          : <ChevronUp className="w-4 h-4 text-text-muted" />
        }
      </button>

      {!collapsed && (
        <div className="divide-y divide-border-subtle/40">
          {filtered.map((req) => (
            <RequirementRow
              key={req.id}
              req={req}
              coveringItem={getCoveringItem(req, tackleboxItems)}
              onAddToGear={() => onAddToGear(req)}
              onFindProducts={() => onFindProducts(req)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Main component
   ========================================================================== */

export const SessionCheckSheet: React.FC<SessionCheckSheetProps> = ({
  isOpen,
  onClose,
  setup,
  template,
  requirements,
  sections,
  tackleboxItems,
  onAddToGear,
  onFindProducts,
}) => {
  const [filter, setFilter] = useState<PriorityFilter>('all');

  const completeness: CompletenessResult | null = useMemo(() => {
    if (!template || requirements.length === 0) return null;
    return computeCompleteness(template, requirements, tackleboxItems);
  }, [template, requirements, tackleboxItems]);

  const readiness   = completeness ? getReadinessLabel(completeness) : null;
  const isReady     = completeness?.isSessionReady ?? false;

  const missingEssentialCount = completeness?.missingItems.filter(
    (m) => m.priority === 'essential'
  ).length ?? 0;

  // Sections ordered as template specifies
  const orderedSections = useMemo(() => {
    if (!template) return sections;
    return template.setupSectionIds
      .map((id) => sections.find((s) => s.id === id))
      .filter(Boolean) as SetupSection[];
  }, [template, sections]);

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

          {/* Full-height sheet */}
          <motion.div
            className="fixed inset-0 md:inset-4 md:max-w-xl md:mx-auto md:my-auto z-50 flex flex-col"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="bg-surface-card border border-border-subtle rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col h-full md:max-h-[92vh]">

              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-subtle flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {DISCIPLINE_ICONS[setup.discipline] ?? '🎣'}
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-text-primary leading-tight">
                      {setup.name}
                    </h2>
                    <p className="text-[10px] text-text-muted">
                      Sessiecheck
                      {setup.sessionType && ` — ${SESSION_TYPE_LABELS[setup.sessionType] ?? setup.sessionType}`}
                    </p>
                  </div>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Completeness summary ───────────────────────────────── */}
              {completeness && readiness && (
                <div className={cn(
                  'mx-5 mt-4 flex items-center gap-4 p-4 rounded-2xl border flex-shrink-0',
                  isReady
                    ? 'bg-success/8 border-success/25'
                    : 'bg-orange-500/5 border-orange-500/20'
                )}>
                  <div className="relative flex-shrink-0">
                    <Ring pct={completeness.essentialsPct} size={60} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn(
                        'text-[11px] font-black',
                        isReady ? 'text-success' : 'text-orange-400'
                      )}>
                        {completeness.essentialsPct}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {isReady ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-success" />
                          <span className="text-sm font-bold text-success">Sessie-klaar!</span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Alle essentials zijn gedekt. Pak je spullen en ga!
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-orange-400">
                          {readiness.emoji} {readiness.label}
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {missingEssentialCount} essential{missingEssentialCount !== 1 ? 's' : ''} ontbreken nog.
                          {completeness.recommendedPct < 100 && ` En ${100 - completeness.recommendedPct}% aanbevolen.`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── Filter tabs ─────────────────────────────────────────── */}
              <div className="flex gap-2 px-5 pt-4 pb-0 flex-shrink-0">
                {([ 
                  { value: 'all',       label: 'Alles' },
                  { value: 'essential', label: 'Essentials' },
                  { value: 'missing',   label: 'Ontbrekend' },
                ] as { value: PriorityFilter; label: string }[]).map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                      filter === f.value
                        ? 'bg-brand text-bg-main border-brand'
                        : 'bg-surface-soft text-text-muted border-border-subtle hover:border-brand/30'
                    )}
                  >
                    {f.label}
                    {f.value === 'missing' && missingEssentialCount > 0 && (
                      <span className="ml-1.5 bg-orange-400 text-white rounded-full w-4 h-4 inline-flex items-center justify-center text-[8px]">
                        {missingEssentialCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Checklist ──────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {orderedSections.map((section) => (
                  <SectionGroup
                    key={section.id}
                    section={section}
                    requirements={requirements.filter((r) => r.sectionId === section.id)}
                    tackleboxItems={tackleboxItems}
                    filter={filter}
                    onAddToGear={onAddToGear}
                    onFindProducts={onFindProducts}
                  />
                ))}

                {/* No results for missing filter */}
                {filter === 'missing' && missingEssentialCount === 0 && (
                  <div className="text-center py-10">
                    <div className="text-3xl mb-3">🏆</div>
                    <p className="text-sm font-bold text-success">Alles gedekt!</p>
                    <p className="text-[11px] text-text-muted mt-1">
                      Geen ontbrekende essentials gevonden.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Footer ─────────────────────────────────────────────── */}
              <div className="px-5 py-4 border-t border-border-subtle flex-shrink-0">
                <Button
                  onClick={onClose}
                  variant="secondary"
                  className="w-full h-12 rounded-xl"
                >
                  Sluiten
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
