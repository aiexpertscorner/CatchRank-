import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Waves,
  Fish,
  Zap,
  Plus,
  Pause,
  Play,
  Square,
  Navigation,
  ChevronRight,
  Target,
  Wind,
  Thermometer,
  Droplets,
  CloudRain,
  Users,
  ShoppingBag,
  MessageSquare,
  History,
  TrendingUp,
  Sun,
  Cloud,
  Eye,
  Activity,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Session, Catch, Spot, UserProfile } from '../../../types';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { Input } from '../../../components/ui/Inputs';
import { useSession } from '../../../contexts/SessionContext';
import { useAuth } from '../../../App';
import { db } from '../../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { formatDistanceToNow, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { QuickCatchModal } from '../../../components/QuickCatchModal';
import { SpotSelectorModal } from '../../../components/SpotSelectorModal';
import { ParticipantInviteModal } from '../../../components/ParticipantInviteModal';
import { loggingService } from '../services/loggingService';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface SessionDashboardProps {
  session: Session;
}

const COLLECTIONS = {
  CATCHES: 'catches_v2',
  SPOTS: 'spots_v2',
  USERS: 'users',
} as const;

const getSessionOwnerId = (session: Partial<Session>) =>
  (session as any).createdBy || (session as any).userId || (session as any).ownerUserId;

const getSessionParticipantIds = (session: Partial<Session>): string[] =>
  (session as any).participantIds ||
  (session as any).participantUserIds ||
  [];

const getSessionPendingIds = (session: Partial<Session>): string[] =>
  (session as any).pendingUserIds || [];

const getSessionStart = (session: Partial<Session>) =>
  (session as any).startTime || (session as any).startedAt || null;

const getSessionSpotId = (session: Partial<Session>) =>
  (session as any).spotId || (session as any).activeSpotId || '';

const getSessionStatus = (session: Partial<Session>) => {
  if ((session as any).status) return (session as any).status;
  if ((session as any).isActive === true) return 'live';
  return 'completed';
};

const getSpotName = (spot?: Partial<Spot> | null) =>
  (spot as any)?.title || (spot as any)?.name || 'Onbekende stek';

const getSpotLat = (spot?: Partial<Spot> | null) =>
  (spot as any)?.lat ?? (spot as any)?.latitude ?? (spot as any)?.coordinates?.lat;

const getSpotLng = (spot?: Partial<Spot> | null) =>
  (spot as any)?.lng ?? (spot as any)?.longitude ?? (spot as any)?.coordinates?.lng;

const getCatchImage = (catchItem: Partial<Catch>) =>
  (catchItem as any).mainImage ||
  (catchItem as any).photoURL ||
  (catchItem as any).imageUrl ||
  '';

const getCatchSpecies = (catchItem: Partial<Catch>) =>
  (catchItem as any).speciesSpecific ||
  (catchItem as any).speciesGeneral ||
  (catchItem as any).species ||
  'Onbekend';

const formatCatchWeight = (weight?: number) => {
  if (weight == null) return '--';
  if (weight >= 1000) return `${(weight / 1000).toFixed(1)}kg`;
  return `${weight}g`;
};

export const SessionDashboard: React.FC<SessionDashboardProps> = ({ session }) => {
  const { endActiveSession, pauseActiveSession, resumeActiveSession } = useSession();
  const { profile } = useAuth();

  const [catches, setCatches] = useState<Catch[]>([]);
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [pendingParticipants, setPendingParticipants] = useState<UserProfile[]>([]);
  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);
  const [isSpotSelectorOpen, setIsSpotSelectorOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('');
  const [note, setNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const ownerId = getSessionOwnerId(session);
  const participantIds = getSessionParticipantIds(session);
  const pendingIds = getSessionPendingIds(session);
  const sessionSpotId = getSessionSpotId(session);
  const sessionStart = getSessionStart(session);
  const isOwner = profile?.uid === ownerId;

  useEffect(() => {
    if (!session.id) return;

    const catchesQ = query(
      collection(db, COLLECTIONS.CATCHES),
      where('sessionId', '==', session.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(catchesQ, (snapshot) => {
      setCatches(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Catch)));
    });

    const loadRelatedData = async () => {
      try {
        if (sessionSpotId) {
          const spotSnap = await getDoc(doc(db, COLLECTIONS.SPOTS, sessionSpotId));
          if (spotSnap.exists()) {
            setActiveSpot({ id: spotSnap.id, ...spotSnap.data() } as Spot);
          } else {
            setActiveSpot(null);
          }
        } else {
          setActiveSpot(null);
        }

        if (participantIds.length > 0) {
          const participantDocs = await Promise.all(
            participantIds.map((uid) => getDoc(doc(db, COLLECTIONS.USERS, uid)))
          );
          setParticipants(
            participantDocs
              .filter((d) => d.exists())
              .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
          );
        } else {
          setParticipants([]);
        }

        if (pendingIds.length > 0) {
          const pendingDocs = await Promise.all(
            pendingIds.map((uid) => getDoc(doc(db, COLLECTIONS.USERS, uid)))
          );
          setPendingParticipants(
            pendingDocs
              .filter((d) => d.exists())
              .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
          );
        } else {
          setPendingParticipants([]);
        }
      } catch (error) {
        console.error('SessionDashboard related data error:', error);
      }
    };

    loadRelatedData();

    return () => unsubscribe();
  }, [session.id, sessionSpotId, JSON.stringify(participantIds), JSON.stringify(pendingIds)]);

  useEffect(() => {
    if (!sessionStart) {
      setElapsedTime('00:00');
      return;
    }

    const updateTimer = () => {
      const start =
        sessionStart?.toDate?.() || (sessionStart ? new Date(sessionStart) : new Date());

      const diff = Date.now() - start.getTime();

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setElapsedTime(
        `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  const handleAddNote = async () => {
    if (!note.trim() || !session.id) return;

    setIsSubmittingNote(true);
    try {
      await loggingService.addSessionNote(session.id, note);
      setNote('');
      toast.success('Notitie toegevoegd aan tijdlijn');
    } catch (error) {
      console.error('Add note error:', error);
      toast.error('Fout bij toevoegen van notitie');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleSwitchSpot = async (spot: Spot) => {
    if (!session.id || !spot.id) return;

    try {
      await loggingService.switchSessionSpot(session.id, spot.id, getSpotName(spot));
      setIsSpotSelectorOpen(false);
      toast.success(`Verplaatst naar ${getSpotName(spot)}`);
    } catch (error) {
      console.error('Switch spot error:', error);
      toast.error('Fout bij wisselen van stek');
    }
  };

  const totalWeight = catches.reduce((sum, c: any) => sum + (c.weight || 0), 0);
  const totalLength = catches.reduce((sum, c: any) => sum + (c.length || 0), 0);
  const totalXP = catches.reduce((sum, c: any) => sum + (c.xpEarned || 0), 0);

  const timelineItems = [
    ...catches.map((c: any) => ({
      id: c.id,
      type: 'catch' as const,
      timestamp: c.timestamp?.toDate?.() || new Date(),
      data: c,
    })),
    ...(Array.isArray((session as any).notes) ? (session as any).notes : []).map((n: any, idx: number) => ({
      id: `note-${idx}`,
      type: n.type || 'note',
      timestamp: n.timestamp?.toDate?.() || new Date(),
      data: n,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const sessionStatus = getSessionStatus(session);

  return (
    <div className="space-y-6 pb-20">
      {/* Main Status Hub */}
      <Card
        variant="premium"
        className="relative overflow-hidden p-6 md:p-10 rounded-[2.5rem] border border-accent/20"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 blur-[100px] -mr-48 -mt-48" />

        <div className="relative z-10 flex flex-col lg:flex-row gap-8 md:gap-12">
          {/* Left: Timer & Title */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-3 h-3 rounded-full shadow-[0_0_15px_rgba(244,194,13,0.6)]',
                  sessionStatus === 'live' ? 'bg-accent animate-pulse' : 'bg-text-muted'
                )}
              />
              <span className="text-xs font-black uppercase tracking-[0.3em] text-accent">
                {sessionStatus === 'live' ? 'Sessie Live' : 'Sessie Gepauzeerd'}
              </span>
            </div>

            <h2 className="text-4xl md:text-7xl font-black text-primary tracking-tighter leading-tight">
              {(session as any).name || (session as any).title || 'Actieve sessie'}
            </h2>

            <div className="flex items-center gap-8 md:gap-12">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                  Verstreken Tijd
                </p>
                <p className="text-3xl md:text-5xl font-mono font-black text-primary tracking-tight tabular-nums">
                  {elapsedTime}
                </p>
              </div>
              <div className="h-12 w-px bg-border-subtle" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                  Totaal XP
                </p>
                <div className="flex items-center gap-2">
                  <Zap className="w-6 h-6 md:w-8 md:h-8 text-accent fill-current" />
                  <p className="text-3xl md:text-5xl font-black text-accent tracking-tight">
                    +{totalXP}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Primary Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-4 min-w-[280px]">
            <Button
              className="h-16 md:h-20 text-xl md:text-2xl rounded-2xl shadow-premium-accent font-black flex-1 active:scale-95 transition-all"
              onClick={() => setIsQuickCatchOpen(true)}
              icon={<Plus className="w-6 h-6 md:w-8 md:h-8" />}
            >
              Vangst Loggen
            </Button>

            {isOwner && (
              <div className="flex gap-4 flex-1">
                {sessionStatus === 'live' ? (
                  <Button
                    variant="secondary"
                    className="h-16 md:h-20 flex-1 rounded-2xl font-black border-border-subtle hover:bg-surface-soft"
                    onClick={pauseActiveSession}
                    icon={<Pause className="w-5 h-5 md:w-6 md:h-6" />}
                  >
                    Pauze
                  </Button>
                ) : (
                  <Button
                    className="h-16 md:h-20 flex-1 rounded-2xl font-black bg-accent text-black shadow-premium-accent"
                    onClick={resumeActiveSession}
                    icon={<Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                  >
                    Hervat
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="h-16 md:h-20 flex-1 rounded-2xl font-black text-danger hover:bg-danger/10 border border-danger/20"
                  onClick={endActiveSession}
                  icon={<Square className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                >
                  Stop
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weather */}
          <Card className="p-6 md:p-8 rounded-[2rem] border border-border-subtle bg-surface-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Waves className="w-32 h-32 text-info" />
            </div>

            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-info/10 rounded-2xl flex items-center justify-center">
                    <Waves className="w-6 h-6 text-info" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-primary tracking-tight">
                      Weer & Forecast
                    </h4>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">
                      Real-time condities
                    </p>
                  </div>
                </div>
                {((session as any).weatherStart || (session as any).weatherSnapshotStart)?.description && (
                  <Badge
                    variant="outline"
                    className="bg-info/10 text-info border-info/20 px-3 py-1 font-black uppercase tracking-widest text-[9px]"
                  >
                    {((session as any).weatherStart || (session as any).weatherSnapshotStart).description}
                  </Badge>
                )}
              </div>

              {((session as any).weatherStart || (session as any).weatherSnapshotStart) ? (
                <div className="space-y-8">
                  {(() => {
                    const weather =
                      (session as any).weatherStart || (session as any).weatherSnapshotStart;

                    return (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-text-muted">
                              <Thermometer className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                Temp
                              </span>
                            </div>
                            <p className="text-2xl font-black text-primary">
                              {weather.temp}°C
                            </p>
                            <p className="text-[10px] text-text-muted">
                              Gevoel: {weather.feelsLike ?? '--'}°C
                            </p>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-text-muted">
                              <Wind className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                Wind
                              </span>
                            </div>
                            <p className="text-2xl font-black text-primary">
                              {weather.windSpeed} <span className="text-xs text-text-muted font-bold">km/u</span>
                            </p>
                            <p className="text-[10px] text-text-muted">
                              Richting: {weather.windDir ?? weather.windDirection ?? '--'}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-text-muted">
                              <Droplets className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                Vocht
                              </span>
                            </div>
                            <p className="text-2xl font-black text-primary">
                              {weather.humidity ?? '--'}%
                            </p>
                            <p className="text-[10px] text-text-muted">
                              Druk: {weather.pressure ?? '--'} hPa
                            </p>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-text-muted">
                              <Eye className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                Zicht
                              </span>
                            </div>
                            <p className="text-2xl font-black text-primary">
                              {weather.visibility ?? '--'} <span className="text-xs text-text-muted font-bold">km</span>
                            </p>
                            <p className="text-[10px] text-text-muted">UV: {weather.uv ?? weather.uvIndex ?? '--'}</p>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-border-subtle">
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">
                            Verwachting komende uren
                          </p>
                          <div className="flex justify-between overflow-x-auto no-scrollbar gap-4 pb-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="flex flex-col items-center gap-2 min-w-[60px] p-3 bg-surface-soft/30 rounded-xl"
                              >
                                <span className="text-[10px] font-bold text-text-muted">
                                  {format(new Date(Date.now() + i * 3600000), 'HH:mm')}
                                </span>
                                {i % 2 === 0 ? (
                                  <Cloud className="w-5 h-5 text-text-secondary" />
                                ) : (
                                  <Sun className="w-5 h-5 text-accent" />
                                )}
                                <span className="text-sm font-black text-primary">
                                  {(weather.temp ?? 0) + (i % 2 === 0 ? -1 : 1)}°
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <CloudRain className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                  <p className="text-text-secondary font-medium italic">
                    Geen weerdata beschikbaar voor deze sessie.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Active Spot Card */}
          <Card className="p-6 md:p-8 rounded-[2rem] border border-border-subtle bg-surface-card group hover:border-accent/30 transition-all overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <MapPin className="w-32 h-32 text-accent" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <MapPin className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-2xl font-black text-primary tracking-tight">
                      {activeSpot ? getSpotName(activeSpot) : 'Laden...'}
                    </h4>
                    <Badge
                      variant="outline"
                      className="bg-accent/10 text-accent border-accent/20 text-[9px] font-black uppercase tracking-widest"
                    >
                      Actief
                    </Badge>
                  </div>
                  <p className="text-sm text-text-muted flex items-center gap-2 font-medium">
                    <Navigation className="w-4 h-4 text-accent" />
                    {activeSpot
                      ? `${(activeSpot as any).waterType || 'Onbekend water'} • ${
                          getSpotLat(activeSpot) != null && getSpotLng(activeSpot) != null
                            ? `${Number(getSpotLat(activeSpot)).toFixed(4)}, ${Number(
                                getSpotLng(activeSpot)
                              ).toFixed(4)}`
                            : 'Geen coördinaten'
                        }`
                      : 'Geen actieve stek'}
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full sm:w-auto h-12 px-6 rounded-xl font-black border-border-subtle hover:border-accent/50 group-hover:bg-accent/5"
                onClick={() => setIsSpotSelectorOpen(true)}
              >
                Stek Wisselen
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>

          {/* Spot History / Timeline */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-accent" />
                <h3 className="text-xl font-black text-primary tracking-tight">Stek Historie</h3>
              </div>
              <Badge className="bg-surface-soft text-text-secondary rounded-lg font-black px-3">
                {(session as any).spotTimeline?.length || 0}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(session as any).spotTimeline && (session as any).spotTimeline.length > 0 ? (
                [...(session as any).spotTimeline].reverse().map((spot: any, idx: number) => (
                  <Card
                    key={`${spot.spotId}-${idx}`}
                    className={cn(
                      'p-4 rounded-2xl border bg-surface-card flex items-center justify-between group',
                      sessionSpotId === spot.spotId
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-border-subtle'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          sessionSpotId === spot.spotId
                            ? 'bg-accent text-black'
                            : 'bg-surface-soft text-text-muted'
                        )}
                      >
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-primary">
                          {spot.name || 'Stek'}
                        </p>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                          Sinds {format(spot.arrivedAt?.toDate?.() || new Date(), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    {sessionSpotId === spot.spotId && (
                      <Badge
                        variant="success"
                        className="bg-accent text-black border-none text-[8px] font-black uppercase tracking-widest"
                      >
                        Actief
                      </Badge>
                    )}
                  </Card>
                ))
              ) : (
                <div className="col-span-full p-8 text-center border-2 border-dashed border-border-subtle rounded-[2rem] bg-surface-soft/10">
                  <p className="text-text-secondary font-medium italic">
                    Geen stek historie beschikbaar.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Session Timeline */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-accent" />
                <h3 className="text-xl font-black text-primary tracking-tight">Sessie Tijdlijn</h3>
              </div>
              <Badge className="bg-surface-soft text-text-secondary rounded-lg font-black px-3">
                {timelineItems.length}
              </Badge>
            </div>

            <div className="flex gap-3">
              <Input
                placeholder="Voeg een observatie of event toe..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-12 rounded-xl bg-surface-card border-border-subtle focus:border-accent font-medium"
                onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <Button
                className="h-12 w-12 p-0 rounded-xl shrink-0"
                onClick={handleAddNote}
                loading={isSubmittingNote}
                disabled={!note.trim()}
              >
                <Plus className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-4 relative before:absolute before:left-[23px] before:top-4 before:bottom-4 before:w-0.5 before:bg-border-subtle/30">
              {timelineItems.length > 0 ? (
                timelineItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative pl-12"
                  >
                    <div
                      className={cn(
                        'absolute left-0 top-1 w-12 h-12 rounded-xl flex items-center justify-center z-10 shadow-sm',
                        item.type === 'catch'
                          ? 'bg-accent text-black'
                          : item.type === 'spot_change'
                            ? 'bg-water text-white'
                            : 'bg-surface-soft text-text-muted'
                      )}
                    >
                      {item.type === 'catch' ? (
                        <Fish className="w-6 h-6" />
                      ) : item.type === 'spot_change' ? (
                        <MapPin className="w-6 h-6" />
                      ) : (
                        <MessageSquare className="w-5 h-5" />
                      )}
                    </div>

                    <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl hover:border-accent/30 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                          {format(item.timestamp, 'HH:mm')} •{' '}
                          {formatDistanceToNow(item.timestamp, {
                            addSuffix: true,
                            locale: nl,
                          })}
                        </span>
                        {item.type === 'catch' && (
                          <span className="text-[10px] font-black text-accent uppercase tracking-widest">
                            +{item.data.xpEarned || 0} XP
                          </span>
                        )}
                      </div>

                      {item.type === 'catch' ? (
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-soft shrink-0">
                            {getCatchImage(item.data) ? (
                              <img
                                src={getCatchImage(item.data)}
                                alt={getCatchSpecies(item.data)}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text-muted">
                                <Fish className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-primary">
                              {getCatchSpecies(item.data)}
                            </p>
                            <p className="text-xs text-text-muted">
                              {(item.data as any).length || '--'}cm •{' '}
                              {formatCatchWeight((item.data as any).weight)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p
                          className={cn(
                            'font-bold text-sm',
                            item.type === 'spot_change' ? 'text-water' : 'text-primary'
                          )}
                        >
                          {item.data.text}
                        </p>
                      )}
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-border-subtle rounded-[2rem] bg-surface-soft/10 ml-12">
                  <History className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                  <p className="text-text-secondary font-medium italic">
                    Nog geen activiteit gelogd.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Stats */}
          <Card className="p-6 md:p-8 rounded-[2rem] border border-border-subtle bg-surface-card space-y-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h4 className="text-xl font-black text-primary tracking-tight">Sessie Stats</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle space-y-1">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                  Vangsten
                </p>
                <p className="text-2xl font-black text-primary">{catches.length}</p>
              </div>
              <div className="p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle space-y-1">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                  Totaal XP
                </p>
                <p className="text-2xl font-black text-accent">+{totalXP}</p>
              </div>
              <div className="p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle space-y-1">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                  Gewicht
                </p>
                <p className="text-2xl font-black text-primary">
                  {formatCatchWeight(totalWeight)}
                </p>
              </div>
              <div className="p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle space-y-1">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                  Lengte
                </p>
                <p className="text-2xl font-black text-primary">
                  {totalLength} <span className="text-xs text-text-muted">cm</span>
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-border-subtle">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">
                Sessie Details
              </p>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted">Type</span>
                  <Badge
                    variant="secondary"
                    className="bg-surface-soft text-primary font-black uppercase tracking-widest text-[9px]"
                  >
                    {(session as any).sessionType || (session as any).type || 'Solo'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted">Methode</span>
                  <span className="text-xs font-black text-primary uppercase tracking-widest">
                    {(session as any).metadata?.method || 'Onbekend'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted">Doelsoort</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(session as any).metadata?.targetSpecies?.length ? (
                      (session as any).metadata.targetSpecies.map((s: string) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="text-[9px] font-black uppercase tracking-widest border-accent/20 text-accent"
                        >
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs font-black text-text-muted">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Participants */}
          <Card className="p-6 md:p-8 rounded-[2rem] border border-border-subtle bg-surface-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-water" />
                <h4 className="text-xl font-black text-primary tracking-tight">Deelnemers</h4>
              </div>
              <Badge className="bg-water/10 text-water border-none font-black">
                {participants.length + pendingParticipants.length}
              </Badge>
            </div>

            <div className="space-y-4">
              {participants.map((p) => (
                <div
                  key={p.uid}
                  className="flex items-center justify-between p-3 bg-surface-soft/30 rounded-2xl border border-border-subtle group hover:border-water/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-surface shadow-sm">
                      <img
                        src={
                          p.photoURL ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            p.displayName
                          )}&background=random`
                        }
                        alt={p.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-black text-primary">{p.displayName}</p>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                        Level {p.level}
                      </p>
                    </div>
                  </div>
                  {p.uid === ownerId && (
                    <Badge className="bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest border-none">
                      Host
                    </Badge>
                  )}
                </div>
              ))}

              {pendingParticipants.map((p) => (
                <div
                  key={p.uid}
                  className="flex items-center justify-between p-3 bg-surface-soft/10 rounded-2xl border border-dashed border-border-subtle opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-surface grayscale">
                      <img
                        src={
                          p.photoURL ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            p.displayName
                          )}&background=random`
                        }
                        alt={p.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-black text-text-secondary">{p.displayName}</p>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest italic">
                        Uitnodiging verstuurd
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[8px] font-black uppercase tracking-widest border-border-subtle text-text-muted"
                  >
                    Pending
                  </Badge>
                </div>
              ))}

              <Button
                variant="ghost"
                className="w-full h-12 rounded-xl border-2 border-dashed border-border-subtle text-text-muted hover:text-water hover:border-water/30 font-black text-xs uppercase tracking-widest"
                onClick={() => setIsInviteModalOpen(true)}
              >
                Vriend Uitnodigen +
              </Button>
            </div>
          </Card>

          {/* Gear */}
          <Card className="p-6 md:p-8 rounded-[2rem] border border-border-subtle bg-surface-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-accent" />
                <h4 className="text-xl font-black text-primary tracking-tight">Actieve Gear</h4>
              </div>
              <Badge className="bg-accent/10 text-accent border-none font-black">
                {((session as any).gearIds || (session as any).linkedGearIds || []).length}
              </Badge>
            </div>

            {(((session as any).gearIds || (session as any).linkedGearIds || []).length > 0) ? (
              <div className="space-y-4">
                <div className="p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-primary">Actieve sessie gear</p>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                      Gekoppelde uitrusting
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="w-full h-12 rounded-xl font-black border-border-subtle text-xs uppercase tracking-widest"
                >
                  Gear Beheren
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center mx-auto opacity-20">
                  <ShoppingBag className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-xs text-text-muted font-medium italic">
                  Geen gear gekoppeld aan deze sessie.
                </p>
                <Button
                  variant="secondary"
                  className="w-full h-12 rounded-xl font-black border-border-subtle text-xs uppercase tracking-widest"
                >
                  Gear Toevoegen +
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      <QuickCatchModal
        isOpen={isQuickCatchOpen}
        onClose={() => setIsQuickCatchOpen(false)}
        activeSessionId={session.id}
      />

      <SpotSelectorModal
        isOpen={isSpotSelectorOpen}
        onClose={() => setIsSpotSelectorOpen(false)}
        onSelect={handleSwitchSpot}
        currentSpotId={sessionSpotId}
      />

      <ParticipantInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        session={session}
      />
    </div>
  );
};