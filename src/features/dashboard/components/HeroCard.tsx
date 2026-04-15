import React from 'react';
import { Card, Badge } from '../../../components/ui/Base';
import { XpProgressBar } from '../../../components/xp/XpProgressBar';
import { getLevelProgress, getLevelTitle } from '../../../services/xpService';
import { UserProfile } from '../../../types';
import { UserStats } from '../../../services/statsService';

interface HeroCardProps {
  profile: UserProfile | null;
  stats: UserStats | null;
  spotsCount: number;
  onRankingClick: () => void;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  profile,
  stats,
  spotsCount,
  onRankingClick,
}) => {
  const xp = profile?.xp || 0;
  const levelData = getLevelProgress(xp);
  const levelTitle = getLevelTitle(levelData.level);

  const totalCatches = stats?.totalCatches ?? 0;
  const totalSessions = stats?.totalSessions ?? 0;

  return (
    <Card className="relative overflow-hidden rounded-[1.75rem] border border-brand/20 bg-surface-card p-3.5 shadow-premium">
      <div className="absolute top-0 right-0 w-28 h-28 bg-brand/6 blur-3xl -mr-8 -mt-8 pointer-events-none" />

      <div className="relative z-10 space-y-3">
        {/* Top row: name + level pill */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand leading-none mb-1">
              {levelTitle}
            </p>
            <h1 className="text-[17px] font-bold text-text-primary leading-tight truncate">
              {profile?.displayName || 'Visser'}
            </h1>
          </div>

          <button
            type="button"
            onClick={onRankingClick}
            className="shrink-0 rounded-xl border border-brand/30 bg-brand/8 px-2.5 py-1.5 text-center hover:bg-brand/15 active:scale-95 transition-all"
          >
            <p className="text-[7px] font-black uppercase tracking-widest text-text-muted leading-none">
              Level
            </p>
            <p className="text-[18px] font-black text-text-primary leading-none mt-0.5">
              {levelData.level}
            </p>
            <p className="text-[8px] font-black text-brand leading-none mt-0.5">
              {xp.toLocaleString()} XP
            </p>
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-1.5">
          {[
            { label: 'Vangsten', value: totalCatches },
            { label: 'Sessies', value: totalSessions },
            { label: 'Stekken', value: spotsCount },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 rounded-xl bg-surface-soft border border-border-subtle py-2 text-center"
            >
              <p className="text-[7px] font-black uppercase tracking-widest text-text-muted leading-none">
                {stat.label}
              </p>
              <p className="text-sm font-black text-text-primary mt-1.5 leading-none">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* XP progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
            <span className="text-text-muted">Lvl {levelData.level}</span>
            {levelData.isMaxLevel ? (
              <span className="text-brand">Max level</span>
            ) : (
              <span className="text-brand">
                +{levelData.xpToNextLevel.toLocaleString()} XP → Lvl {levelData.level + 1}
              </span>
            )}
          </div>
          <XpProgressBar xp={xp} compact />
        </div>
      </div>
    </Card>
  );
};
