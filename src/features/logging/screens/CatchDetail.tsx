import React, { useEffect, useState } from 'react';
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
  Anchor
} from 'lucide-react';
import { useAuth } from '../../../App';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch, Spot } from '../../../types';
import { PageLayout } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { CatchForm } from '../../../components/CatchForm';

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

export default function CatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [catchData, setCatchData] = useState<Catch | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [relatedCatches, setRelatedCatches] = useState<Catch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const catchDoc = await getDoc(doc(db, 'catches_v2', id));
        if (!catchDoc.exists()) {
          toast.error('Vangst niet gevonden');
          navigate('/catches');
          return;
        }
        const data = { id: catchDoc.id, ...catchDoc.data() } as Catch;
        setCatchData(data);

        // Load spot details if linked
        if (data.spotId) {
          const spotDoc = await getDoc(doc(db, 'spots_v2', data.spotId));
          if (spotDoc.exists()) {
            setSpot({ id: spotDoc.id, ...spotDoc.data() } as Spot);
          }

          // Load related catches at same spot (excluding this one)
          const relatedQuery = query(
            collection(db, 'catches_v2'),
            where('spotId', '==', data.spotId),
            where('status', '==', 'complete'),
            orderBy('timestamp', 'desc'),
            limit(6)
          );
          const relatedSnap = await getDocs(relatedQuery);
          setRelatedCatches(
            relatedSnap.docs
              .map(d => ({ id: d.id, ...d.data() } as Catch))
              .filter(c => c.id !== id)
              .slice(0, 4)
          );
        }
      } catch (err) {
        console.error('CatchDetail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!catchData?.id || !window.confirm('Vangst definitief verwijderen?')) return;
    try {
      await deleteDoc(doc(db, 'catches_v2', catchData.id));
      toast.success('Vangst verwijderd');
      navigate('/catches');
    } catch {
      toast.error('Fout bij verwijderen');
    }
  };

  const isOwner = catchData?.userId === profile?.uid;

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

  const ts = catchData.timestamp?.toDate?.() ?? (catchData.timestamp ? new Date(catchData.timestamp) : null);

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto pb-32 space-y-0">

        {/* Back Nav */}
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-card border border-border-subtle text-text-muted hover:text-accent hover:border-accent/30 transition-all text-xs font-bold"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Bewerken
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-card border border-border-subtle text-text-muted hover:text-danger hover:border-danger/30 transition-all text-xs font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Verwijderen
              </button>
            </div>
          )}
        </div>

        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden bg-surface-card border border-border-subtle">
          {catchData.photoURL ? (
            <div className="aspect-[4/3] w-full">
              <img
                src={catchData.photoURL}
                alt={catchData.species || 'Vangst'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            </div>
          ) : (
            <div className="aspect-[4/3] w-full flex items-center justify-center bg-gradient-to-br from-surface-card to-surface-soft">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                  <Fish className="w-10 h-10 text-accent/50" />
                </div>
                <p className="text-sm text-text-muted font-medium">Geen foto</p>
              </div>
            </div>
          )}

          {/* Overlay info */}
          <div className={`${catchData.photoURL ? 'absolute bottom-0 left-0 right-0 p-5' : 'p-5 border-t border-border-subtle'}`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h1 className={`text-2xl font-black tracking-tight leading-tight ${catchData.photoURL ? 'text-white' : 'text-text-primary'}`}>
                  {catchData.speciesGeneral || catchData.species || 'Onbekende soort'}
                </h1>
                <div className={`flex items-center gap-3 mt-1 text-sm font-semibold ${catchData.photoURL ? 'text-white/80' : 'text-text-secondary'}`}>
                  {catchData.weight && <span className="flex items-center gap-1"><Scale className="w-4 h-4" />{(catchData.weight / 1000).toFixed(2)} kg</span>}
                  {catchData.length && <span className="flex items-center gap-1"><Ruler className="w-4 h-4" />{catchData.length} cm</span>}
                </div>
              </div>
              {(catchData.xpEarned ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 bg-accent/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shrink-0">
                  <Zap className="w-4 h-4 text-bg-main" />
                  <span className="text-sm font-black text-bg-main">+{catchData.xpEarned} XP</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status + Meta */}
        <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4 mt-3">
          <div className="flex flex-wrap items-center gap-2">
            {catchData.status === 'complete' ? (
              <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Volledig</Badge>
            ) : (
              <Badge variant="warning"><AlertCircle className="w-3 h-3 mr-1" />Concept</Badge>
            )}
            {ts && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                <Calendar className="w-3.5 h-3.5" />
                {format(ts, 'EEEE d MMMM yyyy HH:mm', { locale: nl })}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            {spot && (
              <button
                onClick={() => navigate(`/spots/${catchData.spotId}`)}
                className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
              >
                <MapPin className="w-3.5 h-3.5" />
                {spot.title || spot.name}
              </button>
            )}
            {catchData.sessionId && (
              <button
                onClick={() => navigate(`/sessions/${catchData.sessionId}`)}
                className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-accent"
              >
                <Clock className="w-3.5 h-3.5" />
                Sessie bekijken
              </button>
            )}
          </div>

          {/* Draft enrichment prompt */}
          {catchData.status === 'draft' && (catchData.incompleteFields?.length ?? 0) > 0 && (
            <div className="mt-3 p-3 bg-warning/5 border border-warning/20 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                <span className="text-xs font-semibold text-warning truncate">
                  Aanvullen voor meer XP: {catchData.incompleteFields?.slice(0,3).join(', ')}
                </span>
              </div>
              <Button size="sm" onClick={() => setIsEditOpen(true)} className="shrink-0 h-8 px-3 text-xs rounded-lg">
                Aanvullen
              </Button>
            </div>
          )}
        </Card>

        {/* Weather */}
        {catchData.weather && Object.values(catchData.weather).some(Boolean) && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4 mt-3">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Weersomstandigheden</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {catchData.weather.temp != null && (
                <div className="flex items-center gap-2 p-2.5 bg-surface-soft rounded-xl">
                  <Thermometer className="w-4 h-4 text-accent shrink-0" />
                  <div>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Temp</p>
                    <p className="text-sm font-bold text-text-primary">{catchData.weather.temp}°C</p>
                  </div>
                </div>
              )}
              {catchData.weather.windSpeed != null && (
                <div className="flex items-center gap-2 p-2.5 bg-surface-soft rounded-xl">
                  <Wind className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Wind</p>
                    <p className="text-sm font-bold text-text-primary">{catchData.weather.windSpeed} km/u</p>
                  </div>
                </div>
              )}
              {catchData.weather.humidity != null && (
                <div className="flex items-center gap-2 p-2.5 bg-surface-soft rounded-xl">
                  <Droplets className="w-4 h-4 text-blue-300 shrink-0" />
                  <div>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Vochtigheid</p>
                    <p className="text-sm font-bold text-text-primary">{catchData.weather.humidity}%</p>
                  </div>
                </div>
              )}
              {catchData.weather.description && (
                <div className="col-span-2 sm:col-span-3 flex items-center gap-2 p-2.5 bg-surface-soft rounded-xl">
                  <Eye className="w-4 h-4 text-text-muted shrink-0" />
                  <p className="text-sm font-medium text-text-secondary capitalize">{catchData.weather.description}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Water conditions */}
        {catchData.water && Object.values(catchData.water).some(v => v != null) && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4 mt-3">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Wateromstandigheden</h3>
            <div className="grid grid-cols-2 gap-2">
              {catchData.water.clarity && (
                <div className="flex items-center gap-2 p-2.5 bg-surface-soft rounded-xl">
                  <Eye className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Helderheid</p>
                    <p className="text-sm font-bold text-text-primary">{WATER_CLARITY_LABEL[catchData.water.clarity] ?? catchData.water.clarity}</p>
                  </div>
                </div>
              )}
              {catchData.water.depth != null && (
                <div className="flex items-center gap-2 p-2.5 bg-surface-soft rounded-xl">
                  <Waves className="w-4 h-4 text-blue-300 shrink-0" />
                  <div>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Diepte</p>
                    <p className="text-sm font-bold text-text-primary">{catchData.water.depth} m</p>
                  </div>
                </div>
              )}
              {catchData.water.temp != null && (
                <div className="flex items-center gap-2 p-2.5 bg-surface-soft rounded-xl">
                  <Thermometer className="w-4 h-4 text-accent shrink-0" />
                  <div>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Watertemp</p>
                    <p className="text-sm font-bold text-text-primary">{catchData.water.temp}°C</p>
                  </div>
                </div>
              )}
              {catchData.water.flow && (
                <div className="flex items-center gap-2 p-2.5 bg-surface-soft rounded-xl">
                  <Anchor className="w-4 h-4 text-text-muted shrink-0" />
                  <div>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Stroming</p>
                    <p className="text-sm font-bold text-text-primary">{WATER_FLOW_LABEL[catchData.water.flow] ?? catchData.water.flow}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Bait + Technique */}
        {(catchData.bait || catchData.technique) && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4 mt-3">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Aas & Techniek</h3>
            <div className="grid grid-cols-2 gap-2">
              {catchData.bait && (
                <div className="flex items-center gap-2 p-2.5 bg-surface-soft rounded-xl">
                  <Target className="w-4 h-4 text-accent shrink-0" />
                  <div>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Aas</p>
                    <p className="text-sm font-bold text-text-primary">{catchData.bait}</p>
                  </div>
                </div>
              )}
              {catchData.technique && (
                <div className="flex items-center gap-2 p-2.5 bg-surface-soft rounded-xl">
                  <Anchor className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Techniek</p>
                    <p className="text-sm font-bold text-text-primary">{catchData.technique}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Notes */}
        {catchData.notes && (
          <Card className="bg-surface-card border border-border-subtle rounded-2xl p-4 mt-3">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-2">Notities</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{catchData.notes}</p>
          </Card>
        )}

        {/* Related catches at same spot */}
        {relatedCatches.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-black text-text-muted uppercase tracking-widest">
                Meer op {spot?.title ?? spot?.name ?? 'deze stek'}
              </span>
              {spot && (
                <button
                  onClick={() => navigate(`/spots/${catchData.spotId}`)}
                  className="text-xs font-bold text-accent hover:underline"
                >
                  Bekijk stek
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {relatedCatches.map((c) => {
                const relTs = c.timestamp?.toDate?.() ?? (c.timestamp ? new Date(c.timestamp) : null);
                return (
                  <motion.div
                    key={c.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/catches/${c.id}`)}
                    className="aspect-square rounded-2xl overflow-hidden bg-surface-card border border-border-subtle cursor-pointer relative group"
                  >
                    {c.photoURL ? (
                      <img src={c.photoURL} alt={c.species} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-soft">
                        <Fish className="w-8 h-8 text-accent/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <p className="text-xs font-bold text-white leading-tight truncate">{(c as any).speciesGeneral || c.species || 'Onbekend'}</p>
                      {relTs && <p className="text-[9px] text-white/60">{format(relTs, 'd MMM', { locale: nl })}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && isOwner && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsEditOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl max-h-[95vh] overflow-hidden rounded-[2.5rem] shadow-2xl z-10"
          >
            <CatchForm
              initialData={catchData}
              activeSessionId={catchData.sessionId}
              onComplete={(updatedId) => {
                setIsEditOpen(false);
                // Refresh catch data
                getDoc(doc(db, 'catches_v2', updatedId)).then(d => {
                  if (d.exists()) setCatchData({ id: d.id, ...d.data() } as Catch);
                });
              }}
              onCancel={() => setIsEditOpen(false)}
            />
          </motion.div>
        </div>
      )}
    </PageLayout>
  );
}
