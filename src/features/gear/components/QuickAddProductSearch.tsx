import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  X, Search, Loader2, Plus, ShoppingBag,
  Pencil, Star, ChevronRight, Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import type { ProductCatalogItem, TackleboxItem } from '../../../types';
import { productFeedServicePatch } from '../services/productFeedService.patch';

/* ==========================================================================
   Types
   ========================================================================== */

export interface QuickAddProductSearchProps {
  isOpen:             boolean;
  onClose:            () => void;

  /** Called when user selects a catalog product — open GearItemModal pre-filled */
  onSelectProduct:    (product: ProductCatalogItem) => void;

  /** Called when user chooses to add manually (no catalog product selected) */
  onAddManually:      (prefillName?: string) => void;

  /** Optional: pre-filter by section (e.g. from Sessiecheck "Zoek product") */
  initialSectionId?:  string;
  initialQuery?:      string;
}

/* ==========================================================================
   Compact product row
   ========================================================================== */

function ProductRow({
  product,
  onSelect,
}: {
  product:  ProductCatalogItem & { id?: string };
  onSelect: () => void;
}) {
  const price      = product.price;
  const roleBadge  = (product as any).alternativeRole;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-soft transition-colors text-left border-b border-border-subtle/40 last:border-0"
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center overflow-hidden flex-shrink-0">
        {product.imageURL ? (
          <img
            src={product.imageURL}
            alt={product.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <Package className="w-4 h-4 text-text-dim" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-text-primary leading-tight truncate">
          {product.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {product.brand && (
            <span className="text-[10px] text-text-muted">{product.brand}</span>
          )}
          {price != null && (
            <span className="text-[10px] font-bold text-text-secondary">
              €{price.toFixed(2)}
            </span>
          )}
          {(product as any).beginnerFriendly && (
            <span className="text-[8px] font-black text-green-400 bg-green-400/10 border border-green-400/20 px-1 py-0.5 rounded uppercase tracking-widest">
              Beginner
            </span>
          )}
        </div>
      </div>

      {/* Select arrow */}
      <div className="flex items-center gap-1 text-brand flex-shrink-0">
        <span className="text-[9px] font-black uppercase tracking-widest">Voeg toe</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );
}

/* ==========================================================================
   Popular grid (shown when search is empty)
   ========================================================================== */

function PopularGrid({
  products,
  onSelect,
}: {
  products: ProductCatalogItem[];
  onSelect: (p: ProductCatalogItem) => void;
}) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-4">
        <Star className="w-3.5 h-3.5 text-brand" />
        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
          Populair
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4">
        {products.slice(0, 9).map((product) => {
          const id = (product as any).id ?? (product as any)._id ?? '';
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(product)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-surface-soft border border-border-subtle hover:border-brand/30 hover:bg-brand/5 transition-all text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-card overflow-hidden flex items-center justify-center">
                {product.imageURL ? (
                  <img
                    src={product.imageURL}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <Package className="w-5 h-5 text-text-dim" />
                )}
              </div>
              <p className="text-[9px] font-bold text-text-secondary leading-tight line-clamp-2">
                {product.brand ? `${product.brand}` : product.name.split(' ').slice(0, 3).join(' ')}
              </p>
              {product.price != null && (
                <p className="text-[9px] font-black text-text-primary">
                  €{product.price.toFixed(2)}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   Main component
   ========================================================================== */

export const QuickAddProductSearch: React.FC<QuickAddProductSearchProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onAddManually,
  initialSectionId,
  initialQuery = '',
}) => {
  const [query,           setQuery]           = useState(initialQuery);
  const [results,         setResults]         = useState<ProductCatalogItem[]>([]);
  const [popularProducts, setPopularProducts] = useState<ProductCatalogItem[]>([]);
  const [searching,       setSearching]       = useState(false);
  const [popularLoading,  setPopularLoading]  = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout>>();

  // ── Load popular products on open ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setQuery(initialQuery);
    setResults([]);
    setPopularLoading(true);

    const loadPopular = async () => {
      try {
        const products = initialSectionId
          ? await productFeedServicePatch.getProductsBySectionId(initialSectionId, 12)
          : await productFeedServicePatch.getTopProducts(12);
        setPopularProducts(products);
      } catch (err) {
        console.error('QuickAdd popular load error:', err);
      } finally {
        setPopularLoading(false);
      }
    };

    loadPopular();

    // Auto-focus search
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, initialSectionId]);

  // ── Search with debounce ──────────────────────────────────────────────
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(timerRef.current);

    if (!value.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const found = await productFeedServicePatch.searchProducts(
          value,
          initialSectionId,
          30
        );
        setResults(found);
      } catch (err) {
        console.error('QuickAdd search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [initialSectionId]);

  const handleSelect = (product: ProductCatalogItem) => {
    onSelectProduct(product);
    onClose();
  };

  const handleManual = () => {
    onAddManually(query.trim() || undefined);
    onClose();
  };

  const showSearch    = query.trim().length > 0;
  const showPopular   = !showSearch;
  const showNoResults = showSearch && !searching && results.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[60] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:w-full"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="bg-surface-card border border-border-subtle rounded-t-3xl md:rounded-3xl md:mb-6 overflow-hidden max-h-[88dvh] flex flex-col">

              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-border-subtle" />
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 px-4 pb-3 flex-shrink-0">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder={
                      initialSectionId
                        ? 'Zoek in deze categorie…'
                        : 'Zoek product, merk of type…'
                    }
                    className="w-full bg-surface-soft border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand animate-spin" />
                  )}
                  {query && !searching && (
                    <button
                      onClick={() => handleQueryChange('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Popular grid */}
                {showPopular && (
                  <>
                    {popularLoading ? (
                      <div className="flex items-center justify-center py-12 text-text-muted">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        <span className="text-sm">Populaire producten laden…</span>
                      </div>
                    ) : (
                      <PopularGrid
                        products={popularProducts}
                        onSelect={handleSelect}
                      />
                    )}
                  </>
                )}

                {/* Search results */}
                {showSearch && !searching && results.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest px-4 py-2">
                      {results.length} resultaten
                    </p>
                    {results.map((product) => {
                      const id = (product as any).id ?? (product as any)._id ?? Math.random().toString();
                      return (
                        <ProductRow
                          key={id}
                          product={product}
                          onSelect={() => handleSelect(product)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* No results */}
                {showNoResults && (
                  <div className="flex flex-col items-center py-10 px-4 text-text-muted">
                    <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-bold text-text-primary">
                      Niets gevonden voor "{query}"
                    </p>
                    <p className="text-[11px] text-text-muted mt-1 text-center">
                      Je kunt het handmatig toevoegen — wij zoeken mee.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer — manual add */}
              <div className="px-4 py-4 border-t border-border-subtle flex-shrink-0">
                <button
                  type="button"
                  onClick={handleManual}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-border-subtle bg-surface-soft text-text-secondary hover:text-brand hover:border-brand/30 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {query.trim()
                    ? `Voeg "${query.trim()}" handmatig toe`
                    : 'Handmatig toevoegen'
                  }
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
