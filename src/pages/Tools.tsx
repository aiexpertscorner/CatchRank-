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
  ExternalLink
} from 'lucide-react';
import { Card, Button, Badge } from '../components/ui/Base';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';
import { cn } from '../lib/utils';

export default function Tools() {
  const tools = [
    {
      title: 'Weer & Getij',
      description: 'Actuele weersomstandigheden en getijdeninformatie voor jouw favoriete stekken.',
      icon: Cloud,
      color: 'text-brand',
      bg: 'bg-brand-soft',
    },
    {
      title: 'Knoop Gids',
      description: 'Stapsgewijze instructies voor de meest essentiële visknopen.',
      icon: Anchor,
      color: 'text-aqua',
      bg: 'bg-aqua-soft',
    },
    {
      title: 'Vissoorten Gids',
      description: 'Informatie over alle zoet- en zoutwatervissen in Nederland.',
      icon: BookOpen,
      color: 'text-warning',
      bg: 'bg-warning-soft',
    },
    {
      title: 'Aas Advies',
      description: 'Slimme suggesties voor het beste aas op basis van seizoen en vissoort.',
      icon: Zap,
      color: 'text-success',
      bg: 'bg-success-soft',
    }
  ];

  return (
    <PageLayout>
      <PageHeader 
        title="Tools & Info"
        subtitle="Slimme hulpmiddelen en kennis om je vangstkansen te vergroten."
        badge="Tools"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {tools.map((tool) => (
          <Card key={tool.title} hoverable className="p-8 group cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="space-y-6">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", tool.bg)}>
                  <tool.icon className={cn("w-8 h-8", tool.color)} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-text-primary group-hover:text-brand transition-colors">{tool.title}</h3>
                  <p className="text-text-secondary leading-relaxed max-w-sm">
                    {tool.description}
                  </p>
                </div>
                <Button variant="secondary" size="sm" icon={<ChevronRight className="w-4 h-4" />}>
                  Open Tool
                </Button>
              </div>
              <ExternalLink className="w-5 h-5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Card>
        ))}
      </div>

      <section className="pt-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-brand-soft text-brand rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-display font-bold text-text-primary">CatchRank Academy</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { title: 'Beginnen met Roofvissen', category: 'Techniek', time: '5 min' },
            { title: 'De perfecte Karper Rig', category: 'Materiaal', time: '8 min' },
            { title: 'Vissen in de Winter', category: 'Seizoen', time: '6 min' },
          ].map((article, i) => (
            <Card key={i} hoverable className="p-6 space-y-4">
              <div className="aspect-video rounded-xl bg-surface-soft mb-4 overflow-hidden">
                <img src={`https://picsum.photos/seed/fish${i}/800/450`} alt="Article" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{article.category}</Badge>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{article.time} leestijd</span>
                </div>
                <h4 className="text-lg font-bold text-text-primary leading-tight">{article.title}</h4>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
