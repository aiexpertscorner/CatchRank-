import React, { useEffect, useState } from 'react';
import { 
  Cloud, 
  CloudRain, 
  Sun, 
  Wind, 
  Thermometer, 
  Droplets, 
  Navigation, 
  ChevronLeft, 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  Waves, 
  Sunrise, 
  Sunset,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Moon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { weatherService } from '../../services/weather/weatherService';
import { useAuth } from '../../../App';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

/**
 * Weather Forecast Screen
 * Part of the 'weather' feature module.
 * Provides detailed weather data and fishing-specific insights.
 */

export default function WeatherForecast() {
  const { profile } = useAuth();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('Amsterdam');

  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true);
      try {
        const data = await weatherService.fetchWeather(location);
        setWeather(data);
      } catch (error) {
        console.error("Error loading weather:", error);
        toast.error("Fout bij ophalen weerdata");
      } finally {
        setLoading(false);
      }
    };

    loadWeather();
  }, [location]);

  const getFishingAdvice = (temp: number, pressure: number, wind: number) => {
    if (pressure < 1010) return { text: "Uitstekend! Dalende luchtdruk activeert de vis.", variant: "success" };
    if (wind > 5) return { text: "Lastig. Harde wind maakt secuur vissen moeilijk.", variant: "warning" };
    if (temp < 5) return { text: "Traag. Vissen zijn minder actief bij deze kou.", variant: "info" };
    return { text: "Standaard condities. Zoek de diepere gaten op.", variant: "accent" };
  };

  return (
    <PageLayout>
      <PageHeader 
        title="Weer & Forecast" 
        subtitle="Sessie planning op basis van data"
        actions={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text"
              placeholder="Locatie..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-surface-card border border-border-subtle rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-brand transition-all w-48"
            />
          </div>
        }
      />

      <div className="space-y-8 pb-nav-pad">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 md:px-0">
            <div className="md:col-span-2 h-64 bg-surface-card animate-pulse rounded-[2.5rem]" />
            <div className="h-64 bg-surface-card animate-pulse rounded-[2.5rem]" />
          </div>
        ) : weather ? (
          <>
            {/* Current Weather Hero */}
            <section className="px-2 md:px-0">
              <Card className="p-8 md:p-12 border border-border-subtle bg-surface-card rounded-[2.5rem] shadow-premium relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 blur-3xl -mr-48 -mt-48 group-hover:bg-brand/10 transition-colors duration-1000" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="space-y-6 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-surface-soft flex items-center justify-center text-brand border border-border-subtle">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-3xl md:text-5xl font-bold text-text-primary tracking-tight">{weather.name}</h2>
                        <p className="text-sm text-text-secondary font-medium uppercase tracking-widest">Nu Live</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-8">
                      <div className="text-6xl md:text-8xl font-black text-text-primary tracking-tighter flex items-start">
                        {Math.round(weather.main.temp)}
                        <span className="text-3xl md:text-5xl text-brand mt-2">°C</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl md:text-2xl font-bold text-text-primary capitalize">{weather.weather[0].description}</p>
                        <p className="text-xs text-text-muted font-black uppercase tracking-widest">Gevoel: {Math.round(weather.main.feels_like)}°C</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div className="w-48 h-48 md:w-64 md:h-64 bg-brand/10 rounded-full flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-brand/5 blur-3xl animate-pulse" />
                      <Cloud className="w-24 h-24 md:w-32 md:h-32 text-brand relative z-10" />
                    </div>
                  </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-12 border-t border-border-subtle relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-text-muted mb-1">
                      <Wind className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Wind</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">{Math.round(weather.wind.speed * 3.6)} km/u</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-text-muted mb-1">
                      <Waves className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Luchtdruk</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">{weather.main.pressure} hPa</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-text-muted mb-1">
                      <Droplets className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Vochtigheid</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">{weather.main.humidity}%</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-text-muted mb-1">
                      <Sun className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Zicht</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">{Math.round(weather.visibility / 1000)} km</p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Fishing Advice Card */}
            <section className="px-2 md:px-0">
              <Card className="bg-brand/5 border border-brand/20 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://picsum.photos/seed/water/1920/1080')] opacity-5 grayscale" />
                <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center text-bg-main shadow-lg shadow-brand/20 flex-shrink-0 relative z-10">
                  <Zap className="w-8 h-8" />
                </div>
                <div className="flex-1 space-y-2 relative z-10 text-center md:text-left">
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">Dick's Advies voor Vandaag</h3>
                  <p className="text-sm text-text-secondary font-medium leading-relaxed">
                    {getFishingAdvice(weather.main.temp, weather.main.pressure, weather.wind.speed).text}
                  </p>
                </div>
                <Button className="relative z-10 h-12 px-8 rounded-xl font-bold shadow-premium-accent">
                  Bekijk Stek Advies
                  <ChevronLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              </Card>
            </section>

            {/* Sun & Moon */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2 md:px-0">
              <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Sunrise className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Zonsopkomst</p>
                    <h4 className="text-lg font-bold text-text-primary">07:12</h4>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Zonsondergang</p>
                    <h4 className="text-lg font-bold text-text-primary">20:18</h4>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Sunset className="w-6 h-6" />
                  </div>
                </div>
              </Card>
              <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <Moon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Maanfase</p>
                    <h4 className="text-lg font-bold text-text-primary">Wassende Maan</h4>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Verlichting</p>
                  <h4 className="text-lg font-bold text-text-primary">42%</h4>
                </div>
              </Card>
            </section>
          </>
        ) : (
          <Card className="p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl mx-2 md:mx-0">
            <Cloud className="w-12 h-12 text-brand/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-text-primary">Geen weerdata beschikbaar</h3>
            <p className="text-sm text-text-secondary mb-6">Controleer je internetverbinding of probeer een andere locatie.</p>
            <Button onClick={() => setLocation('Amsterdam')}>Herstel Locatie</Button>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
