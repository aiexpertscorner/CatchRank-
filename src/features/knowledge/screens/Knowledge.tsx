import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  ChevronRight, 
  Fish, 
  Zap, 
  Target, 
  Layers, 
  Anchor, 
  Waves, 
  Play, 
  Clock, 
  Star,
  Bookmark,
  Share2,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../../App';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Knowledge Screen (Academy)
 * Part of the 'knowledge' feature module.
 * Provides educational content, species info, and techniques.
 */

export default function Knowledge() {
  const { profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState<'all' | 'species' | 'techniques' | 'gear' | 'knots'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'Alles', icon: BookOpen },
    { id: 'species', label: 'Vissoorten', icon: Fish },
    { id: 'techniques', label: 'Technieken', icon: Zap },
    { id: 'gear', label: 'Materiaal', icon: Layers },
    { id: 'knots', label: 'Knopen', icon: Anchor },
  ] as const;

  // Mock Data for Academy
  const articles = [
    { id: '1', title: 'Snoekbaars Verticalen: De Basis', category: 'techniques', readTime: '5 min', difficulty: 'Beginner', img: 'https://picsum.photos/seed/zander/800/400', isNew: true },
    { id: '2', title: 'De Perfecte Dropshot Montage', category: 'techniques', readTime: '8 min', difficulty: 'Gevorderd', img: 'https://picsum.photos/seed/dropshot/800/400', isNew: false },
    { id: '3', title: 'Alles over de Baars (Perca fluviatilis)', category: 'species', readTime: '12 min', difficulty: 'Beginner', img: 'https://picsum.photos/seed/perch/800/400', isNew: false },
    { id: '4', title: 'De FG-Knoop Stap voor Stap', category: 'knots', readTime: '10 min', difficulty: 'Expert', img: 'https://picsum.photos/seed/knot/800/400', isNew: true },
    { id: '5', title: 'Keuze van de Juiste Hengel', category: 'gear', readTime: '15 min', difficulty: 'Beginner', img: 'https://picsum.photos/seed/rod/800/400', isNew: false },
  ];

  const filteredArticles = articles.filter(a => 
    (activeCategory === 'all' || a.category === activeCategory) &&
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout>
      <PageHeader 
        title="Academy" 
        subtitle="Word een betere visser"
        actions={
          <Button variant="ghost" size="sm" className="text-brand font-black text-[10px] uppercase tracking-widest">
            <Bookmark className="w-4 h-4 mr-2" />
            Opgeslagen
          </Button>
        }
      />

      <div className="space-y-8 pb-nav-pad">
        {/* Search & Category Tabs */}
        <section className="space-y-6 px-2 md:px-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text"
              placeholder="Zoek in de academy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-card border border-border-subtle rounded-xl pl-12 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  activeCategory === cat.id 
                    ? 'bg-brand border-brand text-bg-main shadow-lg shadow-brand/20' 
                    : 'bg-surface-card border-border-subtle text-text-muted hover:text-text-primary hover:border-brand/30'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Featured Article */}
        {activeCategory === 'all' && searchQuery === '' && (
          <section className="px-2 md:px-0">
            <Card padding="none" className="group relative aspect-[16/9] md:aspect-[21/9] rounded-[2.5rem] overflow-hidden border border-border-subtle shadow-premium cursor-pointer">
              <img src={articles[0].img} alt={articles[0].title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="accent" className="bg-brand text-bg-main border-none font-black">NIEUW</Badge>
                  <Badge variant="secondary" className="bg-white/10 backdrop-blur-md text-white border-none font-bold">Technieken</Badge>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight max-w-2xl">{articles[0].title}</h2>
                <div className="flex items-center gap-6 text-white/60 text-xs font-bold">
                  <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {articles[0].readTime}</span>
                  <span className="flex items-center gap-2"><Target className="w-4 h-4" /> {articles[0].difficulty}</span>
                </div>
                <Button className="h-12 px-8 rounded-xl font-bold shadow-premium-accent">
                  Lees Artikel
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </section>
        )}

        {/* Article Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2 md:px-0">
          {filteredArticles.map((article) => (
            <Card 
              key={article.id} 
              padding="none" 
              hoverable 
              className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-[2rem] overflow-hidden flex flex-col"
            >
              <div className="aspect-video relative overflow-hidden bg-surface-soft">
                <img src={article.img} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="bg-black/40 backdrop-blur-md text-white border-none font-black text-[8px] uppercase tracking-widest">
                    {article.category}
                  </Badge>
                </div>
                {article.isNew && (
                  <div className="absolute top-4 right-4">
                    <div className="w-8 h-8 rounded-full bg-brand text-bg-main flex items-center justify-center shadow-lg">
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-lg font-bold text-text-primary tracking-tight mb-4 group-hover:text-brand transition-colors line-clamp-2">{article.title}</h4>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {article.readTime}</span>
                    <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> {article.difficulty}</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-border-subtle flex items-center justify-between">
                  <button className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                    Lees Meer
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button className="text-text-muted hover:text-brand transition-colors">
                    <Bookmark className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </section>

        {/* Quick Tips / Knowledge Base */}
        <section className="px-2 md:px-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-text-primary tracking-tight">Snelle Tips</h3>
            <Button variant="ghost" size="sm" className="text-brand font-black text-[10px] uppercase tracking-widest">Alles</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Beste tijd voor snoekbaars?', content: 'Rond zonsopgang en zonsondergang zijn ze het meest actief.', icon: Clock },
              { title: 'Welke kleur kunstaas?', content: 'Helder water = natuurlijke kleuren. Troebel water = felle kleuren.', icon: Zap },
              { title: 'Luchtdruk effect?', content: 'Een dalende luchtdruk zorgt vaak voor een vreetbui.', icon: Waves },
              { title: 'Knoop sterkte?', content: 'Bevochtig je knoop altijd voor het aantrekken om wrijving te voorkomen.', icon: Anchor },
            ].map((tip, i) => (
              <Card key={i} className="p-6 border border-border-subtle bg-surface-card rounded-2xl flex gap-4 group hover:border-brand/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-surface-soft flex items-center justify-center text-brand flex-shrink-0 group-hover:bg-brand/10 transition-colors">
                  <tip.icon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-text-primary tracking-tight">{tip.title}</h4>
                  <p className="text-xs text-text-secondary font-medium leading-relaxed">{tip.content}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
