import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Fish,
  Trophy,
  User,
  History,
  MapPin
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { QuickActionMenu } from './QuickActionMenu';

const leftNavItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/' },
  { icon: Fish, label: 'Logboek', path: '/catches' },
  { icon: History, label: 'Sessies', path: '/sessions' },
];

const rightNavItems = [
  { icon: MapPin,   label: 'Stekken',  path: '/spots' },
  { icon: Trophy,   label: 'Rankings', path: '/rankings' },
  { icon: User,     label: 'Profiel',  path: '/profile' },
];

function NavItem({ icon: Icon, label, path }: { icon: React.ElementType; label: string; path: string }) {
  return (
    <NavLink
      to={path}
      end={path === '/'}
      className={({ isActive }) => cn(
        'flex flex-col items-center gap-0.5 transition-all active:scale-90 relative py-1 min-w-0',
        isActive ? 'text-accent' : 'text-text-muted hover:text-text-primary'
      )}
    >
      {({ isActive }) => (
        <>
          <div className={cn(
            'p-1 rounded-xl transition-all duration-300',
            isActive ? 'bg-accent/10' : 'bg-transparent'
          )}>
            <Icon className={cn('w-5 h-5 transition-all duration-300', isActive ? 'scale-110 text-accent' : 'scale-100')} />
          </div>
          <span className={cn(
            'text-[9px] font-black uppercase tracking-[0.1em] transition-colors leading-none',
            isActive ? 'text-accent' : 'text-text-muted'
          )}>
            {label}
          </span>
          {isActive && (
            <motion.div
              layoutId={`nav-indicator-${path}`}
              className="absolute -top-0.5 w-1 h-1 rounded-full bg-accent shadow-[0_0_6px_rgba(244,194,13,0.6)]"
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export const BottomNav: React.FC = () => {
  // Set --nav-total-height CSS variable based on actual rendered height
  // so BottomSheet and other overlays can position themselves correctly.
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
    <nav id="bottom-nav-root" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-3xl border-t border-border-subtle px-2 flex items-center justify-around z-40 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
      {/* Left Items */}
      <div className="flex-1 flex justify-around pr-6">
        {leftNavItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </div>

      {/* Central Quick Action */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-5">
        <div className="relative">
          <div className="absolute inset-0 -m-1 bg-accent/5 rounded-[2rem] blur-lg" />
          <div className="p-1 bg-surface rounded-[1.5rem] shadow-[0_8px_24px_rgba(0,0,0,0.3)] border border-border-subtle/50 relative z-10">
            <QuickActionMenu />
          </div>
        </div>
      </div>

      {/* Right Items */}
      <div className="flex-1 flex justify-around pl-6">
        {rightNavItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </div>
    </nav>
  );
};
