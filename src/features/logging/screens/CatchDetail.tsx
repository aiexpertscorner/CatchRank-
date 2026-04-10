import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Fish,
  MapPin,
  Calendar,
  Zap,
  Edit2,
  Trash2,
  Wind,
  Thermometer,
  Droplets,
  Eye,
  Scale,
  Ruler,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  Waves,
  Anchor,
  Moon,
  Navigation,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Cloud,
  Gauge,
  Sun,
  LocateFixed,
  ChevronRight,
} from 'lucide-react';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';

import { useAuth } from '../../../App';
import { db } from '../../../lib/firebase';
import { Catch, Spot } from '../../../types';
import { PageLayout } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { CatchForm } from '../../../components/CatchForm';
import { LazyImage } from '../../../components/ui/LazyImage';
import { normalizeMediaPath } from '../../../lib/media';
import { repairCatchData } from '../services/catchDataRepair';

type CatchWithMeta = Catch & {
  speciesGeneral?: string;
  speciesSpecific?: string;
  baitGeneral?: string;
  baitSpecific?: string;
  baitId?: string;
  techniqueId?: string;
  catchTime?: string;
  mainImage?: string;
  extraImages?: string[];
  photoURL?: string;
  notes?: string;
  city?: string;
  moonPhase?: string;
  latitude?: number;
  longitude?: number;
  weight?: number;
  length?: number;
  xpEarned?: number;
  incompleteFields?: string[];
  isPrivate?: boolean;
  schemaVersion?: number;
  water?: Record<string, any>;
  weather?: Record<string, any>;
  weatherSnapshot?: Record<string, any>;
  sessionId?: string;
  spotId?: string;
  spotName?: string;
  timestamp?: any;
  updatedAt?: any;
  createdAt?: any;
  status?: string;
  video?: string;
};

const WATER_CLARITY_LABEL: Record<string, string> = {
  clear: 'Helder',
  murky: 'Licht troebel',
  stained: 'Troebel',
  very_murky: 'Zeer troebel',
};

const WATER_FLOW_LABEL: Record<string, string> = {
  none: 'Geen stroming',
  slow: 'Langzaam',
  medium: 'Matig',
  fast: 'Snel',
};

function toDateSafe(value: any): Date | null {
  try {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function normalizeAssetPath(raw?: string | null): string {
  // Delegate entirely to the shared media normalizer.
  // assets/ and images/ are Firebase Storage paths — NOT local web paths.
  return normalizeMediaPath(raw);
}

function parseNumericString(value: any): string {
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

function formatWeight(weight?: number | null): string {
  if (weight === undefined || weight === null || Number.isNaN(weight)) return '—';
  return `${weight} kg`;
}

function formatLength(length?: number | null): string {
  if (length === undefined || length === null || Number.isNaN(length)) return '—';
  return `${length} cm`;
}

function getCatchSpecies(c?: CatchWithMeta | null): string {
  if (!c) return 'Onbekende soort';
  return c.speciesSpecific || c.species || c.speciesGeneral || 'Onbekende soort';
}

function getCatchSpeciesGroup(c?: CatchWithMeta | null): string {
  if (!c) return '';
  return c.speciesGeneral || c.species || '';
}

function getCatchImage(c?: CatchWithMeta | null): string {
  if (!c) return '';
  // v2-first: mainImage is the canonical Storage URL; photoURL is legacy fallback
  const raw = (c as any).mainImage || c.photoURL || (c as any).image || (c as any).imageUrl || '';
  return normalizeAssetPath(raw);
}

function getExtraImages(c?: CatchWithMeta | null): string[] {
  if (!c?.extraImages || !Array.isArray(c.extraImages)) return [];
  return c.extraImages.map((img) => normalizeAssetPath(img)).filter(Boolean);
}

function getVideoPath(c?: CatchWithMeta | null): string {
  if (!c?.video) return '';
  return normalizeAssetPath(c.video);
}

function getWeatherData(c?: CatchWithMeta | null): Record<string, any> {
  if (!c) return {};
  return c.weatherSnapshot || c.weather || {};
}

function getReadableTechnique(c?: CatchWithMeta | null): string {
  if (!c) return '';
  return (c as any).technique || c.techniqueId || '';
}

function getReadableBait(c?: CatchWithMeta | null): string {
  if (!c) return '';
  return c.baitSpecific || c.bait || c.baitGeneral || '';
}

function getReadableBaitGroup(c?: CatchWithMeta | null): string {
  if (!c) return '';
  return c.baitGeneral || c.bait || '';
}

function keyLabel(label: string, value?: string | number | null) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-soft px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-text-primary break-words">{value}</p>
    </div>
  );
}

export default function CatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [catchData, setCatchData] = useState<CatchWithMeta | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [relatedCatches, setRelatedCatches] = useState<CatchWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        const catchRef = doc(db, 'catches_v2', id);
        const catchDoc = await getDoc(catchRef);

        if (!catchDoc.exists()) {
          toast.error('Vangst niet gevonden');
          navigate('/catches');
          return;
        }

        const data = { id: catchDoc.id, ...catchDoc.data() } as CatchWithMeta;
        setCatchData(data);

        // Fire-and-forget: silently repair migrated catch data (spotName, stale sessionId)
        repairCatchData({ id: data.id!, spotId: data.spotId, spotName: data.spotName, sessionId: (data as any).sessionId });

        const resolvedSpotId = data.spotId;
        const resolvedSpotName = data.spotName;

        if (resolvedSpotId) {
          const spotDoc = await getDoc(doc(db, 'spots_v2', resolvedSpotId));
          if (spotDoc.exists()) {
            setSpot({ id: spotDoc.id, ...spotDoc.data() } as Spot);
          }
        }

        try {
          let related: CatchWithMeta[] = [];

          if (resolvedSpotId) {
            const relatedQuery = query(
              collection(db, 'catches_v2'),
              where('spotId', '==', resolvedSpotId),
              orderBy('timestamp', 'desc'),
              limit(8)
            );

            const relatedSnap = await getDocs(relatedQuery);
            related = relatedSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as CatchWithMeta))
              .filter((c) => c.id !== id)
              .slice(0, 4);
          } else if (resolvedSpotName) {
            const relatedQuery = query(
              collection(db, 'catches_v2'),
              where('spotName', '==', resolvedSpotName),
              orderBy('timestamp', 'desc'),
              limit(8)
            );

            const relatedSnap = await getDocs(relatedQuery);
            related = relatedSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as CatchWithMeta))
              .filter((c) => c.id !== id)
              .slice(0, 4);
          }

          setRelatedCatches(related);
        } catch (relErr) {
          console.error('Related catches fetch error:', relErr);
        }
      } catch (err) {
        console.error('CatchDetail fetch error:', err);
        toast.error('Fout bij laden van vangst');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!catchData?.id) return;
    if (!window.confirm('Vangst definitief verwijderen?')) return;

    try {
      await deleteDoc(doc(db, 'catches_v2', catchData.id));
      toast.success('Vangst verwijderd');
      navigate('/catches');
    } catch (error) {
      console.error(error);
      toast.error('Fout bij verwijderen');
    }
  };

  const refreshCatch = async (catchId?: string) => {
    if (!catchId) return;
    try {
      const snap = await getDoc(doc(db, 'catches_v2', catchId));
      if (snap.exists()) {
        setCatchData({ id: snap.id, ...snap.data() } as CatchWithMeta);
      }
    } catch (error) {
      console.error('Refresh catch error:', error);
    }
  };

  const isOwner = catchData?.userId === profile?.uid;

  const heroImage = useMemo(() => getCatchImage(catchData), [catchData]);
  const galleryImages = useMemo(() => {
    const items = [heroImage, ...getExtraImages(catchData)].filter(Boolean);
    return Array.from(new Set(items));
  }, [heroImage, catchData]);

  const weatherData = useMemo(() => getWeatherData(catchData), [catchData]);

  const catchDate = toDateSafe(catchData?.timestamp);
  const createdAt = toDateSafe(catchData?.createdAt);
  const updatedAt = toDateSafe(catchData?.updatedAt);

  const speciesName = getCatchSpecies(catchData);
  const speciesGroup = getCatchSpeciesGroup(catchData);
  const baitName = getReadableBait(catchData);
  const baitGroup = getReadableBaitGroup(catchData);
  const techniqueName = getReadableTechnique(catchData);
  const videoPath = getVideoPath(catchData);

  const weatherCards = [
    {
      key: 'temp',
      label: 'Temperatuur',
      value: weatherData.temp,
      icon: Thermometer,
      color: 'text-amber-400',
    },
    {
      key: 'feelsLike',
      label: 'Gevoel',
      value: weatherData.feelsLike,
      icon: Sun,
      color: 'text-orange-400',
    },
    {
      key: 'windSpeedKmh',
      label: 'Wind',
      value: weatherData.windSpeedKmh ? `${weatherData.windSpeedKmh} km/u` : '',
      icon: Wind,
      color: 'text-sky-400',
    },
    {
      key: 'windDirection',
      label: 'Richting',
      value: weatherData.windDirection,
      icon: Navigation,
      color: 'text-cyan-400',
    },
    {
      key: 'humidity',
      label: 'Vochtigheid',
      value: weatherData.humidity,
      icon: Droplets,
      color: 'text-blue-300',
    },
    {
      key: 'pressure',
      label: 'Druk',
      value: weatherData.pressure,
      icon: Gauge,
      color: 'text-violet-300',
    },
    {
      key: 'visibilityKm',
      label: 'Zicht',
      value: weatherData.visibilityKm ? `${weatherData.visibilityKm} km` : '',
      icon: Eye,
      color: 'text-slate-300',
    },
    {
      key: 'uvIndex',
      label: 'UV',
      value:
        weatherData.uvIndex !== undefined && weatherData.uvIndex !== null
          ? String(weatherData.uvIndex)
          : '',
      icon: Sparkles,
      color: 'text-yellow-300',
    },
  ].filter((item) => item.value);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!catchData) return null;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto pb-32">
        <div className="flex items-center justify-between mb-4 px-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors active:scale-95 py-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-semibold">Terug</span>
          </button>

          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-card border border-border-subtle text-text-muted hover:text-accent hover:border-accent/30 transition-all text-xs font-bold"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Bewerken
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-card border border-border-subtle text-text-muted hover:text-danger hover:border-danger/30 transition-all text-xs font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Verwijderen
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-border-subtle bg-surface-card">
            <div className="relative">
              {galleryImages.length > 0 ? (
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden bg-surface-soft"
                  onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    if (touchStartX.current === null) return;
                    const dx = e.changedTouches[0].clientX - touchStartX.current;
                    touchStartX.current = null;
                    if (Math.abs(dx) < 40) return;
                    if (dx < 0) setActiveImage((i) => Math.min(i + 1, galleryImages.length - 1));
                    else setActiveImage((i) => Math.max(i - 1, 0));
                  }}
                >
                  <LazyImage
                    src={galleryImages[Math.min(activeImage, galleryImages.length - 1)]}
                    alt={speciesName}
                    className="rounded-none"
                    wrapperClassName="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  {galleryImages.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                      {galleryImages.map((_, i) => (
                        <span
                          key={i}
                          className={`block rounded-full transition-all ${i === activeImage ? 'w-4 h-1.5 bg-accent' : 'w-1.5 h-1.5 bg-white/50'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-[4/3] w-full flex items-center justify-center bg-gradient-to-br from-surface-card to-surface-soft">
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto">
                      <Fish className="w-10 h-10 text-accent/40" />
                    </div>
                    <p className="text-sm text-text-muted font-medium">Geen foto beschikbaar</p>
                  </div>
                </div>
              )}

              <div className="absolute left-0 right-0 bottom-0 p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {catchData.status === 'complete' ? (
                        <Badge variant="success">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Volledig
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Concept
                        </Badge>
                      )}

                      {speciesGroup && speciesGroup !== speciesName && (
                        <Badge variant="secondary">{speciesGroup}</Badge>
                      )}

                      {catchData.isPrivate ? (
                        <Badge variant="secondary">Privé</Badge>
                      ) : null}
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                      {speciesName}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold text-white/80">
                      <span className="flex items-center gap-1.5">
                        <Ruler className="w-4 h-4" />
                        {formatLength(catchData.length)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Scale className="w-4 h-4" />
                        {formatWeight(catchData.weight)}
                      </span>
                      {catchData.spotName && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {catchData.spotName}
                        </span>
                      )}
                    </div>
                  </div>

                  {(catchData.xpEarned ?? 0) > 0 && (
                    <div className="flex items-center gap-2 bg-accent/95 text-bg-main px-4 py-2.5 rounded-2xl backdrop-blur-md shrink-0 shadow-lg">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm font-black">+{catchData.xpEarned} XP</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {galleryImages.length > 1 && (
              <div className="p-3 border-t border-border-subtle bg-surface-card">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {galleryImages.map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      onClick={() => setActiveImage(index)}
                      className={`relative w-20 h-20 rounded-2xl overflow-hidden border transition-all shrink-0 ${
                        activeImage === index
                          ? 'border-accent shadow-premium-accent'
                          : 'border-border-subtle'
                      }`}
                    >
                      <LazyImage src={img} alt={`Galerij ${index + 1}`} className="rounded-2xl" wrapperClassName="w-full h-full" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="rounded-2xl border border-border-subtle bg-surface-card p-4">
              <div className="flex items-center gap-2 mb-2 text-text-muted">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em]">Datum</span>
              </div>
              <p className="text-sm font-bold text-text-primary">
                {catchDate ? format(catchDate, 'd MMM yyyy', { locale: nl }) : '—'}
              </p>
            </Card>

            <Card className="rounded-2xl border border-border-subtle bg-surface-card p-4">
              <div className="flex items-center gap-2 mb-2 text-text-muted">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em]">Tijd</span>
              </div>
              <p className="text-sm font-bold text-text-primary">
                {catchData.catchTime || (catchDate ? format(catchDate, 'HH:mm', { locale: nl }) : '—')}
              </p>
            </Card>

            <Card className="rounded-2xl border border-border-subtle bg-surface-card p-4">
              <div className="flex items-center gap-2 mb-2 text-text-muted">
                <Moon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em]">Maanfase</span>
              </div>
              <p className="text-sm font-bold text-text-primary">
                {catchData.moonPhase
                  ? ({
                      new: '🌑 Nieuwe maan',
                      crescent: '🌒 Wassende maan',
                      half: '🌓 Halve maan',
                      gibbous: '🌔 Bijna vol',
                      full: '🌕 Volle maan',
                      waning: '🌖 Afnemende maan',
                    } as Record<string, string>)[catchData.moonPhase] ?? catchData.moonPhase
                  : '—'}
              </p>
            </Card>

            <Card className="rounded-2xl border border-border-subtle bg-surface-card p-4">
              <div className="flex items-center gap-2 mb-2 text-text-muted">
                <MapPin className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em]">Plaats</span>
              </div>
              <p className="text-sm font-bold text-text-primary">
                {catchData.city || catchData.spotName || '—'}
              </p>
            </Card>
          </div>

          <div className="grid lg:grid-cols-[1.35fr_0.95fr] gap-4">
            <div className="space-y-4">
              <Card className="rounded-[1.75rem] border border-border-subtle bg-surface-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Fish className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                    Vangstoverzicht
                  </h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {keyLabel('Specifieke soort', speciesName)}
                  {keyLabel('Soortgroep', speciesGroup)}
                  {keyLabel('Lengte', formatLength(catchData.length))}
                  {keyLabel('Gewicht', formatWeight(catchData.weight))}
                  {keyLabel('Status', catchData.status || '—')}
                  {keyLabel('Schema versie', catchData.schemaVersion ?? '—')}
                  {keyLabel('Document ID', catchData.id)}
                  {keyLabel('Zichtbaarheid', catchData.isPrivate ? 'Privé' : 'Openbaar')}
                </div>
              </Card>

              <Card className="rounded-[1.75rem] border border-border-subtle bg-surface-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                    Aas & techniek
                  </h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {keyLabel('Specifiek aas', baitName || '—')}
                  {keyLabel('Aasgroep', baitGroup || '—')}
                  {keyLabel('Techniek', techniqueName || '—')}
                </div>
              </Card>

              {((catchData as any).gearSetupId || ((catchData as any).gearIds?.length ?? 0) > 0) && (
                <Card className="rounded-[1.75rem] border border-border-subtle bg-surface-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Anchor className="w-4 h-4 text-accent" />
                    <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                      Mijn Visgear
                    </h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {keyLabel('Setup ID', (catchData as any).gearSetupId || '—')}
                    {((catchData as any).gearIds?.length ?? 0) > 0 && (
                      <div className="rounded-2xl border border-border-subtle bg-surface-soft px-3 py-3 sm:col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted mb-1">
                          Gekoppelde items
                        </p>
                        <p className="text-sm font-bold text-text-primary">
                          {(catchData as any).gearIds.length} item(s)
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {(catchData.notes || videoPath) && (
                <Card className="rounded-[1.75rem] border border-border-subtle bg-surface-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-accent" />
                    <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                      Notities & media
                    </h3>
                  </div>

                  {catchData.notes && (
                    <div className="rounded-2xl border border-border-subtle bg-surface-soft px-4 py-4 mb-4">
                      <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
                        {catchData.notes}
                      </p>
                    </div>
                  )}

                  {videoPath && (
                    <div className="rounded-2xl overflow-hidden border border-border-subtle bg-black">
                      <video
                        controls
                        className="w-full h-auto max-h-[420px]"
                        preload="metadata"
                      >
                        <source src={videoPath} />
                      </video>
                    </div>
                  )}
                </Card>
              )}

              {galleryImages.length > 0 && (
                <Card className="rounded-[1.75rem] border border-border-subtle bg-surface-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-4 h-4 text-accent" />
                    <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                      Mediagalerij
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {galleryImages.map((img, index) => (
                      <button
                        key={`${img}-grid-${index}`}
                        onClick={() => {
                          setActiveImage(index);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="aspect-square rounded-2xl overflow-hidden border border-border-subtle bg-surface-soft"
                      >
                        <LazyImage src={img} alt={`Catch ${index + 1}`} wrapperClassName="w-full h-full" />
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {relatedCatches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-black text-text-muted uppercase tracking-[0.18em]">
                      Meer vangsten op {spot?.title ?? (spot as any)?.name ?? catchData.spotName ?? 'deze stek'}
                    </span>

                    {(spot || catchData.spotId) && catchData.spotId && (
                      <button
                        onClick={() => navigate(`/spots/${catchData.spotId}`)}
                        className="text-xs font-bold text-accent hover:underline"
                      >
                        Bekijk stek
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {relatedCatches.map((c) => {
                      const relTs = toDateSafe(c.timestamp);
                      const relImage = getCatchImage(c);
                      const relSpecies = getCatchSpecies(c);

                      return (
                        <motion.button
                          key={c.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate(`/catches/${c.id}`)}
                          className="relative aspect-square rounded-[1.5rem] overflow-hidden border border-border-subtle bg-surface-card text-left"
                        >
                          <LazyImage src={relImage} alt={relSpecies} wrapperClassName="w-full h-full" fallbackIconSize={40} />

                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                          <div className="absolute left-0 right-0 bottom-0 p-3">
                            <p className="text-sm font-bold text-white truncate">{relSpecies}</p>
                            <div className="flex items-center gap-2 text-[10px] text-white/70 mt-1">
                              {relTs && <span>{format(relTs, 'd MMM', { locale: nl })}</span>}
                              {c.length != null && <span>• {c.length} cm</span>}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Card className="rounded-[1.75rem] border border-border-subtle bg-surface-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                    Locatie
                  </h3>
                </div>

                <div className="space-y-3">
                  {keyLabel('Stek', catchData.spotName || (spot as any)?.title || (spot as any)?.name || '—')}
                  {keyLabel('Stad', catchData.city || '—')}
                  {keyLabel('Latitude', parseNumericString(catchData.latitude) || '—')}
                  {keyLabel('Longitude', parseNumericString(catchData.longitude) || '—')}
                </div>

                {catchData.spotId && (
                  <button
                    onClick={() => navigate(`/spots/${catchData.spotId}`)}
                    className="mt-4 w-full flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-soft px-4 py-3 text-sm font-bold text-text-primary hover:border-accent/30 hover:text-accent transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <LocateFixed className="w-4 h-4" />
                      Open stekdetail
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {catchData.sessionId && (
                  <button
                    onClick={() => navigate(`/sessions/${catchData.sessionId}`)}
                    className="mt-3 w-full flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-soft px-4 py-3 text-sm font-bold text-text-primary hover:border-accent/30 hover:text-accent transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Open sessie
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </Card>

              {weatherCards.length > 0 || weatherData.conditions ? (
                <Card className="rounded-[1.75rem] border border-border-subtle bg-surface-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Cloud className="w-4 h-4 text-accent" />
                    <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                      Weersomstandigheden
                    </h3>
                  </div>

                  {weatherData.conditions && (
                    <div className="rounded-2xl border border-border-subtle bg-surface-soft px-4 py-3 mb-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted mb-1">
                        Condities
                      </p>
                      <p className="text-sm font-bold text-text-primary">{weatherData.conditions}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {weatherCards.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.key}
                          className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-soft px-4 py-3"
                        >
                          <div className="w-10 h-10 rounded-xl bg-bg-main/50 flex items-center justify-center">
                            <Icon className={`w-4 h-4 ${item.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                              {item.label}
                            </p>
                            <p className="text-sm font-bold text-text-primary">{item.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ) : null}

              {catchData.water && Object.values(catchData.water).some((v) => v != null && v !== '') && (
                <Card className="rounded-[1.75rem] border border-border-subtle bg-surface-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Waves className="w-4 h-4 text-accent" />
                    <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                      Wateromstandigheden
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {catchData.water.clarity && (
                      <div className="rounded-2xl border border-border-subtle bg-surface-soft px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted mb-1">
                          Helderheid
                        </p>
                        <p className="text-sm font-bold text-text-primary">
                          {WATER_CLARITY_LABEL[catchData.water.clarity] ?? catchData.water.clarity}
                        </p>
                      </div>
                    )}

                    {catchData.water.depth != null && (
                      <div className="rounded-2xl border border-border-subtle bg-surface-soft px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted mb-1">
                          Diepte
                        </p>
                        <p className="text-sm font-bold text-text-primary">{catchData.water.depth} m</p>
                      </div>
                    )}

                    {catchData.water.temp != null && (
                      <div className="rounded-2xl border border-border-subtle bg-surface-soft px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted mb-1">
                          Watertemperatuur
                        </p>
                        <p className="text-sm font-bold text-text-primary">{catchData.water.temp}°C</p>
                      </div>
                    )}

                    {catchData.water.flow && (
                      <div className="rounded-2xl border border-border-subtle bg-surface-soft px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted mb-1">
                          Stroming
                        </p>
                        <p className="text-sm font-bold text-text-primary">
                          {WATER_FLOW_LABEL[catchData.water.flow] ?? catchData.water.flow}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <Card className="rounded-[1.75rem] border border-border-subtle bg-surface-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                    Tijdlijn
                  </h3>
                </div>

                <div className="space-y-3">
                  {keyLabel(
                    'Gelogd op',
                    createdAt ? format(createdAt, 'd MMM yyyy HH:mm', { locale: nl }) : '—'
                  )}
                  {keyLabel(
                    'Laatst aangepast',
                    updatedAt ? format(updatedAt, 'd MMM yyyy HH:mm', { locale: nl }) : '—'
                  )}
                  {keyLabel(
                    'Vangstmoment',
                    catchDate ? format(catchDate, 'EEEE d MMMM yyyy HH:mm', { locale: nl }) : '—'
                  )}
                </div>
              </Card>

              {catchData.incompleteFields && catchData.incompleteFields.length > 0 && (
                <Card className="rounded-[1.75rem] border border-warning/20 bg-warning/5 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    <h3 className="text-xs font-black text-warning uppercase tracking-[0.2em]">
                      Nog aan te vullen
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {catchData.incompleteFields.map((field) => (
                      <span
                        key={field}
                        className="px-3 py-1.5 rounded-xl bg-warning/10 border border-warning/20 text-xs font-bold text-warning"
                      >
                        {field}
                      </span>
                    ))}
                  </div>

                  {isOwner && (
                    <Button
                      onClick={() => setIsEditOpen(true)}
                      className="mt-4 rounded-xl h-10 px-4"
                    >
                      Vangst aanvullen
                    </Button>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditOpen && isOwner && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsEditOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative z-10 w-full max-w-2xl max-h-[95vh] overflow-hidden rounded-[2.5rem] shadow-2xl"
            >
              <CatchForm
                initialData={catchData}
                activeSessionId={catchData.sessionId}
                onComplete={(updatedId) => {
                  setIsEditOpen(false);
                  refreshCatch(updatedId || catchData.id);
                }}
                onCancel={() => setIsEditOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}