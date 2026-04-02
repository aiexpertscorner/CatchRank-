import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ProductCatalogItem, ProductCacheMetadata, ProductSource } from '../../../types';
import { PRODUCT_FEED_CACHE_TTL_MS, PRODUCT_FEED_MAX_ITEMS_PER_SOURCE, FEATURE_FLAGS } from '../../../config/env';

/**
 * Product Feed Service — Mijn Visgear
 *
 * Architecture:
 * - Products are stored in `product_catalog` Firestore collection (one doc per product)
 * - Cache metadata stored in `product_cache_meta` (one doc per source)
 * - Refresh happens server-side (/api/gear/fishinn-feed, /api/gear/bol-feed)
 * - Client reads only from Firestore — NO direct feed API calls from client
 * - TTL: 24 hours (configurable via PRODUCT_FEED_CACHE_TTL_MS)
 * - Max items: PRODUCT_FEED_MAX_ITEMS_PER_SOURCE per source to control read costs
 *
 * Dev-safe: FEATURE_FLAGS.ENABLE_PRODUCT_FEED_REFRESH must be true to trigger
 * server-side refresh. By default it's off — reads cached data only.
 */

// ─── Cache Helpers ─────────────────────────────────────────────────────────

/**
 * Check if the cache for a given source is stale (older than TTL).
 */
async function isCacheStale(source: ProductSource): Promise<boolean> {
  const metaRef = doc(db, 'product_cache_meta', source);
  const snap = await getDoc(metaRef);

  if (!snap.exists()) return true;

  const meta = snap.data() as ProductCacheMetadata;
  if (!meta.isValid || !meta.lastFetched) return true;

  const lastFetched = meta.lastFetched instanceof Timestamp
    ? meta.lastFetched.toDate().getTime()
    : Date.now();

  return Date.now() - lastFetched > PRODUCT_FEED_CACHE_TTL_MS;
}

/**
 * Update cache metadata after a successful refresh.
 */
async function updateCacheMeta(source: ProductSource, itemCount: number): Promise<void> {
  await setDoc(doc(db, 'product_cache_meta', source), {
    source,
    lastFetched: serverTimestamp(),
    itemCount,
    isValid: true,
  } as ProductCacheMetadata);
}

// ─── Feed Refresh (server-side triggered) ──────────────────────────────────

/**
 * Trigger a server-side refresh of the Fishinn product feed.
 * Calls /api/gear/fishinn-feed which fetches TradeTracker JSON,
 * normalizes it, and stores results in Firestore product_catalog.
 *
 * Dev-safe: only runs if FEATURE_FLAGS.ENABLE_PRODUCT_FEED_REFRESH is true.
 */
async function refreshFishinnFeed(): Promise<void> {
  if (!FEATURE_FLAGS.ENABLE_PRODUCT_FEED_REFRESH) {
    console.info('[productFeedService] Feed refresh disabled (dev-safe mode)');
    return;
  }

  try {
    const response = await fetch('/api/gear/fishinn-feed', { method: 'POST' });
    if (!response.ok) throw new Error(`Feed refresh failed: ${response.status}`);
    const result = await response.json();
    console.info(`[productFeedService] Fishinn feed refreshed: ${result.count} products`);
  } catch (err) {
    console.error('[productFeedService] Fishinn feed refresh error:', err);
  }
}

/**
 * Trigger a server-side refresh of the Bol.com product catalog.
 * Calls /api/gear/bol-feed which uses OAuth2 + Marketing Catalog API,
 * normalizes results, and stores in Firestore product_catalog.
 *
 * Dev-safe: only runs if FEATURE_FLAGS.ENABLE_PRODUCT_FEED_REFRESH is true.
 */
async function refreshBolFeed(): Promise<void> {
  if (!FEATURE_FLAGS.ENABLE_PRODUCT_FEED_REFRESH) {
    console.info('[productFeedService] Feed refresh disabled (dev-safe mode)');
    return;
  }

  try {
    const response = await fetch('/api/gear/bol-feed', { method: 'POST' });
    if (!response.ok) throw new Error(`Bol feed refresh failed: ${response.status}`);
    const result = await response.json();
    console.info(`[productFeedService] Bol feed refreshed: ${result.count} products`);
  } catch (err) {
    console.error('[productFeedService] Bol feed refresh error:', err);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export const productFeedService = {
  /**
   * Get cached products from Firestore.
   * Optionally filter by source and/or category.
   * Checks cache staleness and triggers refresh if needed (feature-flagged).
   *
   * Returns up to PRODUCT_FEED_MAX_ITEMS_PER_SOURCE items per source.
   */
  async getProducts(
    source?: ProductSource,
    category?: string,
    maxItems = PRODUCT_FEED_MAX_ITEMS_PER_SOURCE
  ): Promise<ProductCatalogItem[]> {
    const constraints: any[] = [];

    if (source) {
      constraints.push(where('source', '==', source));
    }
    if (category) {
      constraints.push(where('category', '==', category));
    }

    constraints.push(orderBy('cachedAt', 'desc'));
    constraints.push(limit(maxItems));

    const q = query(collection(db, 'product_catalog'), ...constraints);
    const snap = await getDocs(q);
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductCatalogItem));

    // Trigger background refresh if cache is stale (non-blocking)
    if (FEATURE_FLAGS.ENABLE_PRODUCT_FEED_REFRESH) {
      const sourcesToCheck: ProductSource[] = source ? [source] : ['fishinn', 'bol'];
      for (const s of sourcesToCheck) {
        isCacheStale(s).then((stale) => {
          if (stale) {
            if (s === 'fishinn') refreshFishinnFeed();
            else refreshBolFeed();
          }
        }).catch(() => {});
      }
    }

    return products;
  },

  /**
   * Search products by keyword (client-side filter on cached results).
   * Searches name, brand, and description fields.
   */
  async searchProducts(
    keyword: string,
    source?: ProductSource
  ): Promise<ProductCatalogItem[]> {
    const all = await this.getProducts(source);
    const lower = keyword.toLowerCase();
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.brand?.toLowerCase().includes(lower) ||
        p.description?.toLowerCase().includes(lower)
    );
  },

  /**
   * Write a batch of normalized products to Firestore cache.
   * Called from server-side feed processing (admin/trigger only).
   * Each product is stored as a separate document with externalId as key.
   *
   * Uses setDoc (upsert) to avoid duplicates on re-fetch.
   */
  async writeProductsToCache(products: Omit<ProductCatalogItem, 'id'>[]): Promise<void> {
    for (const product of products.slice(0, PRODUCT_FEED_MAX_ITEMS_PER_SOURCE)) {
      const docId = `${product.source}_${product.externalId}`;
      await setDoc(doc(db, 'product_catalog', docId), {
        ...product,
        cachedAt: serverTimestamp(),
      });
    }
    if (products.length > 0) {
      await updateCacheMeta(products[0].source, Math.min(products.length, PRODUCT_FEED_MAX_ITEMS_PER_SOURCE));
    }
  },

  /** Expose for admin/debug use */
  refreshFishinnFeed,
  refreshBolFeed,
};

// ─── Normalizers (used by server.ts endpoints) ─────────────────────────────

/**
 * Normalize a raw TradeTracker/Fishinn product to ProductCatalogItem shape.
 * TradeTracker JSON feed structure varies — this handles the common fields.
 */
export function normalizeFishinnProduct(raw: Record<string, any>): Omit<ProductCatalogItem, 'id' | 'cachedAt'> {
  return {
    externalId: String(raw.ID ?? raw.id ?? raw.productId ?? Math.random()),
    source: 'fishinn',
    name: raw.name ?? raw.productName ?? raw.title ?? 'Onbekend product',
    brand: raw.brand ?? raw.manufacturer ?? undefined,
    category: normalizeCategoryFishinn(raw.category ?? raw.categoryName ?? ''),
    description: raw.description ?? raw.shortDescription ?? undefined,
    imageURL: raw.imageURL ?? raw.image ?? raw.imageUrl ?? undefined,
    price: parseFloat(raw.price ?? raw.Price ?? 0) || undefined,
    currency: 'EUR',
    affiliateURL: raw.deeplink ?? raw.clickURL ?? raw.URL ?? '',
    ean: raw.EAN ?? raw.ean ?? undefined,
    inStock: raw.stock !== '0' && raw.stock !== 0,
  };
}

/**
 * Normalize a raw Bol.com Marketing Catalog product to ProductCatalogItem shape.
 */
export function normalizeBolProduct(raw: Record<string, any>): Omit<ProductCatalogItem, 'id' | 'cachedAt'> {
  return {
    externalId: String(raw.ean ?? raw.productId ?? raw.id ?? Math.random()),
    source: 'bol',
    name: raw.title ?? raw.name ?? 'Onbekend product',
    brand: raw.brand ?? undefined,
    category: normalizeCategoryBol(raw.mainCategory ?? raw.category ?? ''),
    description: raw.shortDescription ?? raw.description ?? undefined,
    imageURL: raw.imageUrl ?? raw.image ?? undefined,
    price: parseFloat(raw.price ?? raw.listPrice ?? 0) || undefined,
    currency: 'EUR',
    affiliateURL: raw.url ?? raw.productUrl ?? `https://www.bol.com/nl/p/${raw.ean}/`,
    ean: raw.ean ?? undefined,
    inStock: raw.available ?? true,
  };
}

function normalizeCategoryFishinn(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('hengel') || lower.includes('rod')) return 'rod';
  if (lower.includes('molen') || lower.includes('reel')) return 'reel';
  if (lower.includes('lijn') || lower.includes('line') || lower.includes('draad')) return 'line';
  if (lower.includes('kunstaas') || lower.includes('lure') || lower.includes('shad') || lower.includes('plug')) return 'lure';
  if (lower.includes('haak') || lower.includes('hook')) return 'hook';
  if (lower.includes('aas') || lower.includes('bait')) return 'bait';
  return 'accessory';
}

function normalizeCategoryBol(raw: string): string {
  return normalizeCategoryFishinn(raw);
}
