import React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getLevelTitle } from '../../services/xpService';

interface LevelBadgeProps {
  level: number;
  /** Also render the level title next to the number */
  showTitle?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/**
 * Compact level badge used across Rankings, Profile, and Dashboard.
 * Gold accent consistent with CatchRank design language.
 */
export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  showTitle = false,
  size = 'sm',
  className,
}) => {
  const title = getLevelTitle(level);

  const sizeStyles = {
    xs: 'text-[8px] px-1.5 py-0.5 rounded-md gap-0.5',
    sm: 'text-[9px] px-2 py-1 rounded-lg gap-1',
    md: 'text-[10px] px-2.5 py-1 rounded-xl gap-1',
  };

  const iconSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-black uppercase tracking-widest bg-brand/10 text-brand border border-brand/20 flex-shrink-0',
        sizeStyles[size],
        className
      )}
    >
      <Zap className={cn('fill-current flex-shrink-0', iconSizes[size])} />
      Lvl {level}
      {showTitle && (
        <span className="opacity-60 normal-case tracking-normal font-semibold ml-1 hidden sm:inline">
          · {title}
        </span>
      )}
    </span>
  );
};
