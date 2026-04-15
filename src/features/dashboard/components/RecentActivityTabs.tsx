/**
 * RecentActivityTabs — combined tabbed view for Catches / Sessions / Spots.
 * Replaces three separate list sections in the old Dashboard.tsx.
 * Uses real thumbnail images from Firestore records (migrated included).
 */

import React, { useState } from 'react';
import { Fish, History, MapPin, ChevronRight, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, Badge, Button } from '../../../components/ui/Base';
import { LazyImage } from '../../../components/ui/LazyImage';
import { Catch, Session, Spot } from '../../../types';
import {
  getCatchSpecies,
  getCatchImage,
  getCatchTimestampDate,
  getSessionName,
  getSessionStartDate,
  getSessionCatchCount,
  getSessionSpotName,
  getSessionStatus,
  getSpotName,
  getSpotWaterType,
  getSpotCatchCount,
  getSpotImage,
  formatDateShort,
  formatTimeShort,
} from '../utils/dashboardHelpers';
import { cn } from '../../../lib/utils';

type Tab = 'catches' | 'sessions' | 'spots';

interface RecentActivityTabsProps {
  catches: Catch[];
  sessions: Session[];
  spots: Spot[];
  onCatchClick: (c: Catch) => void;
  onSessionClick: (s: Session) => void;
  onSpotClick: (s: Spot) => void;
  onViewAllCatches: () => void;
  onViewAllSessions: () => void;
  onViewAllSpots: () => void;
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'catches', label: 'Vangsten', icon: Fish },
  { id: 'sessions', label: 'Sessies', icon: History },
  { id: 'spots', label: 'Stekken', icon: MapPin },
];

/* ─── Catch card — 2-column square grid ─── */
function CatchCard({ c, onClick }: { c: Catch; onClick: () => void }) {
  const species = getCatchSpecies(c);
  const imgSrc = getCatchImage(c);
  const date = getCatchTimestampDate(c);

  return (
    <Card
      padding="none"
      hoverable
      variant="premium"
      className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
      onClick={onClick}
    >
      {/* Square thumbnail */}
      <div className="relative aspect-square overflow-hidden">
        <LazyImage
          src={imgSrc || null}
          alt={species}
          wrapperClassName="w-full h-full"
          fallbackIconSize={28}
        />

        {/* XP badge */}
        {(c.xpEarned ?? 0) > 0 && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-0.5 bg-brand text-bg-main rounded-full px-1.5 py-0.5 text-[8px] font-black shadow-accent">
              <Zap className="w-2.5 h-2.5" />
              {c.xpEarned} XP
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="text-[12px] font-bold text-text-primary truncate">{species}</p>
        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-text-muted">
          {c.weight && <span>{c.weight}g</span>}
          {c.length && <span>{c.length}cm</span>}
          <span>{date ? format(date, 'd MMM', { locale: nl }) : 'Zojuist'}</span>
        </div>
      </div>
    </Card>
  );
}

/* ─── Session row ─── */
function SessionRow({ s, onClick }: { s: Session; onClick: () => void }) {
  const status = getSessionStatus(s);
  const isLive = status === 'live' || status === 'active' || (s as any).isActive;
  const start = getSessionStartDate(s);
  const end = (s as any)?.endTime || (s as any)?.endedAt;

  return (
    <Card
      padding="none"
      hoverable
      variant="premium"
      className="p-3.5 rounded-2xl border border-border-subtle bg-surface-card"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
          {isLive ? (
            <div className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
          ) : (
            <History className="w-4.5 h-4.5 text-brand" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[13px] font-bold text-text-primary truncate">
              {getSessionName(s)}
            </p>
            {isLive && (
              <Badge variant="accent" className="text-[7px] px-1.5 py-0.5 rounded-full">
                Live
              </Badge>
            )}
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted truncate">
            {getSessionSpotName(s)}
          </p>
          <div className="flex flex-wrap gap-2.5 mt-1.5 text-[10px] font-bold text-text-secondary">
            {start && <span>{formatDateShort(start)} {formatTimeShort(start)}</span>}
            {!isLive && end && <span>— {formatTimeShort(end)}</span>}
            <span className="text-brand">{getSessionCatchCount(s)} vangsten</span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
      </div>
    </Card>
  );
}

/* ─── Spot row ─── */
function SpotRow({ s, onClick }: { s: Spot; onClick: () => void }) {
  const imgSrc = getSpotImage(s);

  return (
    <Card
      padding="none"
      hoverable
      variant="premium"
      className="rounded-2xl border border-border-subtle bg-surface-card overflow-hidden"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 p-3.5">
        {/* Thumbnail or icon */}
        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-border-subtle bg-surface-soft shrink-0">
          {imgSrc ? (
            <LazyImage
              src={imgSrc}
              alt={getSpotName(s)}
              wrapperClassName="w-full h-full"
              fallbackIconSize={20}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-brand/60" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-text-primary truncate">
            {getSpotName(s)}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-0.5">
            {getSpotWaterType(s)} · {getSpotCatchCount(s)} vangsten
          </p>
        </div>

        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
      </div>
    </Card>
  );
}

/* ─── Main component ─── */
export const RecentActivityTabs: React.FC<RecentActivityTabsProps> = ({
  catches,
  sessions,
  spots,
  onCatchClick,
  onSessionClick,
  onSpotClick,
  onViewAllCatches,
  onViewAllSessions,
  onViewAllSpots,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('catches');

  const viewAllHandlers: Record<Tab, () => void> = {
    catches: onViewAllCatches,
    sessions: onViewAllSessions,
    spots: onViewAllSpots,
  };

  const counts: Record<Tab, number> = {
    catches: catches.length,
    sessions: sessions.length,
    spots: spots.length,
  };

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-text-muted">
          Recente activiteit
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-brand font-black text-[10px] uppercase tracking-widest"
          onClick={viewAllHandlers[activeTab]}
        >
          Alles
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95',
              activeTab === tab.id
                ? 'bg-brand text-bg-main shadow-accent'
                : 'bg-surface-soft text-text-muted border border-border-subtle hover:text-text-primary'
            )}
          >
            <tab.icon className="w-3 h-3 shrink-0" />
            {tab.label}
            {counts[tab.id] > 0 && (
              <span
                className={cn(
                  'ml-0.5 rounded-full px-1 text-[8px] font-black',
                  activeTab === tab.id
                    ? 'bg-bg-main/20 text-bg-main'
                    : 'bg-surface-elevated text-text-muted'
                )}
              >
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'catches' && (
        catches.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {catches.map((c) => (
              <CatchCard key={c.id} c={c} onClick={() => onCatchClick(c)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Fish}
            title="Nog geen vangsten"
            subtitle="Log je eerste vangst met de + knop"
          />
        )
      )}

      {activeTab === 'sessions' && (
        sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionRow key={(s as any).id} s={s} onClick={() => onSessionClick(s)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={History}
            title="Nog geen sessies"
            subtitle="Start een vissessie om bij te houden"
          />
        )
      )}

      {activeTab === 'spots' && (
        spots.length > 0 ? (
          <div className="space-y-2">
            {spots.map((s) => (
              <SpotRow key={s.id} s={s} onClick={() => onSpotClick(s)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MapPin}
            title="Nog geen stekken"
            subtitle="Voeg je eerste visplaats toe"
          />
        )
      )}
    </section>
  );
};

/* ─── Empty state ─── */
function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-soft/20 p-8 text-center">
      <Icon className="w-10 h-10 text-brand/20 mx-auto mb-3" />
      <p className="text-sm font-bold text-text-primary">{title}</p>
      <p className="text-[11px] text-text-muted mt-1">{subtitle}</p>
    </div>
  );
}
