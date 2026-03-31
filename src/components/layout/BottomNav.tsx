import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Fish, 
  Trophy, 
  User,
  Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { QuickActionMenu } from './QuickActionMenu';

const bottomNavItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/' },
  { icon: Fish, label: 'Logboek', path: '/catches' },
  { icon: Trophy, label: 'Rankings', path: '/rankings' },
  { icon: User, label: 'Profiel', path: '/profile' },
];

export const BottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-surface/90 backdrop-blur-2xl border-t border-border-subtle px-4 flex items-center justify-around z-50 pb-2 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
      {/* Left Items */}
      <div className="flex-1 flex justify-around pr-8">
        {bottomNavItems.slice(0, 2).map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-all active:scale-90",
              isActive ? "text-accent" : "text-text-muted hover:text-text-primary"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-300",
                  isActive ? "bg-accent/10 shadow-premium-accent/10 shadow-md" : "bg-transparent"
                )}>
                  <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                </div>
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-wider transition-colors",
                  isActive ? "text-accent" : "text-text-muted"
                )}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
 
      {/* Central Quick Action */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6">
        <div className="p-1 bg-surface rounded-[1.75rem] shadow-premium">
          <QuickActionMenu />
        </div>
      </div>
 
      {/* Right Items */}
      <div className="flex-1 flex justify-around pl-8">
        {bottomNavItems.slice(2, 4).map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-all active:scale-90",
              isActive ? "text-accent" : "text-text-muted hover:text-text-primary"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-300",
                  isActive ? "bg-accent/10 shadow-premium-accent/10 shadow-md" : "bg-transparent"
                )}>
                  <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                </div>
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-wider transition-colors",
                  isActive ? "text-accent" : "text-text-muted"
                )}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
