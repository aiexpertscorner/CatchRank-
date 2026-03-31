import React, { useEffect, useState, useMemo } from 'react';
import { 
  Trophy, 
  Medal, 
  TrendingUp, 
  Users, 
  Globe, 
  Search,
  ChevronRight,
  Zap,
  Star,
  Flame,
  Target,
  Award,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Fish,
  MapPin,
  Clock
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Club } from '../types';
import { Button, Card, Badge } from '../components/ui/Base';
import { RankingCard } from '../components/ui/Data';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Navigation';
import { Input } from '../components/ui/Inputs';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';
import { cn } from '../lib/utils';

export default function Rankings() {
  const { profile } = useAuth();
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [topClubs, setTopClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);

  useEffect(() => {
    // Top Users Query
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('xp', 'desc'),
      limit(50)
    );

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setTopUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    });

    // Top Clubs Query
    const clubsQuery = query(
      collection(db, 'clubs'),
      orderBy('stats.totalXp', 'desc'),
      limit(10)
    );

    const unsubClubs = onSnapshot(clubsQuery, (snapshot) => {
      setTopClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
    });

    return () => {
      unsubUsers();
      unsubClubs();
    };
  }, []);

  const filteredUsers = useMemo(() => {
    return topUsers.filter(u => 
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [topUsers, searchQuery]);

  const userRank = useMemo(() => {
    if (!profile) return null;
    const index = topUsers.findIndex(u => u.uid === profile.uid);
    return index !== -1 ? index + 1 : profile.rank || 124; // Fallback to profile rank or mock
  }, [topUsers, profile]);

  return (
    <PageLayout>
      <PageHeader 
        title="Rankings & Progressie"
        subtitle="Bekijk wie de beste sportvissers zijn en ontdek je eigen milestones."
        badge="Rankings"
        actions={
          <Button 
            variant="secondary" 
            icon={<Award className="w-5 h-5 text-warning" />}
            className="rounded-xl h-12 px-6 font-bold border-border-subtle hover:bg-surface-soft"
            onClick={() => setIsAchievementsOpen(true)}
          >
            Mijn Achievements
          </Button>
        }
      />

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <Card className="p-4 flex items-center gap-4 bg-white border-none shadow-sm rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center">
            <Trophy className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Rang</p>
            <p className="text-lg font-black text-text-primary">#{userRank}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 bg-white border-none shadow-sm rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Totaal XP</p>
            <p className="text-lg font-black text-text-primary">{profile?.xp?.toLocaleString() || 0}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 bg-white border-none shadow-sm rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Streak</p>
            <p className="text-lg font-black text-text-primary">{profile?.streak?.current || 0} Dagen</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 bg-white border-none shadow-sm rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-aqua/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-aqua" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Milestones</p>
            <p className="text-lg font-black text-text-primary">12 / 40</p>
          </div>
        </Card>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-10 mb-16">
        {/* 2nd Place */}
        <div className="order-2 md:order-1">
          <PodiumCard 
            rank={2} 
            user={topUsers[1]} 
            height="h-52" 
            color="bg-slate-100" 
            icon={<Medal className="text-slate-400 w-8 h-8" />} 
          />
        </div>
        {/* 1st Place */}
        <div className="order-1 md:order-2">
          <PodiumCard 
            rank={1} 
            user={topUsers[0]} 
            height="h-72" 
            color="bg-brand-soft" 
            icon={<Trophy className="text-brand w-10 h-10" />} 
            isLarge
          />
        </div>
        {/* 3rd Place */}
        <div className="order-3 md:order-3">
          <PodiumCard 
            rank={3} 
            user={topUsers[2]} 
            height="h-44" 
            color="bg-orange-50" 
            icon={<Medal className="text-orange-400 w-8 h-8" />} 
          />
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-3 w-full md:w-96 bg-surface-soft/50 p-1.5 rounded-2xl border border-border-subtle">
              <TabsTrigger value="global" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3">Globaal</TabsTrigger>
              <TabsTrigger value="friends" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3">Vrienden</TabsTrigger>
              <TabsTrigger value="clubs" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3">Clubs</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-brand transition-colors" />
            <Input 
              placeholder="Zoek visser..." 
              className="pl-12 h-14 bg-white border-border-subtle rounded-2xl shadow-sm focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="global" className="mt-0">
          <Card padding="none" className="divide-y divide-border-subtle overflow-hidden border-none shadow-sm rounded-[2.5rem] bg-white">
            {loading ? (
              [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-24 animate-pulse bg-surface-soft/30" />
              ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.slice(3).map((u, i) => (
                <RankingCard 
                  key={u.uid}
                  rank={i + 4}
                  name={u.displayName}
                  xp={u.xp}
                  avatar={u.photoURL}
                  isCurrentUser={u.uid === profile?.uid}
                  className="border-none rounded-none hover:bg-surface-soft/50"
                />
              ))
            ) : (
              <div className="p-20 text-center">
                <p className="text-text-muted font-bold">Geen vissers gevonden voor "{searchQuery}"</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="friends" className="mt-0">
          <Card variant="premium" className="p-20 text-center border-dashed border-2 border-border-subtle bg-surface-soft/20 rounded-[3rem]">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-premium flex items-center justify-center mx-auto mb-8">
              <Users className="w-12 h-12 text-brand/30" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-text-primary">Nog geen vrienden</h3>
            <p className="text-text-secondary mb-8 max-w-sm mx-auto font-bold">
              Nodig je vismaten uit en vergelijk jullie vangsten en XP!
            </p>
            <Button className="h-14 px-8 rounded-xl shadow-premium-accent font-bold">Vrienden Uitnodigen</Button>
          </Card>
        </TabsContent>

        <TabsContent value="clubs" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topClubs.map((club, i) => (
              <Card key={club.id} hoverable className="p-6 border-none shadow-sm rounded-[2rem] bg-white flex items-center gap-6 group">
                <div className="w-12 h-12 rounded-xl bg-surface-soft flex items-center justify-center font-black text-text-muted shadow-inner group-hover:bg-brand group-hover:text-white transition-all">
                  {i + 1}
                </div>
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                  <img src={club.photoURL || `https://ui-avatars.com/api/?name=${club.name}`} alt={club.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-bold text-text-primary truncate">{club.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-black text-text-muted uppercase tracking-widest">{club.memberCount} Leden</span>
                    <div className="w-1 h-1 rounded-full bg-border-subtle" />
                    <span className="text-xs font-black text-brand uppercase tracking-widest">{club.stats?.totalXp?.toLocaleString()} XP</span>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-text-muted group-hover:text-brand group-hover:translate-x-1 transition-all" />
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* XP Info Card */}
        <Card className="p-8 bg-brand text-white border-none shadow-premium rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-xl border border-white/20">
              <Zap className="w-12 h-12 text-white fill-current" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-3xl font-black mb-3 tracking-tight">Hoe verdien ik XP?</h3>
              <p className="text-white/80 font-bold text-lg max-w-2xl">
                Elke vangst, sessie en milestone levert XP op. Hoe zeldzamer de vis of hoe groter de vangst, hoe meer XP je verdient!
              </p>
            </div>
            <Button variant="secondary" className="bg-white text-brand border-none hover:bg-white/90 h-16 px-10 rounded-2xl font-black text-lg shadow-xl">
              Bekijk XP Gids
            </Button>
          </div>
        </Card>
      </div>

      {/* Achievements Modal */}
      <AnimatePresence>
        {isAchievementsOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsAchievementsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl bg-surface rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-border-subtle flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
                    <Award className="w-7 h-7 text-warning" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-text-primary tracking-tight">Mijn Achievements</h2>
                    <p className="text-xs font-black text-text-muted uppercase tracking-widest">12 van de 40 voltooid</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAchievementsOpen(false)}
                  className="w-12 h-12 rounded-2xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-primary transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {/* Badges */}
                <section>
                  <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-6 ml-1">Verdiende Badges</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {[
                      { name: 'Eerste Vangst', icon: '🎣', color: 'bg-blue-50' },
                      { name: 'Nachtvisser', icon: '🌙', color: 'bg-indigo-50' },
                      { name: 'Soortenjager', icon: '🧬', color: 'bg-green-50' },
                      { name: 'PR Breker', icon: '📏', color: 'bg-orange-50' },
                    ].map((badge, i) => (
                      <div key={i} className="flex flex-col items-center gap-3 group">
                        <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl shadow-sm border-2 border-white transition-all group-hover:scale-110 group-hover:rotate-3", badge.color)}>
                          {badge.icon}
                        </div>
                        <span className="text-xs font-black text-text-primary text-center uppercase tracking-widest">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Milestones */}
                <section>
                  <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-6 ml-1">Aankomende Milestones</h3>
                  <div className="space-y-6">
                    {[
                      { name: 'Vang 50 Snoeken', progress: 34, target: 50, icon: <Fish className="text-brand" /> },
                      { name: '10 Verschillende Stekken', progress: 8, target: 10, icon: <MapPin className="text-aqua" /> },
                      { name: 'Nachtsessie Expert', progress: 2, target: 5, icon: <Clock className="text-indigo-500" /> },
                    ].map((m, i) => (
                      <Card key={i} className="p-6 border-none shadow-sm bg-white rounded-2xl flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-surface-soft flex items-center justify-center flex-shrink-0">
                          {m.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-text-primary">{m.name}</h4>
                            <span className="text-xs font-black text-text-muted uppercase">{m.progress} / {m.target}</span>
                          </div>
                          <div className="h-2.5 w-full bg-surface-soft rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(m.progress / m.target) * 100}%` }}
                              className="h-full bg-brand rounded-full"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>

              <div className="p-8 bg-surface-soft/50 border-t border-border-subtle">
                <Button className="w-full h-16 rounded-2xl font-black text-lg shadow-premium-accent" onClick={() => setIsAchievementsOpen(false)}>
                  Sluiten
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}

function PodiumCard({ rank, user, height, color, icon, isLarge }: { rank: number, user?: UserProfile, height: string, color: string, icon: React.ReactNode, isLarge?: boolean }) {
  if (!user) return <div className={cn("rounded-[3rem] bg-surface-soft animate-pulse", height)} />;

  return (
    <div className="flex flex-col items-center group">
      <div className="relative mb-8">
        <div className={cn(
          "rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl transition-all duration-700 group-hover:scale-105 group-hover:rotate-2",
          isLarge ? "w-32 h-32" : "w-24 h-24"
        )}>
          <img 
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
            alt={user.displayName} 
            className="w-full h-full object-cover"
          />
        </div>
        <div className={cn(
          "absolute -bottom-4 -right-4 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white transition-transform duration-500 group-hover:scale-110",
          color
        )}>
          <span className="font-black text-lg text-text-primary">{rank}</span>
        </div>
      </div>
      
      <div className={cn(
        "w-full rounded-t-[3rem] flex flex-col items-center justify-center p-8 space-y-4 shadow-sm transition-all duration-700 group-hover:shadow-xl",
        color,
        height
      )}>
        <div className="p-3 bg-white/60 backdrop-blur-md rounded-2xl shadow-inner transition-transform group-hover:scale-110">
          {icon}
        </div>
        <div className="text-center">
          <p className="font-black text-text-primary text-xl tracking-tight truncate w-full px-2 mb-1">{user.displayName}</p>
          <div className="flex items-center justify-center gap-2 text-brand font-black">
            <Zap className="w-4 h-4 fill-current" />
            <span className="text-lg">{user.xp?.toLocaleString()} XP</span>
          </div>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-2">Level {user.level || 1}</p>
        </div>
      </div>
    </div>
  );
}
