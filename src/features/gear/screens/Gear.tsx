import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  ShoppingBag, 
  Star, 
  Zap, 
  Trophy,
  Package,
  ExternalLink,
  Tag,
  Layers,
  Settings as SettingsIcon,
  Grid,
  List as ListIcon,
  Heart,
  MoreVertical,
  Edit2,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../../App';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

/**
 * Gear Screen (Mijn Vista / Gear)
 * Part of the 'gear' feature module.
 * Manages user fishing equipment, favorites, and setups.
 * Includes affiliate product discovery.
 */

export default function Gear() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-gear' | 'setups' | 'discover'>('my-gear');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock Data for Gear
  const [myGear, setMyGear] = useState([
    { id: '1', name: 'Sustain FJ 2500', brand: 'Shimano', category: 'Reels', isFavorite: true, photoURL: 'https://picsum.photos/seed/reel/400/400' },
    { id: '2', name: 'Zodias 7\'0" ML', brand: 'Shimano', category: 'Rods', isFavorite: true, photoURL: 'https://picsum.photos/seed/rod/400/400' },
    { id: '3', name: 'Kairiki 8 Steel Grey', brand: 'Shimano', category: 'Lines', isFavorite: false, photoURL: 'https://picsum.photos/seed/line/400/400' },
    { id: '4', name: 'Shadow Rap Deep', brand: 'Rapala', category: 'Lures', isFavorite: false, photoURL: 'https://picsum.photos/seed/lure/400/400' },
  ]);

  const [setups, setSetups] = useState([
    { id: '1', name: 'Lichte Baars Setup', rod: 'Zodias ML', reel: 'Sustain 2500', line: 'Kairiki 0.10mm', catches: 42 },
    { id: '2', name: 'Snoekbaars Verticalen', rod: 'Yasei BB', reel: 'Stradic 2500', line: 'Kairiki 0.13mm', catches: 18 },
  ]);

  const [discoverProducts, setDiscoverProducts] = useState([
    { id: 'd1', name: 'Stradic FM', brand: 'Shimano', price: '€159,00', store: 'Fishinn', img: 'https://picsum.photos/seed/stradic/400/400' },
    { id: 'd2', name: 'Westin Swim 12cm', brand: 'Westin', price: '€14,95', store: 'Bol.com', img: 'https://picsum.photos/seed/westin/400/400' },
    { id: 'd3', name: 'BKK Fangs BT-663', brand: 'BKK', price: '€8,50', store: 'Fishinn', img: 'https://picsum.photos/seed/hooks/400/400' },
  ]);

  const tabs = [
    { id: 'my-gear', label: 'Mijn Gear', icon: Package },
    { id: 'setups', label: 'Setups', icon: Layers },
    { id: 'discover', label: 'Ontdekken', icon: ShoppingBag },
  ] as const;

  const filteredGear = myGear.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout>
      <PageHeader 
        title="Mijn Vista" 
        subtitle="Beheer je gear en ontdek nieuwe items"
        actions={
          <Button 
            icon={<Plus className="w-4 h-4" />} 
            className="rounded-xl h-11 px-6 font-bold shadow-premium-accent"
          >
            Item Toevoegen
          </Button>
        }
      />

      <div className="space-y-8 pb-32">
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
        {activeTab !== 'discover' && (
          <section className="flex flex-col md:flex-row gap-4 px-2 md:px-0">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text"
                placeholder="Zoek in je gear..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-card border border-border-subtle rounded-xl pl-12 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all"
              />
            </div>
            <div className="flex bg-surface-card border border-border-subtle rounded-xl p-1">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand text-bg-main' : 'text-text-muted'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand text-bg-main' : 'text-text-muted'}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'my-gear' && (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-2 md:px-0" 
                : "space-y-3 px-2 md:px-0"
              }>
                {filteredGear.map((g) => (
                  <Card 
                    key={g.id} 
                    padding="none" 
                    hoverable 
                    className={`group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl overflow-hidden flex flex-col ${viewMode === 'list' ? 'flex-row h-24' : 'h-full'}`}
                  >
                    <div className={`${viewMode === 'grid' ? 'aspect-square' : 'w-24 h-full'} relative overflow-hidden bg-surface-soft`}>
                      <img src={g.photoURL} alt={g.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      {g.isFavorite && (
                        <div className="absolute top-2 right-2">
                          <div className="w-6 h-6 rounded-lg bg-brand text-bg-main flex items-center justify-center shadow-lg">
                            <Star className="w-3 h-3 fill-current" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">{g.brand}</p>
                        <h4 className="text-sm font-bold text-text-primary tracking-tight truncate">{g.name}</h4>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="secondary" className="text-[7px] py-0.5 px-1.5 font-black uppercase tracking-widest">{g.category}</Badge>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-text-muted hover:text-brand"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button className="text-text-muted hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                <button className={`rounded-2xl border-2 border-dashed border-border-subtle flex flex-col items-center justify-center gap-3 text-text-muted hover:text-brand hover:border-brand transition-all bg-surface-soft/20 group ${viewMode === 'grid' ? 'aspect-square' : 'h-24 w-full flex-row'}`}>
                  <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Voeg Gear Toe</span>
                </button>
              </div>
            )}

            {activeTab === 'setups' && (
              <div className="space-y-4 px-2 md:px-0">
                {setups.map((s) => (
                  <Card key={s.id} className="p-6 border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                            <Layers className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-text-primary tracking-tight group-hover:text-brand transition-colors">{s.name}</h4>
                            <p className="text-xs text-text-muted font-medium">Gekoppeld aan {s.catches} vangsten</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-bg-main/50 p-3 rounded-xl border border-border-subtle">
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Hengel</p>
                            <p className="text-xs font-bold text-text-primary truncate">{s.rod}</p>
                          </div>
                          <div className="bg-bg-main/50 p-3 rounded-xl border border-border-subtle">
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Molen</p>
                            <p className="text-xs font-bold text-text-primary truncate">{s.reel}</p>
                          </div>
                          <div className="bg-bg-main/50 p-3 rounded-xl border border-border-subtle">
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Lijn</p>
                            <p className="text-xs font-bold text-text-primary truncate">{s.line}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" className="h-10 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest">Wijzig</Button>
                        <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl p-0"><Trash2 className="w-4 h-4 text-text-muted hover:text-danger" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="secondary" className="w-full py-6 rounded-2xl border-dashed border-2 border-border-subtle bg-surface-soft/10 text-text-muted hover:text-brand hover:border-brand hover:bg-brand/5 transition-all">
                  <Plus className="w-5 h-5 mr-2" />
                  Nieuwe Setup Samenstellen
                </Button>
              </div>
            )}

            {activeTab === 'discover' && (
              <div className="space-y-8 px-2 md:px-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Aanbevolen voor jou</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-surface-soft text-text-muted border-none">Fishinn</Badge>
                    <Badge variant="secondary" className="bg-surface-soft text-text-muted border-none">Bol.com</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {discoverProducts.map((p) => (
                    <Card key={p.id} padding="none" className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl overflow-hidden flex flex-col">
                      <div className="aspect-square relative overflow-hidden bg-surface-soft">
                        <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute top-3 right-3">
                          <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:text-danger transition-colors">
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <Badge variant="accent" className="bg-brand text-bg-main border-none font-black">{p.price}</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">{p.brand}</p>
                          <h4 className="text-sm font-bold text-text-primary tracking-tight truncate mb-1">{p.name}</h4>
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-text-dim uppercase tracking-widest">
                            <ShoppingBag className="w-3 h-3" />
                            {p.store}
                          </div>
                        </div>
                        <Button className="w-full mt-4 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest">
                          Bekijk Item
                          <ExternalLink className="w-3 h-3 ml-2" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Affiliate Banner */}
                <Card className="bg-brand/5 border border-brand/20 p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl -mr-32 -mt-32" />
                  <div className="relative z-10 space-y-2 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-text-primary tracking-tight">Upgrade je uitrusting</h3>
                    <p className="text-sm text-text-secondary max-w-md">Ontdek de beste deals bij onze partners en steun CatchRank bij iedere aankoop.</p>
                  </div>
                  <Button className="relative z-10 h-12 px-8 rounded-xl font-bold shadow-premium-accent">
                    Shop bij Fishinn
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}
