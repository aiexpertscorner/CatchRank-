/**
 * BottomNav.tsx
 *
 * Bottom navigatie balk met correcte safe area afhandeling.
 *
 * Dit is de component die je in Gear.tsx en in je globale app layout
 * gebruikt. De hoogte past zich automatisch aan op:
 *   - iPhone (home indicator)
 *   - Android gesture nav
 *   - Oudere toestellen zonder safe area
 *
 * CSS custom property --nav-total-height wordt hier ook gezet
 * zodat BottomSheet.tsx die kan uitlezen.
 */

import React, { useEffect } from 'react';
import { cn } from '../../lib/utils';

/* ==========================================================================
   Types
   ========================================================================== */

export interface NavItem {
  id:      string;
  label:   string;
  icon:    React.ElementType;
  badge?:  number; // rode badge (bijv. shopping list count)
}

interface BottomNavProps {
  items:     NavItem[];
  activeId:  string;
  onChange:  (id: string) => void;
  className?: string;
}

/* ==========================================================================
   Component
   ========================================================================== */

export function BottomNav({
  items,
  activeId,
  onChange,
  className,
}: BottomNavProps) {
  // Zet de CSS custom property op :root zodat BottomSheet.tsx
  // de correcte hoogte kan uitlezen via var(--nav-total-height).
  // We meten de werkelijke hoogte NA render.
  useEffect(() => {
    const el = document.getElementById('bottom-nav-root');
    if (!el) return;

    const update = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--nav-total-height', `${h}px`);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <nav
      id="bottom-nav-root"
      className={cn(
        // Vaste positie onderaan
        'fixed bottom-0 inset-x-0 z-30',
        // Achtergrond + blur
        'bg-surface-card/95 backdrop-blur-md',
        // Bovenste rand
        'border-t border-border-subtle',
        className
      )}
      style={{
        // Padding onderaan = safe area (home indicator / gesture bar)
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex max-w-lg mx-auto px-2">
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1',
                // Hoogte van de zichtbare hit area
                'py-3 min-h-[52px]',
                'transition-all',
                active ? 'text-brand' : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {/* Icon container — pill indicator wanneer actief */}
              <div className={cn(
                'relative w-10 h-7 rounded-xl flex items-center justify-center transition-all',
                active ? 'bg-brand/15' : ''
              )}>
                <item.icon
                  className={cn('w-4 h-4 transition-all', active && 'stroke-[2.5]')}
                />

                {/* Badge */}
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={cn(
                'text-[9px] font-black uppercase tracking-widest transition-all',
                active ? 'text-brand' : 'text-text-dim'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
