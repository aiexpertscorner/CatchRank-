import React from 'react';
import {
  X,
  Heart,
  Bookmark,
  Share2,
  Plus,
  ExternalLink,
  Package,
  Star,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/Base';
import { cn } from '../../../lib/utils';
import { ProductCatalogItem } from '../../../types';

const SUBSUB_LABELS: Record<string, string> = {
  boilie: 'Boilies', wafter: 'Wafters', popup: 'Pop-ups', pva: 'PVA',
  rig: 'Rigs', leadclip: 'Leadclip', hooklink: 'Onderlijnen',
  bite_alarm: 'Bite Alarms', rod_pod: 'Rod Pods', spod: 'Spods',
  marker: 'Marker', karperhengel: 'Karperhengels', feederhengel: 'Feederhengels',
  method_feeder: 'Method Feeder', groundbait: 'Grondvoer',
  fluorocarbon: 'Fluorocarbon', braid: 'Gevlochten Lijn', mono: 'Mono',
  jerkbait: 'Jerkbaits', shad: 'Shads', spinner: 'Spinners', plug: 'Plugs',
  dropshot: 'Dropshot', softbait: 'Softbaits', spinhengel: 'Spinhengels',
  baitrunner: 'Baitrunner', bivvy: 'Bivvy', stretcher: 'Stretchers',
};

const CATEGORY_LABELS: Record<string, string> = {
  rod: 'Hengel', reel: 'Molen', line: 'Lijn', lure: 'Kunstaas',
  hook: 'Haak', bait: 'Aas', accessory: 'Accessoire', other: 'Overig',
};

export interface ProductDetailSheetProps {
  product: (ProductCatalogItem & {
    _mainSection?: string;
    _subSubCategory?: string;
  }) | null;
  isOpen: boolean;
  onClose: () => void;
  isLiked: boolean;
  isSaved: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onAddToGear: (product: ProductCatalogItem) => void;
}

export const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({
  product,
  isOpen,
  onClose,
  isLiked,
  isSaved,
  onLike,
  onSave,
  onShare,
  onAddToGear,
}) => {
  if (!product) return null;

  const ratingAvg = product.rating?.average;
  const stars = ratingAvg != null ? Math.round((ratingAvg / 10) * 5 * 2) / 2 : null;

  const taxonomySpecies = product.taxonomy?.species ?? [];
  const taxonomyTechniques = product.taxonomy?.technique ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet — bottom on mobile, centered on desktop */}
          <motion.div
            className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-end md:justify-center z-50"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="w-full md:max-w-lg bg-surface-card border border-border-subtle rounded-t-3xl md:rounded-3xl md:mb-8 overflow-hidden max-h-[90dvh] flex flex-col">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-border-subtle" />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 pb-6">
                {/* Image */}
                <div className="relative w-full aspect-video bg-surface-soft overflow-hidden">
                  {product.imageURL ? (
                    <img
                      src={product.imageURL}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-dim">
                      <Package className="w-12 h-12" />
                    </div>
                  )}

                  {/* Source badge */}
                  <div className="absolute top-3 left-3">
                    <div className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-[#0000A4] text-white">
                      {product.source === 'fishinn' ? 'Fishinn' : 'Bol.com'}
                    </div>
                  </div>

                  {/* Out of stock */}
                  {product.inStock === false && (
                    <div className="absolute top-3 right-3 text-[8px] font-black bg-surface-card/90 text-text-muted px-2 py-1 rounded-lg">
                      Uitverkocht
                    </div>
                  )}

                  {/* Price overlay */}
                  {product.price != null && (
                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md rounded-xl px-3 py-1">
                      <span className="text-base font-black text-white">€{product.price.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-5 pt-4 space-y-4">
                  {/* Brand + Name */}
                  <div>
                    {product.brand && (
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-0.5">
                        {product.brand}
                      </p>
                    )}
                    <h2 className="text-lg font-bold text-text-primary leading-tight tracking-tight">
                      {product.name}
                    </h2>
                  </div>

                  {/* Rating */}
                  {stars != null && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-3.5 h-3.5',
                              i <= Math.floor(stars) ? 'text-brand fill-brand' : 'text-text-dim'
                            )}
                          />
                        ))}
                      </div>
                      {product.rating?.count != null && product.rating.count > 0 && (
                        <span className="text-xs text-text-muted font-bold">
                          {ratingAvg?.toFixed(1)}/10 ({product.rating.count} reviews)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Taxonomy badges */}
                  {(taxonomySpecies.length > 0 || taxonomyTechniques.length > 0 || product.category || product._subSubCategory) && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.category && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-surface-soft text-text-secondary border border-border-subtle">
                          <Tag className="w-2.5 h-2.5" />
                          {CATEGORY_LABELS[product.category] ?? product.category}
                        </span>
                      )}
                      {(product as any)._mainSection && (product as any)._mainSection !== 'allround' && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-brand/10 text-brand border border-brand/20">
                          {(product as any)._mainSection}
                        </span>
                      )}
                      {product._subSubCategory && product._subSubCategory !== 'all' && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-surface-soft text-text-secondary border border-border-subtle">
                          {SUBSUB_LABELS[product._subSubCategory] ?? product._subSubCategory}
                        </span>
                      )}
                      {taxonomySpecies.map((s) => (
                        <span key={s} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {s}
                        </span>
                      ))}
                      {taxonomyTechniques.map((t) => (
                        <span key={t} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-brand/10 text-brand border border-brand/20">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {product.description && (
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {product.description}
                    </p>
                  )}

                  {/* Interaction actions */}
                  <div className="flex gap-2 pt-1">
                    {/* Like */}
                    <button
                      onClick={onLike}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all',
                        isLiked
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-surface-soft text-text-muted border-border-subtle hover:border-red-500/30 hover:text-red-400'
                      )}
                    >
                      <Heart className={cn('w-4 h-4', isLiked && 'fill-current')} />
                      {isLiked ? 'Geliked' : 'Like'}
                    </button>

                    {/* Save to Wishlist */}
                    <button
                      onClick={onSave}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all',
                        isSaved
                          ? 'bg-brand/10 text-brand border-brand/30'
                          : 'bg-surface-soft text-text-muted border-border-subtle hover:border-brand/30 hover:text-brand'
                      )}
                    >
                      <Bookmark className={cn('w-4 h-4', isSaved && 'fill-current')} />
                      {isSaved ? 'Opgeslagen' : 'Wishlist'}
                    </button>

                    {/* Share */}
                    <button
                      onClick={onShare}
                      className="w-11 h-11 rounded-xl bg-surface-soft border border-border-subtle text-text-muted hover:text-brand hover:border-brand/30 flex items-center justify-center transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Primary CTAs */}
                  <div className="flex gap-2">
                    {product.affiliateURL && (
                      <a
                        href={product.affiliateURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl bg-surface-soft border border-border-subtle text-text-secondary hover:border-brand/30 hover:text-brand text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Bekijk aanbieding
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      </a>
                    )}

                    <Button
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => onAddToGear(product)}
                      className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-premium-accent"
                    >
                      Mijn Gear
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
