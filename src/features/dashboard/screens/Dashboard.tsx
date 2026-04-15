/**
 * Dashboard — main home screen for CatchRank.
 *
 * This component is a lean orchestrator: it wires up hooks and
 * passes data down to focused presentational section components.
 * All data loading lives in useDashboardData / useWeather.
 * All helpers live in utils/dashboardHelpers.ts.
 *
 * Section order (mobile-first priority):
 *  1. HeroCard — identity, level, XP, stats
 *  2. ActiveSessionCard — only when a live session exists
 *  3. DraftCatchesAlert — only when incomplete catches exist
 *  4. QuickActions — primary action triggers
 *  5. WeatherCard — live conditions + hourly forecast
 *  6. RecentActivityTabs — tabbed catches / sessions / spots
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

import { useAuth } from '../../../App';
import { useSession } from '../../../contexts/SessionContext';
import { Catch, Session, Spot } from '../../../types';

import { PageLayout } from '../../../components/layout/PageLayout';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';
import { QuickCatchModal } from '../../../components/QuickCatchModal';
import { CatchForm } from '../../../components/CatchForm';
import { SessionModal } from '../../../components/SessionModal';

import { useDashboardData } from '../hooks/useDashboardData';
import { useWeather } from '../hooks/useWeather';

import { HeroCard } from '../components/HeroCard';
import { QuickActions } from '../components/QuickActions';
import { ActiveSessionCard } from '../components/ActiveSessionCard';
import { DraftCatchesAlert } from '../components/DraftCatchesAlert';
import { WeatherCard } from '../components/WeatherCard';
import { RecentActivityTabs } from '../components/RecentActivityTabs';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { activeSession, endActiveSession } = useSession();

  // ── Data hooks ──────────────────────────────────────────────
  const {
    recentCatches,
    incompleteCatches,
    recentSessions,
    favoriteSpots,
    spotsCount,
    stats,
    loading,
  } = useDashboardData(profile?.uid);

  const {
    weather,
    weatherLocation,
    isEditingLocation,
    setIsEditingLocation,
    handleLocationSubmit,
    hourlyForecast,
  } = useWeather();

  // ── Modal state ──────────────────────────────────────────────
  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);
  const [isCatchFormOpen, setIsCatchFormOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<Catch | null>(null);

  // ── Handlers ─────────────────────────────────────────────────
  const handleEndSession = async () => {
    try { await endActiveSession(); } catch (e) { console.error(e); }
  };

  const openEditCatch = (c: Catch) => {
    setEditingCatch(c);
    setIsCatchFormOpen(true);
  };

  const closeCatchForm = () => {
    setIsCatchFormOpen(false);
    setEditingCatch(null);
  };

  // ── Loading state ─────────────────────────────────────────────
  if (loading) return <DashboardSkeleton />;

  return (
    <PageLayout>
      <div className="space-y-5 px-2 md:px-0">

        {/* 1 — Hero */}
        <HeroCard
          profile={profile}
          stats={stats}
          spotsCount={spotsCount}
          onRankingClick={() => navigate('/rankings')}
        />

        {/* 2 — Active session (contextual) */}
        {activeSession && (
          <ActiveSessionCard
            session={activeSession as Partial<Session>}
            onLogCatch={() => setIsQuickCatchOpen(true)}
            onEndSession={handleEndSession}
          />
        )}

        {/* 3 — Draft catches (contextual) */}
        {incompleteCatches.length > 0 && (
          <DraftCatchesAlert
            drafts={incompleteCatches}
            onEditDraft={openEditCatch}
          />
        )}

        {/* 4 — Quick actions */}
        <QuickActions
          onNewSpot={() => navigate('/spots')}
          onNewSession={() => setIsSessionModalOpen(true)}
          onNewCatch={() => setIsQuickCatchOpen(true)}
        />

        {/* 5 — Weather */}
        <WeatherCard
          weather={weather}
          weatherLocation={weatherLocation}
          isEditingLocation={isEditingLocation}
          onToggleEdit={() => setIsEditingLocation(!isEditingLocation)}
          onLocationSubmit={handleLocationSubmit}
          hourlyForecast={hourlyForecast}
          onOpenForecast={() => navigate('/weather-forecast')}
        />

        {/* 6 — Recent activity tabs */}
        <RecentActivityTabs
          catches={recentCatches}
          sessions={recentSessions}
          spots={favoriteSpots}
          onCatchClick={openEditCatch}
          onSessionClick={(s: Session) => navigate(`/sessions/${(s as any).id}`)}
          onSpotClick={(s: Spot) => navigate(`/spots/${s.id}`)}
          onViewAllCatches={() => navigate('/catches')}
          onViewAllSessions={() => navigate('/sessions')}
          onViewAllSpots={() => navigate('/spots')}
        />
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isQuickCatchOpen && (
          <QuickCatchModal
            isOpen={isQuickCatchOpen}
            onClose={() => setIsQuickCatchOpen(false)}
            activeSessionId={activeSession?.id}
          />
        )}

        {isCatchFormOpen && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeCatchForm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl"
            >
              <CatchForm
                initialData={editingCatch || {}}
                activeSessionId={activeSession?.id}
                onComplete={closeCatchForm}
                onCancel={closeCatchForm}
              />
            </motion.div>
          </div>
        )}

        {isSessionModalOpen && (
          <SessionModal
            isOpen={isSessionModalOpen}
            onClose={() => setIsSessionModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
