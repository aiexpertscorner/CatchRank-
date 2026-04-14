/**
 * GearContext.tsx
 *
 * Gedeelde data-laag voor alle Gear screens.
 *
 * Wat hier leeft: ALLEEN state die meerdere screens nodig hebben.
 *   - myGear        → TackleboxScreen + SetupCoachScreen
 *   - setupsV2      → SetupCoachScreen + DiscoverScreen (gaps)
 *   - likedIds      → DiscoverScreen + WishlistScreen
 *   - savedIds      → DiscoverScreen + WishlistScreen
 *
 * Wat hier NIET leeft (eigen screen-state):
 *   - products, storeFilter, mainSection → DiscoverScreen
 *   - wishlistItems                      → WishlistScreen (binnen Tacklebox)
 *   - isModalOpen, editingItem           → TackleboxScreen
 */

import React, {
  createContext, useContext, useEffect, useState,
  useCallback, ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../App';
import { gearService } from '../services/gearService';
import { gearInteractionService } from '../services/gearInteractionService';
import { setupService } from '../services/setupService';
import type {
  GearItem, GearSetup, GearSetupV2, ProductCatalogItem,
  GearUserSave, GearCategory,
} from '../../../types';
import type { TackleboxItem, SessionSetup } from '../../../types';

/* ==========================================================================
   Types
   ========================================================================== */

interface GearContextValue {
  // ── Core data ──────────────────────────────────────────────────────────
  myGear:        TackleboxItem[];
  setupsV2:      SessionSetup[];
  legacySetups:  GearSetup[];          // V1 setups — backward compat
  gearLoading:   boolean;
  setupsLoading: boolean;

  // ── Interactions (shared between Discover + Wishlist) ─────────────────
  likedIds:  Set<string>;
  savedIds:  Set<string>;

  // ── Interaction handlers ───────────────────────────────────────────────
  handleLike:  (product: ProductCatalogItem) => Promise<void>;
  handleSave:  (product: ProductCatalogItem) => Promise<void>;
  handleShare: (product: ProductCatalogItem) => Promise<void>;

  // ── Gear mutation helpers ──────────────────────────────────────────────
  handleAddToGear:         (product: ProductCatalogItem) => void;
  handleDeleteGear:        (item: GearItem) => Promise<void>;
  handleToggleFavorite:    (item: GearItem) => Promise<void>;
  handleDeleteSetup:       (setup: GearSetup) => Promise<void>;
  handleDeleteSetupV2:     (setup: GearSetupV2) => Promise<void>;
  appendSetupV2:           (setup: SessionSetup) => void;
  replaceSetupV2:          (setup: SessionSetup) => void;
  gearName:                (id?: string) => string;

  // ── Interactions loader ────────────────────────────────────────────────
  loadInteractions: () => void;
  interactionsLoaded: boolean;

  // ── Wishlist (shared state, loaded lazily) ────────────────────────────
  wishlistItems:   GearUserSave[];
  wishlistLoading: boolean;
  loadWishlist:    () => void;
  removeFromWishlist: (productId: string) => Promise<void>;

  // ── Open gear modal callback (set by TackleboxScreen) ─────────────────
  onOpenAddGear:    (prefill?: Partial<TackleboxItem>) => void;
  setOnOpenAddGear: (fn: (prefill?: Partial<TackleboxItem>) => void) => void;
}

const GearContext = createContext<GearContextValue | null>(null);

export function useGearContext(): GearContextValue {
  const ctx = useContext(GearContext);
  if (!ctx) throw new Error('useGearContext must be used inside GearProvider');
  return ctx;
}

/* ==========================================================================
   Provider
   ========================================================================== */

export function GearProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();

  // ── Core data ────────────────────────────────────────────────────────
  const [myGear,        setMyGear]        = useState<TackleboxItem[]>([]);
  const [legacySetups,  setLegacySetups]  = useState<GearSetup[]>([]);
  const [setupsV2,      setSetupsV2]      = useState<SessionSetup[]>([]);
  const [gearLoading,   setGearLoading]   = useState(true);
  const [setupsLoading, setSetupsLoading] = useState(true);

  // ── Interactions ─────────────────────────────────────────────────────
  const [likedIds,           setLikedIds]           = useState<Set<string>>(new Set());
  const [savedIds,           setSavedIds]           = useState<Set<string>>(new Set());
  const [interactionsLoaded, setInteractionsLoaded] = useState(false);

  // ── Wishlist ─────────────────────────────────────────────────────────
  const [wishlistItems,   setWishlistItems]   = useState<GearUserSave[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistLoaded,  setWishlistLoaded]  = useState(false);

  // ── Add-gear callback (set by TackleboxScreen) ────────────────────────
  const [onOpenAddGearFn, setOnOpenAddGearFn] = useState<
    (prefill?: Partial<TackleboxItem>) => void
  >(() => () => {});

  // ── Real-time subscriptions ──────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;

    setGearLoading(true);
    setSetupsLoading(true);

    const unsubGear = gearService.subscribeToUserGear(
      profile.uid,
      (items) => { setMyGear(items as TackleboxItem[]); setGearLoading(false); },
      (err)   => { console.error('[GearContext] gear sub error:', err); setGearLoading(false); }
    );

    const unsubSetups = gearService.subscribeToUserSetups(
      profile.uid,
      (items) => { setLegacySetups(items); setSetupsLoading(false); },
      (err)   => { console.error('[GearContext] setups sub error:', err); setSetupsLoading(false); }
    );

    // Load V2 setups (one-time — updated via appendSetupV2 / replaceSetupV2)
    setupService.getAllSetups(profile.uid)
      .then((items) => setSetupsV2(items as SessionSetup[]))
      .catch((err) => console.error('[GearContext] setupsV2 load error:', err));

    return () => { unsubGear(); unsubSetups(); };
  }, [profile]);

  // ── Interaction loader (lazy) ─────────────────────────────────────────
  const loadInteractions = useCallback(() => {
    if (!profile || interactionsLoaded) return;
    Promise.all([
      gearInteractionService.getUserLikedProductIds(profile.uid),
      gearInteractionService.getUserSavedProductIds(profile.uid),
    ])
      .then(([liked, saved]) => {
        setLikedIds(liked);
        setSavedIds(saved);
        setInteractionsLoaded(true);
      })
      .catch((err) => console.error('[GearContext] interactions load error:', err));
  }, [profile, interactionsLoaded]);

  // ── Wishlist loader (lazy) ────────────────────────────────────────────
  const loadWishlist = useCallback(() => {
    if (!profile || wishlistLoaded) return;
    setWishlistLoading(true);
    gearInteractionService.getUserWishlist(profile.uid)
      .then((items) => { setWishlistItems(items); setWishlistLoaded(true); })
      .catch((err) => console.error('[GearContext] wishlist load error:', err))
      .finally(() => setWishlistLoading(false));
  }, [profile, wishlistLoaded]);

  // ── Interaction handlers ─────────────────────────────────────────────
  const handleLike = useCallback(async (product: ProductCatalogItem) => {
    if (!profile) return;
    const id = (product as any).id ?? product.externalId;
    const wasLiked = likedIds.has(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      wasLiked ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      if (wasLiked) await gearInteractionService.unlikeProduct(profile.uid, id);
      else { await gearInteractionService.likeProduct(profile.uid, id); toast.success('Geliked!'); }
    } catch {
      setLikedIds((prev) => { const next = new Set(prev); wasLiked ? next.add(id) : next.delete(id); return next; });
      toast.error('Actie mislukt.');
    }
  }, [profile, likedIds]);

  const handleSave = useCallback(async (product: ProductCatalogItem) => {
    if (!profile) return;
    const id = (product as any).id ?? product.externalId;
    const wasSaved = savedIds.has(id);
    setSavedIds((prev) => { const next = new Set(prev); wasSaved ? next.delete(id) : next.add(id); return next; });
    try {
      if (wasSaved) {
        await gearInteractionService.removeFromWishlist(profile.uid, id);
        setWishlistItems((prev) => prev.filter((s) => s.productId !== id));
        toast.success('Verwijderd uit wishlist.');
      } else {
        await gearInteractionService.saveToWishlist(profile.uid, id, {
          name: product.name, brand: product.brand,
          imageURL: product.imageURL, price: product.price,
          affiliateURL: product.affiliateURL, source: product.source,
        });
        toast.success('Opgeslagen in wishlist!');
      }
    } catch {
      setSavedIds((prev) => { const next = new Set(prev); wasSaved ? next.add(id) : next.delete(id); return next; });
      toast.error('Actie mislukt.');
    }
  }, [profile, savedIds]);

  const handleShare = useCallback(async (product: ProductCatalogItem) => {
    const url  = product.affiliateURL || window.location.href;
    const text = `${product.name}${product.brand ? ` – ${product.brand}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: text, url });
        gearInteractionService.recordShare(profile?.uid, (product as any).id ?? product.externalId, 'native', 'discover').catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link gekopieerd!');
        gearInteractionService.recordShare(profile?.uid, (product as any).id ?? product.externalId, 'copy', 'discover').catch(() => {});
      }
    } catch { /* user cancelled */ }
  }, [profile]);

  // ── Wishlist remove ───────────────────────────────────────────────────
  const removeFromWishlist = useCallback(async (productId: string) => {
    if (!profile) return;
    await gearInteractionService.removeFromWishlist(profile.uid, productId);
    setWishlistItems((prev) => prev.filter((s) => s.productId !== productId));
    setSavedIds((prev) => { const next = new Set(prev); next.delete(productId); return next; });
    toast.success('Verwijderd uit wishlist.');
  }, [profile]);

  // ── Gear mutation helpers ─────────────────────────────────────────────
  const handleAddToGear = useCallback((product: ProductCatalogItem) => {
    onOpenAddGearFn({
      name:     product.name,
      brand:    product.brand,
      category: (product.category as GearCategory) || 'accessory',
      linkedProductId: (product as any).id ?? product.externalId,
      catalogSnapshot: {
        name:         product.name,
        brand:        product.brand,
        imageURL:     product.imageURL,
        price:        product.price,
        affiliateURL: product.affiliateURL,
        sectionId:    (product as any).sectionId,
      },
    } as any);
  }, [onOpenAddGearFn]);

  const handleDeleteGear = useCallback(async (item: GearItem) => {
    if (!window.confirm(`"${item.name}" verwijderen?`)) return;
    try {
      await gearService.deleteGearItem(item.id!, item.linkedSetupIds);
      toast.success(`${item.name} verwijderd.`);
    } catch { toast.error('Verwijderen mislukt.'); }
  }, []);

  const handleToggleFavorite = useCallback(async (item: GearItem) => {
    try { await gearService.toggleFavorite(item.id!, item.isFavorite); }
    catch { toast.error('Favoriet bijwerken mislukt.'); }
  }, []);

  const handleDeleteSetup = useCallback(async (setup: GearSetup) => {
    if (!window.confirm(`Setup "${setup.name}" verwijderen?`)) return;
    try {
      await gearService.deleteSetup(setup.id!, setup.gearIds);
      toast.success(`Setup "${setup.name}" verwijderd.`);
    } catch { toast.error('Verwijderen mislukt.'); }
  }, []);

  const handleDeleteSetupV2 = useCallback(async (setup: GearSetupV2) => {
    if (!window.confirm(`Setup "${setup.name}" verwijderen?`)) return;
    try {
      await setupService.deleteSetup(setup.id!);
      setSetupsV2((prev) => prev.filter((s) => s.id !== setup.id));
      toast.success(`Setup "${setup.name}" verwijderd.`);
    } catch { toast.error('Verwijderen mislukt.'); }
  }, []);

  const appendSetupV2  = useCallback((s: SessionSetup) => setSetupsV2((prev) => [s, ...prev]), []);
  const replaceSetupV2 = useCallback((s: SessionSetup) => setSetupsV2((prev) => prev.map((x) => x.id === s.id ? s : x)), []);

  const gearName = useCallback((id?: string) => {
    if (!id) return '—';
    const g = myGear.find((x) => x.id === id);
    return g ? `${g.brand} ${g.name}` : '—';
  }, [myGear]);

  const setOnOpenAddGear = useCallback((fn: (prefill?: Partial<TackleboxItem>) => void) => {
    setOnOpenAddGearFn(() => fn);
  }, []);

  return (
    <GearContext.Provider value={{
      myGear, setupsV2, legacySetups, gearLoading, setupsLoading,
      likedIds, savedIds,
      handleLike, handleSave, handleShare,
      handleAddToGear, handleDeleteGear, handleToggleFavorite,
      handleDeleteSetup, handleDeleteSetupV2,
      appendSetupV2, replaceSetupV2, gearName,
      loadInteractions, interactionsLoaded,
      wishlistItems, wishlistLoading, loadWishlist, removeFromWishlist,
      onOpenAddGear: onOpenAddGearFn,
      setOnOpenAddGear,
    }}>
      {children}
    </GearContext.Provider>
  );
}
