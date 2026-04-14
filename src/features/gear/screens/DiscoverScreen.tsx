/**
 * DiscoverScreen.tsx
 *
 * Volledig zelfstandig Ontdekken scherm.
 * Haalt likedIds/savedIds uit GearContext (gedeeld met Wishlist).
 * Alle product-specifieke state (pagina, sectie, zoekterm) is lokaal.
 */

import React, { useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useGearContext } from '../context/GearContext';
import { DiscoverTab } from '../components/DiscoverTab';
import { ProductDetailSheet } from '../components/ProductDetailSheet';
import { useState } from 'react';
import type { ProductCatalogItem } from '../../../types';

export function DiscoverScreen() {
  const {
    myGear, setupsV2,
    likedIds, savedIds,
    handleLike, handleSave, handleShare, handleAddToGear,
    loadInteractions,
  } = useGearContext();

  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Laad interactions zodra dit scherm actief wordt
  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  return (
    <div className="space-y-4 pb-nav-pad">
      <DiscoverTab
        userSetups={setupsV2}
        tackleboxItems={myGear as any}
        likedIds={likedIds}
        savedIds={savedIds}
        onLike={handleLike}
        onSave={handleSave}
        onShare={handleShare}
        onAddToGear={handleAddToGear}
        onOpenDetail={setSelectedProduct}
      />

      <ProductDetailSheet
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        isLiked={selectedProduct ? likedIds.has(selectedProduct.id ?? selectedProduct.externalId) : false}
        isSaved={selectedProduct ? savedIds.has(selectedProduct.id ?? selectedProduct.externalId) : false}
        onLike={() => selectedProduct && handleLike(selectedProduct)}
        onSave={() => selectedProduct && handleSave(selectedProduct)}
        onShare={() => selectedProduct && handleShare(selectedProduct)}
        onAddToGear={(p: ProductCatalogItem) => { handleAddToGear(p); setSelectedProduct(null); }}
      />
    </div>
  );
}
