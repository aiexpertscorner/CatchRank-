import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Fish, 
  MapPin, 
  History, 
  BarChart3, 
  Trophy, 
  Users, 
  Wrench,
  BookOpen,
  User,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import Logo from '../Logo';
import { useAuth } from '../../App';
import { Button } from '../ui/Base';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Fish, label: 'Logboek', path: '/catches' },
  { icon: MessageSquare, label: 'Vraag Dick', path: '/ask-dick' },
  { icon: History, label: 'Sessies', path: '/sessions' },
  { icon: MapPin, label: 'Stekken', path: '/spots' },
  { icon: BarChart3, label: 'Statistieken', path: '/stats' },
  { icon: Trophy, label: 'Rankings', path: '/rankings' },
  { icon: Users, label: 'Community', path: '/clubs' },
  { icon: ShoppingBag, label: 'Mijn Gear', path: '/gear' },
  { icon: Wrench, label: 'Tools', path: '/tools' },
  { icon: BookOpen, label: 'Kennis', path: '/knowledge' },
];

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { profile, logout } = useAuth();

  return (
    <aside className={cn(
      "hidden md:flex flex-col h-screen bg-surface border-r border-border-subtle transition-all duration-300 ease-in-out sticky top-0 z-40",
      isCollapsed ? "w-24" : "w-72"
    )}>
      {/* Header */}
      <div className={cn("p-6 flex items-center justify-between relative", isCollapsed && "justify-center")}>
        {!isCollapsed && <Logo size="md" />}
        {isCollapsed && <Logo size="sm" withText={false} />}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface border border-border-subtle rounded-full flex items-center justify-center text-text-muted hover:text-accent hover:border-accent transition-all shadow-sm z-50"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "nav-item relative group transition-all duration-300 h-11",
              isActive ? "bg-accent text-white shadow-premium-accent/20 shadow-md" : "hover:bg-surface-soft text-text-muted hover:text-text-primary",
              isCollapsed && "justify-center px-0"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-text-muted group-hover:text-accent")} />
                {!isCollapsed && <span className="font-bold tracking-tight truncate text-sm">{item.label}</span>}
                {!isCollapsed && isActive && <ChevronRight className="ml-auto w-3.5 h-3.5 opacity-50" />}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-accent text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border-subtle space-y-1.5">
        <NavLink
          to="/profile"
          className={({ isActive }) => cn(
            "nav-item relative group transition-all duration-300 h-11",
            isActive ? "bg-accent text-white shadow-premium-accent/20 shadow-md" : "hover:bg-surface-soft text-text-muted hover:text-text-primary",
            isCollapsed && "justify-center px-0"
          )}
        >
          {({ isActive }) => (
            <>
              <User className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-text-muted group-hover:text-accent")} />
              {!isCollapsed && <span className="font-bold tracking-tight text-sm">Profiel</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-accent text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                  Profiel
                </div>
              )}
            </>
          )}
        </NavLink>
        
        <button
          onClick={logout}
          className={cn(
            "w-full nav-item relative group hover:bg-danger/10 hover:text-danger h-11",
            isCollapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-text-muted group-hover:text-danger" />
          {!isCollapsed && <span className="font-bold tracking-tight text-sm">Uitloggen</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-danger text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
              Uitloggen
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
