import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Fish,
  MapPin,
  Grid,
  List as ListIcon,
  Edit2,
  Trash2,
  Camera,
} from 'lucide-react';
import { LazyImage } from '../../../components/ui/LazyImage';
import { resolveCatchImageSrc, resolveCatchSpecies } from '../../../lib/catchUtils';
import { useAuth } from '../../../App';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch } from '../../../types';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { QuickCatchModal } from '../../../components/QuickCatchModal';
import { CatchForm } from '../../../components/CatchForm';

type CatchWithMeta = Catch & {
  speciesSpecific?: string;
  speciesGeneral?: string;
  mainImage?: string;
  photoURL?: string;
  timestamp?: any;
  spotName?: string;
  weight?: number;
  length?: number;
  xpEarned?: number;
  status?: string;
};

export default function Catches() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isEmbedded = location.pathname.startsWith('/logboek');

  const [catches, setCatches] = useState<CatchWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecies, setFilterSpecies] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'weight' | 'length'>('date');

  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);
  const [isCatchFormOpen, setIsCatchFormOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<CatchWithMeta | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'catches_v2'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as CatchWithMeta[];

        setCatches(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching catches:', error);
        toast.error('Fout bij ophalen van vangsten');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je deze vangst wilt verwijderen?')) return;

    try {
      await deleteDoc(doc(db, 'catches_v2', id));
      toast.success('Vangst verwijderd');
    } catch (error) {
      console.error('Delete catch error:', error);
      toast.error('Fout bij verwijderen');
    }
  };

  const getCatchSpecies = (c: CatchWithMeta) => resolveCatchSpecies(c as any);

  const getCatchImage = (c: CatchWithMeta) => resolveCatchImageSrc(c as any);

  const getCatchDate = (c: CatchWithMeta) => {
    try {
      if (!c.timestamp) return null;

      if (typeof c.timestamp?.toDate === 'function') {
        return c.timestamp.toDate();
      }

      if (c.timestamp instanceof Date) {
        return c.timestamp;
      }

      const parsed = new Date(c.timestamp);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  };

  const formatWeight = (weight?: number) => {
    if (weight === undefined || weight === null || Number.isNaN(weight)) return '';
    return `${weight}kg`;
  };

  const speciesList = useMemo(() => {
    return Array.from(
      new Set(catches.map((c) => getCatchSpecies(c)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'nl'));
  }, [catches]);

  const filteredCatches = useMemo(() => {
    const queryLower = searchQuery.trim().toLowerCase();

    const filtered = catches.filter((c) => {
      const species = getCatchSpecies(c);
      const speciesLower = species.toLowerCase();
      const spotLower = c.spotName?.toLowerCase() || '';

      const matchesSearch =
        !queryLower ||
        speciesLower.includes(queryLower) ||
        spotLower.includes(queryLower);

      const matchesSpecies = filterSpecies === 'all' || species === filterSpecies;

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'draft' && c.status === 'draft') ||
        (filterStatus === 'complete' && c.status !== 'draft');

      return matchesSearch && matchesSpecies && matchesStatus;
    });

    if (sortBy === 'weight') {
      return [...filtered].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
    }
    if (sortBy === 'length') {
      return [...filtered].sort((a, b) => (b.length ?? 0) - (a.length ?? 0));
    }
    return filtered; // date desc — already ordered by Firestore query
  }, [catches, searchQuery, filterSpecies, filterStatus, sortBy]);

  const listContent = (
    <div className="space-y-5 sm:space-y-6 pb-28 sm:pb-nav-pad">
        <section className="flex flex-col lg:flex-row gap-3 px-2 md:px-0">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Zoek op soort of stek..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-surface-card border border-border-subtle rounded-xl pl-12 pr-4 text-sm text-text-primary focus:outline-none focus:border-brand transition-all"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              className="flex-1 lg:flex-none min-w-0 lg:min-w-[160px] h-12 bg-surface-card border border-border-subtle rounded-xl px-4 text-sm text-text-primary focus:outline-none focus:border-brand"
            >
              <option value="all">Alle soorten</option>
              {speciesList.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'weight' | 'length')}
              className="h-12 bg-surface-card border border-border-subtle rounded-xl px-3 text-sm text-text-primary focus:outline-none focus:border-brand shrink-0"
            >
              <option value="date">Datum</option>
              <option value="weight">Gewicht</option>
              <option value="length">Lengte</option>
            </select>

            <div className="flex bg-surface-card border border-border-subtle rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-brand text-bg-main'
                    : 'text-text-muted'
                }`}
                aria-label="Grid weergave"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-brand text-bg-main'
                    : 'text-text-muted'
                }`}
                aria-label="Lijst weergave"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Status filter chips */}
        <div className="flex gap-2 px-2 md:px-0">
          {(['all', 'complete', 'draft'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                filterStatus === s
                  ? 'bg-brand text-bg-main border-brand shadow-premium-accent'
                  : 'bg-surface-card border-border-subtle text-text-muted hover:border-brand/30'
              }`}
            >
              {s === 'all' ? 'Alle' : s === 'complete' ? 'Compleet' : 'Concept'}
            </button>
          ))}
          <span className="ml-auto text-xs text-text-muted self-center font-medium">
            {filteredCatches.length} {filteredCatches.length === 1 ? 'vangst' : 'vangsten'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-surface-card animate-pulse rounded-2xl border border-border-subtle"
              />
            ))}
          </div>
        ) : filteredCatches.length > 0 ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4'
                : 'space-y-3'
            }
          >
            {filteredCatches.map((c) => {
              const imageSrc = getCatchImage(c);
              const species = getCatchSpecies(c);
              const catchDate = getCatchDate(c);

              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  {viewMode === 'grid' ? (
                    <Card
                      padding="none"
                      hoverable
                      className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl overflow-hidden h-full flex flex-col cursor-pointer"
                      onClick={() => c.id && navigate(`/catches/${c.id}`)}
                    >
                      <div className="aspect-[1/1] relative overflow-hidden bg-surface-soft">
                        <LazyImage
                          src={imageSrc}
                          alt={species}
                          wrapperClassName="w-full h-full"
                          className="group-hover:scale-110 transition-transform duration-700"
                          fallbackIconSize={42}
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-70 group-hover:opacity-85 transition-opacity" />

                        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCatch(c);
                                setIsCatchFormOpen(true);
                              }}
                              className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-white hover:bg-brand hover:text-bg-main transition-colors"
                              aria-label="Bewerk vangst"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (c.id) handleDelete(c.id);
                              }}
                              className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-white hover:bg-danger transition-colors"
                              aria-label="Verwijder vangst"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3">
                          <Badge
                            variant={c.status === 'draft' ? 'warning' : 'accent'}
                            className="text-[7px] py-0.5 px-1.5 font-black uppercase tracking-widest mb-1"
                          >
                            {c.status === 'draft' ? 'Concept' : `+${c.xpEarned || 25} XP`}
                          </Badge>

                          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-2">
                            {species}
                          </h4>
                        </div>
                      </div>

                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary uppercase tracking-widest gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            {c.length !== undefined && c.length !== null && (
                              <span>{c.length}cm</span>
                            )}
                            {c.weight !== undefined && c.weight !== null && (
                              <span>{formatWeight(c.weight)}</span>
                            )}
                          </div>

                          <span className="text-text-muted shrink-0">
                            {catchDate
                              ? format(catchDate, 'd MMM', { locale: nl })
                              : 'Zojuist'}
                          </span>
                        </div>

                        {c.spotName && (
                          <div className="flex items-center gap-1 text-[10px] text-text-dim truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{c.spotName}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <Card
                      className="p-3.5 sm:p-4 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-xl group flex items-center gap-3 sm:gap-4 cursor-pointer"
                      onClick={() => c.id && navigate(`/catches/${c.id}`)}
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface-soft flex-shrink-0 border border-border-subtle">
                        <LazyImage
                          src={imageSrc}
                          alt={species}
                          wrapperClassName="w-full h-full"
                          fallbackIconSize={30}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
                            {species}
                          </h4>
                          {c.status === 'draft' && (
                            <Badge
                              variant="warning"
                              className="text-[7px] py-0.5 px-1.5"
                            >
                              Concept
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-text-secondary flex-wrap">
                          <span className="font-bold">
                            {c.length !== undefined && c.length !== null
                              ? `${c.length}cm`
                              : '--'}
                          </span>

                          {c.weight !== undefined && c.weight !== null && (
                            <>
                              <span className="text-text-dim">•</span>
                              <span>{formatWeight(c.weight)}</span>
                            </>
                          )}

                          <span className="text-text-dim">•</span>
                          <span className="truncate max-w-[130px] sm:max-w-none">
                            {c.spotName || 'Geen stek'}
                          </span>
                          <span className="text-text-dim">•</span>
                          <span>
                            {catchDate
                              ? format(catchDate, 'd MMM yyyy', { locale: nl })
                              : 'Zojuist'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCatch(c);
                            setIsCatchFormOpen(true);
                          }}
                          className="p-2 text-text-muted hover:text-brand transition-colors"
                          aria-label="Bewerk vangst"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (c.id) handleDelete(c.id);
                          }}
                          className="p-2 text-text-muted hover:text-danger transition-colors"
                          aria-label="Verwijder vangst"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Card>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="p-10 sm:p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl">
            <Fish className="w-12 h-12 text-brand/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-text-primary">
              Geen vangsten gevonden
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              Pas je filters aan of log een nieuwe vangst.
            </p>
            <Button
              onClick={() => {
                setEditingCatch(null);
                setIsCatchFormOpen(true);
              }}
            >
              Vangst Loggen
            </Button>
          </Card>
        )}
      </div>
  );

  return (
    <>
      {isEmbedded ? (
        <>
          {/* Embedded action bar — shown instead of PageHeader when inside Logboek hub */}
          <div className="flex items-center justify-end gap-2 px-2 md:px-0 mb-3">
            <Button
              variant="secondary"
              icon={<Camera className="w-4 h-4" />}
              onClick={() => setIsQuickCatchOpen(true)}
              className="rounded-xl h-9 px-3 text-xs font-bold"
            >
              Quick
            </Button>
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => { setEditingCatch(null); setIsCatchFormOpen(true); }}
              className="rounded-xl h-9 px-4 text-xs font-bold shadow-premium-accent"
            >
              Vangst Loggen
            </Button>
          </div>
          {listContent}
        </>
      ) : (
        <PageLayout>
          <PageHeader
            title="Mijn Vangsten"
            subtitle={`${catches.length} vangsten gelogd`}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  icon={<Camera className="w-4 h-4" />}
                  onClick={() => setIsQuickCatchOpen(true)}
                  className="rounded-xl h-11 px-4 font-bold hidden sm:flex"
                >
                  Quick
                </Button>
                <Button
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => { setEditingCatch(null); setIsCatchFormOpen(true); }}
                  className="rounded-xl h-11 px-5 sm:px-6 font-bold shadow-premium-accent"
                >
                  Vangst Loggen
                </Button>
              </div>
            }
          />
          {listContent}
        </PageLayout>
      )}

      <AnimatePresence>
        {isQuickCatchOpen && (
          <QuickCatchModal
            isOpen={isQuickCatchOpen}
            onClose={() => setIsQuickCatchOpen(false)}
          />
        )}

        {isCatchFormOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setIsCatchFormOpen(false);
                setEditingCatch(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-2xl"
            >
              <CatchForm
                initialData={editingCatch || {}}
                onComplete={() => {
                  setIsCatchFormOpen(false);
                  setEditingCatch(null);
                }}
                onCancel={() => {
                  setIsCatchFormOpen(false);
                  setEditingCatch(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}