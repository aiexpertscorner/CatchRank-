import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  MapPin,
  Search,
  ChevronRight,
  Navigation,
  Lock,
  Globe,
  Users,
  Fish,
  TrendingUp,
  Map as MapIcon,
  Layers,
  Maximize2,
  Anchor,
  Star,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../../../App';
import { collection, query, where, onSnapshot, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Spot } from '../../../types';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { SpotModal } from '../../../components/SpotModal';

/**
 * Spots Screen
 * Part of the 'spots' feature module.
 * Manages user fishing spots with filter/sort and navigation to SpotDetail.
 */

type SortMode = 'newest' | 'catches' | 'rating' | 'favorites';
const WATER_TYPES = ['canal', 'river', 'lake', 'pond', 'sea', 'polder'] as const;
const WATER_TYPE_LABELS: Record<string, string> = {
  canal: 'Kanaal', river: 'Rivier', lake: 'Meer', pond: 'Vijver', sea: 'Zee', polder: 'Polder'
};

export default function Spots() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filterWaterType, setFilterWaterType] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'spots_v2'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSpots(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Spot)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching spots:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const filteredAndSorted = useMemo(() => {
    let result = spots.filter(s => {
      const spotName = (s as any).title || s.name || '';
      const matchesSearch = spotName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.waterType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s as any).waterBodyName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterWaterType === 'all' || s.waterType === filterWaterType;
      return matchesSearch && matchesType;
    });

    switch (sortMode) {
      case 'catches':
        result = [...result].sort((a, b) => (b.stats?.totalCatches || 0) - (a.stats?.totalCatches || 0));
        break;
      case 'rating':
        result = [...result].sort((a, b) => (b.stats?.avgRating || 0) - (a.stats?.avgRating || 0));
        break;
      case 'favorites':
        result = [...result].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
        break;
      default:
        break; // newest — already sorted by createdAt desc from Firestore
    }

    return result;
  }, [spots, searchQuery, filterWaterType, sortMode]);

  const SORT_OPTIONS: { id: SortMode; label: string }[] = [
    { id: 'newest', label: 'Nieuwst' },
    { id: 'catches', label: 'Meeste vangsten' },
    { id: 'rating', label: 'Beste rating' },
    { id: 'favorites', label: 'Favorieten eerst' },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Mijn Stekken"
        subtitle={`${spots.length} locaties opgeslagen`}
        actions={
          <Button
            icon={<Plus className="w-4 h-4" />}
            className="rounded-xl h-11 px-6 font-bold shadow-premium-accent"
            onClick={() => setIsModalOpen(true)}
          >
            Nieuwe Stek
          </Button>
        }
      />

      <div className="space-y-6 pb-32">
        {/* Search & View Toggle */}
        <section className="flex flex-col gap-3 px-2 md:px-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Zoek op naam, watertype..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-card border border-border-subtle rounded-xl pl-12 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${showFilters ? 'bg-brand border-brand text-bg-main' : 'bg-surface-card border-border-subtle text-text-muted hover:border-brand/30'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <div className="flex bg-surface-card border border-border-subtle rounded-xl p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-bold ${viewMode === 'list' ? 'bg-brand text-bg-main' : 'text-text-muted'}`}
              >
                <Navigation className="w-3.5 h-3.5" />
                Lijst
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-bold ${viewMode === 'map' ? 'bg-brand text-bg-main' : 'text-text-muted'}`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                Kaart
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-card border border-border-subtle rounded-xl p-4 space-y-4"
            >
              {/* Watertype filter */}
              <div>
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Watertype</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterWaterType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filterWaterType === 'all' ? 'bg-brand border-brand text-bg-main' : 'bg-surface-soft border-border-subtle text-text-secondary hover:border-brand/30'}`}
                  >
                    Alles
                  </button>
                  {WATER_TYPES.map(wt => (
                    <button
                      key={wt}
                      onClick={() => setFilterWaterType(wt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filterWaterType === wt ? 'bg-brand border-brand text-bg-main' : 'bg-surface-soft border-border-subtle text-text-secondary hover:border-brand/30'}`}
                    >
                      {WATER_TYPE_LABELS[wt]}
                    </button>
                  ))}
                </div>
              </div>
              {/* Sort */}
              <div>
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Sorteren</p>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortMode(opt.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${sortMode === opt.id ? 'bg-brand border-brand text-bg-main' : 'bg-surface-soft border-border-subtle text-text-secondary hover:border-brand/30'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </section>

        {/* Map View */}
        {viewMode === 'map' ? (
          <Card className="aspect-video md:aspect-[21/9] bg-surface-soft border border-border-subtle rounded-2xl md:rounded-[2.5rem] flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map/1920/1080')] bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-transparent to-transparent" />
            <div className="relative z-10 text-center space-y-4">
              <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto border border-brand/20 animate-pulse">
                <MapPin className="w-8 h-8 text-brand" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-text-primary tracking-tight">Interactieve Kaart</h3>
                <p className="text-xs text-text-secondary font-medium">Mapbox integratie in ontwikkeling voor fase 3.</p>
              </div>
              <Button variant="secondary" size="sm" className="rounded-xl font-bold">
                <Maximize2 className="w-4 h-4 mr-2" />
                Open Kaart
              </Button>
            </div>
            {filteredAndSorted.slice(0, 5).map((s, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-brand rounded-full shadow-[0_0_10px_rgba(244,194,13,0.5)] border-2 border-white/20"
                style={{ top: `${25 + (i * 12)}%`, left: `${20 + (i * 13)}%` }}
              />
            ))}
          </Card>
        ) : (
          /* List View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2 md:px-0">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-surface-card animate-pulse rounded-2xl border border-border-subtle" />
              ))
            ) : filteredAndSorted.length > 0 ? (
              filteredAndSorted.map((s) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card
                    padding="none"
                    hoverable
                    onClick={() => navigate(`/spots/${s.id}`)}
                    className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl overflow-hidden relative cursor-pointer"
                  >
                    <div className="flex items-center gap-4 p-5">
                      <div className="w-16 h-16 rounded-xl bg-surface-soft flex items-center justify-center text-brand border border-border-subtle group-hover:scale-110 transition-transform duration-500 shadow-sm overflow-hidden flex-shrink-0">
                        {s.mainPhotoURL ? (
                          <img src={s.mainPhotoURL} alt={(s as any).title || s.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <MapPin className="w-8 h-8" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-bold text-text-primary tracking-tight truncate">{(s as any).title || s.name}</h4>
                          {s.isFavorite && <Star className="w-3.5 h-3.5 text-brand fill-brand flex-shrink-0" />}
                          {s.visibility === 'private' ? (
                            <Lock className="w-3 h-3 text-text-dim flex-shrink-0" />
                          ) : s.visibility === 'friends' ? (
                            <Users className="w-3 h-3 text-accent/60 flex-shrink-0" />
                          ) : (
                            <Globe className="w-3 h-3 text-success/60 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary font-medium">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-brand" />
                            {s.waterType ? WATER_TYPE_LABELS[s.waterType] || s.waterType : 'Water'}
                          </span>
                          {s.waterBodyName && (
                            <span className="flex items-center gap-1">
                              <Anchor className="w-3 h-3 text-accent" />
                              {s.waterBodyName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Fish className="w-3.5 h-3.5 text-brand" />
                            {s.stats?.totalCatches || 0} vangsten
                          </span>
                          {s.stats?.avgRating && s.stats.avgRating > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-brand fill-brand" />
                              {s.stats.avgRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-brand transition-colors flex-shrink-0" />
                    </div>

                    {/* Quick Stats Bar */}
                    {(s.stats?.topSpecies?.length || 0) > 0 && (
                      <div className="px-5 py-2.5 bg-bg-main/30 border-t border-border-subtle flex items-center justify-between">
                        <div className="flex gap-2">
                          {s.stats?.topSpecies?.slice(0, 2).map(sp => (
                            <Badge key={sp} variant="secondary" className="text-[8px] py-0.5 px-2 font-black uppercase tracking-widest">
                              {sp}
                            </Badge>
                          ))}
                        </div>
                        {(s.stats?.totalCatches || 0) > 5 && (
                          <div className="flex items-center gap-1 text-[9px] font-black text-brand uppercase tracking-widest">
                            <TrendingUp className="w-3 h-3" />
                            Hot Spot
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="col-span-full p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl">
                <MapPin className="w-12 h-12 text-brand/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2 text-text-primary">Geen stekken gevonden</h3>
                <p className="text-sm text-text-secondary mb-6">Sla je favoriete visplekken op om ze later makkelijk terug te vinden.</p>
                <Button onClick={() => setIsModalOpen(true)}>Eerste Stek Toevoegen</Button>
              </Card>
            )}
          </div>
        )}
      </div>

      <SpotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </PageLayout>
  );
}
