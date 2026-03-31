import React, { useEffect, useState } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  MapPin, 
  Plus, 
  ChevronRight,
  Zap,
  Clock,
  Fish,
  Waves,
  Wind,
  Thermometer,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Catch, Session } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Button, Card, Badge, ProgressBar } from '../components/ui/Base';
import { StatCard, RankingCard } from '../components/ui/Data';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { PageLayout } from '../components/layout/PageLayout';
import { fetchWeather } from '../services/weatherService';
import { QuickCatchModal } from '../components/QuickCatchModal';
import { CatchForm } from '../components/CatchForm';
import { SessionModal } from '../components/SessionModal';
import { toast } from 'sonner';
import { loggingService } from '../services/loggingService';

export default function Dashboard() {
  const { profile } = useAuth();
  const [recentCatches, setRecentCatches] = useState<Catch[]>([]);
  const [incompleteCatches, setIncompleteCatches] = useState<Catch[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);
  const [isCatchFormOpen, setIsCatchFormOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<Catch | null>(null);

  useEffect(() => {
    if (!profile) return;

    const catchesQuery = query(
      collection(db, 'catches'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribeCatches = onSnapshot(catchesQuery, (snapshot) => {
      const allCatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Catch));
      setRecentCatches(allCatches.filter(c => c.status === 'complete').slice(0, 5));
      setIncompleteCatches(allCatches.filter(c => c.status === 'draft'));
      setLoading(false);
    });

    const sessionQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', profile.uid),
      where('isActive', '==', true),
      limit(1)
    );

    const unsubscribeSession = onSnapshot(sessionQuery, (snapshot) => {
      if (!snapshot.empty) {
        setActiveSession({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Session);
      } else {
        setActiveSession(null);
      }
    });

    return () => {
      unsubscribeCatches();
      unsubscribeSession();
    };
  }, [profile]);

  const handleEndSession = async () => {
    if (!activeSession?.id) return;
    try {
      await loggingService.endSession(activeSession.id);
      toast.success('Sessie beëindigd!', {
        description: 'Je statistieken zijn bijgewerkt.'
      });
    } catch (error) {
      console.error('End session error:', error);
      toast.error('Fout bij beëindigen sessie.');
    }
  };

  const openEditCatch = (c: Catch) => {
    setEditingCatch(c);
    setIsCatchFormOpen(true);
  };

  const [weather, setWeather] = useState<any>(null);
  const [weatherLocation, setWeatherLocation] = useState(localStorage.getItem('weatherLocation') || 'Amsterdam');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState(weatherLocation);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const data = await fetchWeather(weatherLocation);
        setWeather(data);
      } catch (error) {
        console.error('Weather fetch error:', error);
      }
    };
    loadWeather();
  }, [weatherLocation]);

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWeatherLocation(newLocation);
    localStorage.setItem('weatherLocation', newLocation);
    setIsEditingLocation(false);
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <PageLayout>
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div className="space-y-3">
          <Badge variant="accent" className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Dashboard</Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-primary tracking-tight leading-tight">
            Goedenavond, <span className="text-accent">{profile?.displayName}</span>!
          </h1>
          <p className="text-text-secondary text-xl font-medium max-w-lg">
            Klaar voor een nieuwe sessie aan de waterkant? Je logboek wacht op je.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="secondary" 
            icon={<Plus className="w-5 h-5 text-accent" />}
            onClick={() => setIsSessionModalOpen(true)}
            className="rounded-2xl h-14 px-8 font-bold shadow-sm hover:shadow-md transition-all"
          >
            Nieuwe Sessie
          </Button>
          <Button 
            icon={<Plus className="w-5 h-5" />}
            onClick={() => setIsQuickCatchOpen(true)}
            className="rounded-2xl h-14 px-8 font-bold shadow-premium-accent"
          >
            Nieuwe Vangst
          </Button>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <StatCard 
          label="Huidig Level"
          value={`Level ${profile?.level}`}
          icon={Zap}
          variant="blue"
          className="rounded-[2.5rem] p-8 shadow-sm border-none bg-gradient-to-br from-blue-50 to-white"
        />
        <StatCard 
          label="Totaal XP"
          value={profile?.xp.toLocaleString() || 0}
          icon={TrendingUp}
          variant="success"
          trend={{ value: '+120 p/w', direction: 'up' }}
          className="rounded-[2.5rem] p-8 shadow-sm border-none bg-gradient-to-br from-green-50 to-white"
        />
        <StatCard 
          label="Ranking"
          value="#12"
          icon={Trophy}
          variant="aqua"
          trend={{ value: 'Top 5%', direction: 'up' }}
          className="rounded-[2.5rem] p-8 shadow-sm border-none bg-gradient-to-br from-aqua-soft/30 to-white"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-16">
          {/* Active Session Card */}
          {activeSession && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card variant="premium" className="bg-primary text-white border-none p-12 relative overflow-hidden shadow-premium-accent/20 rounded-[3rem]">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-accent rounded-full animate-pulse shadow-[0_0_15px_rgba(197,160,89,1)]"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Live Sessie Actief</span>
                    </div>
                    <h3 className="text-5xl text-white font-bold tracking-tight">{activeSession.location?.name || 'Sessie Bezig'}</h3>
                    <div className="flex flex-wrap items-center gap-10 text-sm text-white/70">
                      <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-accent" />
                        <span className="font-bold">
                          {activeSession.startTime ? format(activeSession.startTime.toDate(), 'HH:mm', { locale: nl }) : '--:--'} gestart
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Fish className="w-6 h-6 text-accent" />
                        <span className="font-bold">{activeSession.catchIds?.length || 0} vangsten</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-6 h-6 text-accent" />
                        <span className="font-bold truncate max-w-[150px]">{activeSession.location?.name || 'Onbekend'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      className="bg-accent text-white hover:bg-accent-hover border-none h-16 px-10 rounded-2xl text-lg font-bold shadow-xl shadow-accent/20 transition-all hover:-translate-y-1"
                      onClick={() => setIsQuickCatchOpen(true)}
                    >
                      Vangst Loggen
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-white border-2 border-white/20 hover:bg-white/10 h-16 px-10 rounded-2xl text-lg font-bold transition-all"
                      onClick={handleEndSession}
                    >
                      Beëindigen
                    </Button>
                  </div>
                </div>
                <Fish className="absolute -right-20 -bottom-20 w-96 h-96 opacity-[0.05] rotate-12 pointer-events-none" />
              </Card>
            </motion.div>
          )}

          {/* Tasks / Incomplete Logs */}
          {incompleteCatches.length > 0 && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-warning/10 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-warning" />
                  </div>
                  Nog afronden <span className="text-warning">({incompleteCatches.length})</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {incompleteCatches.map((c) => (
                  <Card 
                    key={c.id} 
                    padding="none" 
                    hoverable 
                    variant="premium"
                    className="border-none bg-warning/5 shadow-sm hover:shadow-md transition-all rounded-[2rem]"
                    onClick={() => openEditCatch(c)}
                  >
                    <div className="flex items-center gap-5 p-5">
                      <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden flex-shrink-0 border border-warning/20 shadow-inner">
                        {c.photoURL ? (
                          <img src={c.photoURL} alt="Draft" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-warning/5 to-white">
                            <Fish className="text-warning/30 w-10 h-10" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-warning uppercase tracking-[0.2em] mb-1.5">Concept Vangst</p>
                        <p className="text-lg font-bold text-primary truncate mb-1">{c.timestamp ? format(c.timestamp.toDate(), 'd MMM HH:mm', { locale: nl }) : 'Zojuist'}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="warning" className="text-[8px] py-0.5 px-2 font-black uppercase tracking-widest">Incompleet</Badge>
                          <span className="text-[10px] text-text-muted font-bold">{c.incompleteFields?.length} velden te gaan</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <ChevronRight className="w-5 h-5 text-warning" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* XP Progress Section */}
          <Card variant="premium" className="p-10 rounded-[2.5rem] border-none shadow-sm bg-gradient-to-br from-white to-surface-soft/30">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-primary tracking-tight">XP Voortgang</h3>
                <p className="text-sm text-text-secondary font-medium">Je bent bijna bij het volgende level!</p>
              </div>
              <div className="flex flex-col items-end">
                <Badge variant="accent" className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm">Level {profile?.level}</Badge>
              </div>
            </div>
            <ProgressBar 
              value={65} 
              label="Nog 350 XP tot Level 12" 
              subLabel="65%" 
              className="mb-10 h-4 rounded-full bg-surface-soft"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-10 border-t border-border-subtle">
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Vangsten</p>
                <p className="text-2xl font-bold text-primary">42</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Sessies</p>
                <p className="text-2xl font-bold text-primary">18</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Soorten</p>
                <p className="text-2xl font-bold text-primary">7</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">PR's</p>
                <p className="text-2xl font-bold text-primary">3</p>
              </div>
            </div>
          </Card>

          {/* Recent Catches */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-primary tracking-tight">Laatste Vangsten</h2>
              <Button variant="ghost" size="sm" className="text-accent font-black text-[10px] uppercase tracking-[0.2em] hover:bg-accent/5">Alle bekijken</Button>
            </div>
            <div className="space-y-5">
              {recentCatches.length > 0 ? (
                recentCatches.map((c) => (
                  <Card key={c.id} padding="none" hoverable variant="premium" className="group border-none shadow-sm hover:shadow-premium transition-all duration-500 rounded-[2rem] overflow-hidden" onClick={() => openEditCatch(c)}>
                    <div className="flex items-center gap-6 p-5">
                      <div className="w-24 h-24 bg-surface-soft rounded-2xl overflow-hidden flex-shrink-0 border border-border-subtle shadow-inner">
                        {c.photoURL ? (
                          <img src={c.photoURL} alt={c.species} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-soft to-white">
                            <Fish className="text-text-muted/20 w-12 h-12" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-xl font-bold text-primary truncate tracking-tight">{c.species}</h4>
                          {c.status === 'draft' && <Badge variant="warning" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">Concept</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-text-secondary font-bold">
                          {c.weight && <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-accent" />{c.weight}g</span>}
                          {c.length && <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-accent" />{c.length}cm</span>}
                          <span className="text-text-muted flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-border-subtle" />{c.timestamp ? format(c.timestamp.toDate(), 'd MMM HH:mm', { locale: nl }) : 'Zojuist'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="hidden md:flex flex-col items-end mr-2">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">XP Verdiend</span>
                          <span className="text-xl font-bold text-accent">+25</span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-surface-soft flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all duration-500 group-hover:shadow-lg group-hover:shadow-accent/20 group-hover:-translate-x-1">
                          <ChevronRight className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Card variant="premium" className="p-20 text-center border-dashed border-2 border-border-subtle bg-surface-soft/20 rounded-[3rem]">
                  <div className="w-24 h-24 bg-white rounded-[2rem] shadow-premium flex items-center justify-center mx-auto mb-8">
                    <Fish className="w-12 h-12 text-accent/30" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-primary tracking-tight">Nog geen vangsten gelogd</h3>
                  <p className="text-text-secondary mb-10 max-w-xs mx-auto text-lg leading-relaxed">Begin met het loggen van je eerste vangst om XP te verdienen en je statistieken op te bouwen.</p>
                  <Button className="h-16 px-10 text-xl rounded-2xl shadow-premium-accent" icon={<Plus className="w-6 h-6" />} onClick={() => setIsQuickCatchOpen(true)}>Eerste Vangst Loggen</Button>
                </Card>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-4 space-y-12">
          {/* Weather & Conditions */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-primary tracking-tight">Omstandigheden</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-accent text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent/5"
                onClick={() => setIsEditingLocation(!isEditingLocation)}
              >
                {isEditingLocation ? 'Annuleren' : 'Wijzig'}
              </Button>
            </div>
            
            {isEditingLocation && (
              <form onSubmit={handleLocationSubmit} className="mb-6 flex gap-3">
                <input 
                  type="text" 
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="flex-1 bg-white border border-border-subtle rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:border-accent transition-all"
                  placeholder="Stad of regio..."
                  autoFocus
                />
                <Button type="submit" size="sm" className="rounded-xl px-5 font-bold">OK</Button>
              </form>
            )}

            <Card className="bg-primary text-white border-none p-10 space-y-10 shadow-premium-accent/10 rounded-[2.5rem] relative overflow-hidden">
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Huidige Locatie</p>
                  <p className="text-2xl font-bold tracking-tight">{weather?.location?.name || weatherLocation}</p>
                </div>
                <div className="w-16 h-16 bg-white/10 rounded-[1.25rem] flex items-center justify-center backdrop-blur-md border border-white/10">
                  {weather?.current?.condition?.icon ? (
                    <img src={weather.current.condition.icon} alt="Weather" className="w-12 h-12" />
                  ) : (
                    <Waves className="w-8 h-8 text-accent/60" />
                  )}
                </div>
              </div>
              
              <div className="relative z-10 grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/50">
                    <Thermometer className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Temperatuur</span>
                  </div>
                  <p className="text-3xl font-bold tracking-tight">{weather?.current?.temp_c ? `${Math.round(weather.current.temp_c)}°C` : '--°C'}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/50">
                    <Wind className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Windkracht</span>
                  </div>
                  <p className="text-3xl font-bold tracking-tight">{weather?.current?.wind_kph ? `${Math.round(weather.current.wind_kph)} km/u` : '--'}</p>
                </div>
              </div>

              {weather?.forecast?.forecastday && (
                <div className="relative z-10 pt-8 border-t border-white/10">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-6">
                    <span>Voorspelling</span>
                    <span className="opacity-50">3 Dagen</span>
                  </div>
                  <div className="space-y-5">
                    {weather.forecast.forecastday.map((day: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm font-bold">
                        <span className="w-16 text-white/70">{i === 0 ? 'Vandaag' : format(new Date(day.date), 'EEE', { locale: nl })}</span>
                        <div className="flex-1 flex justify-center">
                          <img src={day.day.condition.icon} alt="icon" className="w-8 h-8" />
                        </div>
                        <span className="w-16 text-right font-black tracking-tighter text-accent">{Math.round(day.day.maxtemp_c)}° <span className="text-white/30 text-xs">/ {Math.round(day.day.mintemp_c)}°</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative z-10 pt-8 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold leading-relaxed text-white/90">
                      {weather?.current?.condition?.text || 'Laden...'}
                      {weather?.current?.pressure_mb && <span className="block text-[10px] text-accent mt-1 uppercase tracking-widest font-black">Luchtdruk: {weather.current.pressure_mb} mb</span>}
                    </p>
                  </div>
                </div>
              </div>
              <Waves className="absolute -left-20 -bottom-20 w-80 h-80 opacity-[0.03] rotate-45 pointer-events-none" />
            </Card>
          </section>

          {/* Top Rankings Mini */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-primary tracking-tight">Top Vissers</h3>
              <Button variant="ghost" size="sm" className="text-accent font-black text-[10px] uppercase tracking-[0.2em] hover:bg-accent/5">Bekijk alles</Button>
            </div>
            <Card padding="none" variant="premium" className="divide-y divide-border-subtle border-none shadow-sm rounded-[2.5rem] overflow-hidden">
              <RankingCard rank={1} name="Sander V." xp={12450} className="p-6 hover:bg-surface-soft/50 transition-colors" />
              <RankingCard rank={2} name="Lisa de B." xp={10200} className="p-6 hover:bg-surface-soft/50 transition-colors" />
              <RankingCard rank={3} name="Marco K." xp={9850} className="p-6 hover:bg-surface-soft/50 transition-colors" />
              <RankingCard rank={12} name={profile?.displayName || 'Jij'} xp={profile?.xp || 0} isCurrentUser className="p-6 bg-accent/5" />
            </Card>
          </section>

          {/* Favorite Spots */}
          <section className="space-y-6">
            <h3 className="text-2xl font-bold text-primary tracking-tight">Favoriete Stekken</h3>
            <div className="space-y-4">
              <Card padding="none" hoverable variant="premium" className="p-5 flex items-center gap-5 border-none shadow-sm hover:shadow-md transition-all rounded-2xl group overflow-hidden">
                <div className="w-14 h-14 bg-water-soft text-water rounded-2xl flex items-center justify-center border border-water/10 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                  <MapPin className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-primary truncate tracking-tight">De Kromme Mijdrecht</p>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Kanaal • 12 vangsten</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all duration-500">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Card>
              <Card padding="none" hoverable variant="premium" className="p-5 flex items-center gap-5 border-none shadow-sm hover:shadow-md transition-all rounded-2xl group overflow-hidden">
                <div className="w-14 h-14 bg-water-soft text-water rounded-2xl flex items-center justify-center border border-water/10 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                  <MapPin className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-primary truncate tracking-tight">Sloterplas Noord</p>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Plas • 8 vangsten</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all duration-500">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Card>
            </div>
          </section>
        </div>
      </div>

      {/* Logging Modals */}
      <AnimatePresence>
        {isQuickCatchOpen && (
          <QuickCatchModal 
            isOpen={isQuickCatchOpen} 
            onClose={() => setIsQuickCatchOpen(false)} 
            activeSessionId={activeSession?.id}
          />
        )}
        {isCatchFormOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsCatchFormOpen(false)}
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
                onComplete={() => {
                  setIsCatchFormOpen(false);
                  setEditingCatch(null);
                }}
                onCancel={() => {
                  setIsCatchFormOpen(false);
                  setEditingCatch(null);
                }}
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
