import React, { useEffect, useMemo, useState } from 'react';
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
  Star,
  ShoppingBag,
  History,
  Cloud,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../App';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch, Session, Spot, GearItem } from '../../../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Button, Card, Badge } from '../../../components/ui/Base';
import { RankingCard } from '../../../components/ui/Data';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';
import { PageLayout } from '../../../components/layout/PageLayout';
import { weatherService } from '../../weather/services/weatherService';
import { QuickCatchModal } from '../../../components/QuickCatchModal';
import { CatchForm } from '../../../components/CatchForm';
import { SessionModal } from '../../../components/SessionModal';
import { statsService, UserStats } from '../../../services/statsService';
import { useSession } from '../../../contexts/SessionContext';
import { LevelBadge } from '../../../components/xp/LevelBadge';
import { XpProgressBar } from '../../../components/xp/XpProgressBar';
import { gearService } from '../../gear/services/gearService';

/**
 * Dashboard Screen — v3
 * - Weather defaults to browser geolocation when allowed
 * - Falls back to Utrecht when denied / unavailable
 * - Hero starts with username, level, XP and main stats
 * - Primary action row under hero: Vangst / Sessie / Stek
 */

const COLLECTIONS = {
  CATCHES: 'catches_v2',
  SPOTS: 'spots_v2',
} as const;

const DEFAULT_LOCATION = 'Utrecht';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getCatchSpecies = (c: Partial<Catch>) =>
  (c as any).speciesSpecific ||
  (c as any).speciesGeneral ||
  c.species ||
  'Onbekend';

const getCatchImage = (c: Partial<Catch>) =>
  (c as any).mainImage ||
  c.photoURL ||
  '';

const getCatchTimestamp = (c: Partial<Catch>) =>
  (c as any).timestamp || (c as any).catchTime || null;

const getSessionName = (s: Partial<Session> | null | undefined) =>
  (s as any)?.name || (s as any)?.title || 'Sessie Bezig';

const getSessionStart = (s: Partial<Session> | null | undefined) =>
  (s as any)?.startTime || (s as any)?.startedAt || null;

const getSessionCatchCount = (s: Partial<Session> | null | undefined) =>
  (s as any)?.stats?.totalCatches ||
  (s as any)?.statsSummary?.totalCatches ||
  (s as any)?.linkedCatchIds?.length ||
  0;

const getSpotName = (s: Partial<Spot>) =>
  (s as any)?.title || s.name || 'Onbekende stek';

const getSpotWaterType = (s: Partial<Spot>) =>
  (s as any)?.waterType || (s as any)?.water_type || 'Water';

const getSpotCatchCount = (s: Partial<Spot>) =>
  (s as any)?.statsSummary?.totalCatches ||
  s.stats?.totalCatches ||
  0;

const getGearImage = (g: Partial<GearItem>) =>
  (g as any)?.photoURL || '';

const getProgressText = (xp: number) => {
  const levelThresholds = [
    0, 150, 400, 800, 1400, 2200, 3200, 4500, 6000, 8000, 10500, 13500, 17000,
    21500, 27000, 34000, 43000, 54000, 68000, 85000,
  ];

  const foundLevel =
    levelThresholds.findIndex(
      (v, i) => xp >= v && xp < (levelThresholds[i + 1] ?? Infinity)
    ) + 1;

  const currentLevel = Math.min(
    foundLevel > 0 ? foundLevel : levelThresholds.length,
    levelThresholds.length
  );

  const nextXp = levelThresholds[currentLevel] ?? xp;
  const xpToNext = Math.max(0, nextXp - xp);

  return currentLevel >= levelThresholds.length
    ? 'Max level bereikt'
    : `Nog ${xpToNext.toLocaleString()} XP tot Level ${currentLevel + 1}`;
};

const getBrowserPosition = (): Promise<{ lat: number; lon: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 1000 * 60 * 10,
      }
    );
  });
};

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { activeSession, endActiveSession } = useSession();

  const [recentCatches, setRecentCatches] = useState<Catch[]>([]);
  const [incompleteCatches, setIncompleteCatches] = useState<Catch[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [favoriteSpots, setFavoriteSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);
  const [isCatchFormOpen, setIsCatchFormOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<Catch | null>(null);

  // Weather state
  const savedLocation = localStorage.getItem('weatherLocation') || DEFAULT_LOCATION;
  const [weather, setWeather] = useState<any>(null);
  const [weatherLocation, setWeatherLocation] = useState(savedLocation);
  const [newLocation, setNewLocation] = useState(savedLocation);
  const [weatherCoords, setWeatherCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationResolved, setLocationResolved] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;

    setLoading(true);

    const catchesQuery = query(
      collection(db, COLLECTIONS.CATCHES),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(12)
    );

    const unsubscribeCatches = onSnapshot(
      catchesQuery,
      (snapshot) => {
        const allCatches = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Catch)
        );

        setRecentCatches(
          allCatches.filter((c) => c.status === 'complete').slice(0, 5)
        );
        setIncompleteCatches(allCatches.filter((c) => c.status === 'draft'));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching catches:', error);
        setLoading(false);
      }
    );

    const loadSecondaryData = async () => {
      try {
        const [userStats, gear] = await Promise.all([
          statsService.calculateUserStats(profile.uid),
          gearService.getUserGear(profile.uid),
        ]);

        setStats(userStats);

        const sortedGear = [...gear].sort((a, b) => {
          const aScore = (a.isFavorite ? 1000 : 0) + (a.usageCount || 0);
          const bScore = (b.isFavorite ? 1000 : 0) + (b.usageCount || 0);
          return bScore - aScore;
        });
        setGearItems(sortedGear.slice(0, 2));

        const spotsQuery = query(
          collection(db, COLLECTIONS.SPOTS),
          where('userId', '==', profile.uid),
          limit(8)
        );
        const spotsSnap = await getDocs(spotsQuery);
        const spots = spotsSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Spot)
        );

        const sortedSpots = [...spots].sort((a, b) => {
          const aScore = ((a as any).isFavorite ? 1000 : 0) + getSpotCatchCount(a);
          const bScore = ((b as any).isFavorite ? 1000 : 0) + getSpotCatchCount(b);
          return bScore - aScore;
        });

        setFavoriteSpots(sortedSpots.slice(0, 2));
      } catch (error) {
        console.error('Error loading dashboard secondary data:', error);
      }
    };

    loadSecondaryData();

    return () => {
      unsubscribeCatches();
    };
  }, [profile?.uid]);

  useEffect(() => {
    let cancelled = false;

    const resolveInitialLocation = async () => {
      const manuallySavedLocation = localStorage.getItem('weatherLocation');

      if (manuallySavedLocation) {
        if (!cancelled) {
          setWeatherLocation(manuallySavedLocation);
          setNewLocation(manuallySavedLocation);
          setLocationResolved(true);
        }
        return;
      }

      try {
        const coords = await getBrowserPosition();

        if (!cancelled) {
          setWeatherCoords(coords);
          setLocationResolved(true);
        }
      } catch (error) {
        console.warn('Locatie niet beschikbaar, fallback naar Utrecht:', error);

        if (!cancelled) {
          setWeatherLocation(DEFAULT_LOCATION);
          setNewLocation(DEFAULT_LOCATION);
          setLocationResolved(true);
        }
      }
    };

    resolveInitialLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!locationResolved) return;

    const loadWeather = async () => {
      try {
        let data;

        if (weatherCoords) {
          data = await weatherService.fetchWeather(
            `${weatherCoords.lat},${weatherCoords.lon}`
          );
        } else {
          data = await weatherService.fetchWeather(
            weatherLocation || DEFAULT_LOCATION
          );
        }

        setWeather(data);
      } catch (error) {
        console.error('Weather fetch error:', error);

        if (weatherLocation !== DEFAULT_LOCATION) {
          try {
            const fallbackData = await weatherService.fetchWeather(DEFAULT_LOCATION);
            setWeather(fallbackData);
            setWeatherLocation(DEFAULT_LOCATION);
          } catch (fallbackError) {
            console.error('Fallback weather fetch error:', fallbackError);
          }
        }
      }
    };

    loadWeather();
  }, [weatherLocation, weatherCoords, locationResolved]);

  const handleEndSession = async () => {
    if (!activeSession?.id) return;

    try {
      await endActiveSession();
    } catch (error) {
      console.error('End session error:', error);
    }
  };

  const openEditCatch = (c: Catch) => {
    setEditingCatch(c);
    setIsCatchFormOpen(true);
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextLocation = newLocation.trim() || DEFAULT_LOCATION;
    setWeatherCoords(null);
    setWeatherLocation(nextLocation);
    setNewLocation(nextLocation);
    localStorage.setItem('weatherLocation', nextLocation);
    setIsEditingLocation(false);
  };

  const progressSubtitle = useMemo(
    () => getProgressText(profile?.xp || 0),
    [profile?.xp]
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <PageLayout>
      {/* Dashboard Hero */}
      <section className="mb-8 md:mb-10">
        <Card className="relative overflow-hidden rounded-3xl md:rounded-[2.5rem] border border-brand/20 bg-surface-card p-5 md:p-8 shadow-premium">
          <div className="absolute top-0 right-0 w-72 h-72 bg-brand/10 blur-3xl -mr-24 -mt-24 pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="space-y-2">
                <Badge
                  variant="accent"
                  className="px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  Dashboard
                </Badge>

                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-primary tracking-tight leading-tight">
                    Goedenavond,
                  </h1>
                  <h2 className="text-2xl md:text-4xl font-bold text-accent tracking-tight leading-tight">
                    {profile?.displayName || 'Visser'}!
                  </h2>
                </div>

                <p className="text-sm md:text-base text-text-secondary max-w-xl">
                  Bekijk je level, XP en voortgang in één oogopslag.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                    Huidig Level
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-text-primary">
                    {profile?.level || 1}
                  </p>
                </div>
                <LevelBadge level={profile?.level || 1} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="rounded-2xl bg-surface-soft border border-border-subtle p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                  XP
                </p>
                <p className="text-xl md:text-2xl font-bold text-text-primary mt-1">
                  {(profile?.xp || 0).toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl bg-surface-soft border border-border-subtle p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                  Vangsten
                </p>
                <p className="text-xl md:text-2xl font-bold text-text-primary mt-1">
                  {stats?.totalCatches || 0}
                </p>
              </div>

              <div className="rounded-2xl bg-surface-soft border border-border-subtle p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                  Sessies
                </p>
                <p className="text-xl md:text-2xl font-bold text-text-primary mt-1">
                  {stats?.totalSessions || 0}
                </p>
              </div>

              <div className="rounded-2xl bg-surface-soft border border-border-subtle p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                  Soorten
                </p>
                <p className="text-xl md:text-2xl font-bold text-text-primary mt-1">
                  {stats?.speciesCount || 0}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <XpProgressBar xp={profile?.xp || 0} compact />
              <p className="text-xs text-text-secondary">{progressSubtitle}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Primary Actions */}
      <section className="mb-8 md:mb-12">
        <div className="grid grid-cols-3 gap-3">
          <Button
            onClick={() => setIsQuickCatchOpen(true)}
            className="h-12 md:h-14 rounded-2xl font-bold"
          >
            Log Vangst
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsSessionModalOpen(true)}
            className="h-12 md:h-14 rounded-2xl font-bold"
          >
            Sessie
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate('/spots')}
            className="h-12 md:h-14 rounded-2xl font-bold"
          >
            Stek
          </Button>
        </div>
      </section>

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
                <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                  Activatie Doel
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
                Log je eerste vangst!
              </h2>

              <p className="text-sm md:text-base text-text-secondary max-w-md">
                Je bent er bijna! Log je eerste vangst om je statistieken te starten
                en je eerste badges te verdienen.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 px-2 md:px-0">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-10 md:space-y-16">
          {/* Active Session Card */}
          {activeSession && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card
                variant="premium"
                className="bg-surface-card border border-brand/20 p-6 md:p-10 relative overflow-hidden shadow-premium-accent/10 rounded-2xl md:rounded-[2.5rem]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-16 -mt-16" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-brand rounded-full animate-pulse shadow-[0_0_10px_rgba(244,194,13,1)]"></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand">
                        Live Sessie Actief
                      </span>
                    </div>

                    <h3 className="text-2xl md:text-4xl text-text-primary font-bold tracking-tight">
                      {getSessionName(activeSession)}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand" />
                        <span className="font-bold">
                          {(() => {
                            const start = getSessionStart(activeSession);
                            const date = start?.toDate?.() ?? (start ? new Date(start) : null);
                            return date
                              ? format(date, 'HH:mm', { locale: nl })
                              : '--:--';
                          })()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Fish className="w-4 h-4 text-brand" />
                        <span className="font-bold">
                          {getSessionCatchCount(activeSession)} vangsten
                        </span>
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
                    Takenlijst{' '}
                    <span className="text-warning">({incompleteCatches.length})</span>
                  </h3>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-warning font-black text-[10px] uppercase tracking-widest"
                >
                  Afronden
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incompleteCatches.map((c) => {
                  const tsRaw = getCatchTimestamp(c);
                  const ts = tsRaw?.toDate?.() ?? (tsRaw ? new Date(tsRaw) : null);

                  return (
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
                          {getCatchImage(c) ? (
                            <img
                              src={getCatchImage(c)}
                              alt="Draft"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Fish className="text-warning/30 w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-warning/10" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-warning uppercase tracking-widest mb-1">
                            Concept Vangst
                          </p>
                          <p className="text-base font-bold text-text-primary truncate mb-1">
                            {ts ? format(ts, 'd MMM HH:mm', { locale: nl }) : 'Zojuist'}
                          </p>
                          <Badge
                            variant="warning"
                            className="text-[7px] py-0.5 px-1.5 font-black uppercase tracking-widest"
                          >
                            {c.incompleteFields?.length || 0} velden missen
                          </Badge>
                        </div>

                        <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-warning transition-colors" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* XP Progress Section */}
          <Card
            variant="premium"
            className="p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-border-subtle bg-surface-card shadow-premium"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">
                  XP Voortgang
                </h3>
                <p className="text-xs text-text-secondary">{progressSubtitle}</p>
              </div>

              <Badge
                variant="accent"
                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest"
              >
                Level {profile?.level || 1}
              </Badge>
            </div>

            <XpProgressBar xp={profile?.xp || 0} />

            <div className="grid grid-cols-4 gap-4 pt-6 border-t border-border-subtle mt-6">
              <div className="text-center space-y-1">
                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                  Vangsten
                </p>
                <p className="text-lg font-bold text-text-primary">
                  {stats?.totalCatches || 0}
                </p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                  Sessies
                </p>
                <p className="text-lg font-bold text-text-primary">
                  {stats?.totalSessions || 0}
                </p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                  Soorten
                </p>
                <p className="text-lg font-bold text-text-primary">
                  {stats?.speciesCount || 0}
                </p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                  XP
                </p>
                <p className="text-lg font-bold text-text-primary">
                  {(profile?.xp || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          {/* Recent Catches */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                Laatste Vangsten
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-brand font-black text-[10px] uppercase tracking-widest"
                onClick={() => navigate('/catches')}
              >
                Alles
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentCatches.length > 0 ? (
                recentCatches.map((c) => {
                  const tsRaw = getCatchTimestamp(c);
                  const ts = tsRaw?.toDate?.() ?? (tsRaw ? new Date(tsRaw) : null);

                  return (
                    <Card
                      key={c.id}
                      padding="none"
                      hoverable
                      variant="premium"
                      className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all duration-500 rounded-2xl overflow-hidden"
                      onClick={() => openEditCatch(c)}
                    >
                      <div className="relative h-40 overflow-hidden">
                        {getCatchImage(c) ? (
                          <img
                            src={getCatchImage(c)}
                            alt={getCatchSpecies(c)}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-surface-soft">
                            <Fish className="text-text-muted/20 w-12 h-12" />
                          </div>
                        )}

                        <div className="absolute top-3 left-3">
                          <Badge
                            variant="accent"
                            className="bg-brand text-bg-main border-none font-black"
                          >
                            +{c.xpEarned || 0} XP
                          </Badge>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-main to-transparent">
                          <h4 className="text-lg font-bold text-text-primary tracking-tight">
                            {getCatchSpecies(c)}
                          </h4>
                        </div>
                      </div>

                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                          {c.weight && <span>{c.weight}g</span>}
                          {c.length && <span>{c.length}cm</span>}
                          <span className="text-text-muted">
                            {ts ? format(ts, 'd MMM', { locale: nl }) : 'Zojuist'}
                          </span>
                        </div>

                        <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-brand transition-colors" />
                      </div>
                    </Card>
                  );
                })
              ) : (
                <Card
                  variant="premium"
                  className="col-span-full p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl"
                >
                  <Fish className="w-12 h-12 text-brand/20 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-text-primary">
                    Geen vangsten
                  </h3>
                  <Button className="mt-4" onClick={() => setIsQuickCatchOpen(true)}>
                    Eerste Vangst Loggen
                  </Button>
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
              <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">
                Omstandigheden
              </h3>

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
                <Button type="submit" size="sm" className="rounded-xl">
                  OK
                </Button>
              </form>
            )}

            <Card className="bg-surface-card border border-border-subtle p-6 space-y-6 shadow-premium rounded-2xl md:rounded-[2rem] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-brand">
                    Huidige Locatie
                  </p>
                  <p className="text-xl font-bold tracking-tight text-text-primary">
                    {weather?.location?.name || weatherLocation}
                  </p>
                </div>

                <div className="w-12 h-12 bg-surface-soft rounded-xl flex items-center justify-center border border-border-subtle">
                  {weather?.current?.condition?.icon ? (
                    <img
                      src={weather.current.condition.icon}
                      alt="Weather"
                      className="w-8 h-8"
                    />
                  ) : (
                    <Waves className="w-6 h-6 text-brand" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Thermometer className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      Temp
                    </span>
                  </div>
                  <p className="text-xl font-bold tracking-tight text-text-primary">
                    {weather?.current?.temp_c != null
                      ? `${Math.round(weather.current.temp_c)}°C`
                      : '--°C'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Wind className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      Wind
                    </span>
                  </div>
                  <p className="text-xl font-bold tracking-tight text-text-primary">
                    {weather?.current?.wind_kph != null
                      ? `${Math.round(weather.current.wind_kph)} km/u`
                      : '--'}
                  </p>
                </div>
              </div>

              {weather?.forecast?.forecastday && (
                <div className="pt-6 border-t border-border-subtle space-y-4">
                  {weather.forecast.forecastday.map((day: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs font-bold"
                    >
                      <span className="w-16 text-text-secondary">
                        {i === 0
                          ? 'Vandaag'
                          : format(new Date(day.date), 'EEE', { locale: nl })}
                      </span>
                      <img src={day.day.condition.icon} alt="icon" className="w-6 h-6" />
                      <span className="w-16 text-right font-black text-brand">
                        {Math.round(day.day.maxtemp_c)}°
                        <span className="text-text-dim">
                          {' '}
                          / {Math.round(day.day.mintemp_c)}°
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          {/* Mijn Gear Mini */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">
                Mijn Gear
              </h3>
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
              {gearItems.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {gearItems.map((item, i) => (
                      <div
                        key={item.id || i}
                        className="group cursor-pointer"
                        onClick={() => navigate('/gear')}
                      >
                        <div className="aspect-square rounded-xl bg-surface-soft overflow-hidden mb-2 relative border border-border-subtle">
                          {getGearImage(item) ? (
                            <img
                              src={getGearImage(item)}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface-soft">
                              <ShoppingBag className="w-8 h-8 text-text-muted/30" />
                            </div>
                          )}

                          {item.isFavorite && (
                            <div className="absolute top-1.5 right-1.5">
                              <div className="w-5 h-5 rounded-lg bg-brand text-bg-main flex items-center justify-center shadow-lg">
                                <Star className="w-2.5 h-2.5 fill-current" />
                              </div>
                            </div>
                          )}
                        </div>

                        <p className="text-[8px] font-black text-text-muted uppercase tracking-widest truncate">
                          {item.brand || 'Gear'}
                        </p>
                        <p className="text-xs font-bold text-text-primary truncate tracking-tight">
                          {item.name}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="secondary"
                    className="w-full h-10 font-bold text-[10px] uppercase tracking-widest"
                    onClick={() => navigate('/gear')}
                  >
                    Alle Gear
                  </Button>
                </>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <ShoppingBag className="w-10 h-10 text-brand/20 mx-auto" />
                  <p className="text-sm font-bold text-text-primary">Nog geen gear</p>
                  <p className="text-xs text-text-muted">Voeg je eerste gear item toe.</p>
                  <Button variant="secondary" onClick={() => navigate('/gear')}>
                    Naar Mijn Gear
                  </Button>
                </div>
              )}
            </Card>
          </section>

          {/* Top Rankings Mini */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">
                Ranking Snapshot
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-brand font-black text-[10px] uppercase tracking-widest"
                onClick={() => navigate('/rankings')}
              >
                Alles
              </Button>
            </div>

            <Card
              padding="none"
              variant="premium"
              className="divide-y divide-border-subtle border border-border-subtle bg-surface-card shadow-premium rounded-2xl overflow-hidden"
            >
              <RankingCard
                rank={profile?.rank || 0}
                name={profile?.displayName || 'Jij'}
                xp={profile?.xp || 0}
                isCurrentUser
                className="p-4 bg-brand/5"
              />
            </Card>
          </section>

          {/* Favorite Spots */}
          <section className="space-y-4">
            <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">
              Favoriete Stekken
            </h3>

            <div className="space-y-3">
              {favoriteSpots.length > 0 ? (
                favoriteSpots.map((spot) => (
                  <Card
                    key={spot.id}
                    padding="none"
                    hoverable
                    variant="premium"
                    className="p-4 flex items-center gap-4 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group overflow-hidden"
                    onClick={() => navigate('/spots')}
                  >
                    <div className="w-12 h-12 bg-surface-soft text-brand rounded-xl flex items-center justify-center border border-border-subtle group-hover:scale-110 transition-transform duration-500 shadow-sm">
                      <MapPin className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-text-primary truncate tracking-tight">
                        {getSpotName(spot)}
                      </p>
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                        {getSpotWaterType(spot)} • {getSpotCatchCount(spot)} vangsten
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-brand transition-colors" />
                  </Card>
                ))
              ) : (
                <Card className="p-5 border border-border-subtle bg-surface-card rounded-2xl shadow-premium">
                  <div className="text-center py-4">
                    <MapPin className="w-10 h-10 text-brand/20 mx-auto mb-3" />
                    <p className="text-sm font-bold text-text-primary">Nog geen stekken</p>
                    <p className="text-xs text-text-muted mt-1">
                      Voeg stekken toe tijdens het loggen.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </section>

          {/* Secondary Shortcuts */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                Snelle Toegang
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                {
                  label: 'Logboek',
                  sub: 'Vangsten',
                  icon: Fish,
                  path: '/catches',
                  color: 'text-accent',
                  bg: 'bg-accent/10',
                },
                {
                  label: 'Sessies',
                  sub: 'Live vissen',
                  icon: History,
                  path: '/sessions',
                  color: 'text-success',
                  bg: 'bg-success/10',
                },
                {
                  label: 'Stekken',
                  sub: 'Jouw plekken',
                  icon: MapPin,
                  path: '/spots',
                  color: 'text-water',
                  bg: 'bg-water/10',
                },
                {
                  label: 'Visgear',
                  sub: 'Mijn materiaal',
                  icon: ShoppingBag,
                  path: '/gear',
                  color: 'text-warning',
                  bg: 'bg-warning/10',
                },
                {
                  label: 'Ranking',
                  sub: 'XP & scores',
                  icon: Trophy,
                  path: '/rankings',
                  color: 'text-primary',
                  bg: 'bg-primary/10',
                },
                {
                  label: 'Weer',
                  sub: 'Visomstandig.',
                  icon: Cloud,
                  path: '/weather',
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-start gap-2 p-3 bg-surface-card rounded-2xl border border-border-subtle/50 hover:border-accent/30 active:scale-95 transition-all text-left group"
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.bg} transition-transform group-active:scale-95`}
                  >
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>

                  <div className="leading-none">
                    <p className="text-xs font-black text-text-primary tracking-tight">
                      {item.label}
                    </p>
                    <p className="text-[9px] text-text-muted mt-0.5 font-medium">
                      {item.sub}
                    </p>
                  </div>
                </button>
              ))}
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
              onClick={() => {
                setIsCatchFormOpen(false);
                setEditingCatch(null);
              }}
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