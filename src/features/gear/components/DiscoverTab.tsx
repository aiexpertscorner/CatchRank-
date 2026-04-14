/**
 * DiscoverTab.tsx
 *
 * Vervangt de bestaande discover-sectie in Gear.tsx.
 *
 * Ontwerp principes (build pack §2, §3):
 *   - Geen filtermuur — producten verschijnen als invulling van een behoefte
 *   - Entry points: setup gaps, sectie-browsing, zoeken
 *   - Toon eerst WHY een product past, daarna pas naam/prijs
 *   - Paginering — nooit alles in één keer laden
 *   - Max 3 per behoefte-groep (beste/simpelste/prijs)
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import {
  Search, X, ShoppingBag, Loader2, ChevronRight,
  Plus, ExternalLink, Star, SlidersHorizontal, Fish,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import type {
  ProductCatalogItem, SessionSetup, TackleboxItem,
} from '../../../types';
import {
  productFeedServicePatch, ProductPageOptions, ProductPage,
  PRODUCTS_CATALOG,
} from '../services/productFeedService.patch';
import { parseQuery, getIntentChips } from '../utils/queryParser';

/* ==========================================================================
   Constants
   ========================================================================== */

/** Setup sections shown as entry points — ordered by usefulness */
const SECTION_ENTRY_POINTS = [
  { id: 'hookbaits',        label: 'Haakaas',           emoji: '🎯', discipline: 'karper'  },
  { id: 'lure_families',    label: 'Kunstaasfamilies',  emoji: '🐟', discipline: 'roofvis' },
  { id: 'bait_liquids',     label: 'Voer & Liquids',    emoji: '🪣', discipline: 'karper'  },
  { id: 'terminal_tackle',  label: 'Terminal Tackle',   emoji: '🔗', discipline: 'karper'  },
  { id: 'leaders_terminal', label: 'Leaders & Terminal',emoji: '🔗', discipline: 'roofvis' },
  { id: 'rods_reels',       label: 'Hengels & Reels',   emoji: '🎣', discipline: 'both'    },
  { id: 'bite_detection',   label: 'Bite Detection',    emoji: '🔔', discipline: 'karper'  },
  { id: 'landing_care',     label: 'Landing & Viszorg', emoji: '🛡', discipline: 'both'    },
  { id: 'shelter_sleep',    label: 'Shelter & Sleep',   emoji: '⛺', discipline: 'karper'  },
  { id: 'bags_mobility',    label: 'Tassen & Mobiliteit',emoji: '🎒', discipline: 'roofvis' },
  { id: 'unhook_safety',    label: 'Onthaak & Veiligheid',emoji: '🔧', discipline: 'roofvis' },
  { id: 'line_storage',     label: 'Lijnen & Spoel',    emoji: '🔄', discipline: 'both'    },
];

const DISCIPLINE_OPTIONS = [
  { value: 'all',     label: 'Alles',   emoji: '🎣' },
  { value: 'karper',  label: 'Karper',  emoji: '🐟' },
  { value: 'roofvis', label: 'Roofvis', emoji: '🦈' },
];

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  beste_keuze:     { label: 'Beste keuze',     color: 'text-brand bg-brand/10 border-brand/20' },
  simpelste_keuze: { label: 'Simpelste',       color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  beste_prijs:     { label: 'Beste prijs',     color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
};

/* ==========================================================================
   Props
   ========================================================================== */

interface DiscoverTabProps {
  userSetups?:     SessionSetup[];
  tackleboxItems?: TackleboxItem[];
  likedIds:        Set<string>;
  savedIds:        Set<string>;
  onLike:          (product: ProductCatalogItem) => void;
  onSave:          (product: ProductCatalogItem) => void;
  onShare:         (product: ProductCatalogItem) => void;
  onAddToGear:     (product: ProductCatalogItem) => void;
  onOpenDetail:    (product: any) => void;
  /** Called when user taps "Zoek product" from Sessiecheck */
  initialSectionId?: string;
}

/* ==========================================================================
   Product card
   ========================================================================== */

function ProductCard({
  product,
  isLiked,
  isSaved,
  onLike,
  onSave,
  onOpenDetail,
  onAddToGear,
}: {
  product:      ProductCatalogItem & { id: string };
  isLiked:      boolean;
  isSaved:      boolean;
  onLike:       () => void;
  onSave:       () => void;
  onOpenDetail: () => void;
  onAddToGear:  () => void;
}) {
  const role       = (product as any).alternativeRole as string | undefined;
  const roleBadge  = role ? ROLE_BADGES[role] : null;
  const price      = product.price;
  const isKarper   = (product as any).mainSection === 'karper';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border-subtle bg-surface-soft overflow-hidden"
    >
      {/* Role badge */}
      {roleBadge && (
        <div className={cn(
          'px-3 py-1.5 text-[8px] font-black uppercase tracking-widest border-b border-border-subtle/50',
          roleBadge.color
        )}>
          {roleBadge.label}
        </div>
      )}

      {/* Image */}
      <button
        onClick={onOpenDetail}
        className="w-full aspect-[4/3] bg-surface-card overflow-hidden block"
      >
        {product.imageURL ? (
          <img
            src={product.imageURL}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-dim">
            <ShoppingBag className="w-8 h-8 opacity-30" />
          </div>
        )}

        {/* Price overlay */}
        {price != null && (
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md rounded-lg px-2 py-0.5">
            <span className="text-xs font-black text-white">€{price.toFixed(2)}</span>
          </div>
        )}
      </button>

      {/* Info */}
      <div className="p-3 space-y-2">
        {product.brand && (
          <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">
            {product.brand}
          </p>
        )}
        <button onClick={onOpenDetail} className="text-left">
          <p className="text-[12px] font-bold text-text-primary leading-tight line-clamp-2">
            {product.name}
          </p>
        </button>

        {/* Beginner badge */}
        {(product as any).beginnerFriendly && (
          <span className="inline-block text-[8px] font-black uppercase tracking-widest text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-lg">
            Beginnersvriendelijk
          </span>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 pt-1">
          {product.affiliateURL && (
            <a
              href={product.affiliateURL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1 h-8 rounded-xl bg-surface-card border border-border-subtle text-text-muted hover:text-brand hover:border-brand/30 text-[9px] font-black uppercase tracking-widest transition-all"
            >
              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
              Bekijk
            </a>
          )}
          <button
            onClick={onAddToGear}
            className="flex items-center justify-center gap-1 h-8 px-2.5 rounded-xl bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <Plus className="w-3 h-3" />
            Gear
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   Section strip (horizontal scroll entry points)
   ========================================================================== */

function SectionStrip({
  activeDiscipline,
  activeSectionId,
  onSelect,
}: {
  activeDiscipline: string;
  activeSectionId:  string;
  onSelect:         (sectionId: string) => void;
}) {
  const filtered = SECTION_ENTRY_POINTS.filter((s) =>
    activeDiscipline === 'all' || s.discipline === activeDiscipline || s.discipline === 'both'
  );

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
      <button
        onClick={() => onSelect('all')}
        className={cn(
          'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all',
          activeSectionId === 'all'
            ? 'bg-brand text-bg-main border-brand'
            : 'bg-surface-soft text-text-muted border-border-subtle hover:border-brand/30'
        )}
      >
        <span>✨</span>
        <span>Populair</span>
      </button>
      {filtered.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
            activeSectionId === s.id
              ? 'bg-brand text-bg-main border-brand'
              : 'bg-surface-soft text-text-muted border-border-subtle hover:border-brand/30'
          )}
        >
          <span>{s.emoji}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ==========================================================================
   Setup gap entry points
   ========================================================================== */

function SetupGapStrip({
  setups,
  onSelectSection,
}: {
  setups:          SessionSetup[];
  onSelectSection: (sectionId: string, label: string) => void;
}) {
  // Find setups with missing items
  const setupsWithGaps = setups.filter(
    (s) => (s.missingKeys?.length ?? 0) > 0 && (s.completenessDetail?.essentialsPct ?? 100) < 100
  );

  if (setupsWithGaps.length === 0) return null;

  // Build unique missing sections across all setups
  const missingSections = new Map<string, { label: string; setupName: string }>();

  for (const setup of setupsWithGaps.slice(0, 2)) {
    const keys = setup.missingKeys ?? [];
    for (const key of keys.slice(0, 3)) {
      const section = SECTION_ENTRY_POINTS.find((s) =>
        s.id === key || key.startsWith(s.id)
      );
      if (section && !missingSections.has(section.id)) {
        missingSections.set(section.id, { label: section.label, setupName: setup.name });
      }
    }
  }

  if (missingSections.size === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
        Aanvullen voor jouw setups
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {[...missingSections.entries()].slice(0, 4).map(([sectionId, { label, setupName }]) => (
          <button
            key={sectionId}
            onClick={() => onSelectSection(sectionId, label)}
            className="flex-shrink-0 text-left p-3 rounded-2xl bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 transition-all min-w-[140px]"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">
                Ontbreekt
              </span>
            </div>
            <p className="text-[11px] font-bold text-text-primary">{label}</p>
            <p className="text-[9px] text-text-dim mt-0.5 truncate">
              {setupName}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Main DiscoverTab
   ========================================================================== */

export const DiscoverTab: React.FC<DiscoverTabProps> = ({
  userSetups = [],
  tackleboxItems = [],
  likedIds,
  savedIds,
  onLike,
  onSave,
  onShare,
  onAddToGear,
  onOpenDetail,
  initialSectionId,
}) => {
  // ── State ────────────────────────────────────────────────────────────
  const [searchQuery,      setSearchQuery]      = useState('');
  const [activeDiscipline, setActiveDiscipline] = useState('all');
  const [activeSectionId,  setActiveSectionId]  = useState(initialSectionId ?? 'all');
  const [sectionLabel,     setSectionLabel]      = useState('');

  const [products,    setProducts]    = useState<ProductCatalogItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [cursor,      setCursor]      = useState<any>(null);
  const [searchMode,  setSearchMode]  = useState(false);

  const parsedQuery = useMemo(() => parseQuery(searchQuery), [searchQuery]);
  const intentChips = useMemo(() => getIntentChips(parsedQuery), [parsedQuery]);

  // ── Load first page when section/discipline changes ───────────────────
  const loadFirstPage = useCallback(async (
    sectionId: string,
    discipline: string,
    search: string
  ) => {
    setLoading(true);
    setProducts([]);
    setCursor(null);
    setHasMore(false);

    try {
      if (search.trim()) {
        // Search mode: client-side filter on top-200
        const results = await productFeedServicePatch.searchProducts(
          search,
          sectionId !== 'all' ? sectionId : undefined
        );
        setProducts(results);
        setHasMore(false);
        setSearchMode(true);
      } else {
        setSearchMode(false);
        const options: ProductPageOptions = {
          pageSize: 20,
          source: 'fishinn', // Fishinn first
        };
        if (sectionId !== 'all') options.sectionId = sectionId;
        if (discipline !== 'all') options.mainSection = discipline;

        const page = await productFeedServicePatch.getProductsPage(options, null);
        setProducts(page.products);
        setCursor(page.lastDoc);
        setHasMore(page.hasMore);
      }
    } catch (err) {
      console.error('DiscoverTab load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load more (pagination) ────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const options: ProductPageOptions = {
        pageSize: 20,
        source: 'fishinn',
      };
      if (activeSectionId !== 'all') options.sectionId = activeSectionId;
      if (activeDiscipline !== 'all') options.mainSection = activeDiscipline;

      const page = await productFeedServicePatch.getProductsPage(options, cursor);
      setProducts((prev) => [...prev, ...page.products]);
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, cursor, activeSectionId, activeDiscipline]);

  // ── Effect: re-fetch when section/discipline/search changes ──────────
  useEffect(() => {
    loadFirstPage(activeSectionId, activeDiscipline, searchQuery);
  }, [activeSectionId, activeDiscipline]);

  // ── Debounced search ─────────────────────────────────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadFirstPage(activeSectionId, activeDiscipline, value);
    }, 350);
  };

  const clearSearch = () => {
    setSearchQuery('');
    loadFirstPage(activeSectionId, activeDiscipline, '');
  };

  // ── Section select (from strip or gap entry point) ───────────────────
  const handleSectionSelect = (sectionId: string, label?: string) => {
    setActiveSectionId(sectionId);
    setSectionLabel(label ?? SECTION_ENTRY_POINTS.find((s) => s.id === sectionId)?.label ?? '');
    setSearchQuery('');
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Search bar ───────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Zoek product, merk of type..."
          className="w-full bg-surface-soft border border-border-subtle rounded-xl pl-10 pr-10 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Intent chips (only when searching) ──────────────────────── */}
      {searchQuery && intentChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {intentChips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand/10 text-brand border border-brand/20 text-[9px] font-black uppercase tracking-widest"
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Discipline filter (only when not searching) ──────────────── */}
      {!searchQuery && (
        <div className="flex gap-2">
          {DISCIPLINE_OPTIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => { setActiveDiscipline(d.value); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all',
                activeDiscipline === d.value
                  ? 'bg-brand text-bg-main border-brand'
                  : 'bg-surface-soft text-text-muted border-border-subtle hover:border-brand/30'
              )}
            >
              <span>{d.emoji}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Setup gap entry points ───────────────────────────────────── */}
      {!searchQuery && userSetups.length > 0 && (
        <SetupGapStrip
          setups={userSetups}
          onSelectSection={(sectionId, label) => handleSectionSelect(sectionId, label)}
        />
      )}

      {/* ── Section browsing strip ───────────────────────────────────── */}
      {!searchQuery && (
        <SectionStrip
          activeDiscipline={activeDiscipline}
          activeSectionId={activeSectionId}
          onSelect={(id) => handleSectionSelect(id)}
        />
      )}

      {/* ── Active section label ─────────────────────────────────────── */}
      {activeSectionId !== 'all' && !searchQuery && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-text-primary">
            {sectionLabel || (SECTION_ENTRY_POINTS.find((s) => s.id === activeSectionId)?.label ?? activeSectionId)}
          </p>
          <button
            onClick={() => handleSectionSelect('all')}
            className="text-[10px] text-text-muted hover:text-brand transition-colors"
          >
            Alles tonen
          </button>
        </div>
      )}

      {searchQuery && (
        <p className="text-[11px] text-text-muted">
          {products.length} resultaten voor "{searchQuery}"
        </p>
      )}

      {/* ── Product grid ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Producten laden…</span>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-text-muted">
          <Fish className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Geen producten gevonden.</p>
          {searchQuery && (
            <button onClick={clearSearch} className="text-[11px] text-brand mt-2 hover:underline">
              Zoekopdracht wissen
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const id = (product as any).id ?? (product as any)._id ?? '';
              return (
                <div key={id} className="relative">
                  <ProductCard
                    product={{ ...product, id }}
                    isLiked={likedIds.has(id)}
                    isSaved={savedIds.has(id)}
                    onLike={() => onLike(product)}
                    onSave={() => onSave(product)}
                    onOpenDetail={() => onOpenDetail({ ...product, id })}
                    onAddToGear={() => onAddToGear(product)}
                  />
                </div>
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && !searchMode && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface-soft border border-border-subtle text-sm text-text-muted hover:text-brand hover:border-brand/30 transition-all"
            >
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Laden…</>
              ) : (
                <>Meer laden</>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
};
