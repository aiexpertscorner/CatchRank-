import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Clock, 
  Calendar, 
  MapPin, 
  Fish, 
  Zap, 
  ChevronRight, 
  MoreVertical,
  Play,
  Square,
  History,
  TrendingUp,
  BarChart3,
  Users
} from 'lucide-react';
import { useAuth } from '../../../App';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Session } from '../../../types';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { SessionModal } from '../../../components/SessionModal';
import { statsService, UserStats } from '../../../services/statsService';
import { loggingService } from '../services/loggingService';

/**
 * Sessions Screen
 * Part of the 'logging' feature module.
 * Displays a list of all user fishing sessions with active session tracking.
 */

import { useSession } from '../../../contexts/SessionContext';
import { SessionDashboard } from './SessionDashboard';
import { SessionInvitationCard } from '../../../components/SessionInvitationCard';

export default function Sessions() {
  const { profile } = useAuth();
  const { activeSession, endActiveSession, pauseActiveSession, resumeActiveSession } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Session[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Fetch sessions where user is owner or participant
    const q = query(
      collection(db, 'sessions'),
      where('participantUserIds', 'array-contains', profile.uid),
      orderBy('startedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setSessions(allSessions);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sessions:", error);
      setLoading(false);
    });

    // Fetch pending invitations
    const pendingQ = query(
      collection(db, 'sessions'),
      where('pendingUserIds', 'array-contains', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePending = onSnapshot(pendingQ, (snapshot) => {
      const pending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setPendingInvitations(pending);
    });

    const loadStats = async () => {
      try {
        const userStats = await statsService.calculateUserStats(profile.uid);
        setStats(userStats);
      } catch (error) {
        console.error("Error calculating stats:", error);
      }
    };
    loadStats();

    return () => {
      unsubscribe();
      unsubscribePending();
    };
  }, [profile]);

  return (
    <PageLayout>
      <PageHeader 
        title="Vis Sessies" 
        subtitle={activeSession ? 'Je bent momenteel aan het vissen!' : `${sessions.length} sessies aan de waterkant`}
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

      <div className="space-y-6 md:space-y-8 pb-32">
        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && profile && (
          <section className="px-2 md:px-0 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-water" />
              <h3 className="text-base md:text-lg font-black text-text-primary uppercase tracking-tight">Uitnodigingen ({pendingInvitations.length})</h3>
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
                  <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">Totaal Tijd</p>
                  <p className="text-lg md:text-xl font-bold text-text-primary">{stats?.totalHours || 0}u</p>
                </Card>
                <Card className="p-3 md:p-4 bg-surface-card border border-border-subtle rounded-xl md:rounded-2xl text-center space-y-0.5 md:space-y-1">
                  <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">Gem. Vangsten</p>
                  <p className="text-lg md:text-xl font-bold text-text-primary">{stats?.averageCatchesPerSession.toFixed(1) || 0}</p>
                </Card>
                <Card className="p-3 md:p-4 bg-surface-card border border-border-subtle rounded-xl md:rounded-2xl text-center space-y-0.5 md:space-y-1">
                  <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">Top Soort</p>
                  <p className="text-lg md:text-xl font-bold text-text-primary truncate px-1">{stats?.topSpecies[0]?.name || '--'}</p>
                </Card>
                <Card className="p-3 md:p-4 bg-surface-card border border-border-subtle rounded-xl md:rounded-2xl text-center space-y-0.5 md:space-y-1">
                  <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">Success Rate</p>
                  <p className="text-lg md:text-xl font-bold text-text-primary">{stats?.totalSessions ? Math.round((stats.totalCatches / stats.totalSessions) * 100) : 0}%</p>
                </Card>
              </section>

              {/* Sessions List */}
              <section className="space-y-4 px-2 md:px-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base md:text-lg font-bold text-text-primary uppercase tracking-tight">Sessie Historie</h3>
                  <Button variant="ghost" size="sm" className="text-brand font-black text-[9px] md:text-[10px] uppercase tracking-widest">Filteren</Button>
                </div>
                
                <div className="space-y-3 md:space-y-4">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 md:h-32 bg-surface-card animate-pulse rounded-xl md:rounded-2xl border border-border-subtle" />
                    ))
                  ) : sessions.length > 0 ? (
                    sessions.filter(s => s.status !== 'live' && s.status !== 'paused').map((s) => (
                      <Card key={s.id} className="p-4 md:p-6 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-xl md:rounded-2xl group cursor-pointer overflow-hidden relative">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-surface-soft flex items-center justify-center text-brand border border-border-subtle group-hover:scale-105 transition-transform duration-500">
                              <History className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                            <div>
                              <h4 className="text-lg md:text-xl font-bold text-text-primary tracking-tight group-hover:text-brand transition-colors">
                                {s.title || 'Sessie aan het water'}
                              </h4>
                              <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-text-muted font-medium mt-0.5 md:mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                  {s.startedAt ? format(s.startedAt.toDate(), 'd MMM yyyy', { locale: nl }) : 'Onbekend'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                  {s.startedAt ? format(s.startedAt.toDate(), 'HH:mm', { locale: nl }) : '--:--'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 border-t md:border-t-0 border-border-subtle/50 pt-3 md:pt-0">
                            <div className="text-center md:text-right">
                              <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest mb-0.5 md:mb-1">Vangsten</p>
                              <div className="flex items-center justify-center md:justify-end gap-1.5">
                                <Fish className="w-3 h-3 md:w-3.5 md:h-3.5 text-brand" />
                                <span className="text-base md:text-lg font-bold text-text-primary">{s.linkedCatchIds?.length || 0}</span>
                              </div>
                            </div>
                            <div className="text-center md:text-right">
                              <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest mb-0.5 md:mb-1">XP</p>
                              <div className="flex items-center justify-center md:justify-end gap-1.5">
                                <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 text-brand" />
                                <span className="text-base md:text-lg font-bold text-text-primary">+{s.statsSummary?.totalXp || 0}</span>
                              </div>
                            </div>
                            <div className="hidden md:block pl-4 border-l border-border-subtle">
                              <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-brand transition-colors" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <Card className="p-8 md:p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-xl md:rounded-2xl">
                      <Clock className="w-10 h-10 md:w-12 md:h-12 text-brand/20 mx-auto mb-4" />
                      <h3 className="text-lg md:text-xl font-bold mb-2 text-text-primary">Nog geen sessies</h3>
                      <p className="text-xs md:text-sm text-text-secondary mb-6">Start je eerste sessie om je voortgang bij te houden.</p>
                      <Button onClick={() => setIsSessionModalOpen(true)} className="rounded-xl">Eerste Sessie Starten</Button>
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
