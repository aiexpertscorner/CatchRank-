import React, { useState, useEffect } from 'react';
import {
  ChevronRight, ExternalLink, Plus, Loader2, ShoppingBag,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ProductCatalogItem, SetupRequirement } from '../../../types';
import { matchingProductService } from '../services/matchingProductService';

/* ==========================================================================
   Props
   ========================================================================== */

export interface SlotProductSuggestionProps {
  requirement:       SetupRequirement;
  conditionTags?:    string[];
  /** Called when user taps a product → opens GearItemModal pre-filled */
  onAddProduct:      (product: ProductCatalogItem) => void;
  /** Called when user taps "Zie alle [label]" → opens DiscoverTab */
  onViewAll:         (sectionId: string, label: string) => void;
  className?:        string;
}

/* ==========================================================================
   Mini product card (compact, for slot context)
   ========================================================================== */

function MiniProductCard({
  product,
  onAdd,
}: {
  product:  ProductCatalogItem;
  onAdd:    () => void;
}) {
  const role       = (product as any).alternativeRole as string | undefined;
  const roleColors: Record<string, string> = {
    beste_keuze:     'text-brand',
    simpelste_keuze: 'text-green-400',
    beste_prijs:     'text-amber-400',
  };
  const roleLabels: Record<string, string> = {
    beste_keuze:     '⭐',
    simpelste_keuze: '✓',
    beste_prijs:     '€',
  };

  return (
    <div className="flex-shrink-0 w-[120px] rounded-2xl border border-border-subtle bg-surface-card overflow-hidden">
      {/* Image */}
      <div className="w-full h-16 bg-surface-soft overflow-hidden">
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
          <div className="w-full h-full flex items-center justify-center text-text-dim">
            <ShoppingBag className="w-5 h-5 opacity-30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2 space-y-1.5">
        {role && roleLabels[role] && (
          <span className={cn('text-[8px] font-black', roleColors[role] ?? 'text-text-muted')}>
            {roleLabels[role]} {role === 'beste_keuze' ? 'Beste' : role === 'simpelste_keuze' ? 'Simpelst' : 'Goedkoopst'}
          </span>
        )}
        <p className="text-[9px] font-bold text-text-primary leading-tight line-clamp-2">
          {product.brand
            ? <><span className="text-text-dim">{product.brand} </span>{product.name.replace(product.brand, '').trim()}</>
            : product.name
          }
        </p>
        {product.price != null && (
          <p className="text-[10px] font-black text-text-primary">
            €{product.price.toFixed(2)}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-1">
          {product.affiliateURL && (
            <a
              href={product.affiliateURL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-6 h-6 rounded-lg bg-surface-soft border border-border-subtle text-text-muted hover:text-brand transition-colors"
            >
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          <button
            type="button"
            onClick={onAdd}
            className="flex-1 flex items-center justify-center gap-0.5 h-6 rounded-lg bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 text-[8px] font-black uppercase tracking-widest transition-all"
          >
            <Plus className="w-2.5 h-2.5" />
            Gear
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Main component
   ========================================================================== */

export const SlotProductSuggestion: React.FC<SlotProductSuggestionProps> = ({
  requirement,
  conditionTags = [],
  onAddProduct,
  onViewAll,
  className,
}) => {
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [loaded,   setLoaded]   = useState(false);

  // Load on first render (lazy — only when this slot is missing)
  useEffect(() => {
    if (loaded) return;
    setLoading(true);
    setLoaded(true);

    matchingProductService
      .getProductsForMissingItem(
        requirement.requirementKey,
        requirement.sectionId,
        conditionTags
      )
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requirement.requirementKey, requirement.sectionId]);

  // Don't render if loading and nothing yet
  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 py-2 text-text-muted', className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-[10px]">Passende producten zoeken…</span>
      </div>
    );
  }

  if (!loading && products.length === 0) return null;

  const sectionLabel = requirement.label;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Product strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {products.slice(0, 3).map((product) => {
          const id = (product as any).id ?? (product as any)._id ?? '';
          return (
            <MiniProductCard
              key={id}
              product={product}
              onAdd={() => onAddProduct(product)}
            />
          );
        })}
      </div>

      {/* View all link */}
      <button
        type="button"
        onClick={() => onViewAll(requirement.sectionId, sectionLabel)}
        className="flex items-center gap-1 text-[9px] font-black text-brand uppercase tracking-widest hover:opacity-70 transition-opacity"
      >
        <span>Zie alle {sectionLabel.toLowerCase()}</span>
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};
