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
import {
  ProductCatalogItem,
  ProductCacheMetadata,
  ProductCluster,
  ProductSource,
} from '../../../types';
import {
  PRODUCT_FEED_CACHE_TTL_MS,
  PRODUCT_FEED_MAX_ITEMS_PER_SOURCE,
  FEATURE_FLAGS,
} from '../../../config/env';

/**
 * Product Feed Service — Mijn Visgear / Ontdekken
 *
 * Architecture:
 * - Products live in `product_catalog` (one doc per product, written by seed script)
 * - Clusters live in `product_clusters` (one doc per cluster, written by seed script)
 * - Cache metadata in `product_cache_meta` (one doc per source)
 * - Client reads ONLY from Firestore — NO direct feed API calls from client
 * - Session-level in-memory cache prevents repeated Firestore reads within a session
 * - TTL: 24h for server-side refresh (feature-flagged), 10min for session cache
 *
 * Cost model:
 * - First load of Discover tab: ~200 reads (all products)
 * - Subsequent tab switches within 10 min: 0 reads (session cache)
 * - Cluster reads: ~1-15 reads (one per cluster doc), cached separately
 */

// ─── Session-level in-memory cache ────────────────────────────────────────────
// Prevents repeated Firestore reads within a single browser session.
// Key format: `products:{source}:{category}` or `clusters`
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface SessionCacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const sessionCache = new Map<string, SessionCacheEntry<any>>();

function fromCache<T>(key: string): T | null {
  const entry = sessionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > SESSION_TTL_MS) {
    sessionCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function toCache<T>(key: string, data: T): void {
  sessionCache.set(key, { data, fetchedAt: Date.now() });
}

export function clearProductCache(): void {
  sessionCache.clear();
}

// ─── Firestore cache staleness check ─────────────────────────────────────────
async function isCacheStale(source: ProductSource): Promise<boolean> {
  const metaRef = doc(db, 'product_cache_meta', source);
  const snap = await getDoc(metaRef);

  if (!snap.exists()) return true;

  const meta = snap.data() as ProductCacheMetadata;
  if (!meta.isValid || !meta.lastFetched) return true;

  const lastFetched =
    meta.lastFetched instanceof Timestamp
      ? meta.lastFetched.toDate().getTime()
      : Date.now();

  return Date.now() - lastFetched > PRODUCT_FEED_CACHE_TTL_MS;
}

async function updateCacheMeta(source: ProductSource, itemCount: number): Promise<void> {
  await setDoc(doc(db, 'product_cache_meta', source), {
    source,
    lastFetched: serverTimestamp(),
    itemCount,
    isValid: true,
  } as ProductCacheMetadata);
}

// ─── Background refresh stubs (server-side only, feature-flagged) ─────────────
async function refreshFishinnFeed(): Promise<void> {
  if (!FEATURE_FLAGS.ENABLE_PRODUCT_FEED_REFRESH) return;
  try {
    const response = await fetch('/api/gear/fishinn-feed', { method: 'POST' });
    if (!response.ok) throw new Error(`Feed refresh failed: ${response.status}`);
  } catch (err) {
    console.error('[productFeedService] Fishinn feed refresh error:', err);
  }
}

async function refreshBolFeed(): Promise<void> {
  if (!FEATURE_FLAGS.ENABLE_PRODUCT_FEED_REFRESH) return;
  try {
    const response = await fetch('/api/gear/bol-feed', { method: 'POST' });
    if (!response.ok) throw new Error(`Bol feed refresh failed: ${response.status}`);
  } catch (err) {
    console.error('[productFeedService] Bol feed refresh error:', err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const productFeedService = {
  /**
   * Get products from Firestore (session-cached).
   * Session cache prevents repeated reads when switching tabs.
   * Optionally filter by source and/or category.
   * Returns up to PRODUCT_FEED_MAX_ITEMS_PER_SOURCE items.
   */
  async getProducts(
    source?: ProductSource,
    category?: string,
    maxItems = PRODUCT_FEED_MAX_ITEMS_PER_SOURCE
  ): Promise<ProductCatalogItem[]> {
    const cacheKey = `products:${source ?? 'all'}:${category ?? 'all'}`;
    const cached = fromCache<ProductCatalogItem[]>(cacheKey);
    if (cached) return cached;

    const constraints: any[] = [];

    if (source) constraints.push(where('source', '==', source));
    if (category) constraints.push(where('category', '==', category));

    // Sort by composite score descending if available, else by cachedAt
    constraints.push(orderBy('scores.composite', 'desc'));
    constraints.push(limit(maxItems));

    let products: ProductCatalogItem[];

    try {
      const q = query(collection(db, 'product_catalog'), ...constraints);
      const snap = await getDocs(q);
      products = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductCatalogItem));
    } catch {
      // Composite score index may not exist yet — fall back to cachedAt order
      const fallbackConstraints: any[] = [];
      if (source) fallbackConstraints.push(where('source', '==', source));
      if (category) fallbackConstraints.push(where('category', '==', category));
      fallbackConstraints.push(orderBy('cachedAt', 'desc'));
      fallbackConstraints.push(limit(maxItems));

      const q = query(collection(db, 'product_catalog'), ...fallbackConstraints);
      const snap = await getDocs(q);
      products = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductCatalogItem));
    }

    toCache(cacheKey, products);

    // Background staleness check (non-blocking, feature-flagged)
    if (FEATURE_FLAGS.ENABLE_PRODUCT_FEED_REFRESH) {
      const sourcesToCheck: ProductSource[] = source ? [source] : ['fishinn', 'bol'];
      for (const s of sourcesToCheck) {
        isCacheStale(s)
          .then(stale => { if (stale) (s === 'fishinn' ? refreshFishinnFeed : refreshBolFeed)(); })
          .catch(() => {});
      }
    }

    return products;
  },

  /**
   * Get all product clusters from Firestore (session-cached).
   * Clusters are written by the seed script and reflect taxonomy groupings.
   * Returns clusters sorted by total product count (highest first).
   */
  async getProductClusters(): Promise<ProductCluster[]> {
    const cacheKey = 'clusters:all';
    const cached = fromCache<ProductCluster[]>(cacheKey);
    if (cached) return cached;

    const snap = await getDocs(collection(db, 'product_clusters'));
    const clusters = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as ProductCluster))
      .sort((a, b) => b.total - a.total);

    toCache(cacheKey, clusters);
    return clusters;
  },

  /**
   * Derive clusters client-side from a set of already-loaded products.
   * Faster than a Firestore read when products are already in session cache.
   * Returns clusters sorted by product count.
   */
  deriveClustersFromProducts(products: ProductCatalogItem[]): Array<{
    key: string;
    label: string;
    count: number;
    type: 'species' | 'technique' | 'category';
  }> {
    const LABELS: Record<string, string> = {
      'species:karper':          'Karper',
      'species:snoek':           'Snoek',
      'species:baars':           'Baars',
      'species:zander':          'Zander',
      'species:forel':           'Forel',
      'technique:karpervissen':  'Karpervissen',
      'technique:roofvissen':    'Roofvissen',
      'technique:feedervissen':  'Feedervissen',
      'technique:vliegvissen':   'Vliegvissen',
      'category:rod':            'Hengels',
      'category:reel':           'Molens',
      'category:lure':           'Kunstaas',
      'category:line':           'Lijnen',
      'category:bait':           'Aas',
      'category:hook':           'Haken',
      'category:accessory':      'Accessoires',
    };

    const counts = new Map<string, number>();
    for (const p of products) {
      for (const cluster of p.clusters ?? []) {
        counts.set(cluster, (counts.get(cluster) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .filter(([key]) => LABELS[key]) // only known clusters
      .map(([key, count]) => ({
        key,
        label: LABELS[key],
        count,
        type: key.startsWith('species:') ? 'species'
          : key.startsWith('technique:') ? 'technique'
          : 'category',
      }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Search products by keyword (client-side filter on session-cached results).
   */
  async searchProducts(keyword: string, source?: ProductSource): Promise<ProductCatalogItem[]> {
    const all = await this.getProducts(source);
    const lower = keyword.toLowerCase();
    return all.filter(
      p =>
        p.name.toLowerCase().includes(lower) ||
        p.brand?.toLowerCase().includes(lower) ||
        p.description?.toLowerCase().includes(lower)
    );
  },

  /**
   * Write a batch of normalized products to Firestore cache.
   * For server-side use only (seed script / admin trigger).
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
      await updateCacheMeta(
        products[0].source,
        Math.min(products.length, PRODUCT_FEED_MAX_ITEMS_PER_SOURCE)
      );
    }
  },

  refreshFishinnFeed,
  refreshBolFeed,
};

// ─── Normalizers (used by server-side endpoints if applicable) ────────────────

export function normalizeFishinnProduct(
  raw: Record<string, any>
): Omit<ProductCatalogItem, 'id' | 'cachedAt'> {
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

export function normalizeBolProduct(
  raw: Record<string, any>
): Omit<ProductCatalogItem, 'id' | 'cachedAt'> {
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
