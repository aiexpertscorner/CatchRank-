import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Fish, 
  ShoppingBag, 
  User
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { QuickActionMenu } from './QuickActionMenu';

const bottomNavItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/' },
  { icon: Fish, label: 'Logboek', path: '/catches' },
  { icon: ShoppingBag, label: 'Gear', path: '/gear' },
  { icon: User, label: 'Profiel', path: '/profile' },
];

export const BottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-3xl border-t border-border-subtle px-4 flex items-center justify-around z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
      {/* Left Items */}
      <div className="flex-1 flex justify-around pr-8">
        {bottomNavItems.slice(0, 2).map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-all active:scale-90 relative py-1",
              isActive ? "text-primary" : "text-text-muted hover:text-text-primary"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-500",
                  isActive ? "bg-primary/10 shadow-inner" : "bg-transparent"
                )}>
                  <item.icon className={cn("w-5 h-5 transition-all duration-300", isActive ? "scale-110 text-primary" : "scale-100")} />
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-[0.12em] transition-colors",
                  isActive ? "text-primary" : "text-text-muted"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator"
                    className="absolute -top-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(244,194,13,0.5)]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
 
      {/* Central Quick Action - Premium Floating Dock */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6">
        <div className="relative">
          {/* Outer Glow/Ring */}
          <div className="absolute inset-0 -m-1.5 bg-primary/5 rounded-[2rem] blur-lg animate-pulse" />
          
          <div className="p-1.5 bg-surface rounded-[1.75rem] shadow-[0_12px_30px_rgba(0,0,0,0.3)] border border-border-subtle relative z-10">
            <QuickActionMenu />
          </div>
        </div>
      </div>
 
      {/* Right Items */}
      <div className="flex-1 flex justify-around pl-8">
        {bottomNavItems.slice(2, 4).map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-all active:scale-90 relative py-1",
              isActive ? "text-primary" : "text-text-muted hover:text-text-primary"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-500",
                  isActive ? "bg-primary/10 shadow-inner" : "bg-transparent"
                )}>
                  <item.icon className={cn("w-5 h-5 transition-all duration-300", isActive ? "scale-110 text-primary" : "scale-100")} />
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-[0.12em] transition-colors",
                  isActive ? "text-primary" : "text-text-muted"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator"
                    className="absolute -top-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(244,194,13,0.5)]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
