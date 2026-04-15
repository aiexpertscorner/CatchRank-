import React from 'react';
import { Trophy } from 'lucide-react';
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
    <Card className="relative overflow-hidden rounded-[1.75rem] border border-brand/20 bg-surface-card p-4 shadow-premium">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-brand/8 blur-3xl -mr-10 -mt-10 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Top row: name + level badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Badge
              variant="accent"
              className="mb-2 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em]"
            >
              {levelTitle}
            </Badge>

            <h1 className="text-xl font-bold text-text-primary leading-tight truncate">
              {profile?.displayName || 'Visser'}
            </h1>
          </div>

          {/* Level + XP block */}
          <button
            type="button"
            onClick={onRankingClick}
            className="shrink-0 rounded-2xl border border-brand/30 bg-brand/8 px-3 py-2 text-center hover:bg-brand/15 active:scale-95 transition-all"
          >
            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Level</p>
            <p className="text-xl font-black text-text-primary leading-none mt-0.5">
              {levelData.level}
            </p>
            <p className="text-[9px] font-black text-brand mt-1 leading-none">
              {xp.toLocaleString()} XP
            </p>
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-surface-soft border border-border-subtle p-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted leading-none">
              Vangsten
            </p>
            <p className="text-base font-black text-text-primary mt-1.5 leading-none">
              {totalCatches}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft border border-border-subtle p-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted leading-none">
              Sessies
            </p>
            <p className="text-base font-black text-text-primary mt-1.5 leading-none">
              {totalSessions}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft border border-border-subtle p-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted leading-none">
              Stekken
            </p>
            <p className="text-base font-black text-text-primary mt-1.5 leading-none">
              {spotsCount}
            </p>
          </div>
        </div>

        {/* XP progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
            <span className="text-text-muted">Lvl {levelData.level}</span>
            {levelData.isMaxLevel ? (
              <span className="text-brand">Max level bereikt</span>
            ) : (
              <span className="text-brand">
                Nog {levelData.xpToNextLevel.toLocaleString()} XP → Lvl {levelData.level + 1}
              </span>
            )}
          </div>

          <XpProgressBar xp={xp} compact />
        </div>

        {/* Ranking link (if rank exists) */}
        {profile?.rank ? (
          <button
            type="button"
            onClick={onRankingClick}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-surface-soft border border-border-subtle hover:border-brand/30 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-brand/10 flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-brand" />
              </div>
              <span className="text-[11px] font-black text-text-primary">
                Rank #{profile.rank}
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand">
              Bekijk →
            </span>
          </button>
        ) : null}
      </div>
    </Card>
  );
};
