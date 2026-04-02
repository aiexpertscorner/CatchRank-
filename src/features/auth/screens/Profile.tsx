import React, { useState, useEffect } from 'react';
import {
  Trophy,
  TrendingUp,
  MapPin,
  Fish,
  Clock,
  Calendar,
  Settings as SettingsIcon,
  Share2,
  ChevronRight,
  Star,
  Zap,
  Target,
  Award,
  History,
  BarChart3,
  Edit2
} from 'lucide-react';
import { useAuth } from '../../../App';
import { PageLayout } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { StatCard, ProgressBar } from '../../../components/ui/Data';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch, Session } from '../../../types';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { LevelBadge } from '../../../components/xp/LevelBadge';
import { XpProgressBar } from '../../../components/xp/XpProgressBar';

/**
 * Profile Screen
 * Part of the 'auth' feature module.
 * Displays user profile, stats, achievements, and activity.
 */

export default function Profile() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'catches' | 'sessions' | 'stats' | 'achievements'>('overview');
  const [catches, setCatches] = useState<Catch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        const catchesQuery = query(
          collection(db, 'catches'),
          where('userId', '==', profile.uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const catchesSnapshot = await getDocs(catchesQuery);
        setCatches(catchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Catch)));

        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('ownerUserId', '==', profile.uid),
          orderBy('startedAt', 'desc'),
          limit(10)
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        setSessions(sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const tabs = [
    { id: 'overview', label: 'Overzicht', icon: History },
    { id: 'catches', label: 'Vangsten', icon: Fish },
    { id: 'sessions', label: 'Sessies', icon: Clock },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'achievements', label: 'Awards', icon: Award },
  ] as const;

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-32">
        {/* Profile Header */}
        <section className="relative">
          <Card className="bg-surface-card border-none overflow-hidden rounded-2xl md:rounded-[2.5rem] shadow-premium">
            {/* Cover Image Placeholder */}
            <div className="h-32 md:h-48 bg-gradient-to-r from-brand/20 via-brand/10 to-transparent relative">
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button variant="secondary" size="sm" className="bg-black/40 backdrop-blur-md border-white/10 text-white h-9 px-4 rounded-xl">
                  <Share2 className="w-4 h-4 mr-2" />
                  Delen
                </Button>
                <Button variant="secondary" size="sm" className="bg-black/40 backdrop-blur-md border-white/10 text-white h-9 px-4 rounded-xl" onClick={() => navigate('/settings')}>
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Instellingen
                </Button>
              </div>
            </div>

            <div className="px-6 md:px-10 pb-8 md:pb-12 -mt-12 md:-mt-16 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 text-center md:text-left">
                  <div className="relative group">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-[2rem] border-4 border-surface-card overflow-hidden bg-surface-soft shadow-2xl">
                      {profile?.photoURL ? (
                        <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-brand/10 text-brand">
                          <Fish className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <button className="absolute bottom-0 right-0 p-2 bg-brand text-bg-main rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 md:pb-2">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
                      <h1 className="text-2xl md:text-4xl font-bold text-text-primary tracking-tight">{profile?.displayName}</h1>
                      <LevelBadge level={profile?.level || 1} showTitle size="md" />
                    </div>
                    <p className="text-sm md:text-base text-text-secondary font-medium max-w-md">
                      {profile?.bio || 'Gepassioneerd sportvisser uit Nederland. Altijd op zoek naar die ene monster snoekbaars!'}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3 md:pb-2">
                  <div className="flex items-center gap-4">
                    <div className="text-center px-4 py-2 border-r border-border-subtle">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">XP</p>
                      <p className="text-xl font-bold text-brand">{(profile?.xp || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center px-4 py-2">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Level</p>
                      <p className="text-xl font-bold text-text-primary">{profile?.level || 1}</p>
                    </div>
                  </div>
                  {/* XP Progress towards next level */}
                  <div className="w-full min-w-[180px] md:min-w-[240px]">
                    <XpProgressBar xp={profile?.xp || 0} compact />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Tab Navigation */}
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

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <OverviewTab profile={profile} catches={catches} sessions={sessions} />}
            {activeTab === 'catches' && <CatchesTab catches={catches} />}
            {activeTab === 'sessions' && <SessionsTab sessions={sessions} />}
            {activeTab === 'stats' && <StatsTab profile={profile} catches={catches} />}
            {activeTab === 'achievements' && <AchievementsTab profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}

function OverviewTab({ profile, catches, sessions }: { profile: any, catches: Catch[], sessions: Session[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      <div className="md:col-span-8 space-y-8">
        {/* Activity Feed */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight px-2">Recente Activiteit</h3>
          <div className="space-y-4">
            {catches.slice(0, 3).map((c) => (
              <Card key={c.id} className="p-4 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-soft flex-shrink-0 border border-border-subtle">
                    {c.photoURL ? (
                      <img src={c.photoURL} alt={c.species} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted/20">
                        <Fish className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-base font-bold text-text-primary tracking-tight">{c.species} gevangen!</h4>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        {c.timestamp ? format(c.timestamp.toDate(), 'd MMM', { locale: nl }) : 'Zojuist'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-secondary mb-3">
                      {c.length && <span>{c.length}cm</span>}
                      {c.weight && <span>{c.weight}g</span>}
                      <span className="text-text-dim">•</span>
                      <span>{c.spotName || 'Onbekende stek'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="accent" className="text-[8px] py-0.5 px-2 font-black uppercase tracking-widest">+25 XP</Badge>
                      <Badge variant="secondary" className="text-[8px] py-0.5 px-2 font-black uppercase tracking-widest">PR Verbeterd</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Button variant="ghost" className="w-full py-4 text-brand font-black text-[10px] uppercase tracking-widest">Bekijk volledige historie</Button>
        </section>
      </div>

      <div className="md:col-span-4 space-y-8">
        {/* Quick Stats */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight px-2">Statistieken</h3>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl text-center">
              <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Vangsten</p>
              <p className="text-2xl font-bold text-text-primary">{profile?.stats?.totalCatches || 0}</p>
            </Card>
            <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl text-center">
              <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Soorten</p>
              <p className="text-2xl font-bold text-text-primary">{profile?.stats?.speciesCount || 0}</p>
            </Card>
          </div>
        </section>

        {/* Favorite Species */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight px-2">Favorieten</h3>
          <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl space-y-4">
            <div className="space-y-3">
              {profile?.favoriteSpecies?.map((s: string) => (
                <div key={s} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                      <Fish className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-text-primary group-hover:text-brand transition-colors">{s}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

function CatchesTab({ catches }: { catches: Catch[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Mijn Vangsten ({catches.length})</h3>
        <Button size="sm" className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest">
          Filteren
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {catches.map((c) => (
          <Card key={c.id} padding="none" className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl overflow-hidden">
            <div className="aspect-square relative overflow-hidden">
              {c.photoURL ? (
                <img src={c.photoURL} alt={c.species} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-soft text-text-muted/20">
                  <Fish className="w-12 h-12" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs font-black text-brand uppercase tracking-widest mb-0.5">{c.species}</p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/90">
                  {c.length && <span>{c.length}cm</span>}
                  {c.weight && <span>{c.weight}g</span>}
                </div>
              </div>
            </div>
          </Card>
        ))}
        <button className="aspect-square rounded-2xl border-2 border-dashed border-border-subtle flex flex-col items-center justify-center gap-3 text-text-muted hover:text-brand hover:border-brand transition-all bg-surface-soft/20 group">
          <div className="w-12 h-12 rounded-full bg-surface-soft flex items-center justify-center group-hover:bg-brand/10 transition-colors">
            <Plus className="w-6 h-6" />
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
      <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight px-2">Vis Sessies ({sessions.length})</h3>
      <div className="space-y-4">
        {sessions.map((s) => (
          <Card key={s.id} className="p-6 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-text-primary tracking-tight">
                      {s.title || 'Sessie aan het water'}
                    </h4>
                    <p className="text-xs text-text-muted font-medium">
                      {s.startedAt ? format(s.startedAt.toDate(), 'EEEE d MMMM yyyy', { locale: nl }) : 'Onbekende datum'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Fish className="w-4 h-4 text-brand" />
                    <span className="text-sm font-bold text-text-secondary">{s.linkedCatchIds?.length || 0} vangsten</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-brand" />
                    <span className="text-sm font-bold text-text-secondary">+{s.statsSummary?.totalXp || 0} XP</span>
                  </div>
                </div>
              </div>
              <Button variant="secondary" className="h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-widest">
                Details bekijken
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatsTab({ profile, catches }: { profile: any, catches: Catch[] }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Totaal Vangsten" value={profile?.stats?.totalCatches || 0} icon={Fish} variant="blue" className="rounded-2xl p-6 bg-surface-card border-border-subtle" />
        <StatCard label="Totaal Sessies" value={profile?.stats?.totalSessions || 0} icon={Clock} variant="success" className="rounded-2xl p-6 bg-surface-card border-border-subtle" />
        <StatCard label="Meeste Soort" value="Snoekbaars" icon={Target} variant="accent" className="rounded-2xl p-6 bg-surface-card border-border-subtle" />
      </div>

      <Card className="p-8 border border-border-subtle bg-surface-card rounded-2xl md:rounded-[2rem]">
        <h4 className="text-lg font-bold text-text-primary uppercase tracking-tight mb-8">Activiteit Analyse</h4>
        <div className="h-64 flex items-end gap-2 px-4">
          {[40, 65, 45, 90, 75, 55, 80, 60, 95, 70, 85, 50].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
              <div className="w-full bg-surface-soft rounded-t-lg relative overflow-hidden" style={{ height: `${h}%` }}>
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  className="absolute inset-0 bg-brand/20 group-hover:bg-brand/40 transition-colors" 
                />
              </div>
              <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl">
          <h4 className="text-base font-bold text-text-primary uppercase tracking-tight mb-6">Persoonlijke Records</h4>
          <div className="space-y-4">
            {[
              { species: 'Snoek', value: '108 cm', date: '12 Okt 2025' },
              { species: 'Snoekbaars', value: '82 cm', date: '05 Jan 2026' },
              { species: 'Baars', value: '48 cm', date: '22 Aug 2025' },
            ].map((pr) => (
              <div key={pr.species} className="flex items-center justify-between p-3 bg-bg-main/50 rounded-xl border border-border-subtle">
                <div>
                  <p className="text-xs font-black text-brand uppercase tracking-widest">{pr.species}</p>
                  <p className="text-sm font-bold text-text-primary">{pr.value}</p>
                </div>
                <span className="text-[10px] font-bold text-text-muted">{pr.date}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl">
          <h4 className="text-base font-bold text-text-primary uppercase tracking-tight mb-6">Top Locaties</h4>
          <div className="space-y-4">
            {[
              { name: 'De Kromme Mijdrecht', catches: 24, xp: 1200 },
              { name: 'Sloterplas', catches: 18, xp: 850 },
              { name: 'Noordzeekanaal', catches: 12, xp: 600 },
            ].map((loc) => (
              <div key={loc.name} className="flex items-center justify-between p-3 bg-bg-main/50 rounded-xl border border-border-subtle">
                <div>
                  <p className="text-sm font-bold text-text-primary">{loc.name}</p>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{loc.catches} vangsten</p>
                </div>
                <Badge variant="accent" className="text-[9px] font-black">+{loc.xp} XP</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AchievementsTab({ profile }: { profile: any }) {
  const achievements = [
    { id: '1', name: 'Nachtbraker', description: 'Log 5 vangsten tussen 00:00 en 04:00', icon: '🌙', progress: 100, isCompleted: true },
    { id: '2', name: 'Soortenjager', description: 'Vang 10 verschillende vissoorten', icon: '🧬', progress: 70, isCompleted: false },
    { id: '3', name: 'Winterkoning', description: 'Log een vangst bij temperaturen onder 0°C', icon: '❄️', progress: 100, isCompleted: true },
    { id: '4', name: 'Monster Hunter', description: 'Vang een vis van meer dan 100cm', icon: '🐉', progress: 0, isCompleted: false },
    { id: '5', name: 'Vroege Vogel', description: 'Log 10 vangsten voor 07:00', icon: '🌅', progress: 40, isCompleted: false },
    { id: '6', name: 'Sociale Visser', description: 'Word lid van 3 verschillende visclubs', icon: '🤝', progress: 100, isCompleted: true },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((ach) => (
          <Card key={ach.id} className={`p-6 border transition-all rounded-2xl relative overflow-hidden ${
            ach.isCompleted 
              ? 'bg-brand/5 border-brand/30 shadow-premium-accent/5' 
              : 'bg-surface-card border-border-subtle opacity-70'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl">{ach.icon}</div>
              {ach.isCompleted && (
                <div className="w-6 h-6 rounded-full bg-brand text-bg-main flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
            <h4 className="text-lg font-bold text-text-primary tracking-tight mb-1">{ach.name}</h4>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed">{ach.description}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className={ach.isCompleted ? 'text-brand' : 'text-text-muted'}>
                  {ach.isCompleted ? 'Voltooid' : 'Bezig'}
                </span>
                <span className="text-text-primary">{ach.progress}%</span>
              </div>
              <ProgressBar value={ach.progress} className={`h-1.5 rounded-full ${ach.isCompleted ? 'bg-brand/20' : 'bg-surface-soft'}`} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function Plus(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
