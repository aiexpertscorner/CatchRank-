import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Star,
  Package,
  Layers,
  ShoppingBag,
  ExternalLink,
  Edit2,
  Trash2,
  Grid,
  List as ListIcon,
  Bookmark,
  X,
  Loader2,
  AlertCircle,
  Heart,
  Fish,
} from 'lucide-react';
import { useAuth } from '../../../App';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { gearService } from '../services/gearService';
import { productFeedService } from '../services/productFeedService';
import { gearInteractionService } from '../services/gearInteractionService';
import { setupService, DISCIPLINE_LABELS, DISCIPLINE_ICONS } from '../services/setupService';
import {
  GearItem,
  GearSetup,
  GearSetupV2,
  GearUserSave,
  ProductCatalogItem,
  GEAR_CATEGORY_LABELS,
  GearCategory,
} from '../../../types';
import { PRODUCT_FEED_MAX_ITEMS_PER_SOURCE } from '../../../config/env';
import { GearItemModal } from '../components/GearItemModal';
import { SetupModal } from '../components/SetupModal';
import { SetupBuilderModal } from '../components/SetupBuilderModal';
import { ProductDetailSheet } from '../components/ProductDetailSheet';
import { cn } from '../../../lib/utils';
import {
  buildProductBlob,
  inferMainSection as inferMainSectionTax,
  inferSubSubCategory as inferSubSubCategoryTax,
  getReasonsRecommended,
  SUBSUB_LABELS as SUBSUB_LABELS_TAX,
  PRIMARY_CATEGORY_LABELS,
} from '../utils/taxonomy';
import { parseQuery, getIntentChips } from '../utils/queryParser';

type Tab = 'my-gear' | 'favorites' | 'setups' | 'wishlist' | 'discover';
type MainSection = 'all' | 'karper' | 'roofvis' | 'witvis' | 'nachtvissen' | 'allround';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'my-gear', label: 'Mijn Gear', icon: Package },
  { id: 'favorites', label: 'Favorieten', icon: Star },
  { id: 'setups', label: 'Setups', icon: Layers },
  { id: 'wishlist', label: 'Wishlist', icon: Bookmark },
  { id: 'discover', label: 'Ontdekken', icon: ShoppingBag },
];

const CATEGORY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Alles' },
  ...Object.entries(GEAR_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

const PRODUCT_STORE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Alle winkels' },
  { value: 'fishinn', label: 'Fishinn' },
  { value: 'bol', label: 'Bol.com' },
];

const MAIN_SECTION_OPTIONS: { value: MainSection; label: string }[] = [
  { value: 'all', label: 'Alles' },
  { value: 'karper', label: 'Karper' },
  { value: 'roofvis', label: 'Roofvis' },
  { value: 'witvis', label: 'Witvis' },
  { value: 'nachtvissen', label: 'Nachtvissen' },
  { value: 'allround', label: 'Allround' },
];

// Use SUBSUB_LABELS from taxonomy.ts (imported as SUBSUB_LABELS_TAX)
// PRIMARY_CATEGORY_LABELS imported from taxonomy.ts for subcategory display
const SUBCATEGORY_LABELS: Record<string, string> = {
  ...PRIMARY_CATEGORY_LABELS,
  rod: 'Hengels',
  reel: 'Molens',
  line: 'Lijnen',
  lure: 'Kunstaas',
  bait: 'Aas',
  hook: 'Haken',
  accessory: 'Accessoires',
};

type EnrichedProduct = ProductCatalogItem & {
  _mainSection: MainSection;
  _subCategory: string;
  _subSubCategory: string;
};

export default function Gear() {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('my-gear');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [storeFilter, setStoreFilter] = useState('all');

  const [mainSection, setMainSection] = useState<MainSection>('all');
  const [subCategory, setSubCategory] = useState<string>('all');
  const [subSubCategory, setSubSubCategory] = useState<string>('all');

  const [myGear, setMyGear] = useState<GearItem[]>([]);
  const [setups, setSetups] = useState<GearSetup[]>([]);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [activeCluster, setActiveCluster] = useState<string>('all');

  const [gearLoading, setGearLoading] = useState(true);
  const [setupsLoading, setSetupsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);

  const [isGearModalOpen, setIsGearModalOpen] = useState(false);
  const [editingGear, setEditingGear] = useState<GearItem | null>(null);
  const [prefillGear, setPrefillGear] = useState<Partial<GearItem> | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<GearSetup | null>(null);

  // ── V2 Setups (discipline-aware, slot-based) ─────────────────────────────
  const [setupsV2, setSetupsV2] = useState<GearSetupV2[]>([]);
  const [setupsV2Loading, setSetupsV2Loading] = useState(false);
  const [isSetupBuilderOpen, setIsSetupBuilderOpen] = useState(false);
  const [editingSetupV2, setEditingSetupV2] = useState<GearSetupV2 | null>(null);

  // ── Parsed search intent ─────────────────────────────────────────────────
  const [parsedQuery, setParsedQuery] = useState(() => parseQuery(''));

  // ── Interactions (likes / wishlist) ─────────────────────────────────────
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [wishlistItems, setWishlistItems] = useState<GearUserSave[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [interactionsLoaded, setInteractionsLoaded] = useState(false);

  // ── Product detail sheet ─────────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<EnrichedProduct | null>(null);

  useEffect(() => {
    if (!profile) return;

    const unsubGear = gearService.subscribeToUserGear(
      profile.uid,
      (items) => { setMyGear(items); setGearLoading(false); },
      (err) => { console.error('Gear sub error:', err); setGearLoading(false); }
    );

    const unsubSetups = gearService.subscribeToUserSetups(
      profile.uid,
      (items) => { setSetups(items); setSetupsLoading(false); },
      (err) => { console.error('Setups sub error:', err); setSetupsLoading(false); }
    );

    return () => {
      unsubGear();
      unsubSetups();
    };
  }, [profile]);

  useEffect(() => {
    if (activeTab !== 'discover') return;

    setProductsLoading(true);
    const source = storeFilter !== 'all' ? (storeFilter as 'fishinn' | 'bol') : undefined;

    productFeedService
      .getProducts({ source, maxItems: PRODUCT_FEED_MAX_ITEMS_PER_SOURCE })
      .then((items) => {
        setProducts(items);
        setActiveCluster('all');
      })
      .catch((err) => console.error('Products load error:', err))
      .finally(() => setProductsLoading(false));
  }, [activeTab, storeFilter]);

  // Load V2 setups when setups tab opens
  useEffect(() => {
    if (!profile || activeTab !== 'setups') return;
    setSetupsV2Loading(true);
    setupService.getSetups(profile.uid)
      .then(setSetupsV2)
      .catch((err) => console.error('SetupV2 load error:', err))
      .finally(() => setSetupsV2Loading(false));
  }, [profile, activeTab]);

  // Parse search intent on each query change
  useEffect(() => {
    setParsedQuery(parseQuery(searchQuery));
  }, [searchQuery]);

  // Load likes + saved IDs once when discover or wishlist tab is first opened
  useEffect(() => {
    if (!profile || interactionsLoaded) return;
    if (activeTab !== 'discover' && activeTab !== 'wishlist') return;

    Promise.all([
      gearInteractionService.getUserLikedProductIds(profile.uid),
      gearInteractionService.getUserSavedProductIds(profile.uid),
    ])
      .then(([liked, saved]) => {
        setLikedIds(liked);
        setSavedIds(saved);
        setInteractionsLoaded(true);
      })
      .catch((err) => console.error('Interactions load error:', err));
  }, [profile, activeTab, interactionsLoaded]);

  // Load full wishlist items when wishlist tab opens
  useEffect(() => {
    if (!profile || activeTab !== 'wishlist') return;

    setWishlistLoading(true);
    gearInteractionService
      .getUserWishlist(profile.uid)
      .then(setWishlistItems)
      .catch((err) => console.error('Wishlist load error:', err))
      .finally(() => setWishlistLoading(false));
  }, [profile, activeTab]);

  const favorites = myGear.filter((g) => g.isFavorite);

  const productClusters = useMemo(
    () => productFeedService.deriveClustersFromProducts(products),
    [products]
  );

  const discoverProductsEnriched = useMemo<EnrichedProduct[]>(() => {
    return products.map((p) => ({
      ...p,
      _mainSection: (inferMainSectionTax(buildProductBlob(p)) as MainSection) || 'allround',
      _subCategory: p.category || 'accessory',
      _subSubCategory: inferSubSubCategoryTax(buildProductBlob(p)),
    }));
  }, [products]);

  const availableSubCategories = useMemo(() => {
    const filtered = discoverProductsEnriched.filter((p) =>
      mainSection === 'all' ? true : p._mainSection === mainSection
    );
    const unique = [...new Set(filtered.map((p) => p._subCategory).filter(Boolean))];
    const ordered = unique.sort((a, b) => (SUBCATEGORY_LABELS[a] || a).localeCompare(SUBCATEGORY_LABELS[b] || b));
    return ['all', ...ordered];
  }, [discoverProductsEnriched, mainSection]);

  const availableSubSubCategories = useMemo(() => {
    const filtered = discoverProductsEnriched.filter((p) => {
      const matchesMain = mainSection === 'all' ? true : p._mainSection === mainSection;
      const matchesSub = subCategory === 'all' ? true : p._subCategory === subCategory;
      return matchesMain && matchesSub;
    });

    const unique = [...new Set(filtered.map((p) => p._subSubCategory).filter(Boolean))];
    const withoutAll = unique.filter((x) => x !== 'all');
    const ordered = withoutAll.sort((a, b) => (SUBSUB_LABELS_TAX[a] || a).localeCompare(SUBSUB_LABELS_TAX[b] || b));
    return ['all', ...ordered];
  }, [discoverProductsEnriched, mainSection, subCategory]);

  const filterGear = (items: GearItem[]) =>
    items.filter((g) => {
      const matchesSearch =
        !searchQuery ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || g.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

  const filteredGear = filterGear(myGear);
  const filteredFavorites = filterGear(favorites);

  const filteredProducts = discoverProductsEnriched.filter((p) => {
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q);

    const matchesMain = mainSection === 'all' ? true : p._mainSection === mainSection;
    const matchesSub = subCategory === 'all' ? true : p._subCategory === subCategory;
    const matchesSubSub = subSubCategory === 'all' ? true : p._subSubCategory === subSubCategory;
    const matchesCluster = activeCluster === 'all' || (p.clusters ?? []).includes(activeCluster);

    return matchesSearch && matchesMain && matchesSub && matchesSubSub && matchesCluster;
  });

  const openAddGear = (prefill?: Partial<GearItem>) => {
    setEditingGear(null);
    setPrefillGear(prefill ?? null);
    setIsGearModalOpen(true);
  };

  const openEditGear = (item: GearItem) => {
    setEditingGear(item);
    setPrefillGear(null);
    setIsGearModalOpen(true);
  };

  const handleAddToGear = (product: ProductCatalogItem) => {
    openAddGear({
      name: product.name,
      brand: product.brand,
      category: (product.category as GearCategory) || 'accessory',
      photoURL: product.imageURL,
      affiliateProductId: product.id,
    });
  };

  const openAddSetup = () => {
    setEditingSetup(null);
    setIsSetupModalOpen(true);
  };

  const openEditSetup = (s: GearSetup) => {
    setEditingSetup(s);
    setIsSetupModalOpen(true);
  };

  const openAddSetupV2 = () => {
    setEditingSetupV2(null);
    setIsSetupBuilderOpen(true);
  };

  const openEditSetupV2 = (s: GearSetupV2) => {
    setEditingSetupV2(s);
    setIsSetupBuilderOpen(true);
  };

  const handleDeleteSetupV2 = async (setup: GearSetupV2) => {
    if (!window.confirm(`Setup "${setup.name}" verwijderen?`)) return;
    try {
      await setupService.deleteSetup(setup.id!);
      setSetupsV2((prev) => prev.filter((s) => s.id !== setup.id));
      toast.success(`Setup "${setup.name}" verwijderd.`);
    } catch {
      toast.error('Verwijderen mislukt.');
    }
  };

  const handleDeleteGear = async (item: GearItem) => {
    if (!window.confirm(`"${item.name}" verwijderen uit Mijn Gear?`)) return;
    try {
      await gearService.deleteGearItem(item.id!, item.linkedSetupIds);
      toast.success(`${item.name} verwijderd.`);
    } catch {
      toast.error('Verwijderen mislukt.');
    }
  };

  const handleDeleteSetup = async (setup: GearSetup) => {
    if (!window.confirm(`Setup "${setup.name}" verwijderen?`)) return;
    try {
      await gearService.deleteSetup(setup.id!, setup.gearIds);
      toast.success(`Setup "${setup.name}" verwijderd.`);
    } catch {
      toast.error('Verwijderen mislukt.');
    }
  };

  const handleToggleFavorite = async (item: GearItem) => {
    try {
      await gearService.toggleFavorite(item.id!, item.isFavorite);
    } catch {
      toast.error('Favoriet bijwerken mislukt.');
    }
  };

  const gearName = (id?: string) => {
    if (!id) return '—';
    const g = myGear.find((x) => x.id === id);
    return g ? `${g.brand} ${g.name}` : '—';
  };

  // ── Interaction handlers ─────────────────────────────────────────────────

  const handleLike = useCallback(async (product: ProductCatalogItem) => {
    if (!profile) return;
    const id = product.id ?? product.externalId;
    const alreadyLiked = likedIds.has(id);

    // Optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(id) : next.add(id);
      return next;
    });

    try {
      if (alreadyLiked) {
        await gearInteractionService.unlikeProduct(profile.uid, id);
      } else {
        await gearInteractionService.likeProduct(profile.uid, id);
        toast.success('Geliked!');
      }
    } catch {
      // Roll back on error
      setLikedIds((prev) => {
        const next = new Set(prev);
        alreadyLiked ? next.add(id) : next.delete(id);
        return next;
      });
      toast.error('Actie mislukt.');
    }
  }, [profile, likedIds]);

  const handleSave = useCallback(async (product: ProductCatalogItem) => {
    if (!profile) return;
    const id = product.id ?? product.externalId;
    const alreadySaved = savedIds.has(id);

    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      alreadySaved ? next.delete(id) : next.add(id);
      return next;
    });

    try {
      if (alreadySaved) {
        await gearInteractionService.removeFromWishlist(profile.uid, id);
        setWishlistItems((prev) => prev.filter((s) => s.productId !== id));
        toast.success('Verwijderd uit wishlist.');
      } else {
        await gearInteractionService.saveToWishlist(profile.uid, id, {
          name: product.name,
          brand: product.brand,
          category: product.category,
          imageURL: product.imageURL,
          price: product.price,
          affiliateURL: product.affiliateURL,
          source: product.source,
        });
        toast.success('Opgeslagen in wishlist!');
      }
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        alreadySaved ? next.add(id) : next.delete(id);
        return next;
      });
      toast.error('Actie mislukt.');
    }
  }, [profile, savedIds]);

  const handleShare = useCallback(async (product: ProductCatalogItem) => {
    const url = product.affiliateURL || window.location.href;
    const text = `${product.name}${product.brand ? ` – ${product.brand}` : ''}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: text, url });
        gearInteractionService.recordShare(profile?.uid, product.id ?? product.externalId, 'native', 'discover').catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link gekopieerd!');
        gearInteractionService.recordShare(profile?.uid, product.id ?? product.externalId, 'copy', 'discover').catch(() => {});
      }
    } catch {
      // User cancelled share — no error needed
    }
  }, [profile]);

  const headerAction =
    activeTab === 'my-gear' || activeTab === 'favorites' ? (
      <Button
        icon={<Plus className="w-4 h-4" />}
        className="rounded-xl h-11 px-5 font-bold shadow-premium-accent"
        onClick={() => openAddGear()}
      >
        Gear Toevoegen
      </Button>
    ) : activeTab === 'setups' ? (
      <Button
        icon={<Plus className="w-4 h-4" />}
        className="rounded-xl h-11 px-5 font-bold shadow-premium-accent"
        onClick={openAddSetupV2}
      >
        Nieuwe Setup
      </Button>
    ) : null;

  return (
    <PageLayout>
      <PageHeader
        title="Mijn Visgear"
        subtitle="Beheer je uitrusting, setups en ontdek nieuwe items"
        actions={headerAction}
      />

      <div className="space-y-6 pb-32">
        <div className="flex items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border-subtle overflow-x-auto no-scrollbar mx-2 md:mx-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
                setCategoryFilter('all');
                setMainSection('all');
                setSubCategory('all');
                setSubSubCategory('all');
                setActiveCluster('all');
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 md:px-5 py-3 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-brand text-bg-main shadow-lg shadow-brand/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
              )}
            >
              <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {(activeTab === 'my-gear' || activeTab === 'favorites' || activeTab === 'discover') && (
          <section className="flex flex-col gap-3 px-2 md:px-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder={activeTab === 'discover' ? 'Zoek producten...' : 'Zoek in je gear...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-card border border-border-subtle rounded-xl pl-11 pr-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {(activeTab === 'my-gear' || activeTab === 'favorites') && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {CATEGORY_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCategoryFilter(opt.value)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex-shrink-0',
                      categoryFilter === opt.value
                        ? 'bg-brand text-bg-main border-brand'
                        : 'bg-surface-card text-text-muted border-border-subtle hover:border-brand/30'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'discover' && searchQuery && getIntentChips(parsedQuery).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {getIntentChips(parsedQuery).map((chip) => (
                  <span
                    key={chip.key}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand/10 text-brand border border-brand/20 text-[9px] font-black uppercase tracking-widest"
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            )}

            {activeTab === 'discover' && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {PRODUCT_STORE_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setStoreFilter(f.value)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex-shrink-0',
                        storeFilter === f.value
                          ? 'bg-brand text-bg-main border-brand'
                          : 'bg-surface-card text-text-muted border-border-subtle hover:border-brand/30'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {MAIN_SECTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setMainSection(opt.value);
                        setSubCategory('all');
                        setSubSubCategory('all');
                      }}
                      className={cn(
                        'px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex-shrink-0',
                        mainSection === opt.value
                          ? 'bg-brand text-bg-main border-brand'
                          : 'bg-surface-card text-text-muted border-border-subtle hover:border-brand/30'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {availableSubCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSubCategory(cat);
                        setSubSubCategory('all');
                      }}
                      className={cn(
                        'px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex-shrink-0',
                        subCategory === cat
                          ? 'bg-brand text-bg-main border-brand'
                          : 'bg-surface-card text-text-muted border-border-subtle hover:border-brand/30'
                      )}
                    >
                      {cat === 'all' ? 'Alle types' : (SUBCATEGORY_LABELS[cat] ?? cat)}
                    </button>
                  ))}
                </div>

                {availableSubSubCategories.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {availableSubSubCategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSubSubCategory(sub)}
                        className={cn(
                          'px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex-shrink-0',
                          subSubCategory === sub
                            ? 'bg-brand text-bg-main border-brand'
                            : 'bg-surface-card text-text-muted border-border-subtle hover:border-brand/30'
                        )}
                      >
                        {SUBSUB_LABELS_TAX[sub] ?? sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(activeTab === 'my-gear' || activeTab === 'favorites') && (
              <div className="flex bg-surface-card border border-border-subtle rounded-xl p-1 flex-shrink-0 self-start">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded-lg transition-all',
                    viewMode === 'grid' ? 'bg-brand text-bg-main' : 'text-text-muted'
                  )}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded-lg transition-all',
                    viewMode === 'list' ? 'bg-brand text-bg-main' : 'text-text-muted'
                  )}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'my-gear' && (
              <GearGrid
                items={filteredGear}
                loading={gearLoading}
                viewMode={viewMode}
                onEdit={openEditGear}
                onDelete={handleDeleteGear}
                onToggleFavorite={handleToggleFavorite}
                onAdd={() => openAddGear()}
                emptyMessage="Nog geen gear toegevoegd."
                emptySubMessage="Voeg je eerste hengel, molen of kunstaas toe."
              />
            )}

            {activeTab === 'favorites' && (
              <GearGrid
                items={filteredFavorites}
                loading={gearLoading}
                viewMode={viewMode}
                onEdit={openEditGear}
                onDelete={handleDeleteGear}
                onToggleFavorite={handleToggleFavorite}
                onAdd={() => openAddGear()}
                emptyMessage="Geen favorieten gevonden."
                emptySubMessage="Markeer gear als favoriet via de ster op een item."
              />
            )}

            {activeTab === 'setups' && (
              <SetupsTab
                setups={setups}
                setupsV2={setupsV2}
                loading={setupsLoading || setupsV2Loading}
                myGear={myGear}
                gearName={gearName}
                onAdd={openAddSetupV2}
                onEdit={openEditSetup}
                onDelete={handleDeleteSetup}
                onEditV2={openEditSetupV2}
                onDeleteV2={handleDeleteSetupV2}
              />
            )}

            {activeTab === 'wishlist' && (
              <WishlistTab
                items={wishlistItems}
                loading={wishlistLoading}
                onRemove={(productId) => {
                  if (!profile) return;
                  gearInteractionService.removeFromWishlist(profile.uid, productId)
                    .then(() => {
                      setWishlistItems((prev) => prev.filter((s) => s.productId !== productId));
                      setSavedIds((prev) => { const n = new Set(prev); n.delete(productId); return n; });
                      toast.success('Verwijderd uit wishlist.');
                    })
                    .catch(() => toast.error('Verwijderen mislukt.'));
                }}
              />
            )}

            {activeTab === 'discover' && (
              <DiscoverTab
                products={filteredProducts}
                allProducts={products}
                loading={productsLoading}
                searchQuery={searchQuery}
                clusters={productClusters}
                activeCluster={activeCluster}
                onClusterChange={setActiveCluster}
                onAddToGear={handleAddToGear}
                likedIds={likedIds}
                savedIds={savedIds}
                onLike={handleLike}
                onSave={handleSave}
                onShare={handleShare}
                onOpenDetail={setSelectedProduct}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <GearItemModal
        isOpen={isGearModalOpen}
        onClose={() => {
          setIsGearModalOpen(false);
          setEditingGear(null);
          setPrefillGear(null);
        }}
        editItem={editingGear}
        prefillData={prefillGear ?? undefined}
      />

      <SetupModal
        isOpen={isSetupModalOpen}
        onClose={() => {
          setIsSetupModalOpen(false);
          setEditingSetup(null);
        }}
        editSetup={editingSetup}
      />

      <SetupBuilderModal
        isOpen={isSetupBuilderOpen}
        onClose={() => {
          setIsSetupBuilderOpen(false);
          setEditingSetupV2(null);
        }}
        editSetup={editingSetupV2}
        ownedGear={myGear}
        onCreated={async (data) => {
          if (data.id) {
            // Edit path — modal already called updateSetup
            setSetupsV2((prev) => prev.map((s) => s.id === data.id ? data : s));
            toast.success('Setup bijgewerkt!');
          } else {
            // Create path
            if (!profile) return;
            try {
              const id = await setupService.createSetup(profile.uid, data);
              const created: GearSetupV2 = { ...data, id, userId: profile.uid };
              setSetupsV2((prev) => [created, ...prev]);
              toast.success('Setup aangemaakt!');
            } catch {
              toast.error('Setup opslaan mislukt.');
            }
          }
          setIsSetupBuilderOpen(false);
          setEditingSetupV2(null);
        }}
      />

      <ProductDetailSheet
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        isLiked={selectedProduct ? likedIds.has(selectedProduct.id ?? selectedProduct.externalId) : false}
        isSaved={selectedProduct ? savedIds.has(selectedProduct.id ?? selectedProduct.externalId) : false}
        onLike={() => selectedProduct && handleLike(selectedProduct)}
        onSave={() => selectedProduct && handleSave(selectedProduct)}
        onShare={() => selectedProduct && handleShare(selectedProduct)}
        onAddToGear={(p) => { setSelectedProduct(null); handleAddToGear(p); }}
      />
    </PageLayout>
  );
}

interface GearGridProps {
  items: GearItem[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  onEdit: (item: GearItem) => void;
  onDelete: (item: GearItem) => void;
  onToggleFavorite: (item: GearItem) => void;
  onAdd: () => void;
  emptyMessage: string;
  emptySubMessage: string;
}

function GearGrid({
  items,
  loading,
  viewMode,
  onEdit,
  onDelete,
  onToggleFavorite,
  onAdd,
  emptyMessage,
  emptySubMessage,
}: GearGridProps) {
  if (loading) return <LoadingState />;

  if (items.length === 0) {
    return (
      <EmptyState icon={Package} message={emptyMessage} subMessage={emptySubMessage}>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={onAdd}
          className="mt-4 rounded-xl h-11 px-6 font-bold shadow-premium-accent"
        >
          Gear Toevoegen
        </Button>
      </EmptyState>
    );
  }

  return (
    <div
      className={cn(
        'px-2 md:px-0',
        viewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
          : 'space-y-3'
      )}
    >
      {items.map((g) => (
        <GearItemCard
          key={g.id}
          item={g}
          viewMode={viewMode}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      ))}

      <button
        onClick={onAdd}
        className={cn(
          'rounded-2xl border-2 border-dashed border-border-subtle flex items-center justify-center gap-3 text-text-muted hover:text-brand hover:border-brand transition-all bg-surface-soft/20 group',
          viewMode === 'grid' ? 'aspect-square flex-col' : 'h-20 w-full flex-row'
        )}
      >
        <div className="w-9 h-9 rounded-full bg-surface-soft flex items-center justify-center group-hover:bg-brand/10 transition-colors">
          <Plus className="w-4 h-4" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest">Voeg Gear Toe</span>
      </button>
    </div>
  );
}

function GearItemCard({
  item,
  viewMode,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  item: GearItem;
  viewMode: 'grid' | 'list';
  onEdit: (item: GearItem) => void;
  onDelete: (item: GearItem) => void;
  onToggleFavorite: (item: GearItem) => void;
}) {
  const categoryLabel = GEAR_CATEGORY_LABELS[item.category] ?? item.category;

  if (viewMode === 'list') {
    return (
      <Card padding="none" className="border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group overflow-hidden">
        <div className="flex items-center gap-4 p-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-soft flex-shrink-0">
            {item.photoURL ? (
              <img src={item.photoURL} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-dim">
                <Package className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">{item.brand}</p>
            <h4 className="text-sm font-bold text-text-primary truncate">{item.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="neutral" className="text-[7px] py-0.5 px-1.5">
                {categoryLabel}
              </Badge>
              {item.usageCount && item.usageCount > 0 && (
                <span className="text-[8px] text-text-dim font-bold">{item.usageCount}× gebruikt</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onToggleFavorite(item)}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                item.isFavorite ? 'text-brand' : 'text-text-muted hover:text-brand'
              )}
            >
              <Star className={cn('w-3.5 h-3.5', item.isFavorite && 'fill-current')} />
            </button>
            <button
              onClick={() => onEdit(item)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-brand transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(item)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-danger transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl overflow-hidden flex flex-col">
      <div className="aspect-square relative overflow-hidden bg-surface-soft">
        {item.photoURL ? (
          <img src={item.photoURL} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-dim">
            <Package className="w-10 h-10" />
          </div>
        )}

        <button
          onClick={() => onToggleFavorite(item)}
          className={cn(
            'absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center shadow-lg transition-all',
            item.isFavorite ? 'bg-brand text-bg-main' : 'bg-black/40 backdrop-blur-md text-white hover:bg-brand/80'
          )}
        >
          <Star className={cn('w-3 h-3', item.isFavorite && 'fill-current')} />
        </button>

        {item.usageCount && item.usageCount > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md rounded-lg px-2 py-0.5">
            <span className="text-[8px] font-black text-white">{item.usageCount}× gebruikt</span>
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">{item.brand}</p>
          <h4 className="text-xs font-bold text-text-primary tracking-tight truncate">{item.name}</h4>
        </div>

        <div className="flex items-center justify-between mt-2">
          <Badge variant="neutral" className="text-[7px] py-0.5 px-1.5 font-black uppercase tracking-widest">
            {categoryLabel}
          </Badge>

          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(item)} className="text-text-muted hover:text-brand transition-colors">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(item)} className="text-text-muted hover:text-danger transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SetupsTab({
  setups,
  setupsV2,
  loading,
  myGear,
  gearName,
  onAdd,
  onEdit,
  onDelete,
  onEditV2,
  onDeleteV2,
}: {
  setups: GearSetup[];
  setupsV2: GearSetupV2[];
  loading: boolean;
  myGear: GearItem[];
  gearName: (id?: string) => string;
  onAdd: () => void;
  onEdit: (s: GearSetup) => void;
  onDelete: (s: GearSetup) => void;
  onEditV2: (s: GearSetupV2) => void;
  onDeleteV2: (s: GearSetupV2) => void;
}) {
  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4 px-2 md:px-0">

      {/* V2 Setups — discipline-aware, slot-based */}
      {setupsV2.length > 0 && (
        <div className="space-y-3">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest px-1">
            Mijn Setups ({setupsV2.length})
          </p>
          {setupsV2.map((s) => (
            <SetupV2Card
              key={s.id}
              setup={s}
              onEdit={onEditV2}
              onDelete={onDeleteV2}
            />
          ))}
        </div>
      )}

      {setups.map((s) => (
        <Card key={s.id} className="p-5 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-text-primary tracking-tight group-hover:text-brand transition-colors">
                    {s.name}
                  </h4>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
                    {s.catchCount || 0} vangsten · {s.sessionCount || 0} sessies
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { label: 'Hengel', id: s.rodId },
                  { label: 'Molen', id: s.reelId },
                  { label: 'Lijn', id: s.lineId },
                  { label: 'Voorlijn', id: s.leaderId },
                  { label: 'Kunstaas', id: s.lureId },
                ]
                  .filter((x) => x.id)
                  .map(({ label, id }) => (
                    <div key={label} className="bg-bg-main/50 p-2.5 rounded-xl border border-border-subtle">
                      <p className="text-[7px] font-black text-text-muted uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="text-xs font-bold text-text-primary truncate">{gearName(id)}</p>
                    </div>
                  ))}
              </div>

              {s.notes && <p className="text-xs text-text-muted italic">{s.notes}</p>}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="secondary"
                size="sm"
                className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest"
                onClick={() => onEdit(s)}
              >
                Wijzig
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl p-0" onClick={() => onDelete(s)}>
                <Trash2 className="w-4 h-4 text-text-muted hover:text-danger" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <button
        onClick={onAdd}
        disabled={myGear.length === 0}
        className="w-full py-5 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-soft/10 text-text-muted hover:text-brand hover:border-brand hover:bg-brand/5 transition-all flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-40 disabled:pointer-events-none"
      >
        <Plus className="w-4 h-4" />
        Nieuwe Setup Samenstellen
      </button>
    </div>
  );
}

function SetupV2Card({
  setup,
  onEdit,
  onDelete,
}: {
  setup: GearSetupV2;
  onEdit: (s: GearSetupV2) => void;
  onDelete: (s: GearSetupV2) => void;
}) {
  const label = DISCIPLINE_LABELS[setup.discipline] ?? setup.discipline;
  const icon = DISCIPLINE_ICONS[setup.discipline] ?? '⚙️';
  const filled = setup.slots?.filter((s) => s.gearItemId || s.productId || s.notes).length ?? 0;
  const total = setup.slots?.length ?? 0;
  const pct = setup.completeness ?? (total > 0 ? Math.round((filled / total) * 100) : 0);

  return (
    <Card className="p-4 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-lg flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">{label}</p>
            <h4 className="text-sm font-bold text-text-primary truncate group-hover:text-brand transition-colors">
              {setup.name}
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 px-3 rounded-xl font-bold text-[10px] uppercase tracking-widest"
            onClick={() => onEdit(setup)}
          >
            Wijzig
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-xl p-0" onClick={() => onDelete(setup)}>
            <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-danger" />
          </Button>
        </div>
      </div>

      {/* Completeness bar */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">
            Compleetheid
          </p>
          <span className="text-[8px] font-black text-text-muted">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-soft overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-brand' : 'bg-brand/50'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Slots preview */}
      {setup.slots && setup.slots.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {setup.slots.slice(0, 5).map((slot) => (
            <span
              key={slot.slotKey}
              className={cn(
                'text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border',
                slot.gearItemId || slot.productId || slot.notes
                  ? 'bg-brand/10 text-brand border-brand/20'
                  : 'bg-surface-soft text-text-dim border-border-subtle'
              )}
            >
              {slot.label}
            </span>
          ))}
          {setup.slots.length > 5 && (
            <span className="text-[8px] font-black text-text-dim px-1">+{setup.slots.length - 5}</span>
          )}
        </div>
      )}
    </Card>
  );
}

function WishlistTab({
  items,
  loading,
  onRemove,
}: {
  items: GearUserSave[];
  loading: boolean;
  onRemove: (productId: string) => void;
}) {
  if (loading) return <LoadingState />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        message="Wishlist is leeg"
        subMessage="Sla producten op uit Ontdekken via het bookmark-icoon om ze hier te bewaren."
      />
    );
  }

  return (
    <div className="space-y-3 px-2 md:px-0">
      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest px-1">
        {items.length} opgeslagen product{items.length !== 1 ? 'en' : ''}
      </p>

      {items.map((save) => {
        const snap = save.productSnapshot;
        return (
          <div
            key={save.id ?? save.productId}
            className="flex items-center gap-3 p-3 bg-surface-card border border-border-subtle rounded-2xl hover:border-brand/20 transition-all group"
          >
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-soft flex-shrink-0">
              {snap?.imageURL ? (
                <img
                  src={snap.imageURL}
                  alt={snap.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-dim">
                  <Package className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {snap?.brand && (
                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">{snap.brand}</p>
              )}
              <p className="text-sm font-bold text-text-primary truncate">{snap?.name ?? '—'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {snap?.price != null && (
                  <span className="text-[9px] font-black text-brand">€{snap.price.toFixed(2)}</span>
                )}
                {snap?.source && (
                  <span className="text-[8px] font-bold text-text-dim uppercase">{snap.source}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {snap?.affiliateURL && (
                <a
                  href={snap.affiliateURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-brand transition-colors border border-border-subtle hover:border-brand/30"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => onRemove(save.productId)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger transition-colors"
                title="Verwijder uit wishlist"
              >
                <Bookmark className="w-3.5 h-3.5 fill-current text-brand" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CLUSTER_TYPE_COLORS: Record<string, string> = {
  species: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  technique: 'text-brand bg-brand/10 border-brand/20',
  category: 'text-text-secondary bg-surface-soft border-border-subtle',
};

function DiscoverTab({
  products,
  allProducts,
  loading,
  searchQuery,
  clusters,
  activeCluster,
  onClusterChange,
  onAddToGear,
  likedIds,
  savedIds,
  onLike,
  onSave,
  onShare,
  onOpenDetail,
}: {
  products: EnrichedProduct[];
  allProducts: ProductCatalogItem[];
  loading: boolean;
  searchQuery: string;
  clusters: Array<{ key: string; label: string; count: number; type: string }>;
  activeCluster: string;
  onClusterChange: (key: string) => void;
  onAddToGear: (product: ProductCatalogItem) => void;
  likedIds: Set<string>;
  savedIds: Set<string>;
  onLike: (product: ProductCatalogItem) => void;
  onSave: (product: ProductCatalogItem) => void;
  onShare: (product: ProductCatalogItem) => void;
  onOpenDetail: (product: EnrichedProduct) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-4 px-2 md:px-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[100, 80, 110, 90, 70, 95].map((w, i) => (
            <div key={i} className="h-8 rounded-xl bg-surface-card animate-pulse flex-shrink-0" style={{ width: w }} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-surface-card animate-pulse overflow-hidden">
              <div className="aspect-square bg-surface-soft" />
              <div className="p-3 space-y-2">
                <div className="h-2 bg-surface-soft rounded w-1/2" />
                <div className="h-3 bg-surface-soft rounded w-full" />
                <div className="h-3 bg-surface-soft rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (allProducts.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        message="Productcatalogus leeg"
        subMessage="Voer 'node scripts/seed-product-catalog.mjs' uit om visproducten te laden."
      />
    );
  }

  if (products.length === 0 && searchQuery) {
    return (
      <EmptyState
        icon={Search}
        message="Geen producten gevonden"
        subMessage={`Geen resultaten voor "${searchQuery}". Probeer een andere zoekterm.`}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Fish}
        message="Geen producten in deze selectie"
        subMessage="Kies een andere discipline of subcategorie."
      />
    );
  }

  return (
    <div className="space-y-5 px-2 md:px-0">
      {clusters.length > 0 && (
        <ClusterPills clusters={clusters} active={activeCluster} onChange={onClusterChange} />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
            {products.length} product{products.length !== 1 ? 'en' : ''}
            {activeCluster !== 'all' && (
              <span className="text-brand ml-1">
                · {clusters.find((c) => c.key === activeCluster)?.label}
              </span>
            )}
          </p>
          <p className="text-xs text-text-dim">
            Ontdek gear per discipline, categorie en specifieke productgroep.
          </p>
        </div>

        {activeCluster !== 'all' && (
          <button
            onClick={() => onClusterChange('all')}
            className="flex items-center gap-1 text-[9px] font-black text-text-muted uppercase tracking-widest hover:text-brand transition-colors"
          >
            <X className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map((p) => {
          const pid = p.id ?? p.externalId;
          return (
            <ProductCard
              key={pid}
              product={p}
              isLiked={likedIds.has(pid)}
              isSaved={savedIds.has(pid)}
              onAddToGear={onAddToGear}
              onLike={() => onLike(p)}
              onSave={() => onSave(p)}
              onOpenDetail={() => onOpenDetail(p)}
            />
          );
        })}
      </div>

      <p className="text-center text-[9px] text-text-dim font-bold uppercase tracking-widest pb-4">
        Productlinks via affiliate partners
      </p>
    </div>
  );
}

function ClusterPills({
  clusters,
  active,
  onChange,
}: {
  clusters: Array<{ key: string; label: string; count: number; type: string }>;
  active: string;
  onChange: (key: string) => void;
}) {
  const ordered = [
    ...clusters.filter((c) => c.type === 'species'),
    ...clusters.filter((c) => c.type === 'technique'),
    ...clusters.filter((c) => c.type === 'category'),
  ].slice(0, 12);

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      <button
        onClick={() => onChange('all')}
        className={cn(
          'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
          active === 'all'
            ? 'bg-brand text-bg-main border-brand shadow-lg shadow-brand/20'
            : 'bg-surface-card text-text-muted border-border-subtle hover:border-brand/30'
        )}
      >
        Alle
      </button>

      {ordered.map((c) => (
        <button
          key={c.key}
          onClick={() => onChange(c.key)}
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
            active === c.key
              ? 'bg-brand text-bg-main border-brand shadow-lg shadow-brand/20'
              : cn('hover:border-brand/30', CLUSTER_TYPE_COLORS[c.type] || 'bg-surface-card text-text-muted border-border-subtle')
          )}
        >
          {c.label}
          <span
            className={cn(
              'text-[8px] font-black px-1 py-0.5 rounded',
              active === c.key ? 'bg-bg-main/20 text-bg-main' : 'bg-black/10'
            )}
          >
            {c.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function ProductCard({
  product,
  isLiked,
  isSaved,
  onAddToGear,
  onLike,
  onSave,
  onOpenDetail,
}: {
  product: EnrichedProduct;
  isLiked: boolean;
  isSaved: boolean;
  onAddToGear: (product: ProductCatalogItem) => void;
  onLike: () => void;
  onSave: () => void;
  onOpenDetail: () => void;
}) {
  const ratingAvg = product.rating?.average;
  const stars = ratingAvg != null ? Math.round((ratingAvg / 10) * 5 * 2) / 2 : null;

  return (
    <Card
      padding="none"
      className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl overflow-hidden flex flex-col cursor-pointer"
      onClick={onOpenDetail}
    >
      <div className="aspect-square relative overflow-hidden bg-surface-soft">
        {product.imageURL ? (
          <img
            src={product.imageURL}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-dim">
            <Package className="w-10 h-10" />
          </div>
        )}

        {product.price != null && (
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md rounded-lg px-2 py-0.5">
            <span className="text-[10px] font-black text-white">€{product.price.toFixed(2)}</span>
          </div>
        )}

        <div className="absolute top-2 right-2">
          <div className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-[#0000A4] text-white">
            {product.source === 'fishinn' ? 'Fishinn' : 'Bol'}
          </div>
        </div>

        {product.inStock === false && (
          <div className="absolute top-2 left-2 text-[7px] font-black bg-surface/80 text-text-muted px-1.5 py-0.5 rounded">
            Uitverkocht
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        <div>
          {product.brand && (
            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">
              {product.brand}
            </p>
          )}

          <h4 className="text-xs font-bold text-text-primary tracking-tight line-clamp-2">
            {product.name}
          </h4>

          {stars != null && (
            <div className="flex items-center gap-1 mt-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-2.5 h-2.5',
                      i <= Math.floor(stars) ? 'text-brand fill-brand' : 'text-text-dim'
                    )}
                  />
                ))}
              </div>
              {product.rating?.count != null && product.rating.count > 0 && (
                <span className="text-[8px] text-text-dim font-bold">({product.rating.count})</span>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="neutral" className="text-[7px] py-0.5 px-1.5 font-black uppercase tracking-widest">
              {SUBCATEGORY_LABELS[product.category ?? 'accessory'] ?? (product.category ?? 'Gear')}
            </Badge>

            {product._mainSection !== 'allround' && (
              <Badge variant="neutral" className="text-[7px] py-0.5 px-1.5 font-black uppercase tracking-widest">
                {product._mainSection}
              </Badge>
            )}

            {product._subSubCategory !== 'all' && (
              <Badge variant="neutral" className="text-[7px] py-0.5 px-1.5 font-black uppercase tracking-widest">
                {SUBSUB_LABELS_TAX[product._subSubCategory] ?? product._subSubCategory}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Like */}
          <button
            onClick={onLike}
            title={isLiked ? 'Unlike' : 'Like'}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all border flex-shrink-0',
              isLiked
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-surface-soft text-text-muted border-border-subtle hover:text-red-400 hover:border-red-500/20'
            )}
          >
            <Heart className={cn('w-3 h-3', isLiked && 'fill-current')} />
          </button>

          {/* Save / wishlist */}
          <button
            onClick={onSave}
            title={isSaved ? 'Verwijder uit wishlist' : 'Voeg toe aan wishlist'}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all border flex-shrink-0',
              isSaved
                ? 'bg-brand/10 text-brand border-brand/20'
                : 'bg-surface-soft text-text-muted border-border-subtle hover:text-brand hover:border-brand/20'
            )}
          >
            <Bookmark className={cn('w-3 h-3', isSaved && 'fill-current')} />
          </button>

          {/* Add to Mijn Gear */}
          <button
            onClick={() => onAddToGear(product)}
            title="Voeg toe aan Mijn Gear"
            className="w-8 h-8 rounded-xl bg-brand/10 text-brand hover:bg-brand hover:text-bg-main flex items-center justify-center transition-all border border-brand/20 hover:border-brand flex-shrink-0"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center items-center py-16 text-text-muted">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
  subMessage,
  children,
}: {
  icon: React.ElementType;
  message: string;
  subMessage: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-surface-soft flex items-center justify-center text-text-dim mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-text-primary mb-1">{message}</h3>
      <p className="text-sm text-text-muted max-w-xs">{subMessage}</p>
      {children}
    </div>
  );
}
