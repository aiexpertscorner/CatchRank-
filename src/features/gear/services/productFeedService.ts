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
  QueryConstraint,
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
 * - Products live in `product_catalog`
 * - Clusters live in `product_clusters`
 * - Cache metadata in `product_cache_meta`
 * - Client reads ONLY from Firestore
 * - Session-level in-memory cache prevents repeated Firestore reads
 */

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

function safeString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function safeLower(value: unknown): string {
  return safeString(value).toLowerCase();
}

function buildCacheKey(params: {
  source?: ProductSource;
  category?: string;
  mainSection?: string;
  subSubCategory?: string;
  maxItems?: number;
}) {
  return [
    'products',
    params.source ?? 'all',
    params.category ?? 'all',
    params.mainSection ?? 'all',
    params.subSubCategory ?? 'all',
    params.maxItems ?? PRODUCT_FEED_MAX_ITEMS_PER_SOURCE,
  ].join(':');
}

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

type GetProductsOptions = {
  source?: ProductSource;
  category?: string;
  mainSection?: string;
  subSubCategory?: string;
  maxItems?: number;
};

type DerivedClusterType =
  | 'species'
  | 'technique'
  | 'category'
  | 'section'
  | 'detail'
  | 'seed'
  | 'misc';

const CLUSTER_LABELS: Record<string, string> = {
  'species:karper': 'Karper',
  'species:snoek': 'Snoek',
  'species:baars': 'Baars',
  'species:zander': 'Zander',
  'species:forel': 'Forel',
  'species:witvis': 'Witvis',
  'species:meerval': 'Meerval',

  'technique:karpervissen': 'Karpervissen',
  'technique:roofvissen': 'Roofvissen',
  'technique:feedervissen': 'Feedervissen',
  'technique:vliegvissen': 'Vliegvissen',
  'technique:nachtvissen': 'Nachtvissen',

  'category:rod': 'Hengels',
  'category:reel': 'Molens',
  'category:line': 'Lijnen',
  'category:lure': 'Kunstaas',
  'category:bait': 'Aas',
  'category:hook': 'Haken',
  'category:accessory': 'Accessoires',

  'section:karper': 'Karper',
  'section:roofvis': 'Roofvis',
  'section:witvis': 'Witvis',
  'section:allround': 'Allround',

  'detail:boilie': 'Boilies',
  'detail:wafter': 'Wafters',
  'detail:popup': 'Pop-ups',
  'detail:pva': 'PVA',
  'detail:rig': 'Rigs',
  'detail:leadclip': 'Leadclip',
  'detail:hooklink': 'Onderlijnen',
  'detail:bite_alarm': 'Bite Alarms',
  'detail:rod_pod': 'Rod Pods',
  'detail:spod': 'Spods',
  'detail:marker': 'Marker',
  'detail:karperhengel': 'Karperhengels',
  'detail:feederhengel': 'Feederhengels',
  'detail:method_feeder': 'Method Feeder',
  'detail:groundbait': 'Grondvoer',
  'detail:fluorocarbon': 'Fluorocarbon',
  'detail:braid': 'Gevlochten Lijn',
  'detail:mono': 'Mono',
  'detail:jerkbait': 'Jerkbaits',
  'detail:shad': 'Shads',
  'detail:spinner': 'Spinners',
  'detail:spinnerbait': 'Spinnerbaits',
  'detail:plug': 'Plugs',
  'detail:dropshot': 'Dropshot',
  'detail:softbait': 'Softbaits',
  'detail:swimbait': 'Swimbaits',
  'detail:jighead': 'Jigheads',
  'detail:spinhengel': 'Spinhengels',
  'detail:baitrunner': 'Baitrunner',
  'detail:bivvy': 'Bivvy',
  'detail:stretcher': 'Stretchers',
  'detail:sleep_system': 'Sleep Systems',
};

function getClusterType(key: string): DerivedClusterType {
  if (key.startsWith('species:')) return 'species';
  if (key.startsWith('technique:')) return 'technique';
  if (key.startsWith('category:')) return 'category';
  if (key.startsWith('section:')) return 'section';
  if (key.startsWith('detail:')) return 'detail';
  if (key.startsWith('seed:')) return 'seed';
  return 'misc';
}

function getClusterLabel(key: string): string {
  return CLUSTER_LABELS[key] || key.replace(/^detail:/, '').replace(/^seed:/, '');
}

function getProductBlob(product: ProductCatalogItem): string {
  return [
    product.name,
    product.brand,
    product.description,
    (product as any).seedCategory,
    (product as any).seedProductType,
    ...(product.taxonomy?.species ?? []),
    ...(product.taxonomy?.technique ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function inferMainSectionFromProduct(product: ProductCatalogItem): string {
  const explicit = safeString((product as any).mainSection);
  if (explicit) return explicit;

  const blob = getProductBlob(product);
  const species = product.taxonomy?.species ?? [];
  const techniques = product.taxonomy?.technique ?? [];

  if (
    species.includes('karper') ||
    techniques.includes('karpervissen') ||
    blob.includes('karper') ||
    blob.includes('carp') ||
    blob.includes('boilie') ||
    blob.includes('wafter') ||
    blob.includes('popup')
  ) return 'karper';

  if (
    species.includes('snoek') ||
    species.includes('baars') ||
    species.includes('zander') ||
    techniques.includes('roofvissen') ||
    blob.includes('roofvis') ||
    blob.includes('jerkbait') ||
    blob.includes('shad') ||
    blob.includes('dropshot')
  ) return 'roofvis';

  if (
    species.includes('witvis') ||
    techniques.includes('feedervissen') ||
    blob.includes('feeder') ||
    blob.includes('method feeder') ||
    blob.includes('grondvoer') ||
    blob.includes('witvis')
  ) return 'witvis';

  return 'allround';
}

function inferSubSubCategoryFromProduct(product: ProductCatalogItem): string {
  const explicit = safeString((product as any).subSubCategory);
  if (explicit) return explicit;

  const blob = getProductBlob(product);

  if (blob.includes('wafter')) return 'wafter';
  if (blob.includes('pop-up') || blob.includes('popup')) return 'popup';
  if (blob.includes('boilie')) return 'boilie';
  if (blob.includes('pva')) return 'pva';
  if (blob.includes('leadclip')) return 'leadclip';
  if (blob.includes('hooklink') || blob.includes('onderlijn')) return 'hooklink';
  if (blob.includes('rig')) return 'rig';
  if (blob.includes('bite alarm')) return 'bite_alarm';
  if (blob.includes('rod pod')) return 'rod_pod';
  if (blob.includes('spod')) return 'spod';
  if (blob.includes('marker')) return 'marker';
  if (blob.includes('karperhengel') || blob.includes('carp rod')) return 'karperhengel';
  if (blob.includes('feederhengel')) return 'feederhengel';
  if (blob.includes('method feeder')) return 'method_feeder';
  if (blob.includes('grondvoer')) return 'groundbait';
  if (blob.includes('fluorocarbon')) return 'fluorocarbon';
  if (blob.includes('gevlochten') || blob.includes('braid')) return 'braid';
  if (blob.includes('mono')) return 'mono';
  if (blob.includes('jerkbait')) return 'jerkbait';
  if (blob.includes('shad')) return 'shad';
  if (blob.includes('spinnerbait')) return 'spinnerbait';
  if (blob.includes('spinner')) return 'spinner';
  if (blob.includes('plug') || blob.includes('wobbler') || blob.includes('crankbait')) return 'plug';
  if (blob.includes('dropshot')) return 'dropshot';
  if (blob.includes('softbait')) return 'softbait';
  if (blob.includes('swimbait')) return 'swimbait';
  if (blob.includes('jighead') || blob.includes('jigkop')) return 'jighead';
  if (blob.includes('spinhengel')) return 'spinhengel';
  if (blob.includes('baitrunner')) return 'baitrunner';
  if (blob.includes('bivvy')) return 'bivvy';
  if (blob.includes('stretcher') || blob.includes('bedchair')) return 'stretcher';
  if (blob.includes('sleep system') || blob.includes('slaapzak')) return 'sleep_system';

  return 'all';
}

function enrichProduct(product: ProductCatalogItem): ProductCatalogItem {
  const enriched: ProductCatalogItem = { ...product };

  (enriched as any).mainSection =
    safeString((product as any).mainSection) || inferMainSectionFromProduct(product);

  (enriched as any).subSubCategory =
    safeString((product as any).subSubCategory) || inferSubSubCategoryFromProduct(product);

  return enriched;
}

export const productFeedService = {
  async getProducts(options?: GetProductsOptions): Promise<ProductCatalogItem[]> {
    const source = options?.source;
    const category = options?.category;
    const mainSection = options?.mainSection;
    const subSubCategory = options?.subSubCategory;
    const maxItems = options?.maxItems ?? PRODUCT_FEED_MAX_ITEMS_PER_SOURCE;

    const cacheKey = buildCacheKey({
      source,
      category,
      mainSection,
      subSubCategory,
      maxItems,
    });

    const cached = fromCache<ProductCatalogItem[]>(cacheKey);
    if (cached) return cached;

    const constraints: QueryConstraint[] = [];

    if (source) constraints.push(where('source', '==', source));
    if (category) constraints.push(where('category', '==', category));
    if (mainSection) constraints.push(where('mainSection', '==', mainSection));
    if (subSubCategory) constraints.push(where('subSubCategory', '==', subSubCategory));

    constraints.push(orderBy('scores.composite', 'desc'));
    constraints.push(limit(maxItems));

    let products: ProductCatalogItem[];

    try {
      const q = query(collection(db, 'product_catalog'), ...constraints);
      const snap = await getDocs(q);
      products = snap.docs.map((d) => enrichProduct({ id: d.id, ...d.data() } as ProductCatalogItem));
    } catch {
      const fallbackConstraints: QueryConstraint[] = [];

      if (source) fallbackConstraints.push(where('source', '==', source));
      if (category) fallbackConstraints.push(where('category', '==', category));
      if (mainSection) fallbackConstraints.push(where('mainSection', '==', mainSection));
      if (subSubCategory) fallbackConstraints.push(where('subSubCategory', '==', subSubCategory));

      fallbackConstraints.push(orderBy('cachedAt', 'desc'));
      fallbackConstraints.push(limit(maxItems));

      const q = query(collection(db, 'product_catalog'), ...fallbackConstraints);
      const snap = await getDocs(q);
      products = snap.docs.map((d) => enrichProduct({ id: d.id, ...d.data() } as ProductCatalogItem));
    }

    toCache(cacheKey, products);

    if (FEATURE_FLAGS.ENABLE_PRODUCT_FEED_REFRESH) {
      const sourcesToCheck: ProductSource[] = source ? [source] : ['fishinn', 'bol'];
      for (const s of sourcesToCheck) {
        isCacheStale(s)
          .then((stale) => {
            if (stale) {
              (s === 'fishinn' ? refreshFishinnFeed : refreshBolFeed)();
            }
          })
          .catch(() => {});
      }
    }

    return products;
  },

  async getProductsByMainSection(
    mainSection: string,
    source?: ProductSource,
    maxItems = PRODUCT_FEED_MAX_ITEMS_PER_SOURCE
  ): Promise<ProductCatalogItem[]> {
    return this.getProducts({ source, mainSection, maxItems });
  },

  async getProductsBySubSubCategory(
    subSubCategory: string,
    source?: ProductSource,
    maxItems = PRODUCT_FEED_MAX_ITEMS_PER_SOURCE
  ): Promise<ProductCatalogItem[]> {
    return this.getProducts({ source, subSubCategory, maxItems });
  },

  async getProductClusters(): Promise<ProductCluster[]> {
    const cacheKey = 'clusters:all';
    const cached = fromCache<ProductCluster[]>(cacheKey);
    if (cached) return cached;

    const snap = await getDocs(collection(db, 'product_clusters'));
    const clusters = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ProductCluster))
      .sort((a, b) => b.total - a.total);

    toCache(cacheKey, clusters);
    return clusters;
  },

  deriveClustersFromProducts(products: ProductCatalogItem[]): Array<{
    key: string;
    label: string;
    count: number;
    type: DerivedClusterType;
  }> {
    const counts = new Map<string, number>();

    for (const product of products) {
      const enriched = enrichProduct(product);

      const explicitClusters = enriched.clusters ?? [];
      const syntheticClusters = [
        ...(enriched.category ? [`category:${enriched.category}`] : []),
        ...((enriched as any).mainSection ? [`section:${(enriched as any).mainSection}`] : []),
        ...((enriched as any).subSubCategory && (enriched as any).subSubCategory !== 'all'
          ? [`detail:${(enriched as any).subSubCategory}`]
          : []),
        ...((enriched.taxonomy?.species ?? []).map((s) => `species:${s}`)),
        ...((enriched.taxonomy?.technique ?? []).map((t) => `technique:${t}`)),
      ];

      const allClusters = [...new Set([...explicitClusters, ...syntheticClusters])];

      for (const cluster of allClusters) {
        counts.set(cluster, (counts.get(cluster) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label: getClusterLabel(key),
        count,
        type: getClusterType(key),
      }))
      .sort((a, b) => b.count - a.count);
  },

  deriveMainSectionsFromProducts(products: ProductCatalogItem[]): Array<{
    key: string;
    label: string;
    count: number;
  }> {
    const counts = new Map<string, number>();

    for (const product of products) {
      const mainSection = safeString((enrichProduct(product) as any).mainSection) || 'allround';
      counts.set(mainSection, (counts.get(mainSection) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  },

  deriveSubSubCategoriesFromProducts(products: ProductCatalogItem[]): Array<{
    key: string;
    label: string;
    count: number;
  }> {
    const counts = new Map<string, number>();

    for (const product of products) {
      const subSub = safeString((enrichProduct(product) as any).subSubCategory);
      if (!subSub || subSub === 'all') continue;
      counts.set(subSub, (counts.get(subSub) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label: getClusterLabel(`detail:${key}`),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  },

  filterProducts(
    products: ProductCatalogItem[],
    filters: {
      keyword?: string;
      source?: ProductSource;
      category?: string;
      mainSection?: string;
      subSubCategory?: string;
      cluster?: string;
    }
  ): ProductCatalogItem[] {
    const keyword = safeLower(filters.keyword);

    return products
      .map((p) => enrichProduct(p))
      .filter((p) => {
        const blob = getProductBlob(p);

        const matchesKeyword =
          !keyword || blob.includes(keyword);

        const matchesSource =
          !filters.source || p.source === filters.source;

        const matchesCategory =
          !filters.category || p.category === filters.category;

        const matchesMainSection =
          !filters.mainSection || safeString((p as any).mainSection) === filters.mainSection;

        const matchesSubSubCategory =
          !filters.subSubCategory || safeString((p as any).subSubCategory) === filters.subSubCategory;

        const matchesCluster =
          !filters.cluster ||
          (p.clusters ?? []).includes(filters.cluster) ||
          filters.cluster === `section:${(p as any).mainSection}` ||
          filters.cluster === `detail:${(p as any).subSubCategory}` ||
          filters.cluster === `category:${p.category}` ||
          (p.taxonomy?.species ?? []).some((s) => filters.cluster === `species:${s}`) ||
          (p.taxonomy?.technique ?? []).some((t) => filters.cluster === `technique:${t}`);

        return (
          matchesKeyword &&
          matchesSource &&
          matchesCategory &&
          matchesMainSection &&
          matchesSubSubCategory &&
          matchesCluster
        );
      });
  },

  async searchProducts(keyword: string, source?: ProductSource): Promise<ProductCatalogItem[]> {
    const all = await this.getProducts({ source });
    return this.filterProducts(all, { keyword, source });
  },

  async writeProductsToCache(products: Omit<ProductCatalogItem, 'id'>[]): Promise<void> {
    for (const product of products.slice(0, PRODUCT_FEED_MAX_ITEMS_PER_SOURCE)) {
      const docId = `${product.source}_${product.externalId}`;
      const enriched = enrichProduct(product as ProductCatalogItem);

      await setDoc(doc(db, 'product_catalog', docId), {
        ...enriched,
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

export function normalizeFishinnProduct(
  raw: Record<string, any>
): Omit<ProductCatalogItem, 'id' | 'cachedAt'> {
  const name = raw.name ?? raw.productName ?? raw.title ?? 'Onbekend product';
  const brand = raw.brand ?? raw.manufacturer ?? undefined;
  const description = raw.description ?? raw.shortDescription ?? undefined;
  const category = normalizeCategory(raw.category ?? raw.categoryName ?? '');
  const blob = [name, brand, description, raw.category, raw.categoryName].filter(Boolean).join(' ').toLowerCase();

  return {
    externalId: String(raw.ID ?? raw.id ?? raw.productId ?? Math.random()),
    source: 'fishinn',
    name,
    brand,
    category,
    description,
    imageURL: raw.imageURL ?? raw.image ?? raw.imageUrl ?? undefined,
    price: parseFloat(raw.price ?? raw.Price ?? 0) || undefined,
    currency: 'EUR',
    affiliateURL: raw.deeplink ?? raw.clickURL ?? raw.URL ?? '',
    ean: raw.EAN ?? raw.ean ?? undefined,
    inStock: raw.stock !== '0' && raw.stock !== 0,
    mainSection: inferMainSectionFromBlob(blob),
    subSubCategory: inferSubSubCategoryFromBlob(blob),
    taxonomy: inferTaxonomyFromBlob(blob),
    clusters: buildSyntheticClustersFromBlob(blob, category),
  } as Omit<ProductCatalogItem, 'id' | 'cachedAt'>;
}

export function normalizeBolProduct(
  raw: Record<string, any>
): Omit<ProductCatalogItem, 'id' | 'cachedAt'> {
  const name = raw.title ?? raw.name ?? 'Onbekend product';
  const brand = raw.brand ?? undefined;
  const description = raw.shortDescription ?? raw.description ?? undefined;
  const category = normalizeCategory(raw.mainCategory ?? raw.category ?? '');
  const blob = [name, brand, description, raw.mainCategory, raw.category].filter(Boolean).join(' ').toLowerCase();

  return {
    externalId: String(raw.ean ?? raw.productId ?? raw.id ?? Math.random()),
    source: 'bol',
    name,
    brand,
    category,
    description,
    imageURL: raw.imageUrl ?? raw.image ?? undefined,
    price: parseFloat(raw.price ?? raw.listPrice ?? 0) || undefined,
    currency: 'EUR',
    affiliateURL: raw.url ?? raw.productUrl ?? `https://www.bol.com/nl/p/${raw.ean}/`,
    ean: raw.ean ?? undefined,
    inStock: raw.available ?? true,
    mainSection: inferMainSectionFromBlob(blob),
    subSubCategory: inferSubSubCategoryFromBlob(blob),
    taxonomy: inferTaxonomyFromBlob(blob),
    clusters: buildSyntheticClustersFromBlob(blob, category),
  } as Omit<ProductCatalogItem, 'id' | 'cachedAt'>;
}

function normalizeCategory(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('hengel') || lower.includes('rod')) return 'rod';
  if (lower.includes('molen') || lower.includes('reel')) return 'reel';
  if (lower.includes('lijn') || lower.includes('line') || lower.includes('draad')) return 'line';
  if (
    lower.includes('kunstaas') ||
    lower.includes('lure') ||
    lower.includes('shad') ||
    lower.includes('plug') ||
    lower.includes('jerkbait') ||
    lower.includes('spinner')
  ) return 'lure';
  if (lower.includes('haak') || lower.includes('hook') || lower.includes('jighead') || lower.includes('jigkop')) return 'hook';
  if (
    lower.includes('aas') ||
    lower.includes('bait') ||
    lower.includes('boilie') ||
    lower.includes('popup') ||
    lower.includes('wafter') ||
    lower.includes('pellet') ||
    lower.includes('grondvoer')
  ) return 'bait';
  return 'accessory';
}

function inferTaxonomyFromBlob(blob: string): {
  species: string[];
  technique: string[];
  skillLevel: string;
} {
  const lower = blob.toLowerCase();

  const species: string[] = [];
  const technique: string[] = [];

  if (lower.includes('karper') || lower.includes('carp') || lower.includes('boilie')) species.push('karper');
  if (lower.includes('snoek') || lower.includes('pike')) species.push('snoek');
  if (lower.includes('baars') || lower.includes('perch')) species.push('baars');
  if (lower.includes('snoekbaars') || lower.includes('zander') || lower.includes('pikeperch')) species.push('zander');
  if (lower.includes('forel') || lower.includes('trout')) species.push('forel');
  if (lower.includes('witvis') || lower.includes('brasem') || lower.includes('voorn') || lower.includes('feeder')) species.push('witvis');

  if (lower.includes('karper') || lower.includes('carp') || lower.includes('boilie') || lower.includes('bite alarm')) technique.push('karpervissen');
  if (lower.includes('roofvis') || lower.includes('jerkbait') || lower.includes('shad') || lower.includes('dropshot') || lower.includes('kunstaas')) technique.push('roofvissen');
  if (lower.includes('feeder') || lower.includes('method feeder') || lower.includes('grondvoer')) technique.push('feedervissen');
  if (lower.includes('vliegvis') || lower.includes('fly rod') || lower.includes('vlieghengel')) technique.push('vliegvissen');
  if (lower.includes('nachtvissen') || lower.includes('bivvy') || lower.includes('sleep system') || lower.includes('stretcher')) technique.push('nachtvissen');

  const skillLevel =
    lower.includes('starter') || lower.includes('beginner')
      ? 'beginner'
      : lower.includes('pro') || lower.includes('expert') || lower.includes('competition')
        ? 'gevorderd'
        : 'allround';

  return {
    species: [...new Set(species)],
    technique: [...new Set(technique)],
    skillLevel,
  };
}

function inferMainSectionFromBlob(blob: string): string {
  const taxonomy = inferTaxonomyFromBlob(blob);
  const species = taxonomy.species;
  const techniques = taxonomy.technique;
  const lower = blob.toLowerCase();

  if (
    species.includes('karper') ||
    techniques.includes('karpervissen') ||
    lower.includes('boilie') ||
    lower.includes('wafter') ||
    lower.includes('popup')
  ) return 'karper';

  if (
    species.includes('snoek') ||
    species.includes('baars') ||
    species.includes('zander') ||
    techniques.includes('roofvissen') ||
    lower.includes('jerkbait') ||
    lower.includes('shad') ||
    lower.includes('dropshot')
  ) return 'roofvis';

  if (
    species.includes('witvis') ||
    techniques.includes('feedervissen') ||
    lower.includes('feeder') ||
    lower.includes('method feeder') ||
    lower.includes('grondvoer')
  ) return 'witvis';

  return 'allround';
}

function inferSubSubCategoryFromBlob(blob: string): string {
  const lower = blob.toLowerCase();

  if (lower.includes('wafter')) return 'wafter';
  if (lower.includes('pop-up') || lower.includes('popup')) return 'popup';
  if (lower.includes('boilie')) return 'boilie';
  if (lower.includes('pva')) return 'pva';
  if (lower.includes('leadclip')) return 'leadclip';
  if (lower.includes('hooklink') || lower.includes('onderlijn')) return 'hooklink';
  if (lower.includes('rig')) return 'rig';
  if (lower.includes('bite alarm')) return 'bite_alarm';
  if (lower.includes('rod pod')) return 'rod_pod';
  if (lower.includes('spod')) return 'spod';
  if (lower.includes('marker')) return 'marker';
  if (lower.includes('karperhengel') || lower.includes('carp rod')) return 'karperhengel';
  if (lower.includes('feederhengel')) return 'feederhengel';
  if (lower.includes('method feeder')) return 'method_feeder';
  if (lower.includes('grondvoer')) return 'groundbait';
  if (lower.includes('fluorocarbon')) return 'fluorocarbon';
  if (lower.includes('gevlochten') || lower.includes('braid')) return 'braid';
  if (lower.includes('mono')) return 'mono';
  if (lower.includes('jerkbait')) return 'jerkbait';
  if (lower.includes('shad')) return 'shad';
  if (lower.includes('spinnerbait')) return 'spinnerbait';
  if (lower.includes('spinner')) return 'spinner';
  if (lower.includes('plug') || lower.includes('wobbler') || lower.includes('crankbait')) return 'plug';
  if (lower.includes('dropshot')) return 'dropshot';
  if (lower.includes('softbait')) return 'softbait';
  if (lower.includes('swimbait')) return 'swimbait';
  if (lower.includes('jighead') || lower.includes('jigkop')) return 'jighead';
  if (lower.includes('spinhengel')) return 'spinhengel';
  if (lower.includes('baitrunner')) return 'baitrunner';
  if (lower.includes('bivvy')) return 'bivvy';
  if (lower.includes('stretcher') || lower.includes('bedchair')) return 'stretcher';
  if (lower.includes('sleep system') || lower.includes('slaapzak')) return 'sleep_system';

  return 'all';
}

function buildSyntheticClustersFromBlob(blob: string, category: string): string[] {
  const taxonomy = inferTaxonomyFromBlob(blob);
  const mainSection = inferMainSectionFromBlob(blob);
  const subSubCategory = inferSubSubCategoryFromBlob(blob);

  return [
    ...taxonomy.species.map((s) => `species:${s}`),
    ...taxonomy.technique.map((t) => `technique:${t}`),
    `category:${category}`,
    `section:${mainSection}`,
    ...(subSubCategory !== 'all' ? [`detail:${subSubCategory}`] : []),
  ];
}