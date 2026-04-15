import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { X, Menu } from 'lucide-react';
import Logo from '../Logo';
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
  LogOut
} from 'lucide-react';
import { useAuth } from '../../App';

const mobileNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Fish, label: 'Logboek', path: '/catches' },
  { icon: History, label: 'Sessies', path: '/sessions' },
  { icon: MapPin, label: 'Stekken', path: '/spots' },
  { icon: BarChart3, label: 'Statistieken', path: '/stats' },
  { icon: Trophy, label: 'Rankings', path: '/rankings' },
  { icon: Users, label: 'Community', path: '/clubs' },
  { icon: Wrench, label: 'Tools', path: '/tools' },
  { icon: BookOpen, label: 'Kennis', path: '/knowledge' },
  { icon: User, label: 'Profiel', path: '/profile' },
];

export const AppShell: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-bg-main flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <Topbar 
          onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          isMenuOpen={isMobileMenuOpen} 
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-nav-pad md:pb-10">
          <div className="page-container p-4 md:p-8 lg:p-10">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>

      {/* Mobile Sidebar Overlay Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[80%] max-w-xs bg-surface z-[70] md:hidden flex flex-col p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-10">
                <Logo size="md" />
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-surface-soft rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-1.5 overflow-y-auto">
                {mobileNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "nav-item relative group",
                      isActive && "nav-item-active"
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-text-muted")} />
                        <span className="font-bold tracking-tight">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              <div className="mt-auto pt-6 border-t border-border-subtle">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-text-secondary hover:bg-danger-soft hover:text-danger transition-all font-bold"
                >
                  <LogOut className="w-5 h-5" />
                  Uitloggen
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
