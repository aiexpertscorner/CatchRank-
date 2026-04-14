import React, { useState } from 'react';
import { 
  Trophy, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Globe, 
  Lock, 
  TrendingUp, 
  MessageSquare, 
  Calendar, 
  Fish, 
  Zap,
  Shield,
  Star,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../../App';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Clubs Screen
 * Part of the 'community' feature module.
 * Manages fishing clubs, discovery, and member interactions.
 */

export default function Clubs() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-clubs' | 'discover'>('my-clubs');
  const [searchQuery, setSearchQuery] = useState('');

  // Clubs Firestore integration is in development — empty for production launch
  const [myClubs] = useState<any[]>([]);
  const [discoverClubs] = useState<any[]>([]);

  const tabs = [
    { id: 'my-clubs', label: 'Mijn Clubs', icon: Shield },
    { id: 'discover', label: 'Ontdekken', icon: Globe },
  ] as const;

  return (
    <PageLayout>
      <PageHeader 
        title="Vis Clubs" 
        subtitle="Sluit je aan bij een community"
        actions={
          <Button 
            icon={<Plus className="w-4 h-4" />} 
            className="rounded-xl h-11 px-6 font-bold shadow-premium-accent"
          >
            Club Oprichting
          </Button>
        }
      />

      <div className="space-y-8 pb-nav-pad">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border-subtle overflow-x-auto no-scrollbar mx-2 md:mx-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-brand text-bg-main shadow-lg shadow-brand/20' 
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <section className="px-2 md:px-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text"
              placeholder="Zoek clubs op naam of interesse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-card border border-border-subtle rounded-xl pl-12 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all"
            />
          </div>
        </section>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 px-2 md:px-0"
          >
            {(activeTab === 'my-clubs' ? myClubs : discoverClubs).map((club) => (
              <Card 
                key={club.id} 
                className="p-6 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group cursor-pointer overflow-hidden relative"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5 flex-1">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border border-border-subtle flex-shrink-0 relative">
                      <img src={club.photo} alt={club.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      {club.isPrivate && (
                        <div className="absolute top-1 right-1 p-1 bg-black/40 backdrop-blur-md rounded-lg">
                          <Lock className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold text-text-primary tracking-tight group-hover:text-brand transition-colors truncate">{club.name}</h4>
                        {'role' in club && (
                          <Badge variant="accent" className="text-[7px] py-0.5 px-1.5 font-black uppercase tracking-widest">{club.role}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary font-medium line-clamp-1">{club.description}</p>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          <Users className="w-3.5 h-3.5 text-brand" />
                          {club.memberCount} leden
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          <Fish className="w-3.5 h-3.5 text-brand" />
                          {club.totalCatches} vangsten
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex -space-x-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-surface-card overflow-hidden bg-surface-soft">
                          <img src={`https://picsum.photos/seed/user${i + 10}/100/100`} alt="Member" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full border-2 border-surface-card bg-surface-soft flex items-center justify-center text-[8px] font-black text-text-muted">+{club.memberCount - 3}</div>
                    </div>
                    <Button variant={activeTab === 'discover' ? 'primary' : 'secondary'} size="sm" className="h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-widest">
                      {activeTab === 'discover' ? 'Lid Worden' : 'Bekijk Club'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {activeTab === 'discover' && discoverClubs.length === 0 && (
              <Card className="p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl">
                <Trophy className="w-12 h-12 text-brand/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2 text-text-primary">Geen nieuwe clubs gevonden</h3>
                <p className="text-sm text-text-secondary mb-6">Probeer een andere zoekterm of richt zelf een club op.</p>
                <Button>Club Oprichting</Button>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Global Club Ranking Mini */}
        <section className="space-y-4 px-2 md:px-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Top Clubs</h3>
            <Button variant="ghost" size="sm" className="text-brand font-black text-[10px] uppercase tracking-widest">Alles</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Snoekbaars Elite', xp: 124500, trend: '+12%' },
              { name: 'Karper Kanjers', xp: 98200, trend: '+5%' },
              { name: 'Streetfishing Ams', xp: 85400, trend: '+18%' },
            ].map((c, i) => (
              <Card key={i} className="p-4 border border-border-subtle bg-surface-card rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand font-black text-xs">{i + 1}</div>
                  <div>
                    <p className="text-sm font-bold text-text-primary truncate max-w-[120px]">{c.name}</p>
                    <p className="text-[9px] font-black text-brand uppercase tracking-widest">{c.xp.toLocaleString()} XP</p>
                  </div>
                </div>
                <div className="text-success text-[10px] font-black">{c.trend}</div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
