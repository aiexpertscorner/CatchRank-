import React, { useEffect, useMemo, useState } from 'react';
import {
  Fish,
  Clock,
  Settings as SettingsIcon,
  Share2,
  ChevronRight,
  Zap,
  Target,
  Award,
  History,
  BarChart3,
  Edit2,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../../App';
import { PageLayout } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { StatCard, ProgressBar } from '../../../components/ui/Data';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch, Session, UserProfile } from '../../../types';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { LevelBadge } from '../../../components/xp/LevelBadge';
import { XpProgressBar } from '../../../components/xp/XpProgressBar';
import { statsService, UserStats } from '../../../services/statsService';

/**
 * Profile Screen
 * v2-first profile view with legacy-compatible rendering.
 */

type ProfileTab = 'overview' | 'catches' | 'sessions' | 'stats' | 'achievements';

export default function Profile() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [catches, setCatches] = useState<Catch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const catchesQuery = query(
          collection(db, 'catches_v2'),
          where('userId', '==', profile.uid),
          orderBy('timestamp', 'desc'),
          limit(24)
        );

        const sessionsQuery = query(
          collection(db, 'sessions_v2'),
          where('participantIds', 'array-contains', profile.uid),
          orderBy('startTime', 'desc'),
          limit(16)
        );

        const [catchesSnapshot, sessionsSnapshot, stats] = await Promise.all([
          getDocs(catchesQuery),
          getDocs(sessionsQuery),
          statsService.calculateUserStats(profile.uid),
        ]);

        setCatches(
          catchesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Catch))
        );

        setSessions(
          sessionsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Session))
        );

        setUserStats(stats);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.uid]);

  const tabs = [
    { id: 'overview', label: 'Overzicht', icon: History },
    { id: 'catches', label: 'Vangsten', icon: Fish },
    { id: 'sessions', label: 'Sessies', icon: Clock },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'achievements', label: 'Awards', icon: Award },
  ] as const;

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-5xl mx-auto space-y-6 pb-nav-pad">
          <Card className="h-[420px] rounded-[2rem] md:rounded-[2.5rem] bg-surface-card border-none animate-pulse" />
          <Card className="h-16 rounded-2xl bg-surface-card border border-border-subtle animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="h-48 rounded-2xl bg-surface-card border border-border-subtle animate-pulse" />
            <Card className="h-48 rounded-2xl bg-surface-card border border-border-subtle animate-pulse" />
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-nav-pad">
        <section className="relative">
          <Card className="overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border-none bg-surface-card shadow-premium">
            <div className="relative h-28 md:h-44 bg-gradient-to-r from-brand/20 via-brand/10 to-transparent">
              <div className="absolute inset-0 bg-black/20" />

              <div className="hidden md:flex absolute bottom-4 right-4 gap-2 z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 px-4 rounded-xl bg-black/40 backdrop-blur-md border-white/10 text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Delen
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 px-4 rounded-xl bg-black/40 backdrop-blur-md border-white/10 text-white"
                  onClick={() => navigate('/settings')}
                >
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Instellingen
                </Button>
              </div>
            </div>

            <div className="relative z-10 px-5 md:px-10 pb-8 md:pb-12">
              <div className="-mt-12 md:-mt-16 flex justify-center md:justify-start">
                <div className="relative group">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-[1.75rem] md:rounded-[2rem] border-4 border-surface-card overflow-hidden bg-surface-soft shadow-2xl">
                    {profile?.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt={profile?.displayName || 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand/10 text-brand">
                        <Fish className="w-10 h-10 md:w-12 md:h-12" />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-2 bg-brand text-bg-main rounded-xl shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    onClick={() => navigate('/settings')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex md:hidden gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-11 rounded-2xl bg-bg-main/70 backdrop-blur-md border-border-subtle text-text-primary"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Delen
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-11 rounded-2xl bg-bg-main/70 backdrop-blur-md border-border-subtle text-text-primary"
                  onClick={() => navigate('/settings')}
                >
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Instellingen
                </Button>
              </div>

              <div className="mt-5 md:mt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-8">
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center md:items-end justify-center md:justify-start gap-2 md:gap-3">
                    <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight leading-none">
                      {profile?.displayName || 'Gebruiker'}
                    </h1>
                    <div className="mt-1 md:mt-0">
                      <LevelBadge level={profile?.level || 1} showTitle size="md" />
                    </div>
                  </div>

                  <p className="mt-4 text-base md:text-lg text-text-secondary font-medium max-w-2xl mx-auto md:mx-0 leading-relaxed">
                    {profile?.bio || 'Bouw je profiel op met vangsten, sessies, awards en progressie.'}
                  </p>

                  {profile?.locationPreference?.name && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-soft border border-border-subtle text-xs font-bold text-text-secondary">
                      <MapPin className="w-4 h-4 text-brand" />
                      {profile.locationPreference.name}
                    </div>
                  )}
                </div>

                <div className="w-full md:w-auto md:min-w-[320px]">
                  <div className="rounded-[1.75rem] border border-border-subtle bg-bg-main/35 backdrop-blur-sm px-4 py-4 md:px-5 md:py-5">
                    <div className="grid grid-cols-2 items-stretch">
                      <div className="text-center px-3 py-2 border-r border-border-subtle">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-text-muted">
                          XP
                        </p>
                        <p className="text-3xl md:text-4xl font-bold text-brand leading-none">
                          {(profile?.xp || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-center px-3 py-2">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-text-muted">
                          Level
                        </p>
                        <p className="text-3xl md:text-4xl font-bold text-text-primary leading-none">
                          {profile?.level || 1}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <XpProgressBar xp={profile?.xp || 0} compact />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <div className="flex items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border-subtle overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand text-bg-main shadow-lg shadow-brand/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab
                profile={profile}
                catches={catches}
                sessions={sessions}
                stats={userStats}
                onOpenSettings={() => navigate('/settings')}
              />
            )}
            {activeTab === 'catches' && <CatchesTab catches={catches} />}
            {activeTab === 'sessions' && <SessionsTab sessions={sessions} />}
            {activeTab === 'stats' && <StatsTab profile={profile} catches={catches} stats={userStats} />}
            {activeTab === 'achievements' && <AchievementsTab profile={profile} stats={userStats} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}

function getCatchDisplaySpecies(catchItem: Catch): string {
  return (
    catchItem.speciesSpecific ||
    catchItem.speciesGeneral ||
    catchItem.species ||
    'Onbekende vis'
  );
}

function getCatchDisplayImage(catchItem: Catch): string | undefined {
  return catchItem.mainImage || catchItem.photoURL || catchItem.extraImages?.[0];
}

function getSessionDisplayTitle(session: Session): string {
  return session.title || session.name || session.spotName || 'Sessie aan het water';
}

function getSessionStart(session: Session): any {
  return session.startTime || session.startedAt;
}

function OverviewTab({
  profile,
  catches,
  sessions,
  stats,
  onOpenSettings,
}: {
  profile: UserProfile | null;
  catches: Catch[];
  sessions: Session[];
  stats: UserStats | null;
  onOpenSettings: () => void;
}) {
  const recentCompleteCatches = catches.filter((c) => c.status !== 'draft').slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      <div className="md:col-span-8 space-y-8">
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight px-2">
            Recente Activiteit
          </h3>

          <div className="space-y-4">
            {recentCompleteCatches.length > 0 ? (
              recentCompleteCatches.map((c) => {
                const image = getCatchDisplayImage(c);
                const species = getCatchDisplaySpecies(c);

                return (
                  <Card
                    key={c.id}
                    className="p-4 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group"
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-soft flex-shrink-0 border border-border-subtle">
                        {image ? (
                          <img
                            src={image}
                            alt={species}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted/20">
                            <Fish className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center justify-between mb-1 gap-3">
                          <h4 className="text-base font-bold text-text-primary tracking-tight">
                            {species} gevangen
                          </h4>
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">
                            {c.timestamp ? format(c.timestamp.toDate(), 'd MMM', { locale: nl }) : 'Zojuist'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary mb-3">
                          {c.length && <span>{c.length}cm</span>}
                          {c.weight && <span>{c.weight}g</span>}
                          {c.spotName && (
                            <>
                              <span className="text-text-dim">•</span>
                              <span>{c.spotName}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {(c.xpEarned || 0) > 0 && (
                            <Badge
                              variant="accent"
                              className="text-[8px] py-0.5 px-2 font-black uppercase tracking-widest"
                            >
                              +{c.xpEarned} XP
                            </Badge>
                          )}
                          {c.status === 'complete' && (
                            <Badge
                              variant="secondary"
                              className="text-[8px] py-0.5 px-2 font-black uppercase tracking-widest"
                            >
                              Gelogd
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl">
                <p className="text-sm text-text-secondary">
                  Nog geen recente activiteit. Log je eerste vangst of start een sessie.
                </p>
              </Card>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full py-4 text-brand font-black text-[10px] uppercase tracking-widest"
          >
            Bekijk volledige historie
          </Button>
        </section>
      </div>

      <div className="md:col-span-4 space-y-8">
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight px-2">
            Statistieken
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl text-center">
              <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                Vangsten
              </p>
              <p className="text-2xl font-bold text-text-primary">
                {stats?.totalCatches || 0}
              </p>
            </Card>
            <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl text-center">
              <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                Soorten
              </p>
              <p className="text-2xl font-bold text-text-primary">
                {stats?.speciesCount || 0}
              </p>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight px-2">
            Favorieten
          </h3>
          <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl space-y-4">
            {profile?.favoriteSpecies?.length ? (
              <div className="space-y-3">
                {profile.favoriteSpecies.map((s: string) => (
                  <div key={s} className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                        <Fish className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-text-primary group-hover:text-brand transition-colors">
                        {s}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Je hebt nog geen favoriete vissoorten ingesteld.
                </p>
                <Button variant="secondary" className="w-full" onClick={onOpenSettings}>
                  Instellen
                </Button>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

function CatchesTab({ catches }: { catches: Catch[] }) {
  const visibleCatches = catches.filter((c) => c.status !== 'draft');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2 gap-4">
        <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">
          Mijn Vangsten ({visibleCatches.length})
        </h3>
        <Button size="sm" className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest">
          Filteren
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleCatches.map((c) => {
          const image = getCatchDisplayImage(c);
          const species = getCatchDisplaySpecies(c);

          return (
            <Card
              key={c.id}
              padding="none"
              className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl overflow-hidden"
            >
              <div className="aspect-square relative overflow-hidden">
                {image ? (
                  <img
                    src={image}
                    alt={species}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-soft text-text-muted/20">
                    <Fish className="w-12 h-12" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-xs font-black text-brand uppercase tracking-widest mb-0.5">
                    {species}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/90 flex-wrap">
                    {c.length && <span>{c.length}cm</span>}
                    {c.weight && <span>{c.weight}g</span>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        <button className="aspect-square rounded-2xl border-2 border-dashed border-border-subtle flex flex-col items-center justify-center gap-3 text-text-muted hover:text-brand hover:border-brand transition-all bg-surface-soft/20 group">
          <div className="w-12 h-12 rounded-full bg-surface-soft flex items-center justify-center group-hover:bg-brand/10 transition-colors">
            <Fish className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Nieuwe Vangst</span>
        </button>
      </div>
    </div>
  );
}

function SessionsTab({ sessions }: { sessions: Session[] }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight px-2">
        Vis Sessies ({sessions.length})
      </h3>

      <div className="space-y-4">
        {sessions.map((s) => {
          const start = getSessionStart(s);

          return (
            <Card
              key={s.id}
              className="p-6 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-text-primary tracking-tight">
                        {getSessionDisplayTitle(s)}
                      </h4>
                      <p className="text-xs text-text-muted font-medium">
                        {start ? format(start.toDate(), 'EEEE d MMMM yyyy', { locale: nl }) : 'Onbekende datum'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Fish className="w-4 h-4 text-brand" />
                      <span className="text-sm font-bold text-text-secondary">
                        {s.stats?.totalCatches ?? s.statsSummary?.totalCatches ?? s.linkedCatchIds?.length ?? 0} vangsten
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-brand" />
                      <span className="text-sm font-bold text-text-secondary">
                        +{s.stats?.totalXp ?? s.statsSummary?.totalXp ?? 0} XP
                      </span>
                    </div>
                  </div>
                </div>

                <Button variant="secondary" className="h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-widest">
                  Details bekijken
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatsTab({
  profile,
  catches,
  stats,
}: {
  profile: UserProfile | null;
  catches: Catch[];
  stats: UserStats | null;
}) {
  const monthly = stats?.monthlyActivity || [];

  const topSpeciesLabel =
    stats?.topSpecies?.[0]?.name ||
    catches.find((c) => getCatchDisplaySpecies(c))?.species ||
    '—';

  const personalRecords = useMemo(() => {
    const map = new Map<string, { species: string; length?: number; weight?: number; timestamp?: any }>();

    for (const c of catches) {
      const species = getCatchDisplaySpecies(c);
      if (!species) continue;

      const existing = map.get(species);
      const currentScore = (c.length || 0) * 10000 + (c.weight || 0);
      const existingScore = existing ? ((existing.length || 0) * 10000 + (existing.weight || 0)) : -1;

      if (!existing || currentScore > existingScore) {
        map.set(species, {
          species,
          length: c.length,
          weight: c.weight,
          timestamp: c.timestamp,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => ((b.length || 0) * 10000 + (b.weight || 0)) - ((a.length || 0) * 10000 + (a.weight || 0)))
      .slice(0, 5);
  }, [catches]);

  const topLocations = useMemo(() => {
    const counts = new Map<string, { catches: number; xp: number }>();

    for (const c of catches) {
      const key = c.spotName || c.spotId;
      if (!key) continue;

      const current = counts.get(key) || { catches: 0, xp: 0 };
      current.catches += 1;
      current.xp += c.xpEarned || 0;
      counts.set(key, current);
    }

    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.catches - a.catches)
      .slice(0, 5);
  }, [catches]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Totaal Vangsten"
          value={stats?.totalCatches || 0}
          icon={Fish}
          variant="blue"
          className="rounded-2xl p-6 bg-surface-card border-border-subtle"
        />
        <StatCard
          label="Totaal Sessies"
          value={stats?.totalSessions || 0}
          icon={Clock}
          variant="success"
          className="rounded-2xl p-6 bg-surface-card border-border-subtle"
        />
        <StatCard
          label="Top Soort"
          value={topSpeciesLabel}
          icon={Target}
          variant="accent"
          className="rounded-2xl p-6 bg-surface-card border-border-subtle"
        />
      </div>

      <Card className="p-8 border border-border-subtle bg-surface-card rounded-2xl md:rounded-[2rem]">
        <h4 className="text-lg font-bold text-text-primary uppercase tracking-tight mb-8">
          Activiteit Analyse
        </h4>

        <div className="h-64 flex items-end gap-2 px-4">
          {(monthly.length ? monthly : Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}`, count: 0 }))).map((item, i, arr) => {
            const max = Math.max(...arr.map((x) => x.count), 1);
            const h = Math.max(8, Math.round((item.count / max) * 100));

            return (
              <div key={`${item.month}-${i}`} className="flex-1 flex flex-col items-center gap-3 group">
                <div
                  className="w-full bg-surface-soft rounded-t-lg relative overflow-hidden"
                  style={{ height: `${h}%` }}
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className="absolute inset-0 bg-brand/20 group-hover:bg-brand/40 transition-colors"
                  />
                </div>
                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                  {item.month.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl">
          <h4 className="text-base font-bold text-text-primary uppercase tracking-tight mb-6">
            Persoonlijke Records
          </h4>

          <div className="space-y-4">
            {personalRecords.length > 0 ? (
              personalRecords.map((pr) => (
                <div
                  key={pr.species}
                  className="flex items-center justify-between p-3 bg-bg-main/50 rounded-xl border border-border-subtle"
                >
                  <div>
                    <p className="text-xs font-black text-brand uppercase tracking-widest">
                      {pr.species}
                    </p>
                    <p className="text-sm font-bold text-text-primary">
                      {[pr.length ? `${pr.length} cm` : null, pr.weight ? `${pr.weight} g` : null]
                        .filter(Boolean)
                        .join(' • ') || 'Onbekend'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-text-muted">
                    {pr.timestamp ? format(pr.timestamp.toDate(), 'dd MMM yyyy', { locale: nl }) : '—'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">Nog geen records beschikbaar.</p>
            )}
          </div>
        </Card>

        <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl">
          <h4 className="text-base font-bold text-text-primary uppercase tracking-tight mb-6">
            Top Locaties
          </h4>

          <div className="space-y-4">
            {topLocations.length > 0 ? (
              topLocations.map((loc) => (
                <div
                  key={loc.name}
                  className="flex items-center justify-between p-3 bg-bg-main/50 rounded-xl border border-border-subtle"
                >
                  <div>
                    <p className="text-sm font-bold text-text-primary">{loc.name}</p>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                      {loc.catches} vangsten
                    </p>
                  </div>
                  <Badge variant="accent" className="text-[9px] font-black">
                    +{loc.xp} XP
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">Nog geen toplocaties beschikbaar.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AchievementsTab({
  profile,
  stats,
}: {
  profile: UserProfile | null;
  stats: UserStats | null;
}) {
  const badges = profile?.badges || [];

  const achievementCards = [
    {
      id: 'first-catch',
      name: 'Eerste Vangst',
      description: 'Log je eerste vangst in CatchRank',
      progress: Math.min(100, ((stats?.totalCatches || 0) / 1) * 100),
      isCompleted: (stats?.totalCatches || 0) >= 1,
      icon: '🎣',
    },
    {
      id: 'species-hunter',
      name: 'Soortenjager',
      description: 'Vang 10 verschillende vissoorten',
      progress: Math.min(100, ((stats?.speciesCount || 0) / 10) * 100),
      isCompleted: (stats?.speciesCount || 0) >= 10,
      icon: '🧬',
    },
    {
      id: 'session-runner',
      name: 'Sessiebouwer',
      description: 'Voltooi 5 vissessies',
      progress: Math.min(100, ((stats?.totalSessions || 0) / 5) * 100),
      isCompleted: (stats?.totalSessions || 0) >= 5,
      icon: '⏱️',
    },
  ];

  return (
    <div className="space-y-8">
      {badges.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight px-2">
            Behaalde Awards
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {badges.map((badge) => (
              <Card
                key={badge.id}
                className="p-6 border border-brand/30 bg-brand/5 rounded-2xl relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{badge.icon}</div>
                  <div className="w-6 h-6 rounded-full bg-brand text-bg-main flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <h4 className="text-lg font-bold text-text-primary tracking-tight mb-1">
                  {badge.name}
                </h4>
                <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                  Behaald
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-brand">Voltooid</span>
                    <span className="text-text-primary">100%</span>
                  </div>
                  <ProgressBar value={100} className="h-1.5 rounded-full bg-brand/20" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight px-2">
          Progressie Awards
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievementCards.map((ach) => (
            <Card
              key={ach.id}
              className={`p-6 border transition-all rounded-2xl relative overflow-hidden ${
                ach.isCompleted
                  ? 'bg-brand/5 border-brand/30 shadow-premium-accent/5'
                  : 'bg-surface-card border-border-subtle'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-3xl">{ach.icon}</div>
                {ach.isCompleted && (
                  <div className="w-6 h-6 rounded-full bg-brand text-bg-main flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>

              <h4 className="text-lg font-bold text-text-primary tracking-tight mb-1">
                {ach.name}
              </h4>
              <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                {ach.description}
              </p>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className={ach.isCompleted ? 'text-brand' : 'text-text-muted'}>
                    {ach.isCompleted ? 'Voltooid' : 'Bezig'}
                  </span>
                  <span className="text-text-primary">{Math.round(ach.progress)}%</span>
                </div>
                <ProgressBar
                  value={ach.progress}
                  className={`h-1.5 rounded-full ${ach.isCompleted ? 'bg-brand/20' : 'bg-surface-soft'}`}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}