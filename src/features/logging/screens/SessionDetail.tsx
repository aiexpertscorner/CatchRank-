import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  Fish,
  History,
  MapPin,
  Zap,
  Calendar,
  Play,
  CheckCircle2,
  Pause,
  Archive,
  Scale,
  Ruler,
  Thermometer,
  Wind,
  User,
  Trophy,
  Droplets,
  Gauge,
} from 'lucide-react';
import { useAuth } from '../../../App';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Session, Catch, Spot, UserProfile } from '../../../types';
import { PageLayout } from '../../../components/layout/PageLayout';
import { Card, Badge } from '../../../components/ui/Base';
import { LazyImage } from '../../../components/ui/LazyImage';
import { resolveCatchImageSrc } from '../../../lib/catchUtils';
import { getSessionImage } from '../../dashboard/utils/dashboardHelpers';
import { resolveCoords } from '../../../lib/coordUtils';
import LocationMiniMap from '../../spots/components/LocationMiniMap';
import { motion } from 'motion/react';
import { format, differenceInMinutes } from 'date-fns';
import { nl } from 'date-fns/locale';

const COLLECTIONS = {
  SESSIONS: 'sessions_v2',
  CATCHES: 'catches_v2',
  SPOTS: 'spots_v2',
  USERS: 'users',
} as const;

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: 'success' | 'warning' | 'neutral' | 'accent' | 'secondary';
    icon: React.ReactNode;
  }
> = {
  live: {
    label: 'Live',
    variant: 'success',
    icon: <Play className="w-3 h-3" />,
  },
  paused: {
    label: 'Gepauzeerd',
    variant: 'warning',
    icon: <Pause className="w-3 h-3" />,
  },
  ended: {
    label: 'Beëindigd',
    variant: 'secondary',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  completed: {
    label: 'Voltooid',
    variant: 'accent',
    icon: <Trophy className="w-3 h-3" />,
  },
  draft: {
    label: 'Concept',
    variant: 'neutral',
    icon: <Archive className="w-3 h-3" />,
  },
  archived: {
    label: 'Archief',
    variant: 'neutral',
    icon: <Archive className="w-3 h-3" />,
  },
};

const getSessionStatus = (session: Partial<Session>) => {
  if ((session as any).status) return (session as any).status;
  if ((session as any).isActive === true) return 'live';
  return 'completed';
};

const getSessionName = (session: Partial<Session>) =>
  (session as any).name || (session as any).title || 'Vissessie';

const getSessionDescription = (session: Partial<Session>) =>
  (session as any).description || '';

const getSessionOwnerId = (session: Partial<Session>) =>
  (session as any).createdBy || (session as any).userId || (session as any).ownerUserId;

const getSessionParticipantIds = (session: Partial<Session>) => {
  const ownerId = getSessionOwnerId(session);
  return Array.from(
    new Set([
      ...(ownerId ? [ownerId] : []),
      ...(((session as any).participantIds || (session as any).participantUserIds || []) as string[]),
    ])
  );
};

const getSessionStart = (session: Partial<Session>) =>
  (session as any).startTime || (session as any).startedAt || null;

const getSessionEnd = (session: Partial<Session>) =>
  (session as any).endTime || (session as any).endedAt || null;

const getSessionSpotTimeline = (session: Partial<Session>) =>
  ((session as any).spotTimeline || []) as Array<{
    spotId: string;
    name?: string;
    arrivedAt?: any;
    leftAt?: any;
  }>;

const getSessionWeatherStart = (session: Partial<Session>) =>
  (session as any).weatherStart || (session as any).weatherSnapshotStart || null;

const getSessionWeatherEnd = (session: Partial<Session>) =>
  (session as any).weatherEnd || (session as any).weatherSnapshotEnd || null;

const getSessionStats = (session: Partial<Session>) =>
  (session as any).stats || (session as any).statsSummary || {};

const getCatchImage = (c: Partial<Catch>) => resolveCatchImageSrc(c as any);

const getCatchSpecies = (c: Partial<Catch>) =>
  (c as any).speciesSpecific || (c as any).speciesGeneral || (c as any).species || 'Onbekend';

const getSpotDisplayName = (spot?: Partial<Spot> | null) =>
  (spot as any)?.title || (spot as any)?.name || 'Stek';

const formatWeight = (weight?: number) => {
  if (weight == null) return '--';
  if (weight >= 1000) return `${(weight / 1000).toFixed(1)} kg`;
  return `${weight} g`;
};

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [spots, setSpots] = useState<Record<string, Spot>>({});
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const sessionDoc = await getDoc(doc(db, COLLECTIONS.SESSIONS, id));

        if (!sessionDoc.exists()) {
          navigate('/logboek/sessies');
          return;
        }

        const sessionData = { id: sessionDoc.id, ...sessionDoc.data() } as Session;
        setSession(sessionData);

        // Primary: query catches that reference this session
        const catchQuery = query(
          collection(db, COLLECTIONS.CATCHES),
          where('sessionId', '==', id),
          orderBy('timestamp', 'asc')
        );
        const catchSnap = await getDocs(catchQuery);
        let catchList = catchSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Catch));

        // Fallback for migrated sessions: fetch via linkedCatchIds on the session doc
        const linkedIds: string[] = (sessionData as any).linkedCatchIds || [];
        if (catchList.length === 0 && linkedIds.length > 0) {
          const linkedDocs = await Promise.all(
            linkedIds.map((cid) => getDoc(doc(db, COLLECTIONS.CATCHES, cid)))
          );
          catchList = linkedDocs
            .filter((d) => d.exists())
            .map((d) => ({ id: d.id, ...d.data() } as Catch))
            .sort((a: any, b: any) => {
              const ta = a.timestamp?.toDate?.()?.getTime?.() ?? a.timestamp ?? 0;
              const tb = b.timestamp?.toDate?.()?.getTime?.() ?? b.timestamp ?? 0;
              return (typeof ta === 'number' ? ta : new Date(ta).getTime()) -
                     (typeof tb === 'number' ? tb : new Date(tb).getTime());
            });
        }
        setCatches(catchList);

        const spotTimeline = getSessionSpotTimeline(sessionData);
        const spotIds = Array.from(
          new Set([
            ...((((sessionData as any).linkedSpotIds || []) as string[])),
            ...spotTimeline.map((s) => s.spotId),
            ...(((sessionData as any).spotId ? [(sessionData as any).spotId] : []) as string[]),
          ])
        );

        if (spotIds.length > 0) {
          const spotDocs = await Promise.all(
            spotIds.map((sid) => getDoc(doc(db, COLLECTIONS.SPOTS, sid)))
          );

          const spotMap: Record<string, Spot> = {};
          spotDocs.forEach((d) => {
            if (d.exists()) {
              spotMap[d.id] = { id: d.id, ...d.data() } as Spot;
            }
          });
          setSpots(spotMap);
        } else {
          setSpots({});
        }

        const participantIds = getSessionParticipantIds(sessionData);
        if (participantIds.length > 0) {
          const profileDocs = await Promise.all(
            participantIds.map((uid) => getDoc(doc(db, COLLECTIONS.USERS, uid)))
          );
          setParticipants(
            profileDocs
              .filter((d) => d.exists())
              .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
          );
        } else {
          setParticipants([]);
        }
      } catch (err) {
        console.error('SessionDetail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!session) return null;

  const startedAtRaw = getSessionStart(session);
  const endedAtRaw = getSessionEnd(session);

  const startedAt =
    startedAtRaw?.toDate?.() ?? (startedAtRaw ? new Date(startedAtRaw) : null);
  const endedAt =
    endedAtRaw?.toDate?.() ?? (endedAtRaw ? new Date(endedAtRaw) : null);

  const sessionStatus = getSessionStatus(session);
  const statusCfg = STATUS_CONFIG[sessionStatus] ?? STATUS_CONFIG.completed;

  const sessionStats = getSessionStats(session);
  // Use stored totalXp as authoritative; fallback to sum of individual catch XP
  const storedXp: number = sessionStats.totalXp ?? 0;
  const catchXp = catches.reduce((sum, c: any) => sum + (c.xpEarned ?? 0), 0);
  const totalXp = storedXp > 0 ? storedXp : catchXp;

  const speciesSet = new Set(catches.map((c) => getCatchSpecies(c)).filter(Boolean));
  const isOwner = getSessionOwnerId(session) === profile?.uid;

  const weatherStart = getSessionWeatherStart(session);
  const weatherEnd = getSessionWeatherEnd(session);

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto pb-nav-pad space-y-3">
        {/* Back Nav */}
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors active:scale-95 py-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-semibold">Terug</span>
          </button>
        </div>

        {/* Header Card */}
        <Card className="bg-surface-card border border-border-subtle rounded-2xl overflow-hidden">
          {/* Session photo — hero */}
          {getSessionImage(session) ? (
            <div className="w-full h-52 overflow-hidden">
              <LazyImage
                src={getSessionImage(session)}
                alt="Sessie foto"
                wrapperClassName="w-full h-full"
              />
            </div>
          ) : (
            <div className="w-full h-28 bg-brand/5 flex items-center justify-center border-b border-border-subtle">
              <History className="w-10 h-10 text-brand/20" />
            </div>
          )}
          <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-text-primary tracking-tight leading-tight line-clamp-2">
                {getSessionName(session)}
              </h1>
              {getSessionDescription(session) && (
                <p className="text-sm text-text-muted mt-1 line-clamp-2">
                  {getSessionDescription(session)}
                </p>
              )}
            </div>
            <Badge
              variant={statusCfg.variant}
              className="shrink-0 flex items-center gap-1"
            >
              {statusCfg.icon}
              {statusCfg.label}
            </Badge>
          </div>

          {/* Spot name from session data */}
          {((session as any).spotName || (session as any).locationName || (session as any).spotTitle) && (
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-text-muted mb-3">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {(session as any).spotName || (session as any).locationName || (session as any).spotTitle}
            </p>
          )}

          {/* Date + Duration */}
          <div className="flex flex-wrap gap-3 text-xs text-text-muted font-medium">
            {startedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(startedAt, 'd MMMM yyyy HH:mm', { locale: nl })}
              </span>
            )}

            {(() => {
              const durationMin = (session as any).durationMinutes > 0
                ? (session as any).durationMinutes
                : (startedAt && endedAt ? differenceInMinutes(endedAt, startedAt) : 0);
              if (durationMin <= 0) return null;
              const h = Math.floor(durationMin / 60);
              const m = durationMin % 60;
              return (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {h > 0 ? `${h}u ${m}m` : `${m} min`}
                </span>
              );
            })()}

            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold text-accent">
                {(session as any).type || (session as any).mode || 'Sessie'}
              </span>
            </span>
          </div>
          </div>{/* /p-5 */}
        </Card>

        {/* Stats Strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: 'Vangsten',
              value: catches.length > 0
                ? catches.length
                : (sessionStats.totalFish ?? sessionStats.totalCatches ?? 0),
              icon: <Fish className="w-4 h-4 text-accent" />,
              accent: 'text-accent',
            },
            {
              label: 'Soorten',
              value: speciesSet.size,
              icon: <Trophy className="w-4 h-4 text-warning" />,
              accent: 'text-warning',
            },
            {
              label: 'Stekken',
              value: Object.keys(spots).length,
              icon: <MapPin className="w-4 h-4 text-blue-400" />,
              accent: 'text-blue-400',
            },
            {
              label: 'XP',
              value: totalXp,
              icon: <Zap className="w-4 h-4 text-success" />,
              accent: 'text-success',
            },
          ].map((s) => (
            <Card
              key={s.label}
              className="bg-surface-card border border-border-subtle rounded-xl p-3 text-center"
            >
              <div className="flex justify-center mb-1">{s.icon}</div>
              <p className={`text-lg font-black ${s.accent}`}>{s.value}</p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                {s.label}
              </p>
            </Card>
          ))}
        </div>

        {/* Session Location Mini-Map — primary spot coords */}
        {(() => {
          // Find the first linked spot that has resolvable coordinates
          const primarySpot = Object.values(spots).find((s) => resolveCoords(s) !== null);
          if (!primarySpot) return null;
          const coords = resolveCoords(primarySpot)!;
          const spotName = (primarySpot as any).title || primarySpot.name || 'Stek';
          return (
            <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">
                Locatie
              </h3>
              <LocationMiniMap
                lat={coords.lat}
                lng={coords.lng}
                label={spotName}
                height={160}
                showCoords
                showGoogleMapsBtn
              />
            </Card>
          );
        })()}

        {/* Participants */}
        {participants.length > 0 && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">
              Deelnemers
            </h3>
            <div className="space-y-2">
              {participants.map((p) => {
                const userCatches = catches.filter((c) => c.userId === p.uid);
                const userXp = userCatches.reduce((sum, c: any) => sum + (c.xpEarned ?? 0), 0);

                return (
                  <div
                    key={p.uid}
                    className="flex items-center gap-3 p-2.5 bg-surface-soft rounded-xl"
                  >
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-surface border border-border-subtle shrink-0">
                      <LazyImage src={p.photoURL} alt={p.displayName || 'Deelnemer'} wrapperClassName="w-full h-full" fallbackIconSize={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {p.displayName}
                        {p.uid === getSessionOwnerId(session) && (
                          <span className="text-[10px] text-accent font-black ml-1">
                            • Eigenaar
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {userCatches.length} vangst{userCatches.length !== 1 ? 'en' : ''}
                      </p>
                    </div>
                    {userXp > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Zap className="w-3 h-3 text-accent" />
                        <span className="text-xs font-black text-accent">{userXp}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Catches Timeline */}
        {catches.length > 0 && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">
                Vangsten ({catches.length})
              </h3>
            </div>
            <div className="space-y-2">
              {catches.map((c) => {
                const catchTs =
                  (c as any).timestamp?.toDate?.() ??
                  ((c as any).timestamp ? new Date((c as any).timestamp) : null);

                const catcher = participants.find((p) => p.uid === c.userId);

                return (
                  <motion.div
                    key={c.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/catches/${c.id}`)}
                    className="flex items-center gap-3 p-2.5 bg-surface-soft rounded-xl cursor-pointer hover:bg-surface-card transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface border border-border-subtle shrink-0">
                      <LazyImage src={getCatchImage(c)} alt={getCatchSpecies(c)} wrapperClassName="w-full h-full" fallbackIconSize={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {getCatchSpecies(c)}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted">
                        {(c as any).weight != null && (
                          <span className="flex items-center gap-0.5">
                            <Scale className="w-3 h-3" />
                            {formatWeight((c as any).weight)}
                          </span>
                        )}
                        {(c as any).length != null && (
                          <span className="flex items-center gap-0.5">
                            <Ruler className="w-3 h-3" />
                            {(c as any).length}cm
                          </span>
                        )}
                        {catcher && participants.length > 1 && (
                          <span className="text-accent/80 font-semibold">
                            {catcher.displayName}
                          </span>
                        )}
                        {catchTs && (
                          <span>{format(catchTs, 'HH:mm', { locale: nl })}</span>
                        )}
                      </div>
                    </div>

                    {((c as any).xpEarned ?? 0) > 0 && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Zap className="w-3 h-3 text-accent" />
                        <span className="text-xs font-black text-accent">
                          +{(c as any).xpEarned}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Spot Timeline */}
        {getSessionSpotTimeline(session).length > 0 && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">
              Stek Tijdlijn
            </h3>
            <div className="space-y-2">
              {getSessionSpotTimeline(session).map((entry, i) => {
                const arrAt =
                  entry.arrivedAt?.toDate?.() ??
                  (entry.arrivedAt ? new Date(entry.arrivedAt) : null);
                const leftAt =
                  entry.leftAt?.toDate?.() ??
                  (entry.leftAt ? new Date(entry.leftAt) : null);
                const spotCatches = catches.filter((c) => c.spotId === entry.spotId);

                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2.5 bg-surface-soft rounded-xl"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/spots/${entry.spotId}`)}
                        className="text-sm font-bold text-text-primary hover:text-accent transition-colors truncate block"
                      >
                        {entry.name || getSpotDisplayName(spots[entry.spotId])}
                      </button>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                        {arrAt && <span>{format(arrAt, 'HH:mm', { locale: nl })}</span>}
                        {leftAt && (
                          <>
                            <span>→</span>
                            <span>{format(leftAt, 'HH:mm', { locale: nl })}</span>
                          </>
                        )}
                        {spotCatches.length > 0 && (
                          <span className="text-accent font-semibold">
                            {spotCatches.length} vangst
                            {spotCatches.length !== 1 ? 'en' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Weather snapshots */}
        {(weatherStart || weatherEnd) && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">
              Weersomstandigheden
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Start', w: weatherStart },
                { label: 'Einde', w: weatherEnd },
              ]
                .filter((x) => x.w)
                .map(({ label, w }) => (
                  <div key={label} className="p-3 bg-surface-soft rounded-xl space-y-1.5">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-wider">
                      {label}
                    </p>
                    {w.conditions && (
                      <p className="text-[11px] font-semibold text-text-primary capitalize leading-tight">
                        {w.conditions}
                      </p>
                    )}
                    {w.tempC != null && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Thermometer className="w-3.5 h-3.5 text-accent shrink-0" />
                        {w.tempC}°C
                        {w.feelslikeC != null && w.feelslikeC !== w.tempC && (
                          <span className="text-text-muted">(voelt {w.feelslikeC}°)</span>
                        )}
                      </div>
                    )}
                    {w.windKph != null && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Wind className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        {w.windKph} km/u {w.windDir || ''}
                      </div>
                    )}
                    {w.humidityPct != null && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Droplets className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                        {w.humidityPct}%
                      </div>
                    )}
                    {w.pressureMb != null && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Gauge className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        {w.pressureMb} mb
                      </div>
                    )}
                    {w.moonPhase && (
                      <p className="text-[10px] text-text-muted">
                        🌙 {w.moonPhase}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </Card>
        )}

        {/* Notes */}
        {(session as any).notes && typeof (session as any).notes === 'string' && (session as any).notes.trim() !== '' && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-2">
              Notities
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {(session as any).notes}
            </p>
          </Card>
        )}

        {/* Empty catches */}
        {catches.length === 0 && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-8 text-center">
            <Fish className="w-10 h-10 text-accent/20 mx-auto mb-3" />
            <p className="text-sm font-bold text-text-muted">
              Geen vangsten in deze sessie
            </p>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}