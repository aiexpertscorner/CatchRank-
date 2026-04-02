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
  CheckCircle2,
  Star,
  ShoppingBag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

    // --- MOCK DATA FOR BYPASS ---
    if (profile.uid === 'dev-user-123') {
      setRecentCatches([
        { id: '1', userId: profile.uid, species: 'Snoek', length: 85, weight: 4200, timestamp: { toDate: () => new Date() }, status: 'complete', photoURL: 'https://picsum.photos/seed/pike/800/600' },
        { id: '2', userId: profile.uid, species: 'Baars', length: 32, weight: 600, timestamp: { toDate: () => new Date(Date.now() - 86400000) }, status: 'complete', photoURL: 'https://picsum.photos/seed/perch/800/600' }
      ]);
      setIncompleteCatches([
        { id: '3', userId: profile.uid, species: 'Concept Vangst', timestamp: { toDate: () => new Date() }, status: 'draft', incompleteFields: ['species', 'length'] }
      ]);
      setLoading(false);
      return;
    }
    // ----------------------------

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
      {/* Welcome Banner for New Users */}
      {recentCatches.length === 0 && !activeSession && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-brand/10 border border-brand/20 p-6 md:p-8 rounded-2xl md:rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10 space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Trophy className="w-5 h-5 text-brand" />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand">Activatie Doel</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Log je eerste vangst!</h2>
              <p className="text-sm md:text-base text-text-secondary max-w-md">
                Je bent er bijna! Log je eerste vangst om je statistieken te starten en je eerste badges te verdienen.
              </p>
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button 
                onClick={() => setIsQuickCatchOpen(true)}
                className="h-12 md:h-14 px-8 rounded-xl md:rounded-2xl font-bold shadow-premium-accent"
              >
                Quick Catch Loggen
              </Button>
              <Button 
                variant="secondary"
                onClick={() => setIsSessionModalOpen(true)}
                className="h-12 md:h-14 px-8 rounded-xl md:rounded-2xl font-bold"
              >
                Sessie Starten
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-16 px-2 md:px-0">
        <div className="space-y-2 md:space-y-3">
          <Badge variant="accent" className="px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Dashboard</Badge>
          <h1 className="text-2xl md:text-5xl font-bold text-primary tracking-tight leading-tight">
            Goedenavond, <span className="text-accent">{profile?.displayName}</span>!
          </h1>
          <p className="text-text-secondary text-base md:text-xl font-medium max-w-lg">
            Klaar voor een nieuwe sessie aan de waterkant? Je logboek wacht op je.
          </p>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <Button 
            variant="secondary" 
            icon={<Plus className="w-4 h-4 md:w-5 md:h-5 text-accent" />}
            onClick={() => setIsSessionModalOpen(true)}
            className="flex-1 md:flex-none rounded-xl md:rounded-2xl h-12 md:h-14 px-4 md:px-8 font-bold shadow-sm hover:shadow-md transition-all text-xs md:text-sm"
          >
            Nieuwe Sessie
          </Button>
          <Button 
            icon={<Plus className="w-4 h-4 md:w-5 md:h-5" />}
            onClick={() => setIsQuickCatchOpen(true)}
            className="flex-1 md:flex-none rounded-xl md:rounded-2xl h-12 md:h-14 px-4 md:px-8 font-bold shadow-premium-accent text-xs md:text-sm"
          >
            Nieuwe Vangst
          </Button>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-10 md:mb-16 px-2 md:px-0">
        <StatCard 
          label="Huidig Level"
          value={`Level ${profile?.level}`}
          icon={Zap}
          variant="blue"
          className="rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-premium border-none bg-surface-card"
        />
        <StatCard 
          label="Totaal XP"
          value={profile?.xp.toLocaleString() || 0}
          icon={TrendingUp}
          variant="success"
          trend={{ value: '+120', direction: 'up' }}
          className="rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-premium border-none bg-surface-card"
        />
        <StatCard 
          label="Ranking"
          value="#12"
          icon={Trophy}
          variant="aqua"
          trend={{ value: 'Top 5%', direction: 'up' }}
          className="col-span-2 md:col-span-1 rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-premium border-none bg-surface-card"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 px-2 md:px-0">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-10 md:space-y-16">
          {/* Active Session Card */}
          {activeSession && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card variant="premium" className="bg-surface-card border border-brand/20 p-6 md:p-10 relative overflow-hidden shadow-premium-accent/10 rounded-2xl md:rounded-[2.5rem]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-16 -mt-16" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-brand rounded-full animate-pulse shadow-[0_0_10px_rgba(244,194,13,1)]"></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand">Live Sessie Actief</span>
                    </div>
                    <h3 className="text-2xl md:text-4xl text-text-primary font-bold tracking-tight">{activeSession.location?.name || 'Sessie Bezig'}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand" />
                        <span className="font-bold">
                          {activeSession.startTime ? format(activeSession.startTime.toDate(), 'HH:mm', { locale: nl }) : '--:--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Fish className="w-4 h-4 text-brand" />
                        <span className="font-bold">{activeSession.catchIds?.length || 0} vangsten</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1 md:flex-none h-12 px-6 rounded-xl font-bold"
                      onClick={() => setIsQuickCatchOpen(true)}
                    >
                      Vangst Loggen
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="flex-1 md:flex-none h-12 px-6 rounded-xl font-bold"
                      onClick={handleEndSession}
                    >
                      Stop
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Tasks / Incomplete Logs */}
          {incompleteCatches.length > 0 && (
            <section className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Takenlijst <span className="text-warning">({incompleteCatches.length})</span>
                  </h3>
                </div>
                <Button variant="ghost" size="sm" className="text-warning font-black text-[10px] uppercase tracking-widest">Afronden</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incompleteCatches.map((c) => (
                  <Card 
                    key={c.id} 
                    padding="none" 
                    hoverable 
                    variant="premium"
                    className="border border-border-subtle bg-surface-card hover:border-warning/30 transition-all duration-500 rounded-2xl relative overflow-hidden group"
                    onClick={() => openEditCatch(c)}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="w-16 h-16 bg-surface-soft rounded-xl overflow-hidden flex-shrink-0 border border-border-subtle relative">
                        {c.photoURL ? (
                          <img src={c.photoURL} alt="Draft" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Fish className="text-warning/30 w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-warning/10" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-warning uppercase tracking-widest mb-1">Concept Vangst</p>
                        <p className="text-base font-bold text-text-primary truncate mb-1">
                          {c.timestamp ? format(c.timestamp.toDate(), 'd MMM HH:mm', { locale: nl }) : 'Zojuist'}
                        </p>
                        <Badge variant="warning" className="text-[7px] py-0.5 px-1.5 font-black uppercase tracking-widest">
                          {c.incompleteFields?.length} velden missen
                        </Badge>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-warning transition-colors" />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* XP Progress Section */}
          <Card variant="premium" className="p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-border-subtle bg-surface-card shadow-premium">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">XP Voortgang</h3>
                <p className="text-xs text-text-secondary">Nog 350 XP tot Level 12</p>
              </div>
              <Badge variant="accent" className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Level {profile?.level}</Badge>
            </div>
            <ProgressBar 
              value={65} 
              className="mb-8 h-2.5 rounded-full bg-surface-soft"
            />
            <div className="grid grid-cols-4 gap-4 pt-6 border-t border-border-subtle">
              <div className="text-center space-y-1">
                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Vangsten</p>
                <p className="text-lg font-bold text-text-primary">42</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Sessies</p>
                <p className="text-lg font-bold text-text-primary">18</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Soorten</p>
                <p className="text-lg font-bold text-text-primary">7</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">PR's</p>
                <p className="text-lg font-bold text-text-primary">3</p>
              </div>
            </div>
          </Card>

          {/* Recent Catches */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Laatste Vangsten</h2>
              <Button variant="ghost" size="sm" className="text-brand font-black text-[10px] uppercase tracking-widest">Alles</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentCatches.length > 0 ? (
                recentCatches.map((c) => (
                  <Card 
                    key={c.id} 
                    padding="none" 
                    hoverable 
                    variant="premium" 
                    className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all duration-500 rounded-2xl overflow-hidden" 
                    onClick={() => openEditCatch(c)}
                  >
                    <div className="relative h-40 overflow-hidden">
                      {c.photoURL ? (
                        <img src={c.photoURL} alt={c.species} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-soft">
                          <Fish className="text-text-muted/20 w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge variant="accent" className="bg-brand text-bg-main border-none font-black">+25 XP</Badge>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-main to-transparent">
                        <h4 className="text-lg font-bold text-text-primary tracking-tight">{c.species}</h4>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                        {c.weight && <span>{c.weight}g</span>}
                        {c.length && <span>{c.length}cm</span>}
                        <span className="text-text-muted">{c.timestamp ? format(c.timestamp.toDate(), 'd MMM', { locale: nl }) : 'Zojuist'}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-brand transition-colors" />
                    </div>
                  </Card>
                ))
              ) : (
                <Card variant="premium" className="col-span-full p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl">
                  <Fish className="w-12 h-12 text-brand/20 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-text-primary">Geen vangsten</h3>
                  <Button className="mt-4" onClick={() => setIsQuickCatchOpen(true)}>Eerste Vangst Loggen</Button>
                </Card>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-4 space-y-10 md:space-y-12">
          {/* Weather & Conditions */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">Omstandigheden</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-brand text-[10px] font-black uppercase tracking-widest"
                onClick={() => setIsEditingLocation(!isEditingLocation)}
              >
                {isEditingLocation ? 'Sluiten' : 'Wijzig'}
              </Button>
            </div>
            
            {isEditingLocation && (
              <form onSubmit={handleLocationSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="flex-1 bg-surface-soft border border-border-subtle rounded-xl px-4 py-2 text-xs font-bold text-text-primary focus:border-brand focus:outline-none"
                  placeholder="Stad..."
                  autoFocus
                />
                <Button type="submit" size="sm" className="rounded-xl">OK</Button>
              </form>
            )}

            <Card className="bg-surface-card border border-border-subtle p-6 space-y-6 shadow-premium rounded-2xl md:rounded-[2rem] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-brand">Huidige Locatie</p>
                  <p className="text-xl font-bold tracking-tight text-text-primary">{weather?.location?.name || weatherLocation}</p>
                </div>
                <div className="w-12 h-12 bg-surface-soft rounded-xl flex items-center justify-center border border-border-subtle">
                  {weather?.current?.condition?.icon ? (
                    <img src={weather.current.condition.icon} alt="Weather" className="w-8 h-8" />
                  ) : (
                    <Waves className="w-6 h-6 text-brand" />
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Thermometer className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Temp</span>
                  </div>
                  <p className="text-xl font-bold tracking-tight text-text-primary">{weather?.current?.temp_c ? `${Math.round(weather.current.temp_c)}°C` : '--°C'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Wind className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Wind</span>
                  </div>
                  <p className="text-xl font-bold tracking-tight text-text-primary">{weather?.current?.wind_kph ? `${Math.round(weather.current.wind_kph)} km/u` : '--'}</p>
                </div>
              </div>

              {weather?.forecast?.forecastday && (
                <div className="pt-6 border-t border-border-subtle space-y-4">
                  {weather.forecast.forecastday.map((day: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs font-bold">
                      <span className="w-16 text-text-secondary">{i === 0 ? 'Vandaag' : format(new Date(day.date), 'EEE', { locale: nl })}</span>
                      <img src={day.day.condition.icon} alt="icon" className="w-6 h-6" />
                      <span className="w-16 text-right font-black text-brand">{Math.round(day.day.maxtemp_c)}° <span className="text-text-dim">/ {Math.round(day.day.mintemp_c)}°</span></span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          {/* Mijn Gear Mini */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">Mijn Gear</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-brand text-[10px] font-black uppercase tracking-widest"
                onClick={() => navigate('/gear')}
              >
                Beheer
              </Button>
            </div>
            <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl shadow-premium space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Sustain FJ', brand: 'Shimano', img: 'https://picsum.photos/seed/reel/200/200' },
                  { name: 'Zodias 7\'0"', brand: 'Shimano', img: 'https://picsum.photos/seed/rod/200/200' }
                ].map((item, i) => (
                  <div key={i} className="group cursor-pointer" onClick={() => navigate('/gear')}>
                    <div className="aspect-square rounded-xl bg-surface-soft overflow-hidden mb-2 relative border border-border-subtle">
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute top-1.5 right-1.5">
                        <div className="w-5 h-5 rounded-lg bg-brand text-bg-main flex items-center justify-center shadow-lg">
                          <Star className="w-2.5 h-2.5 fill-current" />
                        </div>
                      </div>
                    </div>
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest truncate">{item.brand}</p>
                    <p className="text-xs font-bold text-text-primary truncate tracking-tight">{item.name}</p>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="w-full h-10 font-bold text-[10px] uppercase tracking-widest" onClick={() => navigate('/gear')}>
                Alle Gear
              </Button>
            </Card>
          </section>

          {/* Top Rankings Mini */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">Top Vissers</h3>
              <Button variant="ghost" size="sm" className="text-brand font-black text-[10px] uppercase tracking-widest">Alles</Button>
            </div>
            <Card padding="none" variant="premium" className="divide-y divide-border-subtle border border-border-subtle bg-surface-card shadow-premium rounded-2xl overflow-hidden">
              <RankingCard rank={1} name="Sander V." xp={12450} className="p-4 hover:bg-surface-soft transition-colors" />
              <RankingCard rank={2} name="Lisa de B." xp={10200} className="p-4 hover:bg-surface-soft transition-colors" />
              <RankingCard rank={3} name="Marco K." xp={9850} className="p-4 hover:bg-surface-soft transition-colors" />
              <RankingCard rank={12} name={profile?.displayName || 'Jij'} xp={profile?.xp || 0} isCurrentUser className="p-4 bg-brand/5" />
            </Card>
          </section>

          {/* Favorite Spots */}
          <section className="space-y-4">
            <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">Favoriete Stekken</h3>
            <div className="space-y-3">
              <Card padding="none" hoverable variant="premium" className="p-4 flex items-center gap-4 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group overflow-hidden">
                <div className="w-12 h-12 bg-surface-soft text-brand rounded-xl flex items-center justify-center border border-border-subtle group-hover:scale-110 transition-transform duration-500 shadow-sm">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-text-primary truncate tracking-tight">De Kromme Mijdrecht</p>
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Kanaal • 12 vangsten</p>
                </div>
                <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-brand transition-colors" />
              </Card>
              <Card padding="none" hoverable variant="premium" className="p-4 flex items-center gap-4 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group overflow-hidden">
                <div className="w-12 h-12 bg-surface-soft text-brand rounded-xl flex items-center justify-center border border-border-subtle group-hover:scale-110 transition-transform duration-500 shadow-sm">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-text-primary truncate tracking-tight">Sloterplas Noord</p>
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Plas • 8 vangsten</p>
                </div>
                <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-brand transition-colors" />
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
