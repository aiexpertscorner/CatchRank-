/**
 * Gear.tsx — navigatie-shell (v2)
 * Locatie: src/features/gear/screens/Gear.tsx
 */

import { useState } from 'react';
import { Layers, Package, ShoppingBag } from 'lucide-react';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { GearProvider } from '../context/GearContext';
import { SetupCoachScreen } from './SetupCoachScreen';
import { TackleboxScreen } from './TackleboxScreen';
import { DiscoverScreen } from './DiscoverScreen';
import { cn } from '../../../lib/utils';

type Screen = 'setup-coach' | 'tacklebox' | 'discover';

const NAV_ITEMS = [
  { id: 'setup-coach' as Screen, label: 'Setup Coach', icon: Layers      },
  { id: 'tacklebox'   as Screen, label: 'Tacklebox',   icon: Package     },
  { id: 'discover'    as Screen, label: 'Ontdekken',   icon: ShoppingBag },
];

const SCREEN_TITLES: Record<Screen, { title: string; subtitle: string }> = {
  'setup-coach': { title: 'Setup Coach',    subtitle: 'Sessie setups, checklist en advies' },
  'tacklebox':   { title: 'Mijn Tacklebox', subtitle: 'Gear, favorieten en wishlist'        },
  'discover':    { title: 'Ontdekken',      subtitle: 'Vind passende producten'             },
};

export default function Gear() {
  const [activeScreen, setActiveScreen] = useState<Screen>('setup-coach');
  const { title, subtitle } = SCREEN_TITLES[activeScreen];

  return (
    <GearProvider>
      <PageLayout>
        <PageHeader title={title} subtitle={subtitle} />

        {/* Inline pill tab bar — NOT fixed, flows as part of page content */}
        <div className="flex gap-1.5 px-2 mb-5 mt-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveScreen(item.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl',
                'text-[11px] font-black uppercase tracking-widest transition-all active:scale-95',
                activeScreen === item.id
                  ? 'bg-accent text-bg-main shadow-accent'
                  : 'bg-surface-soft text-text-muted hover:text-text-primary border border-border-subtle'
              )}
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="px-2 md:px-0">
          {activeScreen === 'setup-coach' && <SetupCoachScreen />}
          {activeScreen === 'tacklebox'   && <TackleboxScreen />}
          {activeScreen === 'discover'    && <DiscoverScreen />}
        </div>
      </PageLayout>
    </GearProvider>
  );
}
