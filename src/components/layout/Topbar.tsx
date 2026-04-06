import React, { useMemo, useState } from 'react';
import {
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Trophy,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../App';
import Logo from '../Logo';
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

  const avatarSrc = useMemo(() => {
    return (
      profile?.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.displayName || 'User')}&background=111827&color=ffffff`
    );
  }, [profile?.photoURL, profile?.displayName]);

  return (
    <header className="sticky top-0 z-50 h-20 border-b border-border-subtle bg-surface/95 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/85">
      {/* MOBILE */}
      <div className="relative flex h-full items-center px-4 md:hidden">
        {/* Left: Logo zone with same visual footprint as right controls */}
        <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.04] bg-surface-soft/80 shadow-[0_4px_20px_rgba(0,0,0,0.18)]">
            <Logo size="lg" withText={false} />
          </div>
        </div>

        {/* Center: Premium subtle bell */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto">
            <button
              className="group relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.05] bg-surface-soft/72 shadow-[0_4px_18px_rgba(0,0,0,0.14)] transition-all duration-200 active:scale-95"
              aria-label="Meldingen"
              type="button"
            >
              <Bell className="h-[18px] w-[18px] text-text-secondary transition-colors duration-200 group-hover:text-text-primary" />
              <span className="absolute right-[11px] top-[10px] h-2 w-2 rounded-full border border-surface bg-danger shadow-[0_0_0_2px_rgba(17,24,39,0.65)]" />
            </button>
          </div>
        </div>

        {/* Right controls */}
        <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen((v) => !v)}
              className="group flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.04] bg-surface-soft/80 p-0.5 shadow-[0_4px_20px_rgba(0,0,0,0.18)] transition-all duration-200 active:scale-95"
              aria-label="Profielmenu"
              type="button"
            >
              <div className="relative">
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="h-9 w-9 rounded-xl border border-brand/10 object-cover shadow-sm"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-success shadow-sm" />
              </div>
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
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl"
                  >
                    <div className="border-b border-border-subtle bg-surface-soft/50 p-6">
                      <div className="mb-6 flex items-center gap-4">
                        <img
                          src={avatarSrc}
                          alt="Profile"
                          className="h-14 w-14 rounded-2xl border-2 border-white shadow-premium object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate tracking-tight font-black text-text-primary">
                            {profile?.displayName || 'Gebruiker'}
                          </p>
                          <p className="truncate text-xs font-medium text-text-muted">
                            {profile?.email || 'Geen e-mail'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-accent/10 bg-accent/10 p-3 text-center">
                          <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-accent">
                            XP
                          </p>
                          <p className="text-base font-black text-accent">
                            {profile?.xp?.toLocaleString?.() ?? 0}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-warning/10 bg-warning/10 p-3 text-center">
                          <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-warning">
                            Rank
                          </p>
                          <p className="text-base font-black text-warning">#12</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-surface-soft"
                        type="button"
                      >
                        <User className="h-4 w-4" />
                        Mijn Profiel
                      </button>

                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-surface-soft"
                        type="button"
                      >
                        <Settings className="h-4 w-4" />
                        Instellingen
                      </button>

                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-surface-soft"
                        type="button"
                      >
                        <Trophy className="h-4 w-4" />
                        Prestaties
                      </button>

                      <div className="mx-2 my-2 h-px bg-border-subtle" />

                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-danger-soft hover:text-danger"
                        type="button"
                      >
                        <LogOut className="h-4 w-4" />
                        Uitloggen
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Menu */}
          <button
            onClick={onMenuClick}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.04] bg-surface-soft/80 shadow-[0_4px_20px_rgba(0,0,0,0.18)] transition-all duration-200 active:scale-95"
            aria-label={isMenuOpen ? 'Sluit menu' : 'Open menu'}
            type="button"
          >
            {isMenuOpen ? (
              <X className="h-[22px] w-[22px] text-text-primary" />
            ) : (
              <Menu className="h-[22px] w-[22px] text-text-primary" />
            )}
          </button>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden h-full items-center justify-between gap-6 px-8 md:flex">
        {/* Search */}
        <div
          className={cn(
            'flex w-full max-w-md items-center gap-3 rounded-2xl border bg-surface-soft px-5 py-3 transition-all duration-300',
            isSearchFocused ? 'border-accent ring-2 ring-accent/10' : 'border-border-subtle'
          )}
        >
          <Search
            className={cn(
              'h-5 w-5 transition-colors',
              isSearchFocused ? 'text-accent' : 'text-text-muted'
            )}
          />
          <input
            type="text"
            placeholder="Zoek vangsten, sessies of vissers..."
            className="w-full border-none bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-muted/60"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          <div className="hidden items-center gap-1 rounded-lg border border-border-subtle bg-surface px-2 py-1 text-[9px] font-black uppercase tracking-widest text-text-muted lg:flex">
            <span className="opacity-50"></span>K
          </div>
        </div>

        {/* Active session */}
        <div className="flex-shrink-0">
          <ActiveSessionHeader />
        </div>

        {/* Desktop right */}
        <div className="flex flex-shrink-0 items-center gap-4">
          <QuickActionMenu className="scale-90" />

          <button
            className="group relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.05] bg-surface-soft/75 shadow-[0_4px_18px_rgba(0,0,0,0.12)] transition-all duration-200 active:scale-95"
            aria-label="Meldingen"
            type="button"
          >
            <Bell className="h-[18px] w-[18px] text-text-secondary transition-colors duration-200 group-hover:text-text-primary" />
            <span className="absolute right-[11px] top-[10px] h-2 w-2 rounded-full border border-surface bg-danger shadow-[0_0_0_2px_rgba(17,24,39,0.55)]" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen((v) => !v)}
              className="group flex items-center gap-2 rounded-2xl border border-white/[0.04] bg-surface-soft/80 p-0.5 pr-2 shadow-[0_4px_20px_rgba(0,0,0,0.16)] transition-all duration-200 active:scale-95"
              aria-label="Profielmenu"
              type="button"
            >
              <div className="relative">
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="h-9 w-9 rounded-xl border border-brand/10 object-cover shadow-sm"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-success shadow-sm" />
              </div>

              <ChevronDown
                className={cn(
                  'h-4 w-4 text-text-muted transition-transform duration-300',
                  isProfileOpen && 'rotate-180'
                )}
              />
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
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl"
                  >
                    <div className="border-b border-border-subtle bg-surface-soft/50 p-6">
                      <div className="mb-6 flex items-center gap-4">
                        <img
                          src={avatarSrc}
                          alt="Profile"
                          className="h-14 w-14 rounded-2xl border-2 border-white shadow-premium object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate tracking-tight font-black text-text-primary">
                            {profile?.displayName || 'Gebruiker'}
                          </p>
                          <p className="truncate text-xs font-medium text-text-muted">
                            {profile?.email || 'Geen e-mail'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-accent/10 bg-accent/10 p-3 text-center">
                          <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-accent">
                            XP
                          </p>
                          <p className="text-base font-black text-accent">
                            {profile?.xp?.toLocaleString?.() ?? 0}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-warning/10 bg-warning/10 p-3 text-center">
                          <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-warning">
                            Rank
                          </p>
                          <p className="text-base font-black text-warning">#12</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-surface-soft"
                        type="button"
                      >
                        <User className="h-4 w-4" />
                        Mijn Profiel
                      </button>

                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-surface-soft"
                        type="button"
                      >
                        <Settings className="h-4 w-4" />
                        Instellingen
                      </button>

                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-surface-soft"
                        type="button"
                      >
                        <Trophy className="h-4 w-4" />
                        Prestaties
                      </button>

                      <div className="mx-2 my-2 h-px bg-border-subtle" />

                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-danger-soft hover:text-danger"
                        type="button"
                      >
                        <LogOut className="h-4 w-4" />
                        Uitloggen
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};