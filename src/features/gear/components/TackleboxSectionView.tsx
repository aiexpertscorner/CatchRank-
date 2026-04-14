/**
 * TackleboxSection.tsx
 *
 * Sectie-gegroepeerde weergave van de Tacklebox.
 * Groepeert gear per setup-blok (sectionId) en toont per blok:
 *   - Hoeveel items aanwezig / vereist
 *   - Status-badges per item (owned/want/reserve/replace)
 *   - Inline "Voeg toe" voor lege blokken
 *   - Completeness bar per blok (als setup actief is)
 */

import React, { useMemo, useState } from 'react';
import {
  Plus, ChevronDown, ChevronUp, Package,
  AlertCircle, Check, ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import type { TackleboxItem, SessionSetup, SetupRequirement } from '../../../types';

/* ==========================================================================
   Constants
   ========================================================================== */

/** Canonical section order + labels (mirrors setup_sections seeds) */
const SECTION_META: Record<string, { label: string; emoji: string; disciplines: string[] }> = {
  rods_reels:       { label: 'Hengels & Reels',      emoji: '🎣', disciplines: ['karper','roofvis','witvis'] },
  terminal_tackle:  { label: 'Terminal Tackle',       emoji: '🔗', disciplines: ['karper'] },
  leaders_terminal: { label: 'Leaders & Terminal',    emoji: '🔗', disciplines: ['roofvis'] },
  hookbaits:        { label: 'Haakaas',               emoji: '🎯', disciplines: ['karper'] },
  bait_liquids:     { label: 'Voer & Liquids',        emoji: '🪣', disciplines: ['karper','witvis'] },
  lure_families:    { label: 'Kunstaasfamilies',      emoji: '🐟', disciplines: ['roofvis'] },
  bite_detection:   { label: 'Bite Detection',        emoji: '🔔', disciplines: ['karper'] },
  landing_care:     { label: 'Landing & Viszorg',     emoji: '🛡', disciplines: ['karper','roofvis'] },
  unhook_safety:    { label: 'Onthaak & Veiligheid',  emoji: '🔧', disciplines: ['roofvis'] },
  shelter_sleep:    { label: 'Shelter & Sleep',       emoji: '⛺', disciplines: ['karper'] },
  cooking_comfort:  { label: 'Koken & Comfort',       emoji: '🔥', disciplines: ['karper'] },
  transport_power:  { label: 'Transport & Power',     emoji: '⚡', disciplines: ['karper'] },
  clothing_safety:  { label: 'Kleding & Veiligheid',  emoji: '🧥', disciplines: ['karper','roofvis'] },
  measure_document: { label: 'Meten & Documenteren',  emoji: '📏', disciplines: ['roofvis','karper'] },
  bags_mobility:    { label: 'Tassen & Mobiliteit',   emoji: '🎒', disciplines: ['roofvis'] },
  comfort_vision:   { label: 'Comfort & Zicht',       emoji: '🕶', disciplines: ['roofvis'] },
  line_storage:     { label: 'Lijnen & Spoel',        emoji: '🔄', disciplines: ['karper','roofvis','witvis'] },
  general:          { label: 'Overig',                emoji: '📦', disciplines: [] },
};

const SECTION_ORDER = Object.keys(SECTION_META);

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  owned:   { label: 'Heb ik',    dot: 'bg-success',      text: 'text-success'      },
  want:    { label: 'Wil ik',    dot: 'bg-brand',         text: 'text-brand'        },
  reserve: { label: 'Reserve',   dot: 'bg-text-muted',    text: 'text-text-muted'   },
  replace: { label: 'Vervangen', dot: 'bg-orange-400',    text: 'text-orange-400'   },
};

/* ==========================================================================
   Props
   ========================================================================== */

interface TackleboxSectionViewProps {
  items:           TackleboxItem[];
  /** Active setup requirements — used for coverage badges */
  requirements?:   SetupRequirement[];
  activeSetup?:    SessionSetup;
  disciplineFilter?: string;         // 'all' | 'karper' | 'roofvis'
  onEdit:          (item: TackleboxItem) => void;
  onDelete:        (item: TackleboxItem) => void;
  onToggleFavorite:(item: TackleboxItem) => void;
  onAddToSection:  (sectionId: string) => void;
}

/* ==========================================================================
   Coverage helper
   ========================================================================== */

/**
 * Check if an item covers at least one active requirement in a section.
 * Returns the requirement keys this item covers.
 */
function getCoveredKeys(item: TackleboxItem, requirements: SetupRequirement[]): string[] {
  if (!requirements.length) return [];
  const active = item.ownershipStatus === 'owned' || item.ownershipStatus === 'reserve';
  if (!active) return [];

  return requirements
    .filter((req) => {
      if (item.requirementKeys?.includes(req.requirementKey)) return true;
      if (item.sectionId === req.sectionId) return true;
      return false;
    })
    .map((req) => req.requirementKey);
}

/* ==========================================================================
   Item row
   ========================================================================== */

function ItemRow({
  item,
  coveredKeys,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  item:            TackleboxItem;
  coveredKeys:     string[];
  onEdit:          (i: TackleboxItem) => void;
  onDelete:        (i: TackleboxItem) => void;
  onToggleFavorite:(i: TackleboxItem) => void;
}) {
  const status = STATUS_CONFIG[item.ownershipStatus ?? 'owned'] ?? STATUS_CONFIG.owned;
  const qty    = item.quantityOwned ?? 1;
  const covers = coveredKeys.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
        covers ? 'bg-success/5' : ''
      )}
    >
      {/* Status dot */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className={cn('w-2 h-2 rounded-full', status.dot)} />
      </div>

      {/* Image / icon */}
      <div className="w-8 h-8 rounded-lg bg-surface-soft border border-border-subtle overflow-hidden flex items-center justify-center flex-shrink-0">
        {(item as any).catalogSnapshot?.imageURL ? (
          <img
            src={(item as any).catalogSnapshot.imageURL}
            alt={item.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <Package className="w-3.5 h-3.5 text-text-dim" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-bold text-text-primary truncate max-w-[140px]">
            {item.name}
          </span>
          {covers && (
            <span className="flex items-center gap-0.5 text-[8px] font-black text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded-lg uppercase tracking-widest">
              <Check className="w-2 h-2" /> Dekt setup
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.brand && (
            <span className="text-[9px] text-text-dim">{item.brand}</span>
          )}
          {qty > 1 && (
            <span className="text-[9px] font-black text-text-muted">
              × {qty} {item.unit ?? 'st.'}
            </span>
          )}
          <span className={cn('text-[9px] font-bold', status.text)}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(item)}
          className="w-7 h-7 rounded-lg text-text-dim hover:text-brand hover:bg-brand/5 flex items-center justify-center transition-all text-[9px] font-black"
        >
          ✎
        </button>
        <button
          onClick={() => onDelete(item)}
          className="w-7 h-7 rounded-lg text-text-dim hover:text-red-400 hover:bg-red-400/5 flex items-center justify-center transition-all text-[10px]"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   Section block
   ========================================================================== */

function SectionBlock({
  sectionId,
  items,
  requirements,
  defaultOpen,
  onEdit,
  onDelete,
  onToggleFavorite,
  onAdd,
}: {
  sectionId:       string;
  items:           TackleboxItem[];
  requirements:    SetupRequirement[];
  defaultOpen:     boolean;
  onEdit:          (i: TackleboxItem) => void;
  onDelete:        (i: TackleboxItem) => void;
  onToggleFavorite:(i: TackleboxItem) => void;
  onAdd:           () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = SECTION_META[sectionId] ?? { label: sectionId, emoji: '📦', disciplines: [] };

  // Completeness against requirements
  const sectionReqs  = requirements.filter((r) => r.sectionId === sectionId);
  const essentialReqs = sectionReqs.filter((r) => r.priority === 'essential');

  const coveredEssentialKeys = new Set<string>();
  for (const item of items) {
    if (item.ownershipStatus !== 'owned' && item.ownershipStatus !== 'reserve') continue;
    for (const req of essentialReqs) {
      if (
        item.requirementKeys?.includes(req.requirementKey) ||
        item.sectionId === req.sectionId
      ) {
        coveredEssentialKeys.add(req.requirementKey);
      }
    }
  }

  const essentialPct = essentialReqs.length > 0
    ? Math.round((coveredEssentialKeys.size / essentialReqs.length) * 100)
    : null;

  const hasGap = essentialPct !== null && essentialPct < 100;

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all',
      hasGap ? 'border-orange-500/20' : 'border-border-subtle'
    )}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 transition-colors',
          hasGap ? 'bg-orange-500/5' : 'bg-surface-soft',
          'hover:bg-surface-card'
        )}
      >
        <span className="text-base">{meta.emoji}</span>

        <div className="flex-1 text-left">
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
            {meta.label}
          </p>
          {essentialPct !== null && (
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1 w-16 bg-surface-card rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    essentialPct === 100 ? 'bg-success' : 'bg-orange-400'
                  )}
                  style={{ width: `${essentialPct}%` }}
                />
              </div>
              <span className={cn(
                'text-[9px] font-black',
                essentialPct === 100 ? 'text-success' : 'text-orange-400'
              )}>
                {essentialPct}% essentials
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Item count badge */}
          <span className={cn(
            'text-[9px] font-black px-2 py-0.5 rounded-lg border',
            items.length > 0
              ? 'bg-brand/10 text-brand border-brand/20'
              : 'bg-surface-soft text-text-dim border-border-subtle'
          )}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>

          {hasGap && (
            <AlertCircle className="w-4 h-4 text-orange-400" />
          )}

          {open
            ? <ChevronUp className="w-4 h-4 text-text-muted" />
            : <ChevronDown className="w-4 h-4 text-text-muted" />
          }
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-subtle/50 divide-y divide-border-subtle/30">
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  coveredKeys={getCoveredKeys(item, sectionReqs)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}

              {/* Empty state with add CTA */}
              {items.length === 0 && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg border border-dashed border-border-subtle flex items-center justify-center flex-shrink-0">
                    <Package className="w-3.5 h-3.5 text-text-dim" />
                  </div>
                  <p className="flex-1 text-[11px] text-text-dim italic">
                    Nog niets in dit blok.
                  </p>
                  <button
                    onClick={onAdd}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand/10 text-brand border border-brand/20 text-[9px] font-black uppercase tracking-widest hover:bg-brand/20 transition-all"
                  >
                    <Plus className="w-2.5 h-2.5" /> Voeg toe
                  </button>
                </div>
              )}

              {/* Add button (when items present) */}
              {items.length > 0 && (
                <div className="px-4 py-2">
                  <button
                    onClick={onAdd}
                    className="flex items-center gap-1.5 text-[9px] font-black text-text-muted hover:text-brand uppercase tracking-widest transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Item toevoegen aan {meta.label.toLowerCase()}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ==========================================================================
   Main component
   ========================================================================== */

export function TackleboxSectionView({
  items,
  requirements = [],
  activeSetup,
  disciplineFilter = 'all',
  onEdit,
  onDelete,
  onToggleFavorite,
  onAddToSection,
}: TackleboxSectionViewProps) {

  // Group items by sectionId
  const grouped = useMemo(() => {
    const map = new Map<string, TackleboxItem[]>();

    for (const item of items) {
      const sid = item.sectionId || 'general';
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(item);
    }

    return map;
  }, [items]);

  // Sections to show — union of: sections with items + sections with requirements
  const sectionsToShow = useMemo(() => {
    const withItems = new Set(grouped.keys());
    const withReqs  = new Set(requirements.map((r) => r.sectionId));
    const all       = new Set([...withItems, ...withReqs]);

    // Filter by discipline if needed
    const filtered = [...all].filter((sid) => {
      if (disciplineFilter === 'all') return true;
      const meta = SECTION_META[sid];
      if (!meta) return true;
      return meta.disciplines.includes(disciplineFilter) || meta.disciplines.length === 0;
    });

    // Sort per canonical order
    return filtered.sort((a, b) => {
      const ia = SECTION_ORDER.indexOf(a);
      const ib = SECTION_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [grouped, requirements, disciplineFilter]);

  if (sectionsToShow.length === 0) return null;

  // Sections with gaps (essentials not covered) are opened by default
  const gapSections = new Set(
    sectionsToShow.filter((sid) => {
      const reqs = requirements.filter((r) => r.sectionId === sid && r.priority === 'essential');
      if (reqs.length === 0) return false;
      const sectionItems = grouped.get(sid) ?? [];
      return reqs.some((req) =>
        !sectionItems.some(
          (item) =>
            (item.ownershipStatus === 'owned' || item.ownershipStatus === 'reserve') &&
            (item.requirementKeys?.includes(req.requirementKey) || item.sectionId === req.sectionId)
        )
      );
    })
  );

  return (
    <div className="space-y-2">
      {sectionsToShow.map((sectionId) => (
        <SectionBlock
          key={sectionId}
          sectionId={sectionId}
          items={grouped.get(sectionId) ?? []}
          requirements={requirements.filter((r) => r.sectionId === sectionId)}
          defaultOpen={gapSections.has(sectionId) || (grouped.get(sectionId)?.length ?? 0) > 0}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          onAdd={() => onAddToSection(sectionId)}
        />
      ))}
    </div>
  );
}
