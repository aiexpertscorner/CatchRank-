import React, { useEffect, useState } from 'react';
import {
  Plus,
  Clock,
  Calendar,
  Fish,
  Zap,
  ChevronRight,
  History,
  Users,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../../App';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { LazyImage } from '../../../components/ui/LazyImage';
import { Session } from '../../../types';
import { getSessionImage } from '../../dashboard/utils/dashboardHelpers';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button } from '../../../components/ui/Base';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { SessionModal } from '../../../components/SessionModal';
import { statsService, UserStats } from '../../../services/statsService';

import { useSession } from '../../../contexts/SessionContext';
import { SessionDashboard } from './SessionDashboard';
import { SessionInvitationCard } from '../../../components/SessionInvitationCard';

/**
 * Sessions Screen v2
 * Reads from sessions_v2
 * Uses participantIds / startTime / name / stats / isActive
 * Keeps fallback support for some legacy fields
 */

const SESSIONS_COLLECTION = 'sessions_v2';

const getSessionName = (session: Partial<Session>) =>
  (session as any).name || (session as any).title || 'Sessie aan het water';

const getSessionStart = (session: Partial<Session>) =>
  (session as any).startTime || (session as any).startedAt || null;

const getSessionCatchCount = (session: Partial<Session>) =>
  (session as any).stats?.totalFish ||
  (session as any).stats?.totalCatches ||
  (session as any).statsSummary?.totalCatches ||
  (session as any).linkedCatchIds?.length ||
  0;

const getSessionXp = (session: Partial<Session>) =>
  (session as any).stats?.totalXp ||
  (session as any).statsSummary?.totalXp ||
  0;

const getSessionSpotName = (session: Partial<Session>) =>
  (session as any).spotName ||
  (session as any).locationName ||
  '';

const isSessionPaused = (session: Partial<Session>) =>
  (session as any).status === 'paused';

const isSessionLive = (session: Partial<Session>) =>
  (session as any).isActive === true && !isSessionPaused(session);

const isSessionArchivedHistory = (session: Partial<Session>) => {
  if (isSessionLive(session) || isSessionPaused(session)) return false;
  return true;
};

export default function Sessions() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { activeSession } = useSession();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Session[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  useEffect(() => {
    if (!profile?.uid) {
      setSessions([]);
      setPendingInvitations([]);
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    /**
     * v2:
     * - participantIds
     * - startTime
     */
    const sessionsQ = query(
      collection(db, SESSIONS_COLLECTION),
      where('participantIds', 'array-contains', profile.uid),
      orderBy('startTime', 'desc')
    );

    const unsubscribeSessions = onSnapshot(
      sessionsQ,
      (snapshot) => {
        const allSessions = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Session)
        );
        setSessions(allSessions);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching sessions:', error);
        setLoading(false);
      }
    );

    /**
     * Pending invitations
     * Kept compatible with current invitation flow fields
     */
    const pendingQ = query(
      collection(db, SESSIONS_COLLECTION),
      where('pendingUserIds', 'array-contains', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePending = onSnapshot(
      pendingQ,
      (snapshot) => {
        const pending = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Session)
        );
        setPendingInvitations(pending);
      },
      (error) => {
        console.error('Error fetching pending invitations:', error);
      }
    );

    const loadStats = async () => {
      try {
        const userStats = await statsService.calculateUserStats(profile.uid);
        setStats(userStats);
      } catch (error) {
        console.error('Error calculating stats:', error);
      }
    };

    loadStats();

    return () => {
      unsubscribeSessions();
      unsubscribePending();
    };
  }, [profile?.uid]);

  const historySessions = sessions.filter(isSessionArchivedHistory);

  return (
    <PageLayout>
      <PageHeader
        title="Vis Sessies"
        subtitle={
          activeSession
            ? 'Je bent momenteel aan het vissen!'
            : `${sessions.length} sessies aan de waterkant`
        }
        actions={
          !activeSession && (
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsSessionModalOpen(true)}
              className="rounded-xl h-11 px-6 font-bold shadow-premium-accent"
            >
              Nieuwe Sessie
            </Button>
          )
        }
      />

      <div className="space-y-6 md:space-y-8 pb-nav-pad">
        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && profile && (
          <section className="px-2 md:px-0 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-water" />
              <h3 className="text-base md:text-lg font-black text-text-primary uppercase tracking-tight">
                Uitnodigingen ({pendingInvitations.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingInvitations.map((session) => (
                <SessionInvitationCard
                  key={session.id}
                  session={session}
                  userId={profile.uid}
                />
              ))}
            </div>
          </section>
        )}

        {/* Active Session Dashboard */}
        <AnimatePresence mode="wait">
          {activeSession ? (
            <motion.div
              key="active-dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-2 md:px-0"
            >
              <SessionDashboard session={activeSession} />
            </motion.div>
          ) : (
            <motion.div
              key="stats-history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 md:space-y-8"
            >
              {/* Stats Summary */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-2 md:px-0">
                <Card className="p-3 md:p-4 bg-surface-card border border-border-subtle rounded-xl md:rounded-2xl text-center space-y-0.5 md:space-y-1">
                  <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">
                    Totaal Tijd
                  </p>
                  <p className="text-lg md:text-xl font-bold text-text-primary">
                    {stats?.totalHours || 0}u
                  </p>
                </Card>

                <Card className="p-3 md:p-4 bg-surface-card border border-border-subtle rounded-xl md:rounded-2xl text-center space-y-0.5 md:space-y-1">
                  <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">
                    Gem. Vangsten
                  </p>
                  <p className="text-lg md:text-xl font-bold text-text-primary">
                    {stats?.averageCatchesPerSession?.toFixed(1) || 0}
                  </p>
                </Card>

                <Card className="p-3 md:p-4 bg-surface-card border border-border-subtle rounded-xl md:rounded-2xl text-center space-y-0.5 md:space-y-1">
                  <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">
                    Top Soort
                  </p>
                  <p className="text-lg md:text-xl font-bold text-text-primary truncate px-1">
                    {stats?.topSpecies?.[0]?.name || '--'}
                  </p>
                </Card>

                <Card className="p-3 md:p-4 bg-surface-card border border-border-subtle rounded-xl md:rounded-2xl text-center space-y-0.5 md:space-y-1">
                  <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">
                    Success Rate
                  </p>
                  <p className="text-lg md:text-xl font-bold text-text-primary">
                    {stats?.totalSessions
                      ? Math.round((stats.totalCatches / stats.totalSessions) * 100)
                      : 0}
                    %
                  </p>
                </Card>
              </section>

              {/* Sessions List */}
              <section className="space-y-4 px-2 md:px-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base md:text-lg font-bold text-text-primary uppercase tracking-tight">
                    Sessie Historie
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-brand font-black text-[9px] md:text-[10px] uppercase tracking-widest"
                  >
                    Filteren
                  </Button>
                </div>

                <div className="space-y-3 md:space-y-4">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 md:h-32 bg-surface-card animate-pulse rounded-xl md:rounded-2xl border border-border-subtle"
                      />
                    ))
                  ) : historySessions.length > 0 ? (
                    historySessions.map((s) => {
                      const start = getSessionStart(s);
                      const startDate =
                        start?.toDate?.() ?? (start ? new Date(start) : null);
                      const imgSrc = getSessionImage(s);
                      const spotName = getSessionSpotName(s);

                      return (
                        <Card
                          key={s.id}
                          padding="none"
                          className="border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group cursor-pointer overflow-hidden"
                          onClick={() => s.id && navigate(`/sessions/${s.id}`)}
                        >
                          <div className="flex items-center gap-0">
                            {/* Thumbnail */}
                            <div className="w-20 h-20 shrink-0 overflow-hidden bg-surface-soft border-r border-border-subtle">
                              {imgSrc ? (
                                <LazyImage
                                  src={imgSrc}
                                  alt={getSessionName(s)}
                                  wrapperClassName="w-full h-full"
                                  fallbackIconSize={22}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-brand/5">
                                  <History className="w-7 h-7 text-brand/40" />
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 px-3.5 py-3">
                              <p className="text-[13px] font-bold text-text-primary truncate group-hover:text-brand transition-colors leading-tight">
                                {getSessionName(s)}
                              </p>
                              {spotName && (
                                <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-text-muted mt-0.5 truncate">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                  {spotName}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] font-medium text-text-secondary">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {startDate
                                    ? format(startDate, 'd MMM yyyy', { locale: nl })
                                    : 'Onbekend'}
                                </span>
                                <span className="flex items-center gap-1 text-brand font-bold">
                                  <Fish className="w-3 h-3" />
                                  {getSessionCatchCount(s)}
                                </span>
                                {getSessionXp(s) > 0 && (
                                  <span className="flex items-center gap-0.5 text-brand font-bold">
                                    <Zap className="w-3 h-3" />
                                    +{getSessionXp(s)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-text-muted shrink-0 mr-3.5 group-hover:text-brand transition-colors" />
                          </div>
                        </Card>
                      );
                    })
                  ) : (
                    <Card className="p-8 md:p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-xl md:rounded-2xl">
                      <Clock className="w-10 h-10 md:w-12 md:h-12 text-brand/20 mx-auto mb-4" />
                      <h3 className="text-lg md:text-xl font-bold mb-2 text-text-primary">
                        Nog geen sessies
                      </h3>
                      <p className="text-xs md:text-sm text-text-secondary mb-6">
                        Start je eerste sessie om je voortgang bij te houden.
                      </p>
                      <Button
                        onClick={() => setIsSessionModalOpen(true)}
                        className="rounded-xl"
                      >
                        Eerste Sessie Starten
                      </Button>
                    </Card>
                  )}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Session Modal */}
      <AnimatePresence>
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