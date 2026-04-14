/**
 * Gear.tsx — navigatie-shell (v2)
 *
 * Gebruikt BottomNav component met correcte safe area afhandeling.
 * Pagina-content krijgt pb-safe-nav zodat niets achter de nav verdwijnt.
 */

import React, { useState } from 'react';
import { Layers, Package, ShoppingBag } from 'lucide-react';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { BottomNav, NavItem } from '../../../components/ui/BottomNav';
import { cn } from '../../../lib/utils';

import { GearProvider } from './context/GearContext';
import { SetupCoachScreen } from './screens/SetupCoachScreen';
import { TackleboxScreen } from './screens/TackleboxScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';

/* ==========================================================================
   Navigation config
   ========================================================================== */

type Screen = 'setup-coach' | 'tacklebox' | 'discover';

const NAV_ITEMS: NavItem[] = [
  { id: 'setup-coach', label: 'Setup Coach', icon: Layers      },
  { id: 'tacklebox',   label: 'Tacklebox',   icon: Package     },
  { id: 'discover',    label: 'Ontdekken',   icon: ShoppingBag },
];

const SCREEN_TITLES: Record<Screen, { title: string; subtitle: string }> = {
  'setup-coach': { title: 'Setup Coach',    subtitle: 'Sessie setups, checklist en advies' },
  'tacklebox':   { title: 'Mijn Tacklebox', subtitle: 'Gear, favorieten en wishlist'        },
  'discover':    { title: 'Ontdekken',      subtitle: 'Vind passende producten'              },
};

/* ==========================================================================
   Component
   ========================================================================== */

export default function Gear() {
  const [activeScreen, setActiveScreen] = useState<Screen>('setup-coach');
  const { title, subtitle } = SCREEN_TITLES[activeScreen];

  return (
    <GearProvider>
      <PageLayout>
        <PageHeader title={title} subtitle={subtitle} />

        {/* Pagina-content: pb-safe-nav zorgt dat niets achter de nav verdwijnt */}
        <div className="px-2 md:px-0 pb-safe-nav">
          {activeScreen === 'setup-coach' && <SetupCoachScreen />}
          {activeScreen === 'tacklebox'   && <TackleboxScreen />}
          {activeScreen === 'discover'    && <DiscoverScreen />}
        </div>

        {/* Bottom nav — hoogte wordt via JS doorgegeven als CSS custom property */}
        <BottomNav
          items={NAV_ITEMS}
          activeId={activeScreen}
          onChange={(id) => setActiveScreen(id as Screen)}
        />
      </PageLayout>
    </GearProvider>
  );
}
