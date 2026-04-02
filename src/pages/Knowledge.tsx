import React from 'react';
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  Fish, 
  Anchor, 
  Compass, 
  Zap,
  Star,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Card, Button, Badge, Input } from '../components/ui/Base';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';
import { cn } from '../lib/utils';

const categories = [
  { id: 'species', name: 'Vissoorten', icon: Fish, count: 42, color: 'text-brand', bg: 'bg-brand-soft' },
  { id: 'how-to', name: 'How-To Gidsen', icon: Anchor, count: 28, color: 'text-aqua', bg: 'bg-aqua-soft' },
  { id: 'guides', name: 'Visgidsen', icon: Compass, count: 15, color: 'text-warning', bg: 'bg-warning-soft' },
  { id: 'academy', name: 'Academy', icon: Zap, count: 34, color: 'text-success', bg: 'bg-success-soft' },
];

const articles = [
  {
    id: '1',
    title: 'Snoekvissen in de Winter: Tips & Tricks',
    summary: 'Hoe je de grootste snoeken vangt wanneer de temperatuur daalt. Alles over stekken en aas.',
    category: 'Guides',
    time: '8 min',
    image: 'https://picsum.photos/seed/pike/800/450',
    featured: true
  },
  {
    id: '2',
    title: 'De Perfecte Karper Knoop',
    summary: 'Stapsgewijze uitleg voor de meest betrouwbare knoop voor je rig.',
    category: 'How-To',
    time: '5 min',
    image: 'https://picsum.photos/seed/knot/800/450'
  },
  {
    id: '3',
    title: 'Baarsvissen met de Dropshot',
    summary: 'Waarom de dropshot techniek zo effectief is voor grote baars.',
    category: 'Academy',
    time: '6 min',
    image: 'https://picsum.photos/seed/perch/800/450'
  }
];

export default function Knowledge() {
  return (
    <PageLayout>
      <PageHeader 
        title="Kennisbank"
        subtitle="Vergroot je kennis en vang meer vis met onze gidsen en academy."
        badge="Knowledge"
      />

      {/* Search Bar */}
      <div className="relative mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <Input 
          placeholder="Zoek in soorgidsen, technieken of tips..." 
          className="pl-12 h-14 bg-surface-card border-border-subtle focus:border-brand text-lg"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {categories.map((cat) => (
          <Card key={cat.id} hoverable className="p-6 text-center group cursor-pointer">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110", cat.bg)}>
              <cat.icon className={cn("w-7 h-7", cat.color)} />
            </div>
            <h3 className="font-bold text-text-primary mb-1">{cat.name}</h3>
            <p className="text-xs text-text-muted font-bold uppercase tracking-widest">{cat.count} Artikelen</p>
          </Card>
        ))}
      </div>

      {/* Featured Article */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold text-text-primary flex items-center gap-3">
            <Star className="w-6 h-6 text-brand" />
            Uitgelicht
          </h2>
        </div>
        
        <Card hoverable className="overflow-hidden group cursor-pointer">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="aspect-video lg:aspect-auto relative overflow-hidden">
              <img 
                src={articles[0].image} 
                alt={articles[0].title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:hidden" />
            </div>
            <div className="p-8 lg:p-12 flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-3">
                <Badge variant="primary">{articles[0].category}</Badge>
                <div className="flex items-center gap-1.5 text-text-muted text-xs font-bold uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  {articles[0].time} leestijd
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl lg:text-4xl font-display font-bold text-text-primary leading-tight group-hover:text-brand transition-colors">
                  {articles[0].title}
                </h3>
                <p className="text-text-secondary text-lg leading-relaxed">
                  {articles[0].summary}
                </p>
              </div>
              <Button variant="primary" className="w-fit" icon={<ArrowRight className="w-4 h-4" />}>
                Lees Artikel
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Latest Articles */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold text-text-primary">Laatste Updates</h2>
          <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />}>Bekijk alles</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {articles.slice(1).map((article) => (
            <Card key={article.id} hoverable className="p-0 overflow-hidden group cursor-pointer flex flex-col">
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={article.image} 
                  alt={article.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
              </div>
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{article.category}</Badge>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{article.time}</span>
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-xl font-bold text-text-primary leading-tight group-hover:text-brand transition-colors">
                    {article.title}
                  </h4>
                  <p className="text-text-muted text-sm line-clamp-2">
                    {article.summary}
                  </p>
                </div>
                <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                  <span className="text-xs font-bold text-brand uppercase tracking-widest">Lees meer</span>
                  <ArrowRight className="w-4 h-4 text-brand" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
