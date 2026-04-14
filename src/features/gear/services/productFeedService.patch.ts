/**
 * productFeedService.patch.ts
 *
 * PATCH voor productFeedService.ts — voeg deze methoden toe aan het
 * bestaande productFeedService object.
 *
 * Fixes:
 *   1. Collection naam: 'product_catalog' → 'products_catalog'
 *   2. Filtering op sectionId (nieuw veld) ipv mainSection/subSubCategory (oud)
 *   3. Paginering met startAfter cursor
 *   4. Nieuwe getProductsBySectionId() methode
 *   5. Nieuwe getProductsPage() voor DiscoverTab paginering
 *
 * Integratie:
 *   - Vervang in de bestaande getProducts() alle instances van
 *     'product_catalog' door 'products_catalog'
 *   - Voeg PRODUCTS_CATALOG constant toe:
 *       const PRODUCTS_CATALOG = 'products_catalog';
 *   - Voeg onderstaande methoden toe aan het productFeedService object
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { ProductCatalogItem } from '../../../types';
import { enrichProductClient } from '../utils/taxonomy';

/* -------------------------------------------------------------------------- */
/* Fix: correct collection name                                                */
/* -------------------------------------------------------------------------- */

/**
 * STAP 1: Voeg deze constant toe bovenaan productFeedService.ts
 * en vervang alle 'product_catalog' strings in de bestaande code:
 */
export const PRODUCTS_CATALOG = 'products_catalog';

/* -------------------------------------------------------------------------- */
/* Paginated options                                                           */
/* -------------------------------------------------------------------------- */

export interface ProductPageOptions {
  sectionId?:      string;        // Setup Coach section key (rods_reels, hookbaits etc.)
  mainSection?:    string;        // karper | roofvis | witvis (backward compat)
  sessionTag?:     string;        // karper_nacht | snoek_struinset etc.
  conditionTag?:   string;        // troebel | koud | wier etc.
  beginnerOnly?:   boolean;
  source?:         string;        // fishinn | bol
  pageSize?:       number;        // default 20
}

export interface ProductPage {
  products:    ProductCatalogItem[];
  lastDoc:     DocumentSnapshot | null; // cursor for next page
  hasMore:     boolean;
}

/* -------------------------------------------------------------------------- */
/* New methods to add to productFeedService                                    */
/* -------------------------------------------------------------------------- */

export const productFeedServicePatch = {

  /**
   * Paginated product loading — no bulk fetch, no client-side filtering.
   * Uses Firestore cursor (startAfter) for efficient paging.
   *
   * Called by DiscoverTab for each "Load more" or scroll event.
   *
   * @param options - filter options
   * @param cursor  - DocumentSnapshot from previous page (null for first page)
   */
  async getProductsPage(
    options: ProductPageOptions = {},
    cursor:  DocumentSnapshot | null = null
  ): Promise<ProductPage> {
    const {
      sectionId,
      mainSection,
      sessionTag,
      conditionTag,
      beginnerOnly,
      source,
      pageSize = 20,
    } = options;

    const constraints: QueryConstraint[] = [];

    // Filter on sectionId (new, preferred)
    if (sectionId && sectionId !== 'all') {
      constraints.push(where('sectionId', '==', sectionId));
    }
    // Fallback: filter on mainSection if no sectionId
    else if (mainSection && mainSection !== 'all') {
      constraints.push(where('mainSection', '==', mainSection));
    }

    // sessionTags is an array field — use array-contains
    if (sessionTag) {
      constraints.push(where('sessionTags', 'array-contains', sessionTag));
    }

    // conditionTags
    if (conditionTag) {
      constraints.push(where('conditionTags', 'array-contains', conditionTag));
    }

    // Beginner friendly
    if (beginnerOnly) {
      constraints.push(where('beginnerFriendly', '==', true));
    }

    // Source (fishinn / bol)
    if (source && source !== 'all') {
      constraints.push(where('source', '==', source));
    }

    // Always in-stock only
    constraints.push(where('inStock', '==', true));

    // Sort by composite score
    constraints.push(orderBy('scores.composite', 'desc'));

    // Pagination cursor
    if (cursor) constraints.push(startAfter(cursor));

    // Fetch one extra to determine hasMore
    constraints.push(limit(pageSize + 1));

    const q    = query(collection(db, PRODUCTS_CATALOG), ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs;

    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const lastDoc  = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

    const products = pageDocs.map((d) =>
      enrichProductClient({ id: d.id, ...d.data() } as ProductCatalogItem)
    );

    return { products, lastDoc, hasMore };
  },

  /**
   * Get products for a specific setup section.
   * Used by DiscoverTab section entry points and SessionCheck "Zoek product".
   *
   * @param sectionId - e.g. 'hookbaits', 'lure_families', 'terminal_tackle'
   * @param limit_    - max products to return (default 20)
   */
  async getProductsBySectionId(
    sectionId: string,
    limit_:    number = 20
  ): Promise<ProductCatalogItem[]> {
    const page = await this.getProductsPage({ sectionId, pageSize: limit_ });
    return page.products;
  },

  /**
   * Quick fetch for the "Populair" grid on the DiscoverTab home.
   * Top products by score, no filter, first 20.
   */
  async getTopProducts(count: number = 20): Promise<ProductCatalogItem[]> {
    const q = query(
      collection(db, PRODUCTS_CATALOG),
      where('inStock', '==', true),
      orderBy('scores.composite', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      enrichProductClient({ id: d.id, ...d.data() } as ProductCatalogItem)
    );
  },

  /**
   * Search products by text. Client-side search on a pre-fetched
   * result set — Firestore doesn't support full-text search.
   *
   * Strategy: fetch top 200 by score, then filter client-side.
   * For better search, consider Algolia or the existing queryParser approach.
   */
  async searchProducts(
    searchTerm:  string,
    sectionId?:  string,
    count:       number = 200
  ): Promise<ProductCatalogItem[]> {
    if (!searchTerm.trim()) return [];

    const constraints: QueryConstraint[] = [
      where('inStock', '==', true),
      orderBy('scores.composite', 'desc'),
      limit(count),
    ];

    if (sectionId && sectionId !== 'all') {
      constraints.push(where('sectionId', '==', sectionId));
    }

    const q    = query(collection(db, PRODUCTS_CATALOG), ...constraints);
    const snap = await getDocs(q);

    const term = searchTerm.toLowerCase();
    return snap.docs
      .map((d) => enrichProductClient({ id: d.id, ...d.data() } as ProductCatalogItem))
      .filter((p) =>
        (p.name?.toLowerCase().includes(term)) ||
        (p.brand?.toLowerCase().includes(term)) ||
        (p.description?.toLowerCase().includes(term))
      );
  },

  /**
   * Get products for multiple section IDs (for the "populair per section" strip).
   * Returns a map of sectionId → top 6 products.
   */
  async getProductsPerSection(
    sectionIds: string[],
    perSection: number = 6
  ): Promise<Map<string, ProductCatalogItem[]>> {
    const result = new Map<string, ProductCatalogItem[]>();

    await Promise.allSettled(
      sectionIds.map(async (sid) => {
        const products = await this.getProductsBySectionId(sid, perSection);
        result.set(sid, products);
      })
    );

    return result;
  },
};

/* -------------------------------------------------------------------------- */
/* INSTRUCTION: productFeedService.ts fix                                     */
/* -------------------------------------------------------------------------- */
/*
  In productFeedService.ts, maak de volgende wijzigingen:

  1. Vervang de collection naam — twee plekken in getProducts():
     VOOR:  collection(db, 'product_catalog')
     NA:    collection(db, 'products_catalog')

  2. Voeg de patch methoden toe aan het productFeedService object:
     import { productFeedServicePatch, PRODUCTS_CATALOG } from './productFeedService.patch';

     export const productFeedService = {
       ...bestaande methoden...
       ...productFeedServicePatch,
     };

  3. Update getProducts() om sectionId te ondersteunen:
     const sectionId = options?.sectionId;
     if (sectionId) constraints.push(where('sectionId', '==', sectionId));
*/
