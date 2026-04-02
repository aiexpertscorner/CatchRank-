import React, { useEffect, useState } from 'react';
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
  ExternalLink,
  Camera,
  Anchor,
  Star,
  Package
} from 'lucide-react';
import { useAuth } from '../../../App';
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Spot, Catch, Session } from '../../../types';
import { loggingService } from '../../logging/services/loggingService';
import { PageLayout } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { SpotModal } from '../../../components/SpotModal';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function SpotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [spot, setSpot] = useState<Spot | null>(null);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchSpot = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'spots', id));
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

    // Listen for catches at this spot
    const catchesQuery = query(
      collection(db, 'catches'),
      where('spotId', '==', id),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribeCatches = onSnapshot(catchesQuery, (snapshot) => {
      setCatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Catch)));
    });

    // Listen for sessions at this spot
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('linkedSpotIds', 'array-contains', id),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
    });

    return () => {
      unsubscribeCatches();
      unsubscribeSessions();
    };
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!spot || !id) return;
    if (!window.confirm('Weet je zeker dat je deze stek wilt verwijderen?')) return;

    try {
      await deleteDoc(doc(db, 'spots', id));
      toast.success('Stek verwijderd');
      navigate('/spots');
    } catch (error) {
      console.error('Delete spot error:', error);
      toast.error('Fout bij verwijderen stek');
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

  const toggleFavorite = async () => {
    if (!profile || !id) return;
    try {
      const newStatus = !spot.isFavorite;
      await loggingService.updateSpot(id, { isFavorite: newStatus });
      setSpot(prev => prev ? { ...prev, isFavorite: newStatus } : null);
      toast.success(newStatus ? 'Toegevoegd aan favorieten' : 'Verwijderd uit favorieten');
    } catch (error) {
      console.error('Toggle favorite error:', error);
      toast.error('Fout bij bijwerken favoriet');
    }
  };

  return (
    <PageLayout>
      <div className="space-y-8 pb-32">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between px-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/spots')}
            className="text-text-muted hover:text-primary"
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
            alt={spot.name}
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
                    <Lock className="w-3 h-3 mr-1.5" />
                    Privé
                  </Badge>
                ) : spot.visibility === 'friends' ? (
                  <Badge variant="secondary" className="bg-accent/10 backdrop-blur-md border-accent/20 text-accent">
                    <Users className="w-3 h-3 mr-1.5" />
                    Vrienden
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-success/10 backdrop-blur-md border-success/20 text-success">
                    <Globe className="w-3 h-3 mr-1.5" />
                    Openbaar
                  </Badge>
                )}
              </div>
              
              <button 
                onClick={toggleFavorite}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md border transition-all",
                  spot.isFavorite 
                    ? "bg-brand border-brand text-bg-main shadow-lg shadow-brand/20" 
                    : "bg-black/40 border-white/10 text-white hover:bg-black/60"
                )}
              >
                <Star className={cn("w-6 h-6", spot.isFavorite && "fill-current")} />
              </button>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-lg">
              {spot.name}
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
              <Card className="bg-surface-card border-border-subtle p-6 text-center">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Fish className="w-5 h-5 text-brand" />
                </div>
                <div className="text-2xl font-black text-primary">{spot.stats?.totalCatches || 0}</div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Vangsten</div>
              </Card>
              <Card className="bg-surface-card border-border-subtle p-6 text-center">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div className="text-2xl font-black text-primary">{spot.stats?.totalSessions || 0}</div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Sessies</div>
              </Card>
              <Card className="bg-surface-card border-border-subtle p-6 text-center">
                <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div className="text-2xl font-black text-primary">{spot.stats?.avgRating?.toFixed(1) || '0.0'}</div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Rating</div>
              </Card>
              <Card className="bg-surface-card border-border-subtle p-6 text-center">
                <div className="w-10 h-10 bg-water/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Navigation className="w-5 h-5 text-water" />
                </div>
                <div className="text-2xl font-black text-primary">GPS</div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Locatie</div>
              </Card>
            </div>

            {/* Description */}
            {spot.description && (
              <Card className="bg-surface-card border-border-subtle p-8">
                <h3 className="text-xl font-black text-primary mb-4 flex items-center gap-3">
                  <Info className="w-6 h-6 text-brand" />
                  Over deze stek
                </h3>
                <p className="text-text-secondary leading-relaxed font-medium">
                  {spot.description}
                </p>
              </Card>
            )}

            {/* Recent Catches */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black text-primary uppercase tracking-tight">Recente Vangsten</h3>
                <Button variant="ghost" size="sm" className="text-brand font-bold">Alles zien</Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catches.length > 0 ? (
                  catches.map((c) => (
                    <Card 
                      key={c.id} 
                      padding="none" 
                      className="bg-surface-card border-border-subtle overflow-hidden group hover:border-brand/30 transition-all"
                    >
                      <div className="flex h-24">
                        <div className="w-24 h-full shrink-0 relative overflow-hidden">
                          <img 
                            src={c.photoURL || `https://picsum.photos/seed/${c.id}/200/200`} 
                            alt={c.species}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 p-4 flex flex-col justify-center">
                          <h4 className="font-bold text-primary truncate">{c.species}</h4>
                          <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                            <span>{c.length}cm</span>
                            <span>•</span>
                            <span>{format(c.timestamp?.toDate() || new Date(), 'd MMM', { locale: nl })}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="col-span-full p-12 text-center border-dashed border-border-subtle bg-surface-soft/20">
                    <Fish className="w-12 h-12 text-text-muted/20 mx-auto mb-3" />
                    <p className="text-text-secondary font-medium">Nog geen vangsten gelogd op deze stek.</p>
                  </Card>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
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
                <Button className="w-full rounded-xl font-bold shadow-premium-accent">
                  <Navigation className="w-4 h-4 mr-2" />
                  Routebeschrijving
                </Button>
              </div>
            </Card>

            {/* Target Species */}
            {spot.targetSpecies && spot.targetSpecies.length > 0 && (
              <Card className="bg-surface-card border-border-subtle p-6">
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
              <Card className="bg-surface-card border-border-subtle p-6">
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

            {/* Linked Gear & Setups */}
            {((spot.linkedGearIds && spot.linkedGearIds.length > 0) || (spot.linkedSetupIds && spot.linkedSetupIds.length > 0)) && (
              <Card className="bg-surface-card border-border-subtle p-6">
                <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-4">Gekoppelde Gear</h4>
                <div className="space-y-3">
                  {spot.linkedSetupIds?.map(setup => (
                    <div key={setup} className="flex items-center gap-3 p-3 bg-surface-soft/50 rounded-xl border border-border-subtle">
                      <Layers className="w-4 h-4 text-brand" />
                      <span className="text-xs font-bold text-text-primary">{setup}</span>
                    </div>
                  ))}
                  {spot.linkedGearIds?.map(gear => (
                    <div key={gear} className="flex items-center gap-3 p-3 bg-surface-soft/50 rounded-xl border border-border-subtle">
                      <Package className="w-4 h-4 text-accent" />
                      <span className="text-xs font-bold text-text-primary">{gear}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Sessions */}
            <section className="space-y-4">
              <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] px-2">Recente Sessies</h4>
              <div className="space-y-3">
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
                      <h5 className="font-bold text-primary truncate">{session.title || 'Visdag'}</h5>
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
                  <p className="text-xs text-text-muted px-2 italic">Geen recente sessies.</p>
                )}
              </div>
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
