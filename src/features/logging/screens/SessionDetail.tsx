import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  Fish,
  MapPin,
  Zap,
  Users,
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
  Trophy
} from 'lucide-react';
import { useAuth } from '../../../App';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Session, Catch, Spot, UserProfile } from '../../../types';
import { PageLayout } from '../../../components/layout/PageLayout';
import { Card, Badge } from '../../../components/ui/Base';
import { motion } from 'motion/react';
import { format, formatDuration, intervalToDuration } from 'date-fns';
import { nl } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'neutral' | 'accent' | 'secondary'; icon: React.ReactNode }> = {
  live:    { label: 'Live',      variant: 'success',  icon: <Play className="w-3 h-3" /> },
  paused:  { label: 'Gepauzeerd', variant: 'warning', icon: <Pause className="w-3 h-3" /> },
  ended:   { label: 'Beëindigd', variant: 'secondary', icon: <CheckCircle2 className="w-3 h-3" /> },
  completed: { label: 'Voltooid', variant: 'accent',  icon: <Trophy className="w-3 h-3" /> },
  draft:   { label: 'Concept',   variant: 'neutral',  icon: <Archive className="w-3 h-3" /> },
  archived: { label: 'Archief',  variant: 'neutral',  icon: <Archive className="w-3 h-3" /> },
};

function formatDurationFromMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}u`;
  return `${h}u ${m}m`;
}

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
        // Load session
        const sessionDoc = await getDoc(doc(db, 'sessions', id));
        if (!sessionDoc.exists()) {
          navigate('/sessions');
          return;
        }
        const sessionData = { id: sessionDoc.id, ...sessionDoc.data() } as Session;
        setSession(sessionData);

        // Load catches in this session
        const catchQuery = query(
          collection(db, 'catches'),
          where('sessionId', '==', id),
          orderBy('timestamp', 'asc')
        );
        const catchSnap = await getDocs(catchQuery);
        const catchList = catchSnap.docs.map(d => ({ id: d.id, ...d.data() } as Catch));
        setCatches(catchList);

        // Load spots
        const spotIds = Array.from(new Set([
          ...(sessionData.linkedSpotIds ?? []),
          ...(sessionData.spotTimeline ?? []).map(s => s.spotId),
        ]));
        if (spotIds.length > 0) {
          const spotDocs = await Promise.all(spotIds.map(sid => getDoc(doc(db, 'spots', sid))));
          const spotMap: Record<string, Spot> = {};
          spotDocs.forEach(d => {
            if (d.exists()) spotMap[d.id] = { id: d.id, ...d.data() } as Spot;
          });
          setSpots(spotMap);
        }

        // Load participant profiles
        const participantIds = Array.from(new Set([
          sessionData.ownerUserId,
          ...(sessionData.participantUserIds ?? []),
        ]));
        const profileDocs = await Promise.all(participantIds.map(uid => getDoc(doc(db, 'users', uid))));
        setParticipants(
          profileDocs.filter(d => d.exists()).map(d => ({ uid: d.id, ...d.data() } as UserProfile))
        );
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

  const startedAt = session.startedAt?.toDate?.() ?? (session.startedAt ? new Date(session.startedAt) : null);
  const endedAt = session.endedAt?.toDate?.() ?? (session.endedAt ? new Date(session.endedAt) : null);
  const statusCfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG['ended'];
  const totalXp = catches.reduce((sum, c) => sum + (c.xpEarned ?? 0), 0) + (session.statsSummary?.totalXp ?? 0);
  const completeCatches = catches.filter(c => c.status === 'complete');
  const speciesSet = new Set(catches.map(c => c.species).filter(Boolean));
  const isOwner = session.ownerUserId === profile?.uid;

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto pb-32 space-y-3">

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
        <Card className="bg-surface-card border border-border-subtle rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-text-primary tracking-tight leading-tight truncate">
                {session.title ?? (startedAt ? format(startedAt, "EEEE d MMMM", { locale: nl }) : 'Vissessie')}
              </h1>
              {session.description && (
                <p className="text-sm text-text-muted mt-1 line-clamp-2">{session.description}</p>
              )}
            </div>
            <Badge variant={statusCfg.variant} className="shrink-0 flex items-center gap-1">
              {statusCfg.icon}
              {statusCfg.label}
            </Badge>
          </div>

          {/* Date + Duration */}
          <div className="flex flex-wrap gap-3 text-xs text-text-muted font-medium">
            {startedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(startedAt, 'd MMMM yyyy HH:mm', { locale: nl })}
              </span>
            )}
            {(session.durationMinutes ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDurationFromMinutes(session.durationMinutes)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold text-accent">{session.mode === 'live' ? 'Live' : 'Retro'}</span>
            </span>
          </div>
        </Card>

        {/* Stats Strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Vangsten', value: catches.length, icon: <Fish className="w-4 h-4 text-accent" />, accent: 'text-accent' },
            { label: 'Soorten', value: speciesSet.size, icon: <Trophy className="w-4 h-4 text-warning" />, accent: 'text-warning' },
            { label: 'Stekken', value: Object.keys(spots).length, icon: <MapPin className="w-4 h-4 text-blue-400" />, accent: 'text-blue-400' },
            { label: 'XP', value: totalXp, icon: <Zap className="w-4 h-4 text-success" />, accent: 'text-success' },
          ].map((s) => (
            <Card key={s.label} className="bg-surface-card border border-border-subtle rounded-xl p-3 text-center">
              <div className="flex justify-center mb-1">{s.icon}</div>
              <p className={`text-lg font-black ${s.accent}`}>{s.value}</p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Deelnemers</h3>
            <div className="space-y-2">
              {participants.map((p) => {
                const userCatches = catches.filter(c => c.userId === p.uid);
                const userXp = userCatches.reduce((sum, c) => sum + (c.xpEarned ?? 0), 0);
                return (
                  <div key={p.uid} className="flex items-center gap-3 p-2.5 bg-surface-soft rounded-xl">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-surface border border-border-subtle shrink-0">
                      {p.photoURL ? (
                        <img src={p.photoURL} alt={p.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-4 h-4 text-text-muted" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {p.displayName} {p.uid === session.ownerUserId && <span className="text-[10px] text-accent font-black ml-1">• Eigenaar</span>}
                      </p>
                      <p className="text-[10px] text-text-muted">{userCatches.length} vangst{userCatches.length !== 1 ? 'en' : ''}</p>
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
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Vangsten ({catches.length})</h3>
            </div>
            <div className="space-y-2">
              {catches.map((c) => {
                const catchTs = c.timestamp?.toDate?.() ?? (c.timestamp ? new Date(c.timestamp) : null);
                const catcher = participants.find(p => p.uid === c.userId);
                return (
                  <motion.div
                    key={c.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/catches/${c.id}`)}
                    className="flex items-center gap-3 p-2.5 bg-surface-soft rounded-xl cursor-pointer hover:bg-surface-card transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface border border-border-subtle shrink-0">
                      {c.photoURL ? (
                        <img src={c.photoURL} alt={c.species} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Fish className="w-5 h-5 text-accent/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{c.species || 'Onbekend'}</p>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted">
                        {c.weight && <span className="flex items-center gap-0.5"><Scale className="w-3 h-3" />{(c.weight/1000).toFixed(1)}kg</span>}
                        {c.length && <span className="flex items-center gap-0.5"><Ruler className="w-3 h-3" />{c.length}cm</span>}
                        {catcher && participants.length > 1 && <span className="text-accent/80 font-semibold">{catcher.displayName}</span>}
                        {catchTs && <span>{format(catchTs, 'HH:mm', { locale: nl })}</span>}
                      </div>
                    </div>
                    {(c.xpEarned ?? 0) > 0 && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Zap className="w-3 h-3 text-accent" />
                        <span className="text-xs font-black text-accent">+{c.xpEarned}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Spot Timeline */}
        {(session.spotTimeline?.length ?? 0) > 0 && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Stek Tijdlijn</h3>
            <div className="space-y-2">
              {session.spotTimeline!.map((entry, i) => {
                const arrAt = entry.arrivedAt?.toDate?.() ?? (entry.arrivedAt ? new Date(entry.arrivedAt) : null);
                const leftAt = entry.leftAt?.toDate?.() ?? (entry.leftAt ? new Date(entry.leftAt) : null);
                const spotCatches = catches.filter(c => c.spotId === entry.spotId);
                return (
                  <div key={i} className="flex items-start gap-3 p-2.5 bg-surface-soft rounded-xl">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/spots/${entry.spotId}`)}
                        className="text-sm font-bold text-text-primary hover:text-accent transition-colors truncate block"
                      >
                        {entry.name ?? spots[entry.spotId]?.name ?? 'Stek'}
                      </button>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                        {arrAt && <span>{format(arrAt, 'HH:mm', { locale: nl })}</span>}
                        {leftAt && <><span>→</span><span>{format(leftAt, 'HH:mm', { locale: nl })}</span></>}
                        {spotCatches.length > 0 && (
                          <span className="text-accent font-semibold">{spotCatches.length} vangst{spotCatches.length !== 1 ? 'en' : ''}</span>
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
        {(session.weatherSnapshotStart ?? session.weatherSnapshotEnd) && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Weersomstandigheden</h3>
            <div className="grid grid-cols-2 gap-2">
              {session.weatherSnapshotStart && (
                <div className="p-3 bg-surface-soft rounded-xl">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-2">Start</p>
                  <div className="space-y-1.5">
                    {session.weatherSnapshotStart.temp != null && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Thermometer className="w-3.5 h-3.5 text-accent" />
                        {session.weatherSnapshotStart.temp}°C
                      </div>
                    )}
                    {session.weatherSnapshotStart.windSpeed != null && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Wind className="w-3.5 h-3.5 text-blue-400" />
                        {session.weatherSnapshotStart.windSpeed} km/u
                      </div>
                    )}
                    {session.weatherSnapshotStart.description && (
                      <p className="text-xs text-text-muted capitalize">{session.weatherSnapshotStart.description}</p>
                    )}
                  </div>
                </div>
              )}
              {session.weatherSnapshotEnd && (
                <div className="p-3 bg-surface-soft rounded-xl">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-2">Einde</p>
                  <div className="space-y-1.5">
                    {session.weatherSnapshotEnd.temp != null && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Thermometer className="w-3.5 h-3.5 text-accent" />
                        {session.weatherSnapshotEnd.temp}°C
                      </div>
                    )}
                    {session.weatherSnapshotEnd.windSpeed != null && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Wind className="w-3.5 h-3.5 text-blue-400" />
                        {session.weatherSnapshotEnd.windSpeed} km/u
                      </div>
                    )}
                    {session.weatherSnapshotEnd.description && (
                      <p className="text-xs text-text-muted capitalize">{session.weatherSnapshotEnd.description}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Notes */}
        {session.notes && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-2">Notities</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{session.notes}</p>
          </Card>
        )}

        {/* Empty catches */}
        {catches.length === 0 && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-8 text-center">
            <Fish className="w-10 h-10 text-accent/20 mx-auto mb-3" />
            <p className="text-sm font-bold text-text-muted">Geen vangsten in deze sessie</p>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
