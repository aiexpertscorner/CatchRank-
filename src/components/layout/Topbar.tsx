import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Menu, 
  X, 
  Plus, 
  ChevronDown,
  User,
  Settings,
  LogOut,
  Zap,
  Trophy
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../App';
import Logo from '../Logo';
import { Button, Badge } from '../ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { QuickActionMenu } from './QuickActionMenu';
import { ActiveSessionHeader } from './ActiveSessionHeader';

interface TopbarProps {
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, isMenuOpen }) => {
  const { profile, logout } = useAuth();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="h-20 bg-surface border-b border-border-subtle px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
      {/* Mobile Menu Toggle & Logo */}
      <div className="flex items-center gap-4 md:hidden">
        <button 
          onClick={onMenuClick}
          className="p-2 hover:bg-surface-soft rounded-xl transition-colors"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <Logo size="sm" withText={false} />
      </div>

      {/* Active Session Header (Mobile/Tablet) */}
      <div className="flex md:hidden">
        <ActiveSessionHeader />
      </div>

      {/* Search Bar (Desktop) */}
      <div className={cn(
        "hidden md:flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border transition-all duration-300 w-full max-w-md shadow-sm",
        isSearchFocused ? "border-accent ring-4 ring-accent/5" : "border-border-subtle"
      )}>
        <Search className={cn("w-5 h-5 transition-colors", isSearchFocused ? "text-accent" : "text-text-muted")} />
        <input 
          type="text" 
          placeholder="Zoek vangsten, sessies of vissers..." 
          className="bg-transparent border-none outline-none w-full text-sm font-bold placeholder:text-text-muted/60"
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
        />
        <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-surface border border-border-subtle rounded-lg text-[9px] font-black text-text-muted uppercase tracking-widest">
          <span className="opacity-50">⌘</span>K
        </div>
      </div>

      {/* Active Session Header (Desktop) */}
      <div className="hidden md:flex">
        <ActiveSessionHeader />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Quick Action Button (Desktop) */}
        <div className="hidden md:block">
          <QuickActionMenu className="scale-90" />
        </div>
 
        {/* Notifications */}
        <button className="relative w-10 h-10 flex items-center justify-center hover:bg-surface-soft rounded-xl transition-all group border border-transparent active:scale-95">
          <Bell className="w-5 h-5 text-text-secondary group-hover:text-brand transition-colors" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-danger border-2 border-surface rounded-full shadow-sm"></span>
        </button>
 
        {/* User Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-0.5 hover:bg-surface-soft rounded-2xl transition-all group border border-transparent active:scale-95"
          >
            <div className="relative">
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                alt="Profile" 
                className="w-9 h-9 rounded-xl border-2 border-brand/10 shadow-sm object-cover"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success border-2 border-surface rounded-full shadow-sm"></div>
            </div>
            <ChevronDown className={cn("hidden lg:block w-4 h-4 text-text-muted transition-transform duration-300", isProfileOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsProfileOpen(false)}
                  className="fixed inset-0 z-40"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-3 w-64 bg-surface rounded-2xl shadow-2xl border border-border-subtle overflow-hidden z-50"
                >
                  <div className="p-6 bg-surface-soft/50 border-b border-border-subtle">
                    <div className="flex items-center gap-4 mb-6">
                      <img 
                        src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                        alt="Profile" 
                        className="w-14 h-14 rounded-2xl border-2 border-white shadow-premium"
                      />
                      <div>
                        <p className="font-black text-text-primary tracking-tight">{profile?.displayName}</p>
                        <p className="text-xs font-medium text-text-muted truncate">{profile?.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-accent/10 p-3 rounded-2xl text-center border border-accent/10">
                        <p className="text-[9px] font-black text-accent uppercase tracking-[0.2em] mb-1">XP</p>
                        <p className="text-base font-black text-accent">{profile?.xp.toLocaleString()}</p>
                      </div>
                      <div className="bg-warning/10 p-3 rounded-2xl text-center border border-warning/10">
                        <p className="text-[9px] font-black text-warning uppercase tracking-[0.2em] mb-1">Rank</p>
                        <p className="text-base font-black text-warning">#12</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-soft transition-all text-sm font-semibold text-text-secondary">
                      <User className="w-4 h-4" />
                      Mijn Profiel
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-soft transition-all text-sm font-semibold text-text-secondary">
                      <Settings className="w-4 h-4" />
                      Instellingen
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-soft transition-all text-sm font-semibold text-text-secondary">
                      <Trophy className="w-4 h-4" />
                      Prestaties
                    </button>
                    <div className="h-px bg-border-subtle my-2 mx-2" />
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-danger-soft hover:text-danger transition-all text-sm font-semibold text-text-secondary"
                    >
                      <LogOut className="w-4 h-4" />
                      Uitloggen
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
