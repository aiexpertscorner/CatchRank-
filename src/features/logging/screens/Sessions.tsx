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
  BarChart3
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

export default function Sessions() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', profile.uid),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setSessions(allSessions);
      setActiveSession(allSessions.find(s => s.status === 'active') || null);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sessions:", error);
      setLoading(false);
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

    return () => unsubscribe();
  }, [profile]);

  const handleEndSession = async (id: string) => {
    try {
      await loggingService.endSession(id);
      toast.success('Sessie beëindigd!');
    } catch (error) {
      toast.error('Fout bij beëindigen sessie');
    }
  };

  return (
    <PageLayout>
      <PageHeader 
        title="Vis Sessies" 
        subtitle={`${sessions.length} sessies aan de waterkant`}
        actions={
          <Button 
            icon={<Plus className="w-4 h-4" />} 
            onClick={() => setIsSessionModalOpen(true)}
            className="rounded-xl h-11 px-6 font-bold shadow-premium-accent"
          >
            Nieuwe Sessie
          </Button>
        }
      />

      <div className="space-y-8 pb-32">
        {/* Active Session Banner */}
        <AnimatePresence>
          {activeSession && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card variant="premium" className="bg-brand/10 border border-brand/30 p-6 md:p-8 rounded-2xl md:rounded-[2rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-brand rounded-full animate-pulse shadow-[0_0_10px_rgba(244,194,13,1)]"></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand">Huidige Sessie Actief</span>
                    </div>
                    <h3 className="text-2xl md:text-4xl text-text-primary font-bold tracking-tight">{activeSession.location?.name || 'Sessie Bezig'}</h3>
                    <div className="flex flex-wrap items-center gap-6 text-xs text-text-secondary">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand" />
                        <span className="font-bold">Gestart om {activeSession.startTime ? format(activeSession.startTime.toDate(), 'HH:mm', { locale: nl }) : '--:--'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Fish className="w-4 h-4 text-brand" />
                        <span className="font-bold">{activeSession.catchIds?.length || 0} vangsten</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="secondary" 
                      className="flex-1 md:flex-none h-12 px-8 rounded-xl font-bold"
                      onClick={() => activeSession.id && handleEndSession(activeSession.id)}
                    >
                      <Square className="w-4 h-4 mr-2 fill-current" />
                      Sessie Stoppen
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Summary */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 md:px-0">
          <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl text-center space-y-1">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Totaal Tijd</p>
            <p className="text-xl font-bold text-text-primary">{stats?.totalHours || 0}u</p>
          </Card>
          <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl text-center space-y-1">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Gem. Vangsten</p>
            <p className="text-xl font-bold text-text-primary">{stats?.averageCatchesPerSession.toFixed(1) || 0} / sessie</p>
          </Card>
          <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl text-center space-y-1">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Top Soort</p>
            <p className="text-xl font-bold text-text-primary truncate px-2">{stats?.topSpecies[0]?.name || '--'}</p>
          </Card>
          <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl text-center space-y-1">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Success Rate</p>
            <p className="text-xl font-bold text-text-primary">{stats?.totalSessions ? Math.round((stats.totalCatches / stats.totalSessions) * 100) : 0}%</p>
          </Card>
        </section>

        {/* Sessions List */}
        <section className="space-y-4 px-2 md:px-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Sessie Historie</h3>
            <Button variant="ghost" size="sm" className="text-brand font-black text-[10px] uppercase tracking-widest">Filteren</Button>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-surface-card animate-pulse rounded-2xl border border-border-subtle" />
              ))
            ) : sessions.length > 0 ? (
              sessions.filter(s => s.status !== 'active').map((s) => (
                <Card key={s.id} className="p-6 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group cursor-pointer overflow-hidden relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-surface-soft flex items-center justify-center text-brand border border-border-subtle group-hover:scale-110 transition-transform duration-500">
                        <History className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-text-primary tracking-tight group-hover:text-brand transition-colors">
                          {s.location?.name || 'Sessie aan het water'}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-text-muted font-medium mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {s.startTime ? format(s.startTime.toDate(), 'd MMMM yyyy', { locale: nl }) : 'Onbekend'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {s.startTime ? format(s.startTime.toDate(), 'HH:mm', { locale: nl }) : '--:--'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Vangsten</p>
                        <div className="flex items-center justify-center gap-1.5">
                          <Fish className="w-3.5 h-3.5 text-brand" />
                          <span className="text-lg font-bold text-text-primary">{s.catchIds?.length || 0}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">XP</p>
                        <div className="flex items-center justify-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-brand" />
                          <span className="text-lg font-bold text-text-primary">+{s.totalXp || 0}</span>
                        </div>
                      </div>
                      <div className="pl-4 border-l border-border-subtle">
                        <ChevronRight className="w-6 h-6 text-text-muted group-hover:text-brand transition-colors" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl">
                <Clock className="w-12 h-12 text-brand/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2 text-text-primary">Nog geen sessies</h3>
                <p className="text-sm text-text-secondary mb-6">Start je eerste sessie om je voortgang bij te houden.</p>
                <Button onClick={() => setIsSessionModalOpen(true)}>Eerste Sessie Starten</Button>
              </Card>
            )}
          </div>
        </section>
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
