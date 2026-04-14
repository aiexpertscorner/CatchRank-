/**
 * TackleboxScreen.tsx  v2
 *
 * Mijn Tacklebox — compleet herbouwd met:
 *   - Sub-views: Gear (lijst) | Secties (per setup-blok) | Favorieten | Wishlist
 *   - Completeness badges per item (dekt het een actieve setup?)
 *   - Sectie-gegroepeerde view via TackleboxSectionView
 *   - QuickAddProductSearch als primaire toevoeg-flow
 *   - GearItemModal voor bewerken / handmatig toevoegen
 *   - Discipline filter (Karper / Roofvis / Alles)
 */

import React, {
  useState, useEffect, useMemo, useCallback,
} from 'react';
import {
  Plus, Search, Star, Bookmark, Package,
  X, Grid, List as ListIcon, Loader2,
  ShoppingBag, ExternalLink, Edit2, Trash2,
  LayoutGrid, SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Base';
import { toast } from 'sonner';
import { useAuth } from '../../../App';
import { useGearContext } from '../context/GearContext';
import { templateService } from '../services/templateService';

import { GearItemModal } from '../components/GearItemModal';
import { QuickAddProductSearch } from '../components/QuickAddProductSearch';
import { TackleboxSectionView } from '../components/TackleboxSectionView';
import { CompletenessItemBadge, SetupCoverageRow } from '../components/CompletenessItemBadge';

import type {
  GearItem, ProductCatalogItem, GearUserSave,
} from '../../../types';
import type { TackleboxItem, SetupRequirement, SessionSetup } from '../../../types';

/* ==========================================================================
   Types
   ========================================================================== */

type SubView     = 'lijst' | 'secties' | 'favorieten' | 'wishlist';
type ViewMode    = 'list' | 'grid';
type DisciplineFilter = 'all' | 'karper' | 'roofvis';

/* ==========================================================================
   Gear item card (list view with completeness badge)
   ========================================================================== */

function GearItemRow({
  item,
  allRequirements,
  viewMode,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  item:             TackleboxItem;
  allRequirements:  SetupRequirement[];
  viewMode:         ViewMode;
  onEdit:           (i: TackleboxItem) => void;
  onDelete:         (i: TackleboxItem) => void;
  onToggleFavorite: (i: TackleboxItem) => void;
}) {
  const STATUS_DOT: Record<string, string> = {
    owned:   'bg-success', want: 'bg-brand',
    reserve: 'bg-text-muted', replace: 'bg-orange-400',
  };
  const STATUS_LABEL: Record<string, string> = {
    owned: 'Heb ik', want: 'Wil ik', reserve: 'Reserve', replace: 'Vervangen',
  };

  const statusDot   = STATUS_DOT[item.ownershipStatus ?? 'owned'] ?? STATUS_DOT.owned;
  const statusLabel = STATUS_LABEL[item.ownershipStatus ?? 'owned'] ?? 'Heb ik';
  const qty         = item.quantityOwned ?? 1;
  const imgURL      = (item as any).catalogSnapshot?.imageURL;

  if (viewMode === 'grid') {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-soft overflow-hidden">
        <div className="aspect-square bg-surface-card flex items-center justify-center overflow-hidden relative">
          {imgURL
            ? <img src={imgURL} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
            : <Package className="w-8 h-8 text-text-dim opacity-30" />
          }
          <button
            onClick={() => onToggleFavorite(item as GearItem)}
            className={cn('absolute top-2 right-2 w-7 h-7 rounded-xl flex items-center justify-center transition-all',
              item.isFavorite ? 'bg-brand text-bg-main' : 'bg-black/40 text-white hover:bg-brand hover:text-bg-main')}
          >
            <Star className="w-3.5 h-3.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="p-3 space-y-1.5">
          {item.brand && <p className="text-[9px] text-text-dim uppercase tracking-widest font-bold">{item.brand}</p>}
          <p className="text-[11px] font-bold text-text-primary leading-tight line-clamp-2">{item.name}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusDot)} />
            <span className="text-[9px] text-text-muted">{statusLabel}</span>
            {qty > 1 && <span className="text-[9px] font-black text-text-dim">× {qty}</span>}
            <CompletenessItemBadge item={item} requirements={allRequirements} />
          </div>
          <div className="flex gap-1 pt-1">
            <button onClick={() => onEdit(item)} className="flex-1 h-7 rounded-lg bg-surface-card border border-border-subtle text-text-muted hover:text-brand text-[9px] font-black uppercase transition-all">
              Bewerk
            </button>
            <button onClick={() => onDelete(item)} className="w-7 h-7 rounded-lg bg-surface-card border border-border-subtle text-text-muted hover:text-red-400 flex items-center justify-center transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-soft border border-border-subtle">
      <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', statusDot)} />
      <div className="w-9 h-9 rounded-xl bg-surface-card border border-border-subtle overflow-hidden flex items-center justify-center flex-shrink-0">
        {imgURL
          ? <img src={imgURL} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
          : <Package className="w-4 h-4 text-text-dim" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[12px] font-bold text-text-primary truncate">{item.name}</p>
          <CompletenessItemBadge item={item} requirements={allRequirements} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.brand && <span className="text-[9px] text-text-dim">{item.brand}</span>}
          <span className="text-[9px] text-text-muted">{statusLabel}</span>
          {qty > 1 && <span className="text-[9px] font-black text-text-dim">× {qty} {item.unit ?? 'st.'}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onToggleFavorite(item as GearItem)}
          className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all',
            item.isFavorite ? 'text-brand bg-brand/10' : 'text-text-dim hover:text-brand hover:bg-brand/5')}>
          <Star className="w-3.5 h-3.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => onEdit(item)} className="w-7 h-7 rounded-lg text-text-dim hover:text-brand hover:bg-brand/5 flex items-center justify-center transition-all">
          <Edit2 className="w-3 h-3" />
        </button>
        <button onClick={() => onDelete(item)} className="w-7 h-7 rounded-lg text-text-dim hover:text-red-400 hover:bg-red-400/5 flex items-center justify-center transition-all">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   Wishlist card
   ========================================================================== */

function WishlistCard({ item, onRemove }: { item: GearUserSave; onRemove: () => void }) {
  const snap = item.productSnapshot as any;
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-soft border border-border-subtle">
      <div className="w-10 h-10 rounded-xl bg-surface-card overflow-hidden flex items-center justify-center flex-shrink-0">
        {snap?.imageURL
          ? <img src={snap.imageURL} alt={snap.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          : <ShoppingBag className="w-4 h-4 text-text-dim" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-text-primary truncate">{snap?.name ?? 'Product'}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {snap?.brand && <span className="text-[10px] text-text-muted">{snap.brand}</span>}
          {snap?.price != null && <span className="text-[10px] font-bold text-text-secondary">€{snap.price.toFixed(2)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {snap?.affiliateURL && (
          <a href={snap.affiliateURL} target="_blank" rel="noopener noreferrer"
            className="w-7 h-7 rounded-lg bg-surface-card border border-border-subtle text-text-muted hover:text-brand flex items-center justify-center transition-all">
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <button onClick={onRemove}
          className="w-7 h-7 rounded-lg bg-surface-card border border-border-subtle text-text-muted hover:text-red-400 flex items-center justify-center transition-all">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   Main screen
   ========================================================================== */

export function TackleboxScreen() {
  const { profile } = useAuth();
  const {
    myGear, gearLoading, setupsV2,
    handleDeleteGear, handleToggleFavorite,
    setOnOpenAddGear,
    wishlistItems, wishlistLoading, loadWishlist, removeFromWishlist,
    loadInteractions,
  } = useGearContext();

  // ── Sub-view & filters ───────────────────────────────────────────────
  const [subView,    setSubView]    = useState<SubView>('lijst');
  const [viewMode,   setViewMode]   = useState<ViewMode>('list');
  const [discipline, setDiscipline] = useState<DisciplineFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Active setup requirements (for completeness badges) ──────────────
  const [allRequirements, setAllRequirements] = useState<SetupRequirement[]>([]);

  useEffect(() => {
    // Load requirements for all user setups with a templateId
    const templateIds = [...new Set(
      setupsV2.map((s) => s.templateId).filter(Boolean) as string[]
    )];
    if (templateIds.length === 0) { setAllRequirements([]); return; }

    Promise.all(templateIds.map((id) => templateService.getRequirementsForTemplate(id)))
      .then((results) => setAllRequirements(results.flat()))
      .catch(() => {});
  }, [setupsV2]);

  // ── Modals ───────────────────────────────────────────────────────────
  const [isGearModalOpen, setIsGearModalOpen] = useState(false);
  const [editingGear,     setEditingGear]     = useState<TackleboxItem | null>(null);
  const [prefillGear,     setPrefillGear]     = useState<Partial<TackleboxItem> | null>(null);
  const [prefillProduct,  setPrefillProduct]  = useState<ProductCatalogItem | null>(null);
  const [isQuickAddOpen,  setIsQuickAddOpen]  = useState(false);
  const [quickAddSection, setQuickAddSection] = useState<string | undefined>();

  // ── Register openAddGear with GearContext ────────────────────────────
  const openAddGear = useCallback((prefill?: Partial<TackleboxItem>) => {
    setEditingGear(null);
    setPrefillGear(prefill ?? null);
    setPrefillProduct(null);
    setIsGearModalOpen(true);
  }, []);

  useEffect(() => {
    setOnOpenAddGear(openAddGear);
  }, [setOnOpenAddGear, openAddGear]);

  // ── Lazy load wishlist when subView = wishlist ────────────────────────
  useEffect(() => {
    if (subView === 'wishlist') {
      loadWishlist();
      loadInteractions();
    }
  }, [subView]);

  // ── Filtered gear ────────────────────────────────────────────────────
  const filteredGear = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return myGear.filter((g) => {
      const matchesSearch  = !q || g.name?.toLowerCase().includes(q) || g.brand?.toLowerCase().includes(q);
      const matchesDiscipline = discipline === 'all' || g.disciplineTags?.includes(discipline);
      return matchesSearch && matchesDiscipline;
    });
  }, [myGear, searchQuery, discipline]);

  const favorites = useMemo(() => filteredGear.filter((g) => g.isFavorite), [filteredGear]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const openEdit = (item: TackleboxItem) => {
    setEditingGear(item);
    setPrefillGear(null);
    setPrefillProduct(null);
    setIsGearModalOpen(true);
  };

  const openQuickAdd = (sectionId?: string) => {
    setQuickAddSection(sectionId);
    setIsQuickAddOpen(true);
  };

  // ── Sub-nav config ────────────────────────────────────────────────────
  const SUB_VIEWS: { id: SubView; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'lijst',      label: 'Lijst',      icon: ListIcon,  count: filteredGear.length  },
    { id: 'secties',    label: 'Secties',     icon: LayoutGrid                             },
    { id: 'favorieten', label: 'Favorieten',  icon: Star,      count: favorites.length     },
    { id: 'wishlist',   label: 'Wishlist',    icon: Bookmark,  count: wishlistItems.length },
  ];

  return (
    <div className="space-y-4 pb-nav-pad">

      {/* ── Top bar: sub-nav + add ─────────────────────────────────── */}
      <div className="flex items-center gap-2 px-2 md:px-0">
        <div className="flex flex-1 bg-surface-card border border-border-subtle rounded-2xl p-1 gap-0.5 overflow-x-auto no-scrollbar">
          {SUB_VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => { setSubView(v.id); setSearchQuery(''); }}
              className={cn(
                'flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all',
                subView === v.id
                  ? 'bg-brand text-bg-main shadow-md shadow-brand/20'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <v.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{v.label}</span>
              {v.count != null && v.count > 0 && (
                <span className={cn(
                  'text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center',
                  subView === v.id ? 'bg-white/20' : 'bg-brand/20 text-brand'
                )}>
                  {v.count > 99 ? '99+' : v.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {subView !== 'wishlist' && (
          <Button
            icon={<Plus className="w-4 h-4" />}
            className="h-10 px-3 rounded-xl font-bold shadow-premium-accent flex-shrink-0"
            onClick={() => openQuickAdd()}
          >
            <span className="hidden sm:inline">Toevoegen</span>
          </Button>
        )}
      </div>

      {/* ── Filters row (search + discipline + view toggle) ───────── */}
      {(subView === 'lijst' || subView === 'favorieten' || subView === 'secties') && (
        <div className="flex items-center gap-2 px-2 md:px-0">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek in je gear…"
              className="w-full bg-surface-soft border border-border-subtle rounded-xl pl-10 pr-9 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Discipline filter */}
          <div className="flex bg-surface-card border border-border-subtle rounded-xl p-0.5 gap-0.5 flex-shrink-0">
            {(['all', 'karper', 'roofvis'] as DisciplineFilter[]).map((d) => (
              <button
                key={d}
                onClick={() => setDiscipline(d)}
                className={cn(
                  'px-2.5 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all',
                  discipline === d ? 'bg-brand text-bg-main' : 'text-text-muted hover:text-text-primary'
                )}
              >
                {d === 'all' ? '🎣' : d === 'karper' ? '🐟' : '🦈'}
              </button>
            ))}
          </div>

          {/* View toggle (lijst only) */}
          {subView === 'lijst' && (
            <div className="flex bg-surface-card border border-border-subtle rounded-xl p-0.5 flex-shrink-0">
              <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-brand text-bg-main' : 'text-text-muted')}>
                <ListIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-brand text-bg-main' : 'text-text-muted')}>
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subView}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.14 }}
          className="px-2 md:px-0"
        >

          {/* LIJST */}
          {subView === 'lijst' && (
            <>
              {gearLoading ? (
                <div className="flex items-center justify-center py-16 text-text-muted">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Tacklebox laden…</span>
                </div>
              ) : filteredGear.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-text-muted">
                  <Package className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold text-text-primary">
                    {searchQuery ? `Geen resultaten voor "${searchQuery}"` : 'Tacklebox is leeg.'}
                  </p>
                  <p className="text-[11px] text-text-muted mt-1 text-center max-w-[240px]">
                    {searchQuery ? 'Probeer een andere zoekterm.' : 'Voeg gear toe om je setups te koppelen.'}
                  </p>
                  {!searchQuery && (
                    <Button icon={<Plus className="w-4 h-4" />} className="mt-4 h-10 px-5 rounded-xl" onClick={() => openQuickAdd()}>
                      Eerste item toevoegen
                    </Button>
                  )}
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
                  {filteredGear.map((item) => (
                    <GearItemRow
                      key={item.id}
                      item={item}
                      allRequirements={allRequirements}
                      viewMode={viewMode}
                      onEdit={openEdit}
                      onDelete={(i) => handleDeleteGear(i as GearItem)}
                      onToggleFavorite={(i) => handleToggleFavorite(i as GearItem)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* SECTIES */}
          {subView === 'secties' && (
            <TackleboxSectionView
              items={filteredGear}
              requirements={allRequirements}
              disciplineFilter={discipline}
              onEdit={openEdit}
              onDelete={(i) => handleDeleteGear(i as GearItem)}
              onToggleFavorite={(i) => handleToggleFavorite(i as GearItem)}
              onAddToSection={(sectionId) => openQuickAdd(sectionId)}
            />
          )}

          {/* FAVORIETEN */}
          {subView === 'favorieten' && (
            <>
              {favorites.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-text-muted">
                  <Star className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold text-text-primary">Geen favorieten.</p>
                  <p className="text-[11px] text-text-muted mt-1 text-center max-w-[240px]">
                    Markeer items als favoriet via de ster in de lijst.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {favorites.map((item) => (
                    <GearItemRow
                      key={item.id}
                      item={item}
                      allRequirements={allRequirements}
                      viewMode="list"
                      onEdit={openEdit}
                      onDelete={(i) => handleDeleteGear(i as GearItem)}
                      onToggleFavorite={(i) => handleToggleFavorite(i as GearItem)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* WISHLIST */}
          {subView === 'wishlist' && (
            <>
              {wishlistLoading ? (
                <div className="flex items-center justify-center py-16 text-text-muted">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Wishlist laden…</span>
                </div>
              ) : wishlistItems.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-text-muted">
                  <Bookmark className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold text-text-primary">Wishlist is leeg.</p>
                  <p className="text-[11px] text-text-muted mt-1 text-center max-w-[240px]">
                    Sla producten op via Ontdekken of Sessiecheck.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {wishlistItems.map((item) => (
                    <WishlistCard
                      key={item.id}
                      item={item}
                      onRemove={() => removeFromWishlist(item.productId)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <QuickAddProductSearch
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        initialSectionId={quickAddSection}
        onSelectProduct={(product) => {
          setPrefillProduct(product as any);
          setEditingGear(null);
          setPrefillGear(null);
          setIsGearModalOpen(true);
          setIsQuickAddOpen(false);
        }}
        onAddManually={(name) => {
          setPrefillGear(name ? { name } as any : null);
          setEditingGear(null);
          setPrefillProduct(null);
          setIsGearModalOpen(true);
          setIsQuickAddOpen(false);
        }}
      />

      <GearItemModal
        isOpen={isGearModalOpen}
        onClose={() => {
          setIsGearModalOpen(false);
          setEditingGear(null);
          setPrefillGear(null);
          setPrefillProduct(null);
        }}
        editItem={editingGear}
        prefillData={prefillGear as any}
        prefillFromProduct={prefillProduct as any}
      />
    </div>
  );
}
