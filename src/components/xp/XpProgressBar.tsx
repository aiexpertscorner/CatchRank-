import React from 'react';
import { Zap, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getLevelProgress } from '../../services/xpService';

interface XpProgressBarProps {
  xp: number;
  /** Compact single-line variant for tight spaces (e.g. header, cards) */
  compact?: boolean;
  className?: string;
}

/**
 * XP progress bar showing progression towards the next level.
 * Used in Profile header and Dashboard XP widget.
 *
 * compact=false: full-width bar with labels above and below
 * compact=true:  single line with inline labels, no sub-labels
 */
export const XpProgressBar: React.FC<XpProgressBarProps> = ({
  xp,
  compact = false,
  className,
}) => {
  const progress = getLevelProgress(xp);

  if (compact) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
            Lvl {progress.level}
            {!progress.isMaxLevel && (
              <span className="text-text-dim"> → Lvl {progress.level + 1}</span>
            )}
          </span>
          <span className="text-[9px] font-black text-brand uppercase tracking-widest">
            {progress.isMaxLevel
              ? 'MAX LEVEL'
              : `${progress.xpToNextLevel.toLocaleString()} XP nodig`}
          </span>
        </div>
        <div className="h-1.5 w-full bg-surface-soft rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-brand transition-all duration-700 ease-out shadow-[0_0_6px_rgba(244,194,13,0.35)]"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Top row: XP total + level range */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-brand fill-current flex-shrink-0" />
          <span className="text-xs font-black text-text-primary">
            {xp.toLocaleString()} XP
          </span>
          <span className="text-[10px] font-semibold text-text-muted hidden sm:inline">
            · {progress.title}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-black text-text-muted uppercase tracking-widest flex-shrink-0">
          <span>Level {progress.level}</span>
          {!progress.isMaxLevel && (
            <>
              <ChevronRight className="w-2.5 h-2.5" />
              <span className="text-brand">Level {progress.level + 1}</span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full bg-surface-soft rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-brand transition-all duration-700 ease-out shadow-[0_0_10px_rgba(244,194,13,0.35)]"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>

      {/* Bottom range labels */}
      {!progress.isMaxLevel && (
        <div className="flex justify-between text-[8px] font-bold text-text-dim uppercase tracking-widest">
          <span>{progress.levelStartXp.toLocaleString()} XP</span>
          <span>{progress.nextLevelXp.toLocaleString()} XP</span>
        </div>
      )}
    </div>
  );
};
