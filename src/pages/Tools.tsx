import React from 'react';
import { 
  Wrench, 
  Cloud, 
  Wind, 
  Droplets, 
  Sun, 
  Thermometer,
  BookOpen,
  Anchor,
  Compass,
  Zap,
  ChevronRight,
  ExternalLink,
  BarChart3,
  MapPin,
  Calendar,
  Waves,
  LayoutGrid,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Card, Button, Badge } from '../components/ui/Base';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const categories = [
  { id: 'weather', name: 'Weer & Water', icon: Cloud, count: 4, color: 'text-brand', bg: 'bg-brand-soft' },
  { id: 'analysis', name: 'Analyse', icon: BarChart3, count: 3, color: 'text-aqua', bg: 'bg-aqua-soft' },
  { id: 'planning', name: 'Planning', icon: Calendar, count: 2, color: 'text-warning', bg: 'bg-warning-soft' },
  { id: 'utility', name: 'Hulpmiddelen', icon: Wrench, count: 5, color: 'text-success', bg: 'bg-success-soft' },
];

const coreTools = [
  {
    id: 'weather-forecast',
    title: 'Visweer Forecast',
    description: 'Gedetailleerde weersverwachting geoptimaliseerd voor sportvissers. Wind, luchtdruk en neerslag.',
    icon: Cloud,
    category: 'weather',
    status: 'active',
    isNew: true
  },
  {
    id: 'tide-tracker',
    title: 'Getijden Tracker',
    description: 'Actuele getijdeninformatie voor alle zoutwaterstekken in Nederland.',
    icon: Waves,
    category: 'weather',
    status: 'active'
  },
  {
    id: 'session-analyzer',
    title: 'Sessie Analyser',
    description: 'Krijg diepgaand inzicht in je sessies. Wat werkte wel en wat niet?',
    icon: BarChart3,
    category: 'analysis',
    status: 'beta'
  },
  {
    id: 'spot-insights',
    title: 'Spot Inzichten',
    description: 'Analyseer de beste tijden en omstandigheden voor jouw opgeslagen stekken.',
    icon: MapPin,
    category: 'analysis',
    status: 'active'
  }
];

const smartTools = [
  {
    id: 'bait-suggest',
    title: 'Bait & Rig Suggesties',
    description: 'Slimme aanbevelingen op basis van vissoort, seizoen en weersomstandigheden.',
    icon: Sparkles,
    category: 'planning',
    status: 'coming_soon',
    isPremium: true
  },
  {
    id: 'pattern-recognition',
    title: 'Patroonherkenning',
    description: 'AI-gestuurde analyse van je vangsten om patronen en trends te ontdekken.',
    icon: Zap,
    category: 'analysis',
    status: 'coming_soon',
    isPremium: true
  }
];

export default function Tools() {
  const navigate = useNavigate();
  return (
    <PageLayout>
      <PageHeader 
        title="Tools Hub"
        subtitle="Slimme hulpmiddelen en analyses om je vangstkansen te maximaliseren."
        badge="Tools"
      />

      {/* Categories */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {categories.map((cat) => (
          <Card key={cat.id} hoverable className="p-6 group cursor-pointer border-border-subtle hover:border-brand/30 transition-all">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", cat.bg)}>
                <cat.icon className={cn("w-6 h-6", cat.color)} />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-sm">{cat.name}</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{cat.count} Tools</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Core Tools Section */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold text-text-primary flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-brand" />
            Core Tools
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {coreTools.map((tool) => (
            <Card key={tool.id} hoverable className="p-8 group cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                {tool.isNew && <Badge variant="primary" className="animate-pulse">Nieuw</Badge>}
                {tool.status === 'beta' && <Badge variant="secondary">Beta</Badge>}
              </div>
              
              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-surface-soft flex items-center justify-center group-hover:bg-brand-soft transition-colors">
                  <tool.icon className="w-8 h-8 text-text-muted group-hover:text-brand transition-colors" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-text-primary group-hover:text-brand transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    icon={<ArrowRight className="w-4 h-4" />}
                    onClick={() => tool.id === 'weather-forecast' && navigate('/tools/weather-forecast')}
                  >
                    Open Tool
                  </Button>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    {tool.category}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Smart Tools Section */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold text-text-primary flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-brand" />
            Smart Tools (AI)
          </h2>
          <Badge variant="secondary" className="bg-brand-soft text-brand border-brand/20">Premium</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {smartTools.map((tool) => (
            <Card key={tool.id} className="p-8 opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all border-dashed border-border-subtle group">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-surface-soft flex items-center justify-center">
                    <tool.icon className="w-8 h-8 text-text-muted group-hover:text-brand transition-colors" />
                  </div>
                  <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">Coming Soon</Badge>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-text-primary">
                    {tool.title}
                  </h3>
                  <p className="text-text-muted leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="pt-4">
                  <Button variant="secondary" size="sm" disabled className="opacity-50">
                    Binnenkort beschikbaar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Knowledge Link */}
      <Card className="p-10 bg-gradient-to-br from-surface-card to-surface-soft border-brand/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-brand/5 rounded-full blur-3xl group-hover:bg-brand/10 transition-all" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold text-text-primary leading-tight">
              Wil je meer weten over vissoorten of technieken?
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl">
              Bezoek onze uitgebreide Kennisbank voor gidsen, how-to's en de CatchRank Academy.
            </p>
          </div>
          <Button 
            variant="primary" 
            size="lg" 
            className="px-10" 
            icon={<ArrowRight className="w-5 h-5" />}
            onClick={() => navigate('/knowledge')}
          >
            Naar Kennisbank
          </Button>
        </div>
      </Card>
    </PageLayout>
  );
}
