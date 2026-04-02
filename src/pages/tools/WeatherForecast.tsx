import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Wind, 
  Droplets, 
  Sun, 
  Thermometer,
  ArrowLeft,
  Navigation,
  Calendar,
  Waves,
  Zap,
  Info
} from 'lucide-react';
import { Card, Button, Badge, Input } from '../../components/ui/Base';
import { PageHeader, PageLayout } from '../../components/layout/PageLayout';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export default function WeatherForecast() {
  const navigate = useNavigate();
  const [location, setLocation] = useState('Amsterdam, NL');
  const [loading, setLoading] = useState(false);

  // Mock weather data
  const forecast = [
    { time: '06:00', temp: 8, wind: 12, rain: 10, activity: 'Medium' },
    { time: '09:00', temp: 10, wind: 15, rain: 5, activity: 'High' },
    { time: '12:00', temp: 14, wind: 18, rain: 0, activity: 'Very High' },
    { time: '15:00', temp: 16, wind: 20, rain: 0, activity: 'High' },
    { time: '18:00', temp: 15, wind: 14, rain: 20, activity: 'Medium' },
    { time: '21:00', temp: 12, wind: 10, rain: 40, activity: 'Low' },
  ];

  return (
    <PageLayout>
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/tools')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Terug naar Tools
        </Button>
      </div>

      <PageHeader 
        title="Visweer Forecast"
        subtitle="Gedetailleerde weersverwachting en bijt-activiteit voor jouw locatie."
        badge="Weather"
      />

      {/* Location Selector */}
      <Card className="p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-widest ml-1">Locatie</label>
            <div className="relative">
              <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />
              <Input 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-12 bg-surface-soft border-border-subtle"
              />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-widest ml-1">Datum</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />
              <Input 
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="pl-12 bg-surface-soft border-border-subtle"
              />
            </div>
          </div>
          <Button variant="primary" className="px-8 h-12">Update</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Activity Card */}
        <Card className="lg:col-span-2 p-8 bg-gradient-to-br from-surface-card to-surface-soft border-brand/20">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand" />
              Bijt-activiteit Vandaag
            </h3>
            <Badge variant="success" className="animate-pulse">Optimale Condities</Badge>
          </div>

          <div className="h-64 flex items-end justify-between gap-2 pt-10">
            {forecast.map((f, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="relative w-full flex flex-col items-center">
                  <div 
                    className={cn(
                      "w-full rounded-t-xl transition-all duration-500 group-hover:brightness-125",
                      f.activity === 'Very High' ? "bg-brand shadow-[0_0_20px_rgba(244,194,13,0.3)]" :
                      f.activity === 'High' ? "bg-brand/70" :
                      f.activity === 'Medium' ? "bg-brand/40" : "bg-brand/10"
                    )}
                    style={{ height: `${f.activity === 'Very High' ? 160 : f.activity === 'High' ? 120 : f.activity === 'Medium' ? 80 : 40}px` }}
                  />
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <Badge variant="secondary" className="text-[8px]">{f.activity}</Badge>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{f.time}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Current Conditions */}
        <div className="space-y-6">
          <Card className="p-6">
            <h4 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2">
              <Info className="w-4 h-4 text-brand" />
              Huidige Condities
            </h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-muted">
                  <Thermometer className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Temp</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">14°C</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-muted">
                  <Wind className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Wind</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">3 Bft</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-muted">
                  <Droplets className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Druk</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">1018 hPa</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-muted">
                  <Waves className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Water</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">11°C</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-brand-soft border-brand/10">
            <h4 className="text-sm font-bold text-brand mb-2 uppercase tracking-widest">Expert Tip</h4>
            <p className="text-text-secondary text-sm leading-relaxed italic">
              "De stijgende luchtdruk en afnemende wind rond 12:00 zorgen voor een piek in activiteit. Focus op de ondiepere zones waar het water sneller opwarmt."
            </p>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
