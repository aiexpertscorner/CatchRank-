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
  Layers,
  Info,
  Clock,
  Anchor,
  Star,
  Package,
  Wind,
  Thermometer,
  Droplets,
  Zap,
  Target,
  BarChart3,
  Hash
} from 'lucide-react';
import { useAuth } from '../../../App';
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Spot, Catch, Session } from '../../../types';
import { loggingService } from '../../logging/services/loggingService';
import { PageLayout } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { SpotModal } from '../../../components/SpotModal';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import { weatherService, WeatherData } from '../../weather/services/weatherService';

// --- Spot Insights computed client-side from loaded catches ---
interface SpotInsights {
  bestHour: number | null;
  topBait: string | null;
  topTechnique: string | null;
  avgWeight: number | null;
  personalRecord: { weight?: number; length?: number } | null;
  successRate: number; // catches per session
}

function computeInsights(catches: Catch[]): SpotInsights {
  if (catches.length === 0) {
    return { bestHour: null, topBait: null, topTechnique: null, avgWeight: null, personalRecord: null, successRate: 0 };
  }

  // Best hour
  const hourCounts: Record<number, number> = {};
  catches.forEach(c => {
    if (c.timestamp?.toDate) {
      const h = c.timestamp.toDate().getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
  });
  const bestHour = Object.keys(hourCounts).length > 0
    ? Number(Object.keys(hourCounts).reduce((a, b) => hourCounts[Number(a)] >= hourCounts[Number(b)] ? a : b))
    : null;

  // Top bait
  const baitCounts: Record<string, number> = {};
  catches.forEach(c => { if (c.bait) baitCounts[c.bait] = (baitCounts[c.bait] || 0) + 1; });
  const topBait = Object.keys(baitCounts).length > 0
    ? Object.keys(baitCounts).reduce((a, b) => baitCounts[a] >= baitCounts[b] ? a : b)
    : null;

  // Top technique
  const techCounts: Record<string, number> = {};
  catches.forEach(c => { if (c.technique) techCounts[c.technique] = (techCounts[c.technique] || 0) + 1; });
  const topTechnique = Object.keys(techCounts).length > 0
    ? Object.keys(techCounts).reduce((a, b) => techCounts[a] >= techCounts[b] ? a : b)
    : null;

  // Avg weight
  const withWeight = catches.filter(c => c.weight && c.weight > 0);
  const avgWeight = withWeight.length > 0
    ? Math.round(withWeight.reduce((s, c) => s + (c.weight || 0), 0) / withWeight.length)
    : null;

  // Personal record
  const maxWeight = withWeight.length > 0 ? Math.max(...withWeight.map(c => c.weight!)) : undefined;
  const withLength = catches.filter(c => c.length && c.length > 0);
  const maxLength = withLength.length > 0 ? Math.max(...withLength.map(c => c.length!)) : undefined;
  const personalRecord = (maxWeight || maxLength) ? { weight: maxWeight, length: maxLength } : null;

  return { bestHour, topBait, topTechnique, avgWeight, personalRecord, successRate: catches.length };
}

// --- Star Rating Component ---
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              'w-7 h-7 transition-colors',
              i <= (hover || value) ? 'text-brand fill-brand' : 'text-text-dim'
            )}
          />
        </button>
      ))}
    </div>
  );
}

// --- Live Weather Mini Widget ---
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
      <Card className="bg-surface-card border-border-subtle p-5 animate-pulse">
        <div className="h-16 bg-surface-soft rounded-xl" />
      </Card>
    );
  }
  if (!weather) return null;

  const c = weather.current;
  return (
    <Card className="bg-surface-card border-border-subtle p-5 space-y-4">
      <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Live Weer</h4>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-black text-text-primary">{Math.round(c.temp_c)}°C</div>
          <div className="text-xs text-text-secondary font-medium capitalize mt-0.5">{c.condition.text}</div>
        </div>
        <img src={`https:${c.condition.icon}`} alt={c.condition.text} className="w-14 h-14" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1 bg-surface-soft/50 rounded-xl p-2">
          <Wind className="w-3.5 h-3.5 text-brand" />
          <span className="text-[10px] font-black text-text-primary">{Math.round(c.wind_kph)} km/h</span>
          <span className="text-[8px] text-text-muted uppercase tracking-wider">Wind</span>
        </div>
        <div className="flex flex-col items-center gap-1 bg-surface-soft/50 rounded-xl p-2">
          <Droplets className="w-3.5 h-3.5 text-water" />
          <span className="text-[10px] font-black text-text-primary">{c.humidity}%</span>
          <span className="text-[8px] text-text-muted uppercase tracking-wider">Vochtig</span>
        </div>
        <div className="flex flex-col items-center gap-1 bg-surface-soft/50 rounded-xl p-2">
          <Thermometer className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-black text-text-primary">{Math.round(c.feelslike_c)}°C</span>
          <span className="text-[8px] text-text-muted uppercase tracking-wider">Gevoels</span>
        </div>
      </div>
    </Card>
  );
}

export default function SpotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [spot, setSpot] = useState<Spot | null>(null);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);

  const insights = useMemo(() => computeInsights(catches), [catches]);

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

    // Load user's existing rating
    if (profile?.uid) {
      getDoc(doc(db, 'spots_v2', id, 'ratings', profile.uid))
        .then(snap => { if (snap.exists()) setUserRating(snap.data().value || 0); })
        .catch(() => {});
    }

    // Catches at this spot
    const catchesQuery = query(
      collection(db, 'catches_v2'),
      where('spotId', '==', id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsubscribeCatches = onSnapshot(catchesQuery, (snapshot) => {
      setCatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Catch)));
    });

    // Sessions at this spot
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
        updatedAt: serverTimestamp()
      });
      toast.success('Rating opgeslagen');
    } catch (error) {
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
    } catch (error) {
      toast.error('Fout bij bijwerken favoriet');
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand shadow-premium-accent"></div>
        </div>
      </PageLayout>
    );
  }

  if (!spot) return null;

  const isOwner = profile?.uid === spot.userId;
  const hasCoords = spot.coordinates?.lat && spot.coordinates?.lng;

  return (
    <PageLayout>
      <div className="space-y-8 pb-32">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/spots')}
            className="text-text-muted hover:text-text-primary"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Terug
          </Button>
          {isOwner && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="rounded-xl"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Bewerken
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="rounded-xl text-danger hover:bg-danger/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Hero Section */}
        <section className="relative h-64 md:h-96 rounded-[2.5rem] overflow-hidden group">
          <img
            src={spot.mainPhotoURL || `https://picsum.photos/seed/${spot.id}/1920/1080`}
            alt={spot.title || spot.name}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/20 to-transparent" />

          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="brand" className="px-4 py-1 text-[10px] font-black uppercase tracking-widest">
                  {spot.waterType || 'Water'}
                </Badge>
                {spot.visibility === 'private' ? (
                  <Badge variant="secondary" className="bg-black/40 backdrop-blur-md border-white/10 text-text-muted">
                    <Lock className="w-3 h-3 mr-1.5" />Privé
                  </Badge>
                ) : spot.visibility === 'friends' ? (
                  <Badge variant="secondary" className="bg-accent/10 backdrop-blur-md border-accent/20 text-accent">
                    <Users className="w-3 h-3 mr-1.5" />Vrienden
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-success/10 backdrop-blur-md border-success/20 text-success">
                    <Globe className="w-3 h-3 mr-1.5" />Openbaar
                  </Badge>
                )}
              </div>
              <button
                onClick={toggleFavorite}
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md border transition-all',
                  spot.isFavorite
                    ? 'bg-brand border-brand text-bg-main shadow-lg shadow-brand/20'
                    : 'bg-black/40 border-white/10 text-white hover:bg-black/60'
                )}
              >
                <Star className={cn('w-6 h-6', spot.isFavorite && 'fill-current')} />
              </button>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-lg">
              {spot.title || spot.name}
            </h1>
            {spot.waterBodyName && (
              <p className="text-lg text-text-secondary font-bold flex items-center gap-2">
                <Anchor className="w-5 h-5 text-accent" />
                {spot.waterBodyName}
              </p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-surface-card border-border-subtle p-5 text-center">
                <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Fish className="w-4 h-4 text-brand" />
                </div>
                <div className="text-2xl font-black text-text-primary">{spot.stats?.totalCatches || 0}</div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">Vangsten</div>
              </Card>
              <Card className="bg-surface-card border-border-subtle p-5 text-center">
                <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-4 h-4 text-accent" />
                </div>
                <div className="text-2xl font-black text-text-primary">{spot.stats?.totalSessions || 0}</div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">Sessies</div>
              </Card>
              <Card className="bg-surface-card border-border-subtle p-5 text-center">
                <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Star className="w-4 h-4 text-brand fill-brand" />
                </div>
                <div className="text-2xl font-black text-text-primary">{spot.stats?.avgRating?.toFixed(1) || '–'}</div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">Gem. Rating</div>
              </Card>
              <Card className="bg-surface-card border-border-subtle p-5 text-center">
                <div className="w-9 h-9 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div className="text-2xl font-black text-text-primary">
                  {insights.avgWeight ? `${(insights.avgWeight / 1000).toFixed(1)}kg` : '–'}
                </div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">Gem. Gewicht</div>
              </Card>
            </div>

            {/* Spot Insights */}
            {catches.length > 0 && (
              <Card className="bg-surface-card border-border-subtle p-6 space-y-5">
                <h3 className="text-base font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand" />
                  Stek Inzichten
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {insights.bestHour !== null && (
                    <div className="bg-surface-soft/50 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2 text-brand">
                        <Clock className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Beste Tijd</span>
                      </div>
                      <div className="text-xl font-black text-text-primary">{insights.bestHour}:00</div>
                    </div>
                  )}
                  {insights.topBait && (
                    <div className="bg-surface-soft/50 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2 text-accent">
                        <Target className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Top Aas</span>
                      </div>
                      <div className="text-sm font-black text-text-primary truncate">{insights.topBait}</div>
                    </div>
                  )}
                  {insights.topTechnique && (
                    <div className="bg-surface-soft/50 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2 text-success">
                        <Zap className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Top Techniek</span>
                      </div>
                      <div className="text-sm font-black text-text-primary truncate">{insights.topTechnique}</div>
                    </div>
                  )}
                  {insights.personalRecord?.weight && (
                    <div className="bg-surface-soft/50 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2 text-water">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Record Gewicht</span>
                      </div>
                      <div className="text-xl font-black text-text-primary">{(insights.personalRecord.weight / 1000).toFixed(2)}kg</div>
                    </div>
                  )}
                  {insights.personalRecord?.length && (
                    <div className="bg-surface-soft/50 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2 text-water">
                        <Hash className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Record Lengte</span>
                      </div>
                      <div className="text-xl font-black text-text-primary">{insights.personalRecord.length}cm</div>
                    </div>
                  )}
                  <div className="bg-surface-soft/50 rounded-xl p-4 space-y-1">
                    <div className="flex items-center gap-2 text-brand">
                      <Fish className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Totaal Logs</span>
                    </div>
                    <div className="text-xl font-black text-text-primary">{catches.length}</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Description */}
            {spot.description && (
              <Card className="bg-surface-card border-border-subtle p-6">
                <h3 className="text-base font-black text-text-primary mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-brand" />
                  Over deze stek
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed font-medium">{spot.description}</p>
              </Card>
            )}

            {/* Recent Catches */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Recente Vangsten</h3>
                <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">{catches.length} totaal</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catches.length > 0 ? (
                  catches.slice(0, 8).map((c) => (
                    <Card
                      key={c.id}
                      padding="none"
                      className="bg-surface-card border-border-subtle overflow-hidden group hover:border-brand/30 transition-all cursor-pointer"
                      onClick={() => c.id && navigate(`/catches/${c.id}`)}
                    >
                      <div className="flex h-24">
                        <div className="w-24 h-full shrink-0 relative overflow-hidden bg-surface-soft">
                          {c.photoURL ? (
                            <img
                              src={c.photoURL}
                              alt={(c as any).speciesGeneral || c.species || ''}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted/20">
                              <Fish className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-4 flex flex-col justify-center">
                          <h4 className="font-bold text-text-primary truncate">{(c as any).speciesGeneral || c.species || '–'}</h4>
                          <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                            {c.length && <span>{c.length}cm</span>}
                            {c.weight && <span>{(c.weight / 1000).toFixed(2)}kg</span>}
                            <span>•</span>
                            <span>{format(c.timestamp?.toDate() || new Date(), 'd MMM', { locale: nl })}</span>
                          </div>
                          {c.bait && (
                            <div className="text-[9px] text-text-dim mt-1 font-bold uppercase tracking-wider truncate">{c.bait}</div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="col-span-full p-12 text-center border-dashed border-border-subtle bg-surface-soft/20">
                    <Fish className="w-12 h-12 text-text-muted/20 mx-auto mb-3" />
                    <p className="text-text-secondary font-medium text-sm">Nog geen vangsten gelogd op deze stek.</p>
                  </Card>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Live Weather */}
            {hasCoords && (
              <WeatherWidget lat={spot.coordinates.lat} lng={spot.coordinates.lng} />
            )}

            {/* Your Rating */}
            <Card className="bg-surface-card border-border-subtle p-5 space-y-3">
              <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Jouw Rating</h4>
              <StarRating value={userRating} onChange={handleRating} />
              {spot.stats?.ratingCount && spot.stats.ratingCount > 0 && (
                <p className="text-[10px] text-text-dim">
                  Gemiddeld {spot.stats.avgRating?.toFixed(1)} ★ van {spot.stats.ratingCount} beoordelingen
                </p>
              )}
            </Card>

            {/* Map Placeholder */}
            <Card className="bg-surface-card border-border-subtle overflow-hidden aspect-square relative group">
              <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map/800/800')] bg-cover bg-center grayscale opacity-40 group-hover:grayscale-0 transition-all duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-brand/20 rounded-full flex items-center justify-center animate-pulse">
                  <MapPin className="w-6 h-6 text-brand" />
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                {hasCoords ? (
                  <a
                    href={`https://maps.google.com/?q=${spot.coordinates.lat},${spot.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full rounded-xl font-bold shadow-premium-accent">
                      <Navigation className="w-4 h-4 mr-2" />
                      Routebeschrijving
                    </Button>
                  </a>
                ) : (
                  <Button className="w-full rounded-xl font-bold shadow-premium-accent" disabled>
                    <Navigation className="w-4 h-4 mr-2" />
                    Geen GPS
                  </Button>
                )}
              </div>
            </Card>

            {/* Target Species */}
            {spot.targetSpecies && spot.targetSpecies.length > 0 && (
              <Card className="bg-surface-card border-border-subtle p-5">
                <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-4">Doelsoorten</h4>
                <div className="flex flex-wrap gap-2">
                  {spot.targetSpecies.map(species => (
                    <Badge key={species} variant="secondary" className="bg-surface-soft border-border-subtle text-text-secondary">
                      {species}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Techniques */}
            {spot.techniques && spot.techniques.length > 0 && (
              <Card className="bg-surface-card border-border-subtle p-5">
                <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-4">Technieken</h4>
                <div className="flex flex-wrap gap-2">
                  {spot.techniques.map(tech => (
                    <Badge key={tech} variant="secondary" className="bg-accent/5 border-accent/10 text-accent">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Linked Gear */}
            {((spot.linkedGearIds && spot.linkedGearIds.length > 0) || (spot.linkedSetupIds && spot.linkedSetupIds.length > 0)) && (
              <Card className="bg-surface-card border-border-subtle p-5">
                <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-4">Gekoppelde Gear</h4>
                <div className="space-y-2">
                  {spot.linkedSetupIds?.map(setup => (
                    <div key={setup} className="flex items-center gap-3 p-3 bg-surface-soft/50 rounded-xl border border-border-subtle">
                      <Layers className="w-4 h-4 text-brand" />
                      <span className="text-xs font-bold text-text-primary truncate">{setup}</span>
                    </div>
                  ))}
                  {spot.linkedGearIds?.map(gear => (
                    <div key={gear} className="flex items-center gap-3 p-3 bg-surface-soft/50 rounded-xl border border-border-subtle">
                      <Package className="w-4 h-4 text-accent" />
                      <span className="text-xs font-bold text-text-primary truncate">{gear}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Sessions */}
            <section className="space-y-3">
              <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Recente Sessies</h4>
              {sessions.length > 0 ? (
                sessions.map(session => (
                  <Card
                    key={session.id}
                    className="bg-surface-card border-border-subtle p-4 hover:border-brand/30 transition-all cursor-pointer"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest py-0.5">
                        {session.mode === 'live' ? 'Live' : 'Retro'}
                      </Badge>
                      <span className="text-[10px] text-text-muted font-bold">
                        {format(session.createdAt?.toDate() || new Date(), 'd MMM yyyy', { locale: nl })}
                      </span>
                    </div>
                    <h5 className="font-bold text-text-primary truncate text-sm">{session.title || 'Visdag'}</h5>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-text-secondary font-bold">
                      <span className="flex items-center gap-1">
                        <Fish className="w-3 h-3 text-brand" />
                        {session.statsSummary?.totalCatches || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-brand" />
                        {session.statsSummary?.totalXp || 0} XP
                      </span>
                    </div>
                  </Card>
                ))
              ) : (
                <p className="text-xs text-text-muted italic">Geen recente sessies.</p>
              )}
            </section>
          </div>
        </div>
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
