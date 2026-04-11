import React, { useEffect, useState } from 'react';
import {
  X, ExternalLink, Plus, Loader2, ShoppingBag, Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Base';
import { toast } from 'sonner';
import type { ProductCatalogItem, SetupRequirement } from '../../../types';
import { matchingProductService } from '../services/matchingProductService';
import { useAuth } from '../../../App';
import { gearInteractionService } from '../services/gearInteractionService';

/* ==========================================================================
   Types
   ========================================================================== */

export interface MatchingProductsDrawerProps {
  isOpen:         boolean;
  onClose:        () => void;

  /** Title context — shown as subtitle */
  contextLabel:   string;

  /** Product rule keys from advice engine OR missing item */
  ruleKeys?:      string[];

  /** Alternative: direct sectionId + requirementKey for Sessiecheck missing items */
  requirement?:   SetupRequirement;
  conditionTags?: string[];

  /** When user taps "+ Mijn Gear" */
  onAddToGear?:   (product: ProductCatalogItem) => void;
}

/* ==========================================================================
   Role labels + colors
   ========================================================================== */

const ROLE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  beste_keuze:     { label: 'Beste keuze',      color: 'text-brand bg-brand/10 border-brand/20',         emoji: '⭐' },
  simpelste_keuze: { label: 'Simpelste keuze',  color: 'text-green-400 bg-green-400/10 border-green-400/20', emoji: '✓' },
  beste_prijs:     { label: 'Beste prijs',       color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',  emoji: '€' },
  aanvullend:      { label: 'Aanvullend',        color: 'text-text-muted bg-surface-soft border-border-subtle', emoji: '+' },
};

/* ==========================================================================
   Product card
   ========================================================================== */

function ProductCard({
  product,
  onAddToGear,
  savedIds,
  onSave,
}: {
  product:    ProductCatalogItem & { id: string };
  onAddToGear: () => void;
  savedIds:   Set<string>;
  onSave:     () => void;
}) {
  const role        = (product as any).alternativeRole as string | undefined;
  const roleConfig  = role ? ROLE_CONFIG[role] : null;
  const isSaved     = savedIds.has(product.id);
  const price       = product.price;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-soft overflow-hidden">
      {/* Role badge */}
      {roleConfig && (
        <div className={cn(
          'flex items-center gap-1.5 px-4 py-2 border-b border-border-subtle/50',
          'text-[9px] font-black uppercase tracking-widest',
          roleConfig.color
        )}>
          <span>{roleConfig.emoji}</span>
          <span>{roleConfig.label}</span>
        </div>
      )}

      <div className="flex gap-3 p-4">
        {/* Image */}
        <div className="w-16 h-16 rounded-xl bg-surface-card flex items-center justify-center overflow-hidden flex-shrink-0">
          {product.imageURL ? (
            <img
              src={product.imageURL}
              alt={product.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <ShoppingBag className="w-6 h-6 text-text-dim" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {product.brand && (
            <p className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-0.5">
              {product.brand}
            </p>
          )}
          <p className="text-[12px] font-bold text-text-primary leading-tight line-clamp-2">
            {product.name}
          </p>

          {/* Reason why this fits */}
          {(product as any).scores?.checklistPriority >= 80 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-2.5 h-2.5 text-brand" />
              <span className="text-[9px] text-brand">Checklist essentieel</span>
            </div>
          )}

          {/* Price */}
          {price != null && (
            <p className="text-sm font-black text-text-primary mt-1">
              €{price.toFixed(2)}
              {(product as any).priceBand === 'low' && (
                <span className="ml-1.5 text-[9px] font-black text-amber-400">Voordelig</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex gap-2 px-4 pb-4">
        {product.affiliateURL && (
          <a
            href={product.affiliateURL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-surface-card border border-border-subtle text-text-secondary hover:text-brand hover:border-brand/30 text-[9px] font-black uppercase tracking-widest transition-all"
          >
            Bekijk aanbieding
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        )}
        <button
          onClick={onAddToGear}
          className={cn(
            'flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all',
            'bg-brand/10 text-brand border-brand/20 hover:bg-brand/20'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          {isSaved ? 'Opgeslagen' : 'Mijn Gear'}
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   Main component
   ========================================================================== */

export const MatchingProductsDrawer: React.FC<MatchingProductsDrawerProps> = ({
  isOpen,
  onClose,
  contextLabel,
  ruleKeys,
  requirement,
  conditionTags = [],
  onAddToGear,
}) => {
  const { profile } = useAuth();

  const [products, setProducts] = useState<(ProductCatalogItem & { id: string })[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // ── Load products ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setProducts([]);

    const load = async () => {
      try {
        let result: ProductCatalogItem[] = [];

        if (ruleKeys && ruleKeys.length > 0) {
          result = await matchingProductService.getProductsForRuleKeys(ruleKeys, 9);
        } else if (requirement) {
          result = await matchingProductService.getProductsForMissingItem(
            requirement.requirementKey,
            requirement.sectionId,
            conditionTags
          );
        }

        setProducts(
          result.map((p) => ({ ...p, id: (p as any).id ?? (p as any)._id ?? '' }))
        );
      } catch (err) {
        console.error('MatchingProductsDrawer load error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, ruleKeys?.join(','), requirement?.requirementKey]);

  // ── Load saved IDs ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !profile) return;
    gearInteractionService
      .getUserSavedProductIds(profile.uid)
      .then(setSavedIds)
      .catch(() => {});
  }, [isOpen, profile]);

  // ── Save to wishlist ──────────────────────────────────────────────────
  const handleSave = async (product: ProductCatalogItem & { id: string }) => {
    if (!profile) return;
    try {
      await gearInteractionService.saveToWishlist(
        profile.uid,
        product.id,
        { name: product.name, brand: product.brand, imageURL: product.imageURL, price: product.price },
        'matching_products'
      );
      setSavedIds((prev) => new Set([...prev, product.id]));
      toast.success('Opgeslagen in Wishlist!');
    } catch {
      toast.error('Opslaan mislukt.');
    }
  };

  // ── Group products by role ────────────────────────────────────────────
  const byRole = {
    beste_keuze:     products.find((p) => (p as any).alternativeRole === 'beste_keuze'),
    simpelste_keuze: products.find((p) => (p as any).alternativeRole === 'simpelste_keuze'),
    beste_prijs:     products.find((p) => (p as any).alternativeRole === 'beste_prijs'),
    rest:            products.filter((p) =>
      !['beste_keuze', 'simpelste_keuze', 'beste_prijs'].includes((p as any).alternativeRole)
    ),
  };

  const orderedProducts = [
    byRole.beste_keuze,
    byRole.simpelste_keuze,
    byRole.beste_prijs,
    ...byRole.rest.slice(0, 3),
  ].filter(Boolean) as (ProductCatalogItem & { id: string })[];

  // ── Render ─────────────────────────────────────────────────────────────
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

          {/* Bottom sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[60] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-md md:w-full"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="bg-surface-card border border-border-subtle rounded-t-3xl md:rounded-3xl md:mb-6 overflow-hidden max-h-[88dvh] flex flex-col">

              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-border-subtle" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between px-5 py-3 border-b border-border-subtle flex-shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Passende producten
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {contextLabel}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary ml-3 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Source badge */}
              <div className="flex items-center gap-2 px-5 py-2 flex-shrink-0">
                <div className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-[#0000A4]/10 text-[#0000A4] border border-[#0000A4]/20">
                  Fishinn
                </div>
                <span className="text-[10px] text-text-dim">
                  Specialist hengelsportwinkel
                </span>
              </div>

              {/* Products */}
              <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-text-muted">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">Producten zoeken…</span>
                  </div>
                ) : orderedProducts.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-text-muted">
                    <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">Geen passende producten gevonden.</p>
                    <p className="text-[11px] text-text-dim mt-1">
                      Probeer de zoekfunctie in Ontdekken.
                    </p>
                  </div>
                ) : (
                  orderedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      savedIds={savedIds}
                      onSave={() => handleSave(product)}
                      onAddToGear={() => {
                        if (onAddToGear) {
                          onAddToGear(product);
                        } else {
                          handleSave(product);
                        }
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
