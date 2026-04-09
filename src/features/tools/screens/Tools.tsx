import React from 'react';
import { 
  Wrench, 
  Calculator, 
  Cloud, 
  Navigation, 
  ChevronRight, 
  Zap, 
  Fish, 
  Target, 
  Layers, 
  Anchor, 
  Waves, 
  Thermometer, 
  Wind, 
  Sun, 
  Moon, 
  ArrowRight,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion } from 'motion/react';

/**
 * Tools Screen
 * Part of the 'tools' feature module.
 * Provides access to various utility tools for anglers.
 */

export default function Tools() {
  const tools = [
    { 
      id: 'ask-dick', 
      name: 'Vraag het Dick Beet', 
      description: 'Stel je visvragen aan onze digitale Dick Beet', 
      icon: MessageSquare, 
      color: 'text-brand', 
      bg: 'bg-brand/10',
      isNew: true,
      path: '/tools/ask-dick'
    },
    { 
      id: 'weight-calc', 
      name: 'Gewicht Calculator', 
      description: 'Bereken het gewicht op basis van de lengte.', 
      icon: Calculator, 
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10',
      path: '/tools/weight-calc'
    },
    { 
      id: 'weather-forecast', 
      name: 'Weer & Forecast', 
      description: 'Gedetailleerde weersverwachting voor vissers.', 
      icon: Cloud, 
      color: 'text-success', 
      bg: 'bg-success/10',
      path: '/weather'
    },
    { 
      id: 'lure-selector', 
      name: 'Aas Keuzehulp', 
      description: 'Krijg advies over het beste aas voor vandaag.', 
      icon: Target, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10',
      path: '/tools/lure-selector'
    },
    { 
      id: 'solunar', 
      name: 'Solunar Kalender', 
      description: 'Beste tijden op basis van maan en zon.', 
      icon: Moon, 
      color: 'text-purple-400', 
      bg: 'bg-purple-400/10',
      path: '/tools/solunar'
    },
    { 
      id: 'knot-guide', 
      name: 'Knopen Gids', 
      description: 'De belangrijkste knopen stap voor stap.', 
      icon: Anchor, 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-400/10',
      path: '/tools/knots'
    },
  ];

  return (
    <PageLayout>
      <PageHeader 
        title="Fishing Tools" 
        subtitle="Slimme hulpmiddelen voor aan de waterkant"
      />

      <div className="space-y-10 pb-32">
        {/* Featured AI Tool */}
        <section className="px-2 md:px-0">
          <Link to="/tools/ask-dick">
            <Card className="p-8 border border-brand/30 bg-brand/5 rounded-[2.5rem] shadow-premium-accent/10 group relative overflow-hidden cursor-pointer hover:border-brand transition-all">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl -mr-32 -mt-32" />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 rounded-[1.5rem] bg-brand flex items-center justify-center text-bg-main shadow-lg shadow-brand/20 group-hover:scale-110 transition-transform duration-500">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h3 className="text-2xl font-bold text-text-primary tracking-tight">Vraag Dick Beet</h3>
                    <Badge variant="accent" className="bg-brand text-bg-main border-none font-black">BETA</Badge>
                  </div>
                  <p className="text-sm text-text-secondary max-w-md">Onze AI-assistent Dick weet alles over vissen. Vraag hem om advies over stekken, technieken of materiaal.</p>
                </div>
                <Button className="h-12 px-8 rounded-xl font-bold shadow-premium-accent">
                  Stel een vraag
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </Link>
        </section>

        {/* Tools Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2 md:px-0">
          {tools.slice(1).map((tool) => (
            <Link key={tool.id} to={tool.path}>
              <Card 
                padding="none" 
                hoverable 
                className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-[2rem] overflow-hidden p-6 flex items-center gap-6 h-full"
              >
                <div className={`w-16 h-16 rounded-2xl ${tool.bg} flex items-center justify-center ${tool.color} flex-shrink-0 group-hover:scale-110 transition-transform duration-500`}>
                  <tool.icon className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-text-primary tracking-tight group-hover:text-brand transition-colors truncate">{tool.name}</h4>
                    {tool.isNew && <Badge variant="accent" className="text-[7px] py-0.5 px-1.5 font-black uppercase tracking-widest">NIEUW</Badge>}
                  </div>
                  <p className="text-xs text-text-secondary font-medium leading-relaxed line-clamp-2">{tool.description}</p>
                </div>
                <ChevronRight className="w-6 h-6 text-text-muted group-hover:text-brand transition-colors" />
              </Card>
            </Link>
          ))}
        </section>

        {/* Quick Info / Tips */}
        <section className="px-2 md:px-0">
          <Card className="bg-surface-soft/30 border border-border-subtle p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-6">
            <div className="w-12 h-12 rounded-full bg-surface-soft flex items-center justify-center text-text-muted flex-shrink-0">
              <Info className="w-6 h-6" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-tight mb-1">Wist je dat?</h4>
              <p className="text-xs text-text-secondary font-medium">Je kunt de tools ook direct gebruiken tijdens het loggen van een vangst of sessie. De app stelt dan automatisch de juiste waarden voor.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-brand font-black text-[10px] uppercase tracking-widest">Meer Info</Button>
          </Card>
        </section>
      </div>
    </PageLayout>
  );
}
