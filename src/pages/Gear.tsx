import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Heart, 
  Layers, 
  Search, 
  Filter, 
  ChevronRight, 
  Star, 
  ExternalLink, 
  ShoppingBag,
  Info,
  Zap,
  Trash2,
  Edit2,
  MoreVertical
} from 'lucide-react';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';
import { Button, Card, Badge } from '../components/ui/Base';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Navigation';
import { Input } from '../components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface GearItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  photoURL?: string;
  isFavorite?: boolean;
  rating?: number;
  price?: number;
  affiliateLink?: string;
  store?: 'Fishinn' | 'Bol.com' | 'Other';
}

interface Setup {
  id: string;
  name: string;
  description: string;
  items: GearItem[];
  targetSpecies: string[];
}

const MOCK_GEAR: GearItem[] = [
  { id: '1', name: 'Sustain FJ 2500', brand: 'Shimano', category: 'Reels', type: 'Spinning', photoURL: 'https://picsum.photos/seed/reel/400/400', isFavorite: true, rating: 5 },
  { id: '2', name: 'Zodias 7\'0" MH', brand: 'Shimano', category: 'Rods', type: 'Casting', photoURL: 'https://picsum.photos/seed/rod/400/400', isFavorite: true, rating: 4.8 },
  { id: '3', name: 'Kairiki 8 Steel Grey', brand: 'Shimano', category: 'Lines', type: 'Braided', photoURL: 'https://picsum.photos/seed/line/400/400', rating: 4.5 },
  { id: '4', name: 'Shadow Rap Deep', brand: 'Rapala', category: 'Lures', type: 'Jerkbait', photoURL: 'https://picsum.photos/seed/lure/400/400', rating: 4.9, price: 14.95, store: 'Fishinn', affiliateLink: '#' },
];

const MOCK_SETUPS: Setup[] = [
  { 
    id: 's1', 
    name: 'Snoekbaars Verticalen', 
    description: 'Mijn favoriete setup voor het verticalen op snoekbaars in de winter.',
    items: [MOCK_GEAR[0], MOCK_GEAR[1]],
    targetSpecies: ['Snoekbaars']
  }
];

const CATEGORIES = ['Alle', 'Hengels', 'Molens', 'Lijnen', 'Kunstaas', 'Accessoires'];

export default function Gear() {
  const [activeTab, setActiveTab] = useState('my-gear');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Alle');

  return (
    <PageLayout>
      <PageHeader 
        title="Mijn Vista / Gear"
        subtitle="Beheer je uitrusting, maak setups en ontdek nieuw materiaal."
        badge="Gear Hub"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} className="rounded-xl h-11 px-6 font-bold text-xs shadow-premium-accent">
            Gear Toevoegen
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2 md:px-0">
          <TabsList className="bg-surface-soft/50 p-1 rounded-xl md:rounded-2xl border border-border-subtle/50 w-full md:w-auto">
            <TabsTrigger value="my-gear" className="flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold">Mijn Gear</TabsTrigger>
            <TabsTrigger value="setups" className="flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold">Setups</TabsTrigger>
            <TabsTrigger value="discover" className="flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold">Ontdekken</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input 
                placeholder="Zoek gear..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 md:h-12 rounded-xl md:rounded-2xl border-border-subtle/50 bg-white"
              />
            </div>
            <Button variant="secondary" size="icon" className="rounded-xl md:rounded-2xl h-11 md:h-12 w-11 md:w-12 border-border-subtle/50">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="my-gear" className="space-y-8 px-2 md:px-0">
          {/* Categories Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                  selectedCategory === cat 
                    ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" 
                    : "bg-white text-text-muted border-border-subtle hover:border-accent/50 hover:text-accent"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {MOCK_GEAR.map((item) => (
              <GearCard key={item.id} item={item} />
            ))}
            <button className="aspect-[4/5] rounded-2xl md:rounded-[2.5rem] border-2 border-dashed border-border-subtle hover:border-accent/50 hover:bg-accent/5 transition-all flex flex-col items-center justify-center gap-3 group">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-surface-soft flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 md:w-8 md:h-8 text-text-muted group-hover:text-accent" />
              </div>
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-text-muted group-hover:text-accent">Nieuwe Gear</span>
            </button>
          </div>
        </TabsContent>

        <TabsContent value="setups" className="space-y-8 px-2 md:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {MOCK_SETUPS.map((setup) => (
              <SetupCard key={setup.id} setup={setup} />
            ))}
            <button className="p-8 md:p-12 rounded-2xl md:rounded-[2.5rem] border-2 border-dashed border-border-subtle hover:border-accent/50 hover:bg-accent/5 transition-all flex flex-col items-center justify-center gap-4 group min-h-[200px]">
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-surface-soft flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="w-8 h-8 md:w-10 md:h-10 text-text-muted group-hover:text-accent" />
              </div>
              <div className="text-center">
                <p className="text-base md:text-lg font-bold text-primary mb-1">Nieuwe Setup Maken</p>
                <p className="text-[10px] md:text-xs font-medium text-text-muted">Combineer je gear voor specifieke visserijen</p>
              </div>
            </button>
          </div>
        </TabsContent>

        <TabsContent value="discover" className="space-y-10 px-2 md:px-0">
          {/* Featured Affiliate Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl md:text-2xl font-bold text-primary tracking-tight">Aanbevolen door Fishinn</h3>
              <Button variant="ghost" size="sm" className="text-accent font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em]">Bekijk alles</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AffiliateCard 
                title="Shimano Vanford C3000"
                price={189.95}
                store="Fishinn"
                image="https://picsum.photos/seed/vanford/600/400"
                description="De ultieme finesse molen voor de veeleisende roofvisser."
                tags={['Roofvis', 'Finesse', 'Topkeuze']}
              />
              <AffiliateCard 
                title="Westin W6 Finesse T&C"
                price={249.00}
                store="Fishinn"
                image="https://picsum.photos/seed/westin/600/400"
                description="Perfecte hengel voor Texas & Carolina rig visserij."
                tags={['Texas Rig', 'Carolina Rig', 'Premium']}
              />
              <AffiliateCard 
                title="BKK Finesse Hooks"
                price={6.95}
                store="Bol.com"
                image="https://picsum.photos/seed/hooks/600/400"
                description="Extreem scherpe haken voor de beste inhaking."
                tags={['Haken', 'Finesse']}
              />
            </div>
          </section>

          {/* Community Inspiration */}
          <section className="space-y-6">
            <h3 className="text-xl md:text-2xl font-bold text-primary tracking-tight">Community Favorieten</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} variant="premium" className="p-4 md:p-6 border-none shadow-sm rounded-2xl md:rounded-[2rem] space-y-4 group cursor-pointer hover:shadow-md transition-all">
                  <div className="aspect-square rounded-xl md:rounded-2xl bg-surface-soft overflow-hidden relative">
                    <img src={`https://picsum.photos/seed/gear-${i}/400/400`} alt="Gear" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-2 right-2">
                      <Badge variant="accent" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest shadow-lg">#1 Populair</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-widest">Shimano</p>
                    <p className="text-sm md:text-base font-bold text-primary truncate tracking-tight">Stradic FM 2500</p>
                    <div className="flex items-center gap-1 text-accent">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-[10px] md:text-xs font-bold">4.9 (124)</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

const GearCard: React.FC<{ item: GearItem }> = ({ item }) => {
  return (
    <Card variant="premium" className="group border-none shadow-sm hover:shadow-premium transition-all duration-500 rounded-2xl md:rounded-[2.5rem] overflow-hidden flex flex-col h-full bg-white">
      <div className="aspect-square relative overflow-hidden bg-surface-soft">
        {item.photoURL ? (
          <img src={item.photoURL} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Wrench className="w-12 h-12 text-text-muted/20" />
          </div>
        )}
        <div className="absolute top-3 right-3 md:top-4 md:right-4 flex flex-col gap-2">
          <button className={cn(
            "w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center backdrop-blur-md transition-all shadow-sm",
            item.isFavorite ? "bg-accent text-white" : "bg-white/80 text-text-muted hover:text-accent"
          )}>
            <Heart className={cn("w-4 h-4 md:w-5 md:h-5", item.isFavorite && "fill-current")} />
          </button>
          <button className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white/80 text-text-muted hover:text-primary flex items-center justify-center backdrop-blur-md transition-all shadow-sm">
            <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
        <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-[8px] md:text-[9px] font-black uppercase tracking-widest border-none shadow-sm">{item.category}</Badge>
        </div>
      </div>
      <div className="p-4 md:p-6 flex-1 flex flex-col justify-between">
        <div className="space-y-1 md:space-y-1.5">
          <p className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-[0.15em] md:tracking-[0.2em]">{item.brand}</p>
          <h4 className="text-base md:text-lg font-bold text-primary leading-tight tracking-tight group-hover:text-accent transition-colors">{item.name}</h4>
        </div>
        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-accent fill-current" />
            <span className="text-[10px] md:text-xs font-bold text-text-secondary">{item.rating || 'N/A'}</span>
          </div>
          <span className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-widest">In 12 sessies</span>
        </div>
      </div>
    </Card>
  );
}

const SetupCard: React.FC<{ setup: Setup }> = ({ setup }) => {
  return (
    <Card variant="premium" className="p-6 md:p-8 border-none shadow-sm hover:shadow-premium transition-all duration-500 rounded-2xl md:rounded-[2.5rem] bg-gradient-to-br from-white to-surface-soft/30 group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 md:mb-8">
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 bg-accent/10 text-accent rounded-xl md:rounded-2xl">
              <Layers className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h4 className="text-xl md:text-2xl font-bold text-primary tracking-tight">{setup.name}</h4>
          </div>
          <p className="text-xs md:text-sm text-text-secondary font-medium leading-relaxed max-w-md">{setup.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" className="rounded-xl md:rounded-2xl h-10 md:h-12 w-10 md:w-12 border-border-subtle/50">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="icon" className="rounded-xl md:rounded-2xl h-10 md:h-12 w-10 md:w-12 border-border-subtle/50 text-danger hover:bg-danger/5">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Inbegrepen Gear</p>
        <div className="flex flex-wrap gap-3">
          {setup.items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2 md:p-3 bg-white rounded-xl md:rounded-2xl border border-border-subtle shadow-sm group-hover:border-accent/30 transition-colors">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl overflow-hidden bg-surface-soft flex-shrink-0">
                <img src={item.photoURL} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="pr-2">
                <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">{item.brand}</p>
                <p className="text-xs md:text-sm font-bold text-primary tracking-tight">{item.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="accent" className="px-2 py-0.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest">Snoekbaars</Badge>
          <Badge variant="secondary" className="px-2 py-0.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest">Verticalen</Badge>
        </div>
        <div className="flex items-center gap-1.5 text-accent">
          <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Top Performance</span>
        </div>
      </div>
    </Card>
  );
}

function AffiliateCard({ title, price, store, image, description, tags }: { title: string, price: number, store: string, image: string, description: string, tags: string[] }) {
  return (
    <Card variant="premium" className="group border-none shadow-sm hover:shadow-premium transition-all duration-500 rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-white flex flex-col">
      <div className="aspect-[16/10] relative overflow-hidden bg-surface-soft">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
        <div className="absolute top-4 left-4">
          <Badge variant="accent" className="px-3 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg">Tip</Badge>
        </div>
        <div className="absolute bottom-4 right-4">
          <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-white/20">
            <p className="text-lg md:text-xl font-black text-primary tracking-tighter">€{price.toFixed(2)}</p>
          </div>
        </div>
      </div>
      <div className="p-6 md:p-8 flex-1 flex flex-col">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{store}</p>
            <div className="flex gap-1">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-[7px] md:text-[8px] font-black uppercase tracking-widest">{tag}</Badge>
              ))}
            </div>
          </div>
          <h4 className="text-xl md:text-2xl font-bold text-primary tracking-tight group-hover:text-accent transition-colors">{title}</h4>
          <p className="text-xs md:text-sm text-text-secondary font-medium leading-relaxed line-clamp-2">{description}</p>
        </div>
        <div className="mt-8 flex gap-3">
          <Button className="flex-1 rounded-xl md:rounded-2xl h-12 md:h-14 font-bold shadow-premium-accent text-xs md:text-sm" icon={<ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />}>
            Bekijk bij {store}
          </Button>
          <Button variant="secondary" size="icon" className="rounded-xl md:rounded-2xl h-12 md:h-14 w-12 md:w-14 border-border-subtle/50">
            <Info className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
