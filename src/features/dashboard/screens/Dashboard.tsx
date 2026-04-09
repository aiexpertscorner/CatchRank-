import React, { useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  MapPin,
  ChevronRight,
  Clock,
  Fish,
  Wind,
  Thermometer,
  AlertCircle,
  Star,
  ShoppingBag,
  History,
  Cloud,
  ArrowUpRight,
  Droplets,
  Sun,
  Compass,
  Gauge,
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
import { weatherService, WeatherData } from '../../weather/services/weatherService';
import { QuickCatchModal } from '../../../components/QuickCatchModal';
import { CatchForm } from '../../../components/CatchForm';
import { SessionModal } from '../../../components/SessionModal';
import { statsService, UserStats } from '../../../services/statsService';
import { useSession } from '../../../contexts/SessionContext';
import { XpProgressBar } from '../../../components/xp/XpProgressBar';
import { gearService } from '../../gear/services/gearService';

const COLLECTIONS = {
  CATCHES: 'catches_v2',
  SPOTS: 'spots_v2',
  SESSIONS: 'sessions_v2',
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
  (s as any)?.name || (s as any)?.title || 'Sessie';

const getSessionStart = (s: Partial<Session> | null | undefined) =>
  (s as any)?.startTime || (s as any)?.startedAt || null;

const getSessionEnd = (s: Partial<Session> | null | undefined) =>
  (s as any)?.endTime || (s as any)?.endedAt || null;

const getSessionCatchCount = (s: Partial<Session> | null | undefined) =>
  (s as any)?.stats?.totalCatches ||
  (s as any)?.statsSummary?.totalCatches ||
  (s as any)?.linkedCatchIds?.length ||
  0;

const getSessionSpotName = (s: Partial<Session> | null | undefined) =>
  (s as any)?.spotName ||
  (s as any)?.locationName ||
  (s as any)?.spotTitle ||
  'Onbekende stek';

const getSessionStatus = (s: Partial<Session> | null | undefined) =>
  (s as any)?.status || ((s as any)?.isActive ? 'active' : 'complete');

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

const getXpNeededText = (xp: number) => {
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
    ? 'MAX'
    : `${xpToNext.toLocaleString()} XP nodig`;
};

const formatDateShort = (value: any) => {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date ? format(date, 'd MMM', { locale: nl }) : 'Onbekend';
};

const formatTimeShort = (value: any) => {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date ? format(date, 'HH:mm', { locale: nl }) : '--:--';
};

const getWindDirectionLabel = (windDir?: string) => {
  if (!windDir) return '--';
  return windDir.toUpperCase();
};

const getHourlyForecast = (weather: WeatherData | null) => {
  const hours = ((weather?.forecast?.forecastday?.[0] as any)?.hour ?? []) as any[];
  if (!Array.isArray(hours) || hours.length === 0) return [];

  const now = Date.now();

  return hours
    .filter((hour) => {
      const ts = new Date(hour.time).getTime();
      return ts >= now - 60 * 60 * 1000;
    })
    .slice(0, 4);
};

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { activeSession, endActiveSession } = useSession();

  const [recentCatches, setRecentCatches] = useState<Catch[]>([]);
  const [incompleteCatches, setIncompleteCatches] = useState<Catch[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [favoriteSpots, setFavoriteSpots] = useState<Spot[]>([]);
  const [spotsCount, setSpotsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);
  const [isCatchFormOpen, setIsCatchFormOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<Catch | null>(null);

  const savedLocation = localStorage.getItem('weatherLocation') || DEFAULT_LOCATION;
  const [weather, setWeather] = useState<WeatherData | null>(null);
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

    const sessionsQuery = query(
      collection(db, COLLECTIONS.SESSIONS),
      where('userId', '==', profile.uid),
      orderBy('startTime', 'desc'),
      limit(6)
    );

    const unsubscribeCatches = onSnapshot(
      catchesQuery,
      (snapshot) => {
        const allCatches = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Catch)
        );

        setRecentCatches(allCatches.filter((c) => c.status === 'complete').slice(0, 4));
        setIncompleteCatches(allCatches.filter((c) => c.status === 'draft').slice(0, 2));
      },
      (error) => {
        console.error('Error fetching catches:', error);
        setLoading(false);
      }
    );

    const unsubscribeSessions = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const sessions = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Session)
        );
        setRecentSessions(sessions.slice(0, 4));
      },
      (error) => {
        console.error('Error fetching sessions:', error);
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
        setGearItems(sortedGear.slice(0, 4));

        const spotsQuery = query(
          collection(db, COLLECTIONS.SPOTS),
          where('userId', '==', profile.uid),
          limit(50)
        );
        const spotsSnap = await getDocs(spotsQuery);
        const spots = spotsSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Spot)
        );

        setSpotsCount(spots.length);

        const sortedSpots = [...spots].sort((a, b) => {
          const aScore = ((a as any).isFavorite ? 1000 : 0) + getSpotCatchCount(a);
          const bScore = ((b as any).isFavorite ? 1000 : 0) + getSpotCatchCount(b);
          return bScore - aScore;
        });

        setFavoriteSpots(sortedSpots.slice(0, 4));
      } catch (error) {
        console.error('Error loading dashboard secondary data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSecondaryData();

    return () => {
      unsubscribeCatches();
      unsubscribeSessions();
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
        let data: WeatherData;

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

  const xpNeededText = useMemo(
    () => getXpNeededText(profile?.xp || 0),
    [profile?.xp]
  );

  const hourlyForecast = useMemo(
    () => getHourlyForecast(weather),
    [weather]
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <PageLayout>
      <div className="space-y-6 px-2 md:px-0 pb-28">

        {/* Hero */}
        <section>
          <Card className="relative overflow-hidden rounded-[1.75rem] border border-brand/20 bg-surface-card p-4 shadow-premium">
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand/10 blur-3xl -mr-12 -mt-12 pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Badge
                    variant="accent"
                    className="mb-2 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em]"
                  >
                    Dashboard
                  </Badge>

                  <h1 className="text-lg font-bold text-text-accent">
                    {profile?.displayName || 'Visser'}
                  </h1>

                  <p className="text-xs text-text-secondary mt-2 max-w-[240px] leading-snug">
                    Level, progressie en laatste activiteit in één overzicht.
                  </p>
                </div>

                <div className="shrink-0 min-w-[118px] rounded-2xl border border-border-subtle bg-surface-soft px-3 py-2.5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[8px] font-black uppercase tracking-widest text-text-muted">
                        Level
                      </span>
                      <span className="text-lg font-bold text-text-primary">
                        {profile?.level || 1}
                      </span>
                    </div>

                    <div className="h-px bg-border-subtle" />

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[8px] font-black uppercase tracking-widest text-text-muted">
                        XP
                      </span>
                      <span className="text-lg font-bold text-brand">
                        {(profile?.xp || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">
                    Vangsten
                  </p>
                  <p className="text-base font-bold text-text-primary mt-1">
                    {stats?.totalCatches || 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">
                    Sessies
                  </p>
                  <p className="text-base font-bold text-text-primary mt-1">
                    {stats?.totalSessions || 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">
                    Stekken
                  </p>
                  <p className="text-base font-bold text-text-primary mt-1">
                    {spotsCount}
                  </p>
                </div>
              </div>

<div className="rounded-2xl border border-border-subtle bg-surface-soft p-3.5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                    Progressie
                  </span>
                  <span className="text-[11px] font-black text-brand">
                    {xpNeededText}
                  </span>
                </div>

                <XpProgressBar xp={profile?.xp || 0} compact />

                <p className="mt-2 text-[11px] text-text-secondary">
                  {progressSubtitle}
                </p>
              </div>

        {/* Nu toevoegen */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-text-muted">
              Nu toevoegen
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Stek',
                icon: MapPin,
                onClick: () => navigate('/spots'),
              },
              {
                label: 'Sessie',
                icon: History,
                onClick: () => setIsSessionModalOpen(true),
              },
              {
                label: 'Vangst',
                icon: Fish,
                onClick: () => setIsQuickCatchOpen(true),
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="rounded-2xl border border-brand bg-brand text-bg-main p-3.5 min-h-[92px] flex flex-col items-center justify-center gap-2 text-center transition-all shadow-premium-accent hover:brightness-105 active:scale-95"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-black tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Actieve sessie */}
        {activeSession && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-surface-card border border-brand/20 p-4 rounded-[1.75rem] relative overflow-hidden shadow-premium">
              <div className="absolute top-0 right-0 w-28 h-28 bg-brand/5 blur-3xl -mr-12 -mt-12" />

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-brand">
                    Live sessie actief
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">
                    {getSessionName(activeSession)}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-secondary font-bold uppercase tracking-widest">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand" />
                      {formatTimeShort(getSessionStart(activeSession))}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Fish className="w-3.5 h-3.5 text-brand" />
                      {getSessionCatchCount(activeSession)} vangsten
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setIsQuickCatchOpen(true)}
                    className="h-11 rounded-xl font-bold"
                  >
                    Vangst loggen
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleEndSession}
                    className="h-11 rounded-xl font-bold"
                  >
                    Stop sessie
                  </Button>
                </div>
              </div>
            </Card>
          </motion.section>
        )}

        {/* Concepten */}
        {incompleteCatches.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                Concepten
              </h2>
            </div>

            <div className="space-y-3">
              {incompleteCatches.map((c) => {
                const tsRaw = getCatchTimestamp(c);
                const ts = tsRaw?.toDate?.() ?? (tsRaw ? new Date(tsRaw) : null);

                return (
                  <Card
                    key={c.id}
                    padding="none"
                    hoverable
                    variant="premium"
                    className="border border-border-subtle bg-surface-card rounded-2xl overflow-hidden"
                    onClick={() => openEditCatch(c)}
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-border-subtle bg-surface-soft shrink-0">
                        {getCatchImage(c) ? (
                          <img
                            src={getCatchImage(c)}
                            alt="Draft"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Fish className="w-6 h-6 text-warning/40" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-warning mb-1">
                          Concept vangst
                        </p>
                        <p className="text-sm font-bold text-text-primary truncate">
                          {ts ? format(ts, 'd MMM HH:mm', { locale: nl }) : 'Zojuist'}
                        </p>
                        <p className="text-[10px] text-text-muted mt-1">
                          {c.incompleteFields?.length || 0} velden missen
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Weer */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Weer & visomstandigheden
            </h2>

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
                className="flex-1 bg-surface-soft border border-border-subtle rounded-xl px-4 py-2.5 text-sm font-medium text-text-primary focus:border-brand focus:outline-none"
                placeholder="Stad..."
                autoFocus
              />
              <Button type="submit" size="sm" className="rounded-xl px-4">
                OK
              </Button>
            </form>
          )}

          <Card className="relative overflow-hidden rounded-[1.75rem] border border-border-subtle bg-surface-card p-4 shadow-premium">
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand/8 blur-3xl -mr-10 -mt-10" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-brand">
                    Huidige locatie
                  </p>
                  <h3 className="text-2xl font-black text-text-primary tracking-tight uppercase">
                    {weather?.location?.name || weatherLocation}
                  </h3>
                  <p className="text-sm text-text-secondary capitalize">
                    {weather?.current?.condition?.text || 'Forecast laden...'}
                  </p>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-surface-soft border border-border-subtle flex items-center justify-center shrink-0">
                  {weather?.current?.condition?.icon ? (
                    <img
                      src={weather.current.condition.icon}
                      alt="Weather"
                      className="w-9 h-9"
                    />
                  ) : (
                    <Cloud className="w-5 h-5 text-brand" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-text-muted">
                    <Thermometer className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Temp</span>
                  </div>
                  <p className="text-base font-bold text-text-primary mt-1">
                    {weather?.current?.temp_c != null
                      ? `${Math.round(weather.current.temp_c)}°`
                      : '--°'}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-text-muted">
                    <Wind className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Wind</span>
                  </div>
                  <p className="text-base font-bold text-text-primary mt-1">
                    {weather?.current?.wind_kph != null
                      ? `${Math.round(weather.current.wind_kph)} km/u`
                      : '--'}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-text-muted">
                    <Compass className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Richting</span>
                  </div>
                  <p className="text-base font-bold text-text-primary mt-1">
                    {getWindDirectionLabel(weather?.current?.wind_dir)}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-text-muted">
                    <Gauge className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Druk</span>
                  </div>
                  <p className="text-base font-bold text-text-primary mt-1">
                    {weather?.current?.pressure_mb != null
                      ? `${Math.round(weather.current.pressure_mb)}`
                      : '--'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-text-muted">
                    <Sun className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[8px] font-black uppercase tracking-widest">UV index</span>
                  </div>
                  <p className="text-base font-bold text-text-primary mt-1">
                    {weather?.current?.uv != null ? weather.current.uv : '--'}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-text-muted">
                    <Droplets className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Vocht</span>
                  </div>
                  <p className="text-base font-bold text-text-primary mt-1">
                    {weather?.current?.humidity != null
                      ? `${weather.current.humidity}%`
                      : '--'}
                  </p>
                </div>
              </div>

              {hourlyForecast.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Komende uren
                    </p>
                  </div>

                  <div className="space-y-2">
                    {hourlyForecast.map((hour: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl bg-surface-soft/60 border border-border-subtle px-3 py-2.5"
                      >
                        <span className="text-xs font-bold text-text-secondary w-12">
                          {format(new Date(hour.time), 'HH:mm', { locale: nl })}
                        </span>

                        <div className="flex items-center gap-2 min-w-0 flex-1 px-2">
                          <img src={hour.condition.icon} alt="icon" className="w-6 h-6" />
                          <span className="text-[11px] font-medium text-text-secondary truncate">
                            {hour.condition.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] font-bold text-text-secondary">
                            {Math.round(hour.wind_kph)} km/u
                          </span>
                          <span className="text-xs font-black text-brand w-10 text-right">
                            {Math.round(hour.temp_c)}°
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hourlyForecast.length === 0 && weather?.forecast?.forecastday?.length ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Korte termijn
                    </p>
                  </div>

                  <div className="space-y-2">
                    {weather.forecast.forecastday.slice(0, 3).map((day, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl bg-surface-soft/60 border border-border-subtle px-3 py-2.5"
                      >
                        <span className="text-xs font-bold text-text-secondary w-16">
                          {i === 0
                            ? 'Vandaag'
                            : format(new Date(day.date), 'EEE', { locale: nl })}
                        </span>

                        <div className="flex items-center gap-2 min-w-0 flex-1 px-2">
                          <img src={day.day.condition.icon} alt="icon" className="w-6 h-6" />
                          <span className="text-[11px] font-medium text-text-secondary truncate">
                            {day.day.condition.text}
                          </span>
                        </div>

                        <span className="text-xs font-black text-brand">
                          {Math.round(day.day.maxtemp_c)}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                onClick={() => navigate('/weather')}
                className="w-full rounded-2xl border border-brand/20 bg-brand/8 px-4 py-3.5 flex items-center justify-between text-left transition-all hover:bg-brand/12 active:scale-[0.99]"
              >
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    Open volledige forecast & advies
                  </p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Meer details, trends en visadvies
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-brand shrink-0" />
              </button>
            </div>
          </Card>
        </section>

        {/* Laatste vangsten */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Laatste vangsten
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

          <div className="grid grid-cols-2 gap-3">
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
                    className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
                    onClick={() => openEditCatch(c)}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      {getCatchImage(c) ? (
                        <img
                          src={getCatchImage(c)}
                          alt={getCatchSpecies(c)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-soft">
                          <Fish className="w-10 h-10 text-text-muted/20" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2">
                        <Badge
                          variant="accent"
                          className="bg-brand text-bg-main border-none text-[9px] font-black"
                        >
                          +{c.xpEarned || 0} XP
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 space-y-1.5">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {getCatchSpecies(c)}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                        {c.weight && <span>{c.weight}g</span>}
                        {c.length && <span>{c.length}cm</span>}
                        <span>{ts ? format(ts, 'd MMM', { locale: nl }) : 'Zojuist'}</span>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="col-span-2 p-8 text-center rounded-2xl border border-dashed border-border-subtle bg-surface-soft/20">
                <Fish className="w-10 h-10 text-brand/20 mx-auto mb-3" />
                <p className="text-sm font-bold text-text-primary">Nog geen vangsten</p>
              </Card>
            )}
          </div>
        </section>

        {/* Laatste sessies */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Laatste sessies
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-brand font-black text-[10px] uppercase tracking-widest"
              onClick={() => navigate('/sessions')}
            >
              Alles
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {recentSessions.length > 0 ? (
              recentSessions.map((session) => {
                const status = getSessionStatus(session);
                const start = getSessionStart(session);
                const end = getSessionEnd(session);

                return (
                  <Card
                    key={(session as any).id}
                    padding="none"
                    hoverable
                    variant="premium"
                    className="p-4 rounded-2xl border border-border-subtle bg-surface-card"
                    onClick={() => navigate('/sessions')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                        <History className="w-5 h-5 text-brand" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-text-primary truncate">
                            {getSessionName(session)}
                          </p>
                          {status === 'active' && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-brand">
                              Live
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted truncate">
                          {getSessionSpotName(session)}
                        </p>

                        <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                          <span>{formatDateShort(start)}</span>
                          <span>{formatTimeShort(start)}</span>
                          {status !== 'active' && end && <span>tot {formatTimeShort(end)}</span>}
                          <span>{getSessionCatchCount(session)} vangsten</span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="p-8 text-center rounded-2xl border border-dashed border-border-subtle bg-surface-soft/20">
                <History className="w-10 h-10 text-brand/20 mx-auto mb-3" />
                <p className="text-sm font-bold text-text-primary">Nog geen sessies</p>
              </Card>
            )}
          </div>
        </section>

        {/* Favoriete stekken */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Favoriete stekken
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-brand font-black text-[10px] uppercase tracking-widest"
              onClick={() => navigate('/spots')}
            >
              Alles
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {favoriteSpots.length > 0 ? (
              favoriteSpots.map((spot) => (
                <Card
                  key={spot.id}
                  padding="none"
                  hoverable
                  variant="premium"
                  className="p-4 rounded-2xl border border-border-subtle bg-surface-card"
                  onClick={() => navigate('/spots')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-surface-soft border border-border-subtle flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-brand" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {getSpotName(spot)}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-1">
                        {getSpotWaterType(spot)} • {getSpotCatchCount(spot)} vangsten
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center rounded-2xl border border-dashed border-border-subtle bg-surface-soft/20">
                <MapPin className="w-10 h-10 text-brand/20 mx-auto mb-3" />
                <p className="text-sm font-bold text-text-primary">Nog geen stekken</p>
              </Card>
            )}
          </div>
        </section>

        {/* Mijn gear */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Mijn gear
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-brand font-black text-[10px] uppercase tracking-widest"
              onClick={() => navigate('/gear')}
            >
              Alles
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {gearItems.length > 0 ? (
              gearItems.map((item, i) => (
                <Card
                  key={item.id || i}
                  padding="none"
                  hoverable
                  variant="premium"
                  className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
                  onClick={() => navigate('/gear')}
                >
                  <div className="relative aspect-square bg-surface-soft border-b border-border-subtle overflow-hidden">
                    {getGearImage(item) ? (
                      <img
                        src={getGearImage(item)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-10 h-10 text-text-muted/25" />
                      </div>
                    )}

                    {item.isFavorite && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-xl bg-brand text-bg-main flex items-center justify-center shadow-lg">
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-muted truncate">
                      {item.brand || 'Gear'}
                    </p>
                    <p className="text-sm font-bold text-text-primary truncate mt-1">
                      {item.name}
                    </p>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="col-span-2 p-8 text-center rounded-2xl border border-dashed border-border-subtle bg-surface-soft/20">
                <ShoppingBag className="w-10 h-10 text-brand/20 mx-auto mb-3" />
                <p className="text-sm font-bold text-text-primary">Nog geen gear</p>
              </Card>
            )}
          </div>
        </section>

        {/* Snelle toegang */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-text-muted">
              Snelle toegang
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
                className="flex flex-col items-center justify-center text-center gap-2 p-3.5 bg-surface-card rounded-2xl border border-border-subtle/60 hover:border-accent/30 active:scale-95 transition-all min-h-[96px]"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>

                <div className="leading-none">
                  <p className="text-[11px] font-black text-text-primary tracking-tight">
                    {item.label}
                  </p>
                  <p className="text-[9px] text-text-muted mt-1 font-medium">
                    {item.sub}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Ranking snapshot */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Ranking snapshot
            </h2>
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
      </div>

      {/* Modals */}
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