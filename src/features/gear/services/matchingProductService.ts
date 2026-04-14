/**
 * matchingProductService.ts
 *
 * Fetches products from Firestore based on:
 *   1. product_rule_mappings keys (from advice engine output)
 *   2. sectionId + requirementKey (for Sessiecheck missing items)
 *
 * The service reads product_rule_mappings to get product IDs,
 * then fetches those specific products from products_catalog.
 *
 * Session-level in-memory cache prevents repeated reads.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  limit,
  documentId,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { ProductCatalogItem } from '../../../types';

/* -------------------------------------------------------------------------- */
/* Cache                                                                       */
/* -------------------------------------------------------------------------- */

const CACHE_TTL  = 5 * 60 * 1000; // 5 min
const cache      = new Map<string, { data: ProductCatalogItem[]; at: number }>();

function fromCache(key: string): ProductCatalogItem[] | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL) { cache.delete(key); return null; }
  return e.data;
}
function toCache(key: string, data: ProductCatalogItem[]): void {
  cache.set(key, { data, at: Date.now() });
}

/* -------------------------------------------------------------------------- */
/* Firestore product fetch by IDs                                              */
/* -------------------------------------------------------------------------- */

/**
 * Fetch up to `maxDocs` products by their document IDs.
 * Firestore 'in' query is limited to 30 IDs per call.
 */
async function fetchProductsByIds(
  ids: string[],
  maxDocs = 9
): Promise<ProductCatalogItem[]> {
  if (ids.length === 0) return [];
  const batch = ids.slice(0, Math.min(ids.length, 30));

  const snap = await getDocs(
    query(
      collection(db, 'products_catalog'),
      where(documentId(), 'in', batch),
      limit(maxDocs)
    )
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  } as ProductCatalogItem));
}

/* -------------------------------------------------------------------------- */
/* Rule mapping fetch                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Translate a productRuleKey from the advice engine into a Firestore doc ID.
 * Colons are replaced with underscores to match the key format used when writing.
 */
function ruleKeyToDocId(ruleKey: string): string {
  return ruleKey.replaceAll(':', '_').replaceAll(' ', '-');
}

interface RuleMappingDoc {
  ruleKey:      string;
  sectionId:    string;
  conditionTags: string[];
  sessionTags:  string[];
  productIds:   string[];
  totalMatches: number;
}

async function getRuleMapping(ruleKey: string): Promise<RuleMappingDoc | null> {
  const docId = ruleKeyToDocId(ruleKey);
  const snap  = await getDoc(doc(db, 'product_rule_mappings', docId));
  if (!snap.exists()) return null;
  return snap.data() as RuleMappingDoc;
}

/* -------------------------------------------------------------------------- */
/* matchingProductService                                                      */
/* -------------------------------------------------------------------------- */

export const matchingProductService = {

  /**
   * Get products for a single productRuleKey from the advice engine.
   * Returns up to 9 products (3 per alternativeRole: beste/simpelste/goedkoopste).
   */
  async getProductsForRuleKey(ruleKey: string): Promise<ProductCatalogItem[]> {
    const cacheKey = `rule:${ruleKey}`;
    const cached   = fromCache(cacheKey);
    if (cached) return cached;

    const mapping = await getRuleMapping(ruleKey);
    if (!mapping || mapping.productIds.length === 0) return [];

    const products = await fetchProductsByIds(mapping.productIds, 9);
    toCache(cacheKey, products);
    return products;
  },

  /**
   * Get products for multiple ruleKeys (advice engine output).
   * Merges results, deduplicates, keeps up to maxProducts.
   */
  async getProductsForRuleKeys(
    ruleKeys:    string[],
    maxProducts: number = 9
  ): Promise<ProductCatalogItem[]> {
    const cacheKey = `rules:${ruleKeys.sort().join(',')}`;
    const cached   = fromCache(cacheKey);
    if (cached) return cached;

    const results = await Promise.allSettled(
      ruleKeys.map((k) => this.getProductsForRuleKey(k))
    );

    const seen = new Set<string>();
    const merged: ProductCatalogItem[] = [];

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const p of result.value) {
        const id = (p as any).id ?? (p as any)._id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(p);
        if (merged.length >= maxProducts) break;
      }
      if (merged.length >= maxProducts) break;
    }

    // Sort: beste_keuze first, then simpelste_keuze, then beste_prijs
    const roleOrder: Record<string, number> = {
      beste_keuze:     0,
      simpelste_keuze: 1,
      beste_prijs:     2,
      aanvullend:      3,
    };
    merged.sort((a, b) => {
      const ra = roleOrder[(a as any).alternativeRole] ?? 9;
      const rb = roleOrder[(b as any).alternativeRole] ?? 9;
      if (ra !== rb) return ra - rb;
      return ((b as any).scores?.composite ?? 0) - ((a as any).scores?.composite ?? 0);
    });

    toCache(cacheKey, merged);
    return merged.slice(0, maxProducts);
  },

  /**
   * Get products for a missing Sessiecheck requirement.
   * Tries progressively broader queries until it finds results.
   *
   * Priority order:
   *   1. sectionId + requirementKey (e.g. "hookbaits_hookbait")
   *   2. sectionId only (e.g. "hookbaits")
   *   3. Fallback: direct Firestore query on products_catalog by sectionId
   */
  async getProductsForMissingItem(
    requirementKey: string,
    sectionId:      string,
    conditionTags:  string[] = []
  ): Promise<ProductCatalogItem[]> {
    const cacheKey = `missing:${sectionId}:${requirementKey}:${conditionTags.sort().join(',')}`;
    const cached   = fromCache(cacheKey);
    if (cached) return cached;

    // 1. Try sectionId + conditionTag combos first
    for (const tag of conditionTags) {
      const ruleKey = `${sectionId}::${tag}`;
      const products = await this.getProductsForRuleKey(ruleKey);
      if (products.length > 0) {
        toCache(cacheKey, products);
        return products;
      }
    }

    // 2. Try sectionId only
    const bySection = await this.getProductsForRuleKey(sectionId);
    if (bySection.length > 0) {
      toCache(cacheKey, bySection);
      return bySection;
    }

    // 3. Fallback: direct Firestore query on products_catalog
    const snap = await getDocs(
      query(
        collection(db, 'products_catalog'),
        where('sectionId', '==', sectionId),
        where('inStock', '==', true),
        limit(9)
      )
    );
    const fallback = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductCatalogItem));

    // Sort by composite score
    fallback.sort((a, b) =>
      ((b as any).scores?.composite ?? 0) - ((a as any).scores?.composite ?? 0)
    );

    toCache(cacheKey, fallback);
    return fallback;
  },

  /** Clear in-memory cache. */
  clearCache(): void {
    cache.clear();
  },
};
