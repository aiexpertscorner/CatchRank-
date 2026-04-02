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
  CloudLightning,
  Eye,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Session, Catch, Spot, UserProfile } from '../../../types';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { Input } from '../../../components/ui/Inputs';
import { useSession } from '../../../contexts/SessionContext';
import { useAuth } from '../../../App';
import { db } from '../../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
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

export const SessionDashboard: React.FC<SessionDashboardProps> = ({ session }) => {
  const { endActiveSession, pauseActiveSession, resumeActiveSession } = useSession();
  const [catches, setCatches] = useState<Catch[]>([]);
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [pendingParticipants, setPendingParticipants] = useState<UserProfile[]>([]);
  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);
  const [isSpotSelectorOpen, setIsSpotSelectorOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>('');
  const [note, setNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  useEffect(() => {
    if (!session.id) return;

    // Fetch catches for this session
    const q = query(
      collection(db, 'catches'),
      where('sessionId', '==', session.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Catch)));
    });

    // Fetch active spot details
    if (session.activeSpotId) {
      getDoc(doc(db, 'spots', session.activeSpotId)).then(docSnap => {
        if (docSnap.exists()) {
          setActiveSpot({ id: docSnap.id, ...docSnap.data() } as Spot);
        }
      });
    }

    // Fetch participants
    if (session.participantUserIds && session.participantUserIds.length > 0) {
      const usersQ = query(
        collection(db, 'users'),
        where('uid', 'in', session.participantUserIds)
      );
      getDocs(usersQ).then(snapshot => {
        setParticipants(snapshot.docs.map(doc => doc.data() as UserProfile));
      });
    }

    // Fetch pending participants
    if (session.pendingUserIds && session.pendingUserIds.length > 0) {
      const pendingQ = query(
        collection(db, 'users'),
        where('uid', 'in', session.pendingUserIds)
      );
      getDocs(pendingQ).then(snapshot => {
        setPendingParticipants(snapshot.docs.map(doc => doc.data() as UserProfile));
      });
    } else {
      setPendingParticipants([]);
    }

    return () => unsubscribe();
  }, [session.id, session.activeSpotId, session.participantUserIds, session.pendingUserIds]);

  useEffect(() => {
    if (!session.startedAt) return;

    const updateTimer = () => {
      const start = session.startedAt.toDate();
      const diff = new Date().getTime() - start.getTime();
      
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setElapsedTime(
        `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);

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
      await loggingService.switchSessionSpot(session.id, spot.id, spot.name);
      setIsSpotSelectorOpen(false);
      toast.success(`Verplaatst naar ${spot.name}`);
    } catch (error) {
      console.error('Switch spot error:', error);
      toast.error('Fout bij wisselen van stek');
    }
  };

  const { profile } = useAuth();
  const isOwner = profile?.uid === session.ownerUserId;

  const totalWeight = catches.reduce((sum, c) => sum + (c.weight || 0), 0);
  const totalLength = catches.reduce((sum, c) => sum + (c.length || 0), 0);
  const totalXP = catches.reduce((sum, c) => sum + (c.xpEarned || 0), 0);

  // Combine catches and notes into a unified timeline
  const timelineItems = [
    ...catches.map(c => ({
      id: c.id,
      type: 'catch' as const,
      timestamp: c.timestamp.toDate(),
      data: c
    })),
    ...(Array.isArray(session.notes) ? session.notes : []).map((n: any, idx: number) => ({
      id: `note-${idx}`,
      type: n.type || 'note',
      timestamp: n.timestamp?.toDate() || new Date(),
      data: n
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-6 pb-20">
      {/* Main Status Hub */}
      <Card variant="premium" className="relative overflow-hidden p-6 md:p-10 rounded-[2.5rem] border border-accent/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 blur-[100px] -mr-48 -mt-48" />
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-8 md:gap-12">
          {/* Left: Timer & Title */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full shadow-[0_0_15px_rgba(244,194,13,0.6)]",
                session.status === 'live' ? "bg-accent animate-pulse" : "bg-text-muted"
              )} />
              <span className="text-xs font-black uppercase tracking-[0.3em] text-accent">
                {session.status === 'live' ? 'Sessie Live' : 'Sessie Gepauzeerd'}
              </span>
            </div>

            <h2 className="text-4xl md:text-7xl font-black text-primary tracking-tighter leading-tight">
              {session.title}
            </h2>

            <div className="flex items-center gap-8 md:gap-12">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Verstreken Tijd</p>
                <p className="text-3xl md:text-5xl font-mono font-black text-primary tracking-tight tabular-nums">
                  {elapsedTime}
                </p>
              </div>
              <div className="h-12 w-px bg-border-subtle" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Totaal XP</p>
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
                {session.status === 'live' ? (
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
        {/* Left Column: Weather, Spot, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weather & Forecast Hub */}
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
                    <h4 className="text-xl font-black text-primary tracking-tight">Weer & Forecast</h4>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">Real-time condities</p>
                  </div>
                </div>
                {session.weatherSnapshotStart && (
                  <Badge variant="outline" className="bg-info/10 text-info border-info/20 px-3 py-1 font-black uppercase tracking-widest text-[9px]">
                    {session.weatherSnapshotStart.description}
                  </Badge>
                )}
              </div>

              {session.weatherSnapshotStart ? (
                <div className="space-y-8">
                  {/* Current Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Thermometer className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Temp</span>
                      </div>
                      <p className="text-2xl font-black text-primary">{session.weatherSnapshotStart.temp}°C</p>
                      <p className="text-[10px] text-text-muted">Gevoel: {session.weatherSnapshotStart.feelsLike}°C</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Wind className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Wind</span>
                      </div>
                      <p className="text-2xl font-black text-primary">{session.weatherSnapshotStart.windSpeed} <span className="text-xs text-text-muted font-bold">km/u</span></p>
                      <p className="text-[10px] text-text-muted">Richting: {session.weatherSnapshotStart.windDir}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Droplets className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Vocht</span>
                      </div>
                      <p className="text-2xl font-black text-primary">{session.weatherSnapshotStart.humidity}%</p>
                      <p className="text-[10px] text-text-muted">Druk: {session.weatherSnapshotStart.pressure} hPa</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Eye className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Zicht</span>
                      </div>
                      <p className="text-2xl font-black text-primary">{session.weatherSnapshotStart.visibility} <span className="text-xs text-text-muted font-bold">km</span></p>
                      <p className="text-[10px] text-text-muted">UV: {session.weatherSnapshotStart.uv}</p>
                    </div>
                  </div>

                  {/* Mini Forecast (Placeholder for now, could be derived from WeatherAPI) */}
                  <div className="pt-6 border-t border-border-subtle">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">Verwachting komende uren</p>
                    <div className="flex justify-between overflow-x-auto no-scrollbar gap-4 pb-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 min-w-[60px] p-3 bg-surface-soft/30 rounded-xl">
                          <span className="text-[10px] font-bold text-text-muted">{format(new Date(Date.now() + i * 3600000), 'HH:mm')}</span>
                          {i % 2 === 0 ? <Cloud className="w-5 h-5 text-text-secondary" /> : <Sun className="w-5 h-5 text-accent" />}
                          <span className="text-sm font-black text-primary">{session.weatherSnapshotStart.temp + (i % 2 === 0 ? -1 : 1)}°</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <CloudRain className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                  <p className="text-text-secondary font-medium italic">Geen weerdata beschikbaar voor deze sessie.</p>
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
                      <h4 className="text-2xl font-black text-primary tracking-tight">{activeSpot?.name || 'Laden...'}</h4>
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-[9px] font-black uppercase tracking-widest">Actief</Badge>
                    </div>
                    <p className="text-sm text-text-muted flex items-center gap-2 font-medium">
                      <Navigation className="w-4 h-4 text-accent" />
                      {activeSpot?.waterType || 'Onbekend water'} • {activeSpot?.coordinates ? `${activeSpot.coordinates.lat.toFixed(4)}, ${activeSpot.coordinates.lng.toFixed(4)}` : 'Geen coördinaten'}
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
                <Badge className="bg-surface-soft text-text-secondary rounded-lg font-black px-3">{session.spotTimeline?.length || 0}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {session.spotTimeline && session.spotTimeline.length > 0 ? (
                  [...session.spotTimeline].reverse().map((spot, idx) => (
                    <Card key={`${spot.spotId}-${idx}`} className={cn(
                      "p-4 rounded-2xl border bg-surface-card flex items-center justify-between group",
                      session.activeSpotId === spot.spotId ? "border-accent/50 bg-accent/5" : "border-border-subtle"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          session.activeSpotId === spot.spotId ? "bg-accent text-black" : "bg-surface-soft text-text-muted"
                        )}>
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-primary">{spot.name}</p>
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                            Sinds {format(spot.arrivedAt?.toDate() || new Date(), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                      {session.activeSpotId === spot.spotId && (
                        <Badge variant="success" className="bg-accent text-black border-none text-[8px] font-black uppercase tracking-widest">Actief</Badge>
                      )}
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full p-8 text-center border-2 border-dashed border-border-subtle rounded-[2rem] bg-surface-soft/10">
                    <p className="text-text-secondary font-medium italic">Geen stek historie beschikbaar.</p>
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
                <Badge className="bg-surface-soft text-text-secondary rounded-lg font-black px-3">{timelineItems.length}</Badge>
              </div>

              {/* Quick Note Input */}
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
                      {/* Timeline Dot/Icon */}
                      <div className={cn(
                        "absolute left-0 top-1 w-12 h-12 rounded-xl flex items-center justify-center z-10 shadow-sm",
                        item.type === 'catch' ? "bg-accent text-black" : 
                        item.type === 'spot_change' ? "bg-water text-white" : "bg-surface-soft text-text-muted"
                      )}>
                        {item.type === 'catch' ? <Fish className="w-6 h-6" /> : 
                         item.type === 'spot_change' ? <MapPin className="w-6 h-6" /> : <MessageSquare className="w-5 h-5" />}
                      </div>

                      <Card className="p-4 bg-surface-card border border-border-subtle rounded-2xl hover:border-accent/30 transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                            {format(item.timestamp, 'HH:mm')} • {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: nl })}
                          </span>
                          {item.type === 'catch' && (
                            <span className="text-[10px] font-black text-accent uppercase tracking-widest">+{item.data.xpEarned} XP</span>
                          )}
                        </div>
                        
                        {item.type === 'catch' ? (
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-soft shrink-0">
                              {item.data.imageUrl ? (
                                <img src={item.data.imageUrl} alt={item.data.species} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-muted">
                                  <Fish className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-black text-primary">{item.data.species}</p>
                              <p className="text-xs text-text-muted">{item.data.length}cm • {item.data.weight}kg</p>
                            </div>
                          </div>
                        ) : (
                          <p className={cn(
                            "font-bold text-sm",
                            item.type === 'spot_change' ? "text-water" : "text-primary"
                          )}>
                            {item.data.text}
                          </p>
                        )}
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-12 text-center border-2 border-dashed border-border-subtle rounded-[2rem] bg-surface-soft/10 ml-12">
                    <History className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                    <p className="text-text-secondary font-medium italic">Nog geen activiteit gelogd.</p>
                  </div>
                )}
              </div>
            </section>
        </div>

        {/* Right Column: Stats, Participants, Gear */}
        <div className="space-y-6">
          {/* Real-time Stats Card */}
          <Card className="p-6 md:p-8 rounded-[2rem] border border-border-subtle bg-surface-card space-y-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h4 className="text-xl font-black text-primary tracking-tight">Sessie Stats</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle space-y-1">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Vangsten</p>
                <p className="text-2xl font-black text-primary">{catches.length}</p>
              </div>
              <div className="p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle space-y-1">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Totaal XP</p>
                <p className="text-2xl font-black text-accent">+{totalXP}</p>
              </div>
              <div className="p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle space-y-1">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Gewicht</p>
                <p className="text-2xl font-black text-primary">{totalWeight.toFixed(1)} <span className="text-xs text-text-muted">kg</span></p>
              </div>
              <div className="p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle space-y-1">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Lengte</p>
                <p className="text-2xl font-black text-primary">{totalLength} <span className="text-xs text-text-muted">cm</span></p>
              </div>
            </div>

            <div className="pt-6 border-t border-border-subtle">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">Sessie Details</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted">Type</span>
                  <Badge variant="secondary" className="bg-surface-soft text-primary font-black uppercase tracking-widest text-[9px]">{session.sessionType || 'Solo'}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted">Methode</span>
                  <span className="text-xs font-black text-primary uppercase tracking-widest">{session.metadata?.method || 'Onbekend'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted">Doelsoort</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {session.metadata?.targetSpecies?.map(s => (
                      <Badge key={s} variant="outline" className="text-[9px] font-black uppercase tracking-widest border-accent/20 text-accent">{s}</Badge>
                    )) || <span className="text-xs font-black text-text-muted">—</span>}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Participants Card */}
          <Card className="p-6 md:p-8 rounded-[2rem] border border-border-subtle bg-surface-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-water" />
                <h4 className="text-xl font-black text-primary tracking-tight">Deelnemers</h4>
              </div>
              <Badge className="bg-water/10 text-water border-none font-black">{participants.length + pendingParticipants.length}</Badge>
            </div>

            <div className="space-y-4">
              {/* Accepted Participants */}
              {participants.map((p) => (
                <div key={p.uid} className="flex items-center justify-between p-3 bg-surface-soft/30 rounded-2xl border border-border-subtle group hover:border-water/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-surface shadow-sm">
                      <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}&background=random`} alt={p.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-primary">{p.displayName}</p>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Level {p.level}</p>
                    </div>
                  </div>
                  {p.uid === session.ownerUserId && (
                    <Badge className="bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest border-none">Host</Badge>
                  )}
                </div>
              ))}

              {/* Pending Participants */}
              {pendingParticipants.map((p) => (
                <div key={p.uid} className="flex items-center justify-between p-3 bg-surface-soft/10 rounded-2xl border border-dashed border-border-subtle opacity-70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-surface grayscale">
                      <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}&background=random`} alt={p.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-text-secondary">{p.displayName}</p>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest italic">Uitnodiging verstuurd</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-border-subtle text-text-muted">Pending</Badge>
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

          {/* Gear & Setup Card */}
          <Card className="p-6 md:p-8 rounded-[2rem] border border-border-subtle bg-surface-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-accent" />
                <h4 className="text-xl font-black text-primary tracking-tight">Actieve Gear</h4>
              </div>
              <Badge className="bg-accent/10 text-accent border-none font-black">{session.gearIds?.length || 0}</Badge>
            </div>

            {session.gearIds && session.gearIds.length > 0 ? (
              <div className="space-y-4">
                {/* Placeholder for real gear items */}
                <div className="p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-primary">Shimano Stradic Setup</p>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Favoriete Combo</p>
                  </div>
                </div>
                <Button variant="secondary" className="w-full h-12 rounded-xl font-black border-border-subtle text-xs uppercase tracking-widest">
                  Gear Beheren
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center mx-auto opacity-20">
                  <ShoppingBag className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-xs text-text-muted font-medium italic">Geen gear gekoppeld aan deze sessie.</p>
                <Button variant="secondary" className="w-full h-12 rounded-xl font-black border-border-subtle text-xs uppercase tracking-widest">
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
        currentSpotId={session.activeSpotId}
      />

      <ParticipantInviteModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        session={session}
      />
    </div>
  );
};
