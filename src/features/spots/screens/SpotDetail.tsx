import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ChevronLeft,
  Edit2,
  Trash2,
  Calendar,
  Fish,
  TrendingUp,
  Navigation,
  Globe,
  Lock,
  Users,
  Info,
  Clock,
  Anchor,
  Star,
  Wind,
  Thermometer,
  Droplets,
  Zap,
  Target,
  BarChart3,
  Hash,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../App';
import {
  doc, getDoc, collection, query, where, orderBy, limit,
  onSnapshot, deleteDoc, setDoc, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Spot, Catch, Session } from '../../../types';
import { loggingService } from '../../logging/services/loggingService';
import { PageLayout } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { LazyImage } from '../../../components/ui/LazyImage';
import { resolveCatchImageSrc, resolveSpotImageSrc } from '../../../lib/catchUtils';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { SpotModal } from '../../../components/SpotModal';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import { weatherService, WeatherData } from '../../weather/services/weatherService';
import { resolveCoords } from '../../../lib/coordUtils';
import LocationMiniMap from '../components/LocationMiniMap';

/* ── Catch species helper ─────────────────────────── */
function getCatchSpecies(c: Partial<Catch>): string {
  return (
    (c as any).speciesSpecific ||
    (c as any).speciesGeneral ||
    c.species ||
    ''
  );
}

/* ── Session helpers (v2 schema) ──────────────────── */
function getSessionName(s: Partial<Session>): string {
  return (s as any)?.name || (s as any)?.title || 'Sessie';
}
function getSessionCatchCount(s: Partial<Session>): number {
  return (
    (s as any)?.stats?.totalFish ||
    (s as any)?.stats?.totalCatches ||
    (s as any)?.statsSummary?.totalCatches ||
    0
  );
}
function getSessionXp(s: Partial<Session>): number {
  return (s as any)?.stats?.totalXp || (s as any)?.statsSummary?.totalXp || 0;
}
function getSessionDate(s: Partial<Session>): Date | null {
  const raw = (s as any)?.startTime || (s as any)?.startedAt || (s as any)?.createdAt;
  if (!raw) return null;
  if (typeof raw?.toDate === 'function') return raw.toDate();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
function isSessionLive(s: Partial<Session>): boolean {
  return (s as any)?.isActive === true && (s as any)?.status !== 'paused';
}

/* ── Spot Insights ────────────────────────────────── */
interface SpotInsights {
  bestHour: number | null;
  topBait: string | null;
  topTechnique: string | null;
  avgWeight: number | null;
  personalRecord: { weight?: number; length?: number } | null;
}

function computeInsights(catches: Catch[]): SpotInsights {
  if (catches.length === 0) {
    return { bestHour: null, topBait: null, topTechnique: null, avgWeight: null, personalRecord: null };
  }

  const hourCounts: Record<number, number> = {};
  catches.forEach(c => {
    let h: number | null = null;
    if (c.catchTime) {
      if (typeof c.catchTime === 'string' && /^\d{1,2}:\d{2}$/.test(c.catchTime)) {
        h = parseInt(c.catchTime.split(':')[0], 10);
      } else if (typeof (c.catchTime as any)?.toDate === 'function') {
        h = (c.catchTime as any).toDate().getHours();
      }
    }
    if (h === null && c.timestamp?.toDate) {
      h = c.timestamp.toDate().getHours();
    }
    if (h !== null) hourCounts[h] = (hourCounts[h] || 0) + 1;
  });
  const bestHour = Object.keys(hourCounts).length > 0
    ? Number(Object.keys(hourCounts).reduce((a, b) => hourCounts[Number(a)] >= hourCounts[Number(b)] ? a : b))
    : null;

  const baitCounts: Record<string, number> = {};
  catches.forEach(c => {
    const bait = (c as any).baitSpecific || (c as any).baitGeneral || c.bait;
    if (bait) baitCounts[bait] = (baitCounts[bait] || 0) + 1;
  });
  const topBait = Object.keys(baitCounts).length > 0
    ? Object.keys(baitCounts).reduce((a, b) => baitCounts[a] >= baitCounts[b] ? a : b)
    : null;

  const techCounts: Record<string, number> = {};
  catches.forEach(c => {
    const tech = c.technique || (c as any).techniqueId;
    if (tech) techCounts[tech] = (techCounts[tech] || 0) + 1;
  });
  const topTechnique = Object.keys(techCounts).length > 0
    ? Object.keys(techCounts).reduce((a, b) => techCounts[a] >= techCounts[b] ? a : b)
    : null;

  const withWeight = catches.filter(c => c.weight && c.weight > 0);
  const avgWeight = withWeight.length > 0
    ? Math.round(withWeight.reduce((s, c) => s + (c.weight || 0), 0) / withWeight.length)
    : null;
  const maxWeight = withWeight.length > 0 ? Math.max(...withWeight.map(c => c.weight!)) : undefined;
  const withLength = catches.filter(c => c.length && c.length > 0);
  const maxLength = withLength.length > 0 ? Math.max(...withLength.map(c => c.length!)) : undefined;
  const personalRecord = (maxWeight || maxLength) ? { weight: maxWeight, length: maxLength } : null;

  return { bestHour, topBait, topTechnique, avgWeight, personalRecord };
}

/* ── Star Rating ─────────────────────────────────── */
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          aria-label={`${i} ster`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform active:scale-95"
        >
          <Star className={cn('w-7 h-7 transition-colors', i <= (hover || value) ? 'text-brand fill-brand' : 'text-text-dim')} />
        </button>
      ))}
    </div>
  );
}

/* ── Live Weather Mini Widget ────────────────────── */
function WeatherWidget({ lat, lng }: { lat: number; lng: number }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    weatherService.fetchWeather(`${lat},${lng}`)
      .then(data => { if (!cancelled) setWeather(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  if (loading) {
    return (
      <Card className="bg-surface-card border border-border-subtle p-4 animate-pulse">
        <div className="h-14 bg-surface-soft rounded-xl" />
      </Card>
    );
  }
  if (!weather) return null;

  const c = weather.current;
  return (
    <Card className="bg-surface-card border border-border-subtle p-4">
      <h4 className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-3">Live Weer</h4>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-2xl font-black text-text-primary">{Math.round(c.temp_c)}°C</div>
          <div className="text-xs text-text-secondary font-medium capitalize mt-0.5">{c.condition.text}</div>
        </div>
        <img src={`https:${c.condition.icon}`} alt={c.condition.text} className="w-12 h-12" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Wind, value: `${Math.round(c.wind_kph)} km/h`, label: 'Wind', color: 'text-brand' },
          { icon: Droplets, value: `${c.humidity}%`, label: 'Vochtig', color: 'text-blue-400' },
          { icon: Thermometer, value: `${Math.round(c.feelslike_c)}°`, label: 'Gevoels', color: 'text-accent' },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 bg-surface-soft/50 rounded-xl p-2">
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            <span className="text-[10px] font-black text-text-primary">{value}</span>
            <span className="text-[8px] text-text-muted uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Main Component ──────────────────────────────── */
export default function SpotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [spot, setSpot] = useState<Spot | null>(null);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [catchesLoaded, setCatchesLoaded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);

  /* Derived stats from loaded catches */
  const speciesSet = useMemo(
    () => new Set(catches.map(getCatchSpecies).filter(Boolean)),
    [catches]
  );

  const totalXp = useMemo(
    () => catches.reduce((sum, c) => sum + ((c as any).xpEarned ?? 0), 0),
    [catches]
  );

  const insights = useMemo(() => computeInsights(catches), [catches]);

  /* Primary data fetch */
  useEffect(() => {
    if (!id) return;

    const fetchSpot = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'spots_v2', id));
        if (docSnap.exists()) {
          setSpot({ id: docSnap.id, ...docSnap.data() } as Spot);
        } else {
          toast.error('Stek niet gevonden');
          navigate('/spots');
        }
      } catch (error) {
        console.error('Error fetching spot:', error);
        toast.error('Fout bij laden stek');
      } finally {
        setLoading(false);
      }
    };

    fetchSpot();

    if (profile?.uid) {
      getDoc(doc(db, 'spots_v2', id, 'ratings', profile.uid))
        .then(snap => { if (snap.exists()) setUserRating(snap.data().value || 0); })
        .catch(() => {});
    }

    /* Catches by spotId */
    const catchesQuery = query(
      collection(db, 'catches_v2'),
      where('spotId', '==', id),
      orderBy('timestamp', 'desc'),
      limit(30)
    );
    const unsubscribeCatches = onSnapshot(catchesQuery, (snapshot) => {
      setCatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Catch)));
      setCatchesLoaded(true);
    });

    /* Sessions by linkedSpotIds (v2 sessions) */
    const sessionsQuery = query(
      collection(db, 'sessions_v2'),
      where('linkedSpotIds', 'array-contains', id),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
      setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Session)));
    });

    return () => {
      unsubscribeCatches();
      unsubscribeSessions();
    };
  }, [id, navigate, profile?.uid]);

  /* Fallback: query catches by spotName for migrated spots */
  useEffect(() => {
    if (!catchesLoaded || catches.length > 0 || !spot) return;
    const spotTitle = (spot as any).title || spot.name || '';
    if (!spotTitle) return;

    let cancelled = false;
    getDocs(
      query(
        collection(db, 'catches_v2'),
        where('spotName', '==', spotTitle),
        orderBy('timestamp', 'desc'),
        limit(30)
      )
    )
      .then(snap => {
        if (!cancelled && snap.docs.length > 0) {
          setCatches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Catch)));
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [catchesLoaded, catches.length, spot?.id]);

  /* Fallback: also check sessions by spotId field (migrated sessions) */
  useEffect(() => {
    if (!id || sessions.length > 0) return;
    let cancelled = false;
    getDocs(
      query(
        collection(db, 'sessions_v2'),
        where('spotId', '==', id),
        orderBy('startTime', 'desc'),
        limit(5)
      )
    )
      .then(snap => {
        if (!cancelled && snap.docs.length > 0) {
          setSessions(prev =>
            [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as Session))]
              .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
          );
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id, sessions.length]);

  const handleDelete = async () => {
    if (!spot || !id) return;
    if (!window.confirm('Weet je zeker dat je deze stek wilt verwijderen?')) return;
    try {
      await deleteDoc(doc(db, 'spots_v2', id));
      toast.success('Stek verwijderd');
      navigate('/spots');
    } catch (error) {
      toast.error('Fout bij verwijderen stek');
    }
  };

  const handleRating = async (value: number) => {
    if (!profile?.uid || !id) return;
    setUserRating(value);
    try {
      await setDoc(doc(db, 'spots_v2', id, 'ratings', profile.uid), {
        value,
        userId: profile.uid,
        updatedAt: serverTimestamp(),
      });
      toast.success('Rating opgeslagen');
    } catch {
      toast.error('Fout bij opslaan rating');
    }
  };

  const toggleFavorite = async () => {
    if (!profile || !id || !spot) return;
    try {
      const newStatus = !spot.isFavorite;
      await loggingService.updateSpot(id, { isFavorite: newStatus });
      setSpot(prev => prev ? { ...prev, isFavorite: newStatus } : null);
      toast.success(newStatus ? 'Toegevoegd aan favorieten' : 'Verwijderd uit favorieten');
    } catch {
      toast.error('Fout bij bijwerken favoriet');
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
        </div>
      </PageLayout>
    );
  }

  if (!spot) return null;

  const isOwner = profile?.uid === spot.userId;
  const spotCoords = resolveCoords(spot);
  const hasCoords = spotCoords !== null;
  const displayCatchCount = Math.max(catches.length, spot.stats?.totalCatches || 0);
  const displaySessionCount = Math.max(sessions.length, spot.stats?.totalSessions || 0);

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto pb-nav-pad space-y-4">

        {/* Back nav + owner actions */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors active:scale-95 py-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-semibold">Terug</span>
          </button>
          {isOwner && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-card border border-border-subtle text-text-muted hover:text-brand hover:border-brand/30 transition-all text-xs font-bold"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Bewerken
              </button>
              <button
                type="button"
                aria-label="Stek verwijderen"
                onClick={handleDelete}
                className="p-2 rounded-xl bg-surface-card border border-border-subtle text-text-muted hover:text-danger hover:border-danger/30 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Hero */}
        <section className="relative h-52 md:h-72 rounded-2xl overflow-hidden">
          <LazyImage
            src={resolveSpotImageSrc(spot as any)}
            alt={(spot as any).title || spot.name || 'Stek'}
            wrapperClassName="w-full h-full"
            objectFit="cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-bg-main/95 via-bg-main/20 to-transparent" />

          {/* Badges top-left */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge variant="brand" className="px-3 py-1 text-[9px] font-black uppercase tracking-widest">
              {spot.waterType || 'Water'}
            </Badge>
            {spot.visibility === 'private' ? (
              <Badge variant="secondary" className="bg-black/40 backdrop-blur-md border-white/10 text-white/70">
                <Lock className="w-2.5 h-2.5 mr-1" />Privé
              </Badge>
            ) : spot.visibility === 'friends' ? (
              <Badge variant="secondary" className="bg-accent/20 backdrop-blur-md border-accent/30 text-accent">
                <Users className="w-2.5 h-2.5 mr-1" />Vrienden
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-success/10 backdrop-blur-md border-success/20 text-success">
                <Globe className="w-2.5 h-2.5 mr-1" />Openbaar
              </Badge>
            )}
          </div>

          {/* Fav button top-right */}
          <button
            type="button"
            aria-label={spot.isFavorite ? 'Verwijder uit favorieten' : 'Toevoegen aan favorieten'}
            onClick={toggleFavorite}
            className={cn(
              'absolute top-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md border transition-all',
              spot.isFavorite
                ? 'bg-brand border-brand text-bg-main shadow-lg shadow-brand/20'
                : 'bg-black/40 border-white/10 text-white hover:bg-black/60'
            )}
          >
            <Star className={cn('w-5 h-5', spot.isFavorite && 'fill-current')} />
          </button>

          {/* Title bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-lg">
              {(spot as any).title || spot.name}
            </h1>
            {spot.waterBodyName && (
              <p className="text-sm text-white/70 font-semibold flex items-center gap-1.5 mt-1">
                <Anchor className="w-3.5 h-3.5 text-accent" />
                {spot.waterBodyName}
              </p>
            )}
          </div>
        </section>

        {/* Stats strip — live data */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Vangsten', value: displayCatchCount, icon: <Fish className="w-4 h-4 text-brand" />, accent: 'text-brand' },
            { label: 'Sessies',  value: displaySessionCount, icon: <Clock className="w-4 h-4 text-accent" />, accent: 'text-accent' },
            { label: 'Soorten',  value: speciesSet.size,  icon: <Trophy className="w-4 h-4 text-water" />, accent: 'text-water' },
            { label: 'XP',       value: totalXp,           icon: <Zap className="w-4 h-4 text-success" />, accent: 'text-success' },
          ].map(s => (
            <Card key={s.label} className="bg-surface-card border border-border-subtle rounded-xl p-3 text-center">
              <div className="flex justify-center mb-1">{s.icon}</div>
              <p className={`text-lg font-black ${s.accent}`}>{s.value}</p>
              <p className="text-[8px] font-bold text-text-muted uppercase tracking-wider">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Description */}
        {spot.description && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Over deze stek</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{spot.description}</p>
          </Card>
        )}

        {/* Live Weather */}
        {hasCoords && spotCoords && (
          <WeatherWidget lat={spotCoords.lat} lng={spotCoords.lng} />
        )}

        {/* Spot Insights */}
        {catches.length > 0 && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Stek Inzichten</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {insights.bestHour !== null && (
                <div className="bg-surface-soft rounded-xl p-3 space-y-0.5">
                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Beste Tijd</p>
                  <p className="text-lg font-black text-text-primary">{insights.bestHour}:00</p>
                </div>
              )}
              {insights.topBait && (
                <div className="bg-surface-soft rounded-xl p-3 space-y-0.5">
                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Top Aas</p>
                  <p className="text-sm font-black text-text-primary truncate">{insights.topBait}</p>
                </div>
              )}
              {insights.topTechnique && (
                <div className="bg-surface-soft rounded-xl p-3 space-y-0.5">
                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Top Techniek</p>
                  <p className="text-sm font-black text-text-primary truncate">{insights.topTechnique}</p>
                </div>
              )}
              {insights.personalRecord?.weight && (
                <div className="bg-surface-soft rounded-xl p-3 space-y-0.5">
                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Record Gewicht</p>
                  <p className="text-lg font-black text-text-primary">{(insights.personalRecord.weight / 1000).toFixed(2)}kg</p>
                </div>
              )}
              {insights.personalRecord?.length && (
                <div className="bg-surface-soft rounded-xl p-3 space-y-0.5">
                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Record Lengte</p>
                  <p className="text-lg font-black text-text-primary">{insights.personalRecord.length}cm</p>
                </div>
              )}
              {insights.avgWeight && (
                <div className="bg-surface-soft rounded-xl p-3 space-y-0.5">
                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Gem. Gewicht</p>
                  <p className="text-lg font-black text-text-primary">{(insights.avgWeight / 1000).toFixed(1)}kg</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Target species + techniques — horizontal pills */}
        {(spot.targetSpecies?.length || 0) > 0 && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-brand" />
              <h4 className="text-[9px] font-black text-text-muted uppercase tracking-widest">Doelsoorten</h4>
            </div>
            <div className="flex gap-2 flex-wrap">
              {spot.targetSpecies!.map(species => (
                <Badge key={species} variant="secondary" className="bg-brand/10 border-brand/20 text-brand text-[10px]">
                  {species}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {spot.techniques?.length ? (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h4 className="text-[9px] font-black text-text-muted uppercase tracking-widest">Technieken</h4>
            </div>
            <div className="flex gap-2 flex-wrap">
              {spot.techniques.map(tech => (
                <Badge key={tech} variant="secondary" className="bg-accent/10 border-accent/20 text-accent text-[10px]">
                  {tech}
                </Badge>
              ))}
            </div>
          </Card>
        ) : null}

        {/* Navigation / Map */}
        <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-brand" />
            <h4 className="text-[9px] font-black text-text-muted uppercase tracking-widest">Locatie</h4>
          </div>

          {hasCoords && spotCoords ? (
            <LocationMiniMap
              lat={spotCoords.lat}
              lng={spotCoords.lng}
              label={(spot as any).title || spot.name}
              height={188}
              showCoords
              showGoogleMapsBtn
            />
          ) : (
            <p className="text-sm text-text-muted italic">Geen GPS-coördinaten opgeslagen.</p>
          )}
        </Card>

        {/* Your Rating */}
        <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
          <h4 className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-3">Jouw Rating</h4>
          <StarRating value={userRating} onChange={handleRating} />
          {spot.stats?.ratingCount && spot.stats.ratingCount > 0 && (
            <p className="text-[10px] text-text-muted mt-2">
              Gemiddeld {spot.stats.avgRating?.toFixed(1)} ★ van {spot.stats.ratingCount} beoordelingen
            </p>
          )}
        </Card>

        {/* Recent Catches */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black text-text-muted uppercase tracking-widest">
              Recente Vangsten
            </h3>
            <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">{catches.length} geladen</span>
          </div>
          <div className="space-y-2">
            {catches.length > 0 ? (
              catches.slice(0, 8).map((c) => {
                const catchTs =
                  (c as any).timestamp?.toDate?.() ??
                  ((c as any).timestamp ? new Date((c as any).timestamp) : null);
                return (
                  <Card
                    key={c.id}
                    padding="none"
                    className="bg-surface-card border border-border-subtle hover:border-brand/30 transition-all rounded-2xl overflow-hidden group cursor-pointer"
                    onClick={() => c.id && navigate(`/catches/${c.id}`)}
                  >
                    <div className="flex items-center gap-0">
                      <div className="w-16 h-16 shrink-0 overflow-hidden bg-surface-soft border-r border-border-subtle">
                        <LazyImage
                          src={resolveCatchImageSrc(c as any)}
                          alt={getCatchSpecies(c)}
                          wrapperClassName="w-full h-full"
                          className="group-hover:scale-110 transition-transform duration-500"
                          fallbackIconSize={20}
                        />
                      </div>
                      <div className="flex-1 min-w-0 px-3 py-3">
                        <p className="text-[13px] font-bold text-text-primary truncate group-hover:text-brand transition-colors">
                          {getCatchSpecies(c) || '—'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted font-medium">
                          {c.length && <span>{c.length}cm</span>}
                          {c.weight && <span>{(c.weight / 1000).toFixed(2)}kg</span>}
                          {catchTs && <span>{format(catchTs, 'd MMM', { locale: nl })}</span>}
                          {(c as any).xpEarned > 0 && (
                            <span className="flex items-center gap-0.5 text-brand font-bold">
                              <Zap className="w-2.5 h-2.5" />+{(c as any).xpEarned}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted shrink-0 mr-3 group-hover:text-brand transition-colors" />
                    </div>
                  </Card>
                );
              })
            ) : catchesLoaded ? (
              <Card className="p-8 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl">
                <Fish className="w-10 h-10 text-brand/20 mx-auto mb-3" />
                <p className="text-sm text-text-muted">Nog geen vangsten op deze stek.</p>
              </Card>
            ) : (
              [...Array(2)].map((_, i) => (
                <div key={i} className="h-16 bg-surface-card animate-pulse rounded-2xl border border-border-subtle" />
              ))
            )}
          </div>
        </section>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-[11px] font-black text-text-muted uppercase tracking-widest px-1">
              Sessies op deze stek
            </h3>
            <div className="space-y-2">
              {sessions.map(session => {
                const sessionDate = getSessionDate(session);
                const live = isSessionLive(session);
                return (
                  <Card
                    key={session.id}
                    padding="none"
                    className="bg-surface-card border border-border-subtle hover:border-brand/30 transition-all rounded-2xl group cursor-pointer"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                        live ? 'bg-success/10 border-success/20' : 'bg-brand/10 border-brand/20'
                      )}>
                        {live
                          ? <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                          : <Fish className="w-4 h-4 text-brand" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-text-primary truncate group-hover:text-brand transition-colors">
                          {getSessionName(session)}
                        </p>
                        <div className="flex items-center gap-2.5 mt-1 text-[10px] text-text-muted font-medium">
                          {sessionDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {format(sessionDate, 'd MMM yyyy', { locale: nl })}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5 text-brand font-bold">
                            <Fish className="w-2.5 h-2.5" />
                            {getSessionCatchCount(session)}
                          </span>
                          {getSessionXp(session) > 0 && (
                            <span className="flex items-center gap-0.5 text-brand font-bold">
                              <Zap className="w-2.5 h-2.5" />
                              +{getSessionXp(session)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted shrink-0 group-hover:text-brand transition-colors" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

      </div>

      {/* Edit Modal */}
      {isOwner && (
        <SpotModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          editingSpot={spot}
        />
      )}
    </PageLayout>
  );
}
