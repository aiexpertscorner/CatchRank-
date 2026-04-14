/**
 * CompletenessItemBadge.tsx
 *
 * Kleine inline badge die per TackleboxItem aangeeft of het een
 * essentieel requirement dekt in de actieve setup(s).
 *
 * Drie staten:
 *   ✓ Dekt essentieel  → groen
 *   ○ Dekt aanbevolen  → geel
 *   (leeg)             → item heeft geen bekende rol in actieve setup
 *
 * Gebruik:
 *   <CompletenessItemBadge item={item} requirements={activeRequirements} />
 */

import React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { TackleboxItem, SetupRequirement } from '../../../types';

/* ==========================================================================
   Types
   ========================================================================== */

interface CompletenessItemBadgeProps {
  item:         TackleboxItem;
  requirements: SetupRequirement[];
  /** Show the section label in the badge */
  showLabel?:   boolean;
  className?:   string;
}

type CoverageLevel = 'essential' | 'recommended' | null;

/* ==========================================================================
   Coverage check
   ========================================================================== */

function getCoverageLevel(
  item:         TackleboxItem,
  requirements: SetupRequirement[]
): { level: CoverageLevel; labels: string[] } {
  // Only owned/reserve items count
  if (item.ownershipStatus !== 'owned' && item.ownershipStatus !== 'reserve') {
    return { level: null, labels: [] };
  }

  const covered: SetupRequirement[] = [];

  for (const req of requirements) {
    const matches =
      item.requirementKeys?.includes(req.requirementKey) ||
      item.sectionId === req.sectionId;

    if (matches) covered.push(req);
  }

  if (covered.length === 0) return { level: null, labels: [] };

  const hasEssential   = covered.some((r) => r.priority === 'essential');
  const hasRecommended = covered.some((r) => r.priority === 'recommended');

  const level: CoverageLevel = hasEssential ? 'essential' : hasRecommended ? 'recommended' : null;
  const labels = covered.map((r) => r.label);

  return { level, labels };
}

/* ==========================================================================
   Component
   ========================================================================== */

export function CompletenessItemBadge({
  item,
  requirements,
  showLabel = false,
  className,
}: CompletenessItemBadgeProps) {
  if (requirements.length === 0) return null;

  const { level, labels } = getCoverageLevel(item, requirements);

  if (!level) return null;

  const isEssential = level === 'essential';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border',
        'text-[8px] font-black uppercase tracking-widest',
        isEssential
          ? 'bg-success/10 text-success border-success/20'
          : 'bg-amber-400/10 text-amber-400 border-amber-400/20',
        className
      )}
      title={labels.join(', ')}
    >
      {isEssential
        ? <Check className="w-2 h-2 flex-shrink-0" />
        : <Circle className="w-2 h-2 flex-shrink-0" />
      }
      {showLabel && (
        <span className="truncate max-w-[80px]">
          {labels[0]}
          {labels.length > 1 && ` +${labels.length - 1}`}
        </span>
      )}
    </span>
  );
}

/* ==========================================================================
   SetupCoverageRow — shows which setups an item covers (for detail view)
   ========================================================================== */

interface SetupCoverageRowProps {
  item:          TackleboxItem;
  setups:        Array<{
    name:         string;
    requirements: SetupRequirement[];
  }>;
}

export function SetupCoverageRow({ item, setups }: SetupCoverageRowProps) {
  const coveredSetups = setups
    .map((s) => ({ name: s.name, ...getCoverageLevel(item, s.requirements) }))
    .filter((s) => s.level !== null);

  if (coveredSetups.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {coveredSetups.map((s) => (
        <span
          key={s.name}
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border',
            'text-[8px] font-black uppercase tracking-widest',
            s.level === 'essential'
              ? 'bg-success/10 text-success border-success/20'
              : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
          )}
        >
          <Check className="w-2 h-2" />
          {s.name.slice(0, 16)}{s.name.length > 16 ? '…' : ''}
        </span>
      ))}
    </div>
  );
}

/* ==========================================================================
   SectionCompleteness — mini gauge for a single section (used in headers)
   ========================================================================== */

interface SectionCompletenessProps {
  sectionId:    string;
  items:        TackleboxItem[];
  requirements: SetupRequirement[];
}

export function SectionCompletenessGauge({
  sectionId,
  items,
  requirements,
}: SectionCompletenessProps) {
  const sectionReqs = requirements.filter(
    (r) => r.sectionId === sectionId && r.priority === 'essential'
  );

  if (sectionReqs.length === 0) return null;

  const activeItems = items.filter(
    (i) => i.ownershipStatus === 'owned' || i.ownershipStatus === 'reserve'
  );

  const coveredCount = sectionReqs.filter((req) =>
    activeItems.some(
      (item) =>
        item.requirementKeys?.includes(req.requirementKey) ||
        item.sectionId === req.sectionId
    )
  ).length;

  const pct    = Math.round((coveredCount / sectionReqs.length) * 100);
  const isFullyCovered = pct === 100;

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 rounded-full bg-surface-card overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isFullyCovered ? 'bg-success' : 'bg-orange-400'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn(
        'text-[8px] font-black',
        isFullyCovered ? 'text-success' : 'text-orange-400'
      )}>
        {coveredCount}/{sectionReqs.length}
      </span>
    </div>
  );
}
