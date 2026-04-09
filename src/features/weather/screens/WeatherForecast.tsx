import React, { useEffect, useMemo, useState } from 'react';
import {
  Cloud,
  Sun,
  Wind,
  Thermometer,
  Droplets,
  Search,
  MapPin,
  Clock,
  Waves,
  Sunrise,
  Sunset,
  Zap,
  ArrowUpRight,
  Info,
  Moon,
  Compass,
  Gauge,
  Eye,
  ArrowLeft,
  CloudRain,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { weatherService, WeatherData } from '../services/weatherService';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const DEFAULT_LOCATION = localStorage.getItem('weatherLocation') || 'Utrecht';

function getAdviceVariantClasses(variant: 'success' | 'warning' | 'info' | 'accent') {
  switch (variant) {
    case 'success':
      return 'bg-success/10 border-success/20 text-success';
    case 'warning':
      return 'bg-warning/10 border-warning/20 text-warning';
    case 'info':
      return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    case 'accent':
    default:
      return 'bg-brand/10 border-brand/20 text-brand';
  }
}

function getFishingAdvice(
  temp: number,
  pressure: number,
  windKph: number,
  rainChance: number,
  uv: number
): { title: string; text: string; variant: 'success' | 'warning' | 'info' | 'accent' } {
  if (pressure < 1010 && windKph < 22) {
    return {
      title: 'Sterk moment',
      text: 'Dalende of lagere luchtdruk met beheersbare wind kan de visactiviteit verhogen. Focus op actieve zones en overgangen.',
      variant: 'success',
    };
  }

  if (windKph > 28) {
    return {
      title: 'Moeilijker vissen',
      text: 'Harde wind maakt presentatie, driften en secuur vissen lastiger. Zoek luwere oevers, beschutte stekken of diepere zones.',
      variant: 'warning',
    };
  }

  if (temp < 5) {
    return {
      title: 'Tragere activiteit',
      text: 'Bij lage temperatuur zijn vissen vaak minder actief. Vis trager, compacter en focus op diepere of stabielere delen.',
      variant: 'info',
    };
  }

  if (rainChance > 65 && windKph < 24) {
    return {
      title: 'Interessante overgang',
      text: 'Regenfronten en veranderende omstandigheden kunnen aasgedrag triggeren. Let extra op windkant en drukwisselingen.',
      variant: 'accent',
    };
  }

  if (uv >= 6) {
    return {
      title: 'Licht & zicht',
      text: 'Hogere UV en helderder weer kunnen vis voorzichtiger maken. Overweeg subtielere presentaties of schaduwrijke zones.',
      variant: 'info',
    };
  }

  return {
    title: 'Stabiele condities',
    text: 'Vrij neutrale omstandigheden. Kies stekken op basis van seizoen, diepte, beschutting en aanwezige activiteit.',
    variant: 'accent',
  };
}

function getWindLabel(dir?: string) {
  return dir?.toUpperCase() || '--';
}

function safeHourList(weather: WeatherData | null): any[] {
  const hours = ((weather?.forecast?.forecastday?.[0] as any)?.hour ?? []) as any[];
  if (!Array.isArray(hours)) return [];
  const now = Date.now();

  return hours
    .filter((hour) => new Date(hour.time).getTime() >= now - 60 * 60 * 1000)
    .slice(0, 8);
}

function formatHourLabel(time: string) {
  return new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time));
}

function formatDayShort(date: string) {
  return new Intl.DateTimeFormat('nl-NL', {
    weekday: 'short',
  }).format(new Date(date));
}

export default function WeatherForecast() {
  const navigate = useNavigate();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [searchValue, setSearchValue] = useState(DEFAULT_LOCATION);

  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true);
      try {
        const data = await weatherService.fetchWeather(location);
        setWeather(data);
      } catch (error) {
        console.error('Error loading weather:', error);
        toast.error('Fout bij ophalen weerdata');
      } finally {
        setLoading(false);
      }
    };

    loadWeather();
  }, [location]);

  const hourlyForecast = useMemo(() => safeHourList(weather), [weather]);

  const today = weather?.forecast?.forecastday?.[0];
  const advice = weather
    ? getFishingAdvice(
        weather.current.temp_c,
        weather.current.pressure_mb,
        weather.current.wind_kph,
        today?.day?.daily_chance_of_rain ?? 0,
        weather.current.uv
      )
    : null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = searchValue.trim();
    if (!next) return;
    localStorage.setItem('weatherLocation', next);
    setLocation(next);
  };

  return (
    <PageLayout>
      <PageHeader
        title="Weer & Forecast"
        subtitle="Uitgebreide omstandigheden, forecast en visadvies"
        actions={
          <form onSubmit={handleSearch} className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Locatie..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="bg-surface-card border border-border-subtle rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-brand transition-all w-full md:w-56"
            />
          </form>
        }
      />

      <div className="space-y-6 md:space-y-8 pb-32 px-2 md:px-0">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate('/')}
            className="h-10 rounded-xl px-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              localStorage.setItem('weatherLocation', 'Utrecht');
              setSearchValue('Utrecht');
              setLocation('Utrecht');
            }}
            className="h-10 rounded-xl px-4"
          >
            Reset locatie
          </Button>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="h-72 bg-surface-card animate-pulse rounded-[2rem]" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-surface-card animate-pulse rounded-[1.5rem]" />
              <div className="h-32 bg-surface-card animate-pulse rounded-[1.5rem]" />
            </div>
            <div className="h-72 bg-surface-card animate-pulse rounded-[2rem]" />
          </div>
        ) : weather ? (
          <>
            {/* Hero */}
            <section>
              <Card className="p-5 md:p-8 border border-border-subtle bg-surface-card rounded-[2rem] shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 blur-3xl -mr-32 -mt-32" />

                <div className="relative z-10 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-2xl bg-surface-soft border border-border-subtle flex items-center justify-center text-brand">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                            Live locatie
                          </p>
                          <h2 className="text-2xl md:text-4xl font-black text-text-primary tracking-tight uppercase leading-none">
                            {weather.location.name}
                          </h2>
                        </div>
                      </div>

                      <p className="text-sm md:text-base text-text-secondary capitalize">
                        {weather.current.condition.text}
                      </p>
                    </div>

                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] bg-surface-soft border border-border-subtle flex items-center justify-center shrink-0">
                      {weather.current.condition.icon ? (
                        <img
                          src={weather.current.condition.icon}
                          alt="Weather"
                          className="w-11 h-11 md:w-14 md:h-14"
                        />
                      ) : (
                        <Cloud className="w-7 h-7 text-brand" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-end gap-4">
                    <div className="text-5xl md:text-7xl font-black text-text-primary tracking-tighter leading-none">
                      {Math.round(weather.current.temp_c)}
                      <span className="text-brand text-3xl md:text-5xl align-top">°</span>
                    </div>

                    <div className="pb-1">
                      <p className="text-sm text-text-secondary">
                        Gevoel: <span className="font-bold text-text-primary">{Math.round(weather.current.feelslike_c)}°C</span>
                      </p>
                      <p className="text-sm text-text-secondary">
                        Wind: <span className="font-bold text-text-primary">{Math.round(weather.current.wind_kph)} km/u</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3.5">
                      <div className="flex items-center gap-2 text-text-muted mb-1">
                        <Wind className="w-4 h-4 text-brand" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Wind</span>
                      </div>
                      <p className="text-lg font-bold text-text-primary">
                        {Math.round(weather.current.wind_kph)} km/u
                      </p>
                    </div>

                    <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3.5">
                      <div className="flex items-center gap-2 text-text-muted mb-1">
                        <Compass className="w-4 h-4 text-brand" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Richting</span>
                      </div>
                      <p className="text-lg font-bold text-text-primary">
                        {getWindLabel(weather.current.wind_dir)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3.5">
                      <div className="flex items-center gap-2 text-text-muted mb-1">
                        <Gauge className="w-4 h-4 text-brand" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Druk</span>
                      </div>
                      <p className="text-lg font-bold text-text-primary">
                        {weather.current.pressure_mb} hPa
                      </p>
                    </div>

                    <div className="rounded-2xl bg-surface-soft border border-border-subtle p-3.5">
                      <div className="flex items-center gap-2 text-text-muted mb-1">
                        <Sun className="w-4 h-4 text-brand" />
                        <span className="text-[10px] font-black uppercase tracking-widest">UV</span>
                      </div>
                      <p className="text-lg font-bold text-text-primary">
                        {weather.current.uv}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Advice */}
            {advice && (
              <section>
                <Card className="p-5 md:p-6 border border-border-subtle bg-surface-card rounded-[1.75rem] shadow-premium relative overflow-hidden">
                  <div className={`absolute inset-0 opacity-100`} />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${getAdviceVariantClasses(advice.variant)}`}>
                      <Zap className="w-7 h-7" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-text-primary tracking-tight">
                          Visadvies
                        </h3>
                        <Badge variant="accent" className="text-[8px] font-black uppercase tracking-widest">
                          {advice.title}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {advice.text}
                      </p>
                    </div>

                    <Button
                      className="h-11 px-5 rounded-xl font-bold"
                      onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    >
                      Meer details
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </Card>
              </section>
            )}

            {/* Quick metrics */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                      Gevoelstemperatuur
                    </p>
                    <p className="text-lg font-bold text-text-primary">
                      {Math.round(weather.current.feelslike_c)}°C
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                      Vochtigheid
                    </p>
                    <p className="text-lg font-bold text-text-primary">
                      {weather.current.humidity}%
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                      Zicht
                    </p>
                    <p className="text-lg font-bold text-text-primary">
                      {Math.round(weather.current.vis_km)} km
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                      Windstoten
                    </p>
                    <p className="text-lg font-bold text-text-primary">
                      {Math.round(weather.current.gust_kph)} km/u
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Hourly forecast */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">
                  Komende uren
                </h3>
                <Badge variant="accent" className="text-[8px] font-black uppercase tracking-widest">
                  Kort termijn
                </Badge>
              </div>

              <Card className="p-4 md:p-5 border border-border-subtle bg-surface-card rounded-[1.75rem] shadow-premium">
                {hourlyForecast.length > 0 ? (
                  <div className="space-y-3">
                    {hourlyForecast.map((hour: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between rounded-2xl bg-surface-soft/60 border border-border-subtle px-3 py-3"
                      >
                        <div className="w-14">
                          <p className="text-sm font-bold text-text-primary">
                            {formatHourLabel(hour.time)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 min-w-0 flex-1 px-2">
                          <img src={hour.condition.icon} alt="icon" className="w-7 h-7" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {hour.condition.text}
                            </p>
                            <p className="text-[10px] uppercase tracking-widest text-text-muted font-black">
                              Wind {Math.round(hour.wind_kph)} km/u
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-brand">
                            {Math.round(hour.temp_c)}°
                          </p>
                          <p className="text-[10px] font-bold text-text-secondary">
                            {hour.chance_of_rain ?? 0}% regen
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-10 h-10 text-brand/20 mx-auto mb-3" />
                    <p className="text-sm font-bold text-text-primary">Geen uurforecast beschikbaar</p>
                  </div>
                )}
              </Card>
            </section>

            {/* 3-day forecast */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">
                  Meerdaagse forecast
                </h3>
                <Badge variant="accent" className="text-[8px] font-black uppercase tracking-widest">
                  3 dagen
                </Badge>
              </div>

              <Card className="p-4 md:p-5 border border-border-subtle bg-surface-card rounded-[1.75rem] shadow-premium">
                <div className="space-y-3">
                  {weather.forecast.forecastday.map((day, i) => (
                    <div
                      key={day.date}
                      className="rounded-2xl border border-border-subtle bg-surface-soft/50 p-4"
                    >
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div>
                          <p className="text-lg font-bold text-text-primary">
                            {i === 0 ? 'Vandaag' : formatDayShort(day.date)}
                          </p>
                          <p className="text-xs text-text-secondary capitalize">
                            {day.day.condition.text}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <img src={day.day.condition.icon} alt="icon" className="w-10 h-10" />
                          <div className="text-right">
                            <p className="text-lg font-black text-brand">
                              {Math.round(day.day.maxtemp_c)}°
                              <span className="text-text-dim"> / {Math.round(day.day.mintemp_c)}°</span>
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                              Gem. {Math.round(day.day.avgtemp_c)}°
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl bg-surface-card border border-border-subtle p-3">
                          <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">
                            Regenkans
                          </p>
                          <p className="text-sm font-bold text-text-primary">
                            {day.day.daily_chance_of_rain}%
                          </p>
                        </div>

                        <div className="rounded-xl bg-surface-card border border-border-subtle p-3">
                          <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">
                            Neerslag
                          </p>
                          <p className="text-sm font-bold text-text-primary">
                            {day.day.totalprecip_mm} mm
                          </p>
                        </div>

                        <div className="rounded-xl bg-surface-card border border-border-subtle p-3">
                          <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">
                            Max wind
                          </p>
                          <p className="text-sm font-bold text-text-primary">
                            {Math.round(day.day.maxwind_kph)} km/u
                          </p>
                        </div>

                        <div className="rounded-xl bg-surface-card border border-border-subtle p-3">
                          <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">
                            UV
                          </p>
                          <p className="text-sm font-bold text-text-primary">
                            {day.day.uv}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* Sun & Moon */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 border border-border-subtle bg-surface-card rounded-[1.75rem] shadow-premium">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Sunrise className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                        Zonsopkomst
                      </p>
                      <h4 className="text-lg font-bold text-text-primary">
                        {today?.astro?.sunrise || '--'}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                        Zonsondergang
                      </p>
                      <h4 className="text-lg font-bold text-text-primary">
                        {today?.astro?.sunset || '--'}
                      </h4>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <Sunset className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-border-subtle bg-surface-card rounded-[1.75rem] shadow-premium">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Moon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                        Maanfase
                      </p>
                      <h4 className="text-lg font-bold text-text-primary">
                        {today?.astro?.moon_phase || '--'}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                      Verlichting
                    </p>
                    <h4 className="text-lg font-bold text-text-primary">
                      {today?.astro?.moon_illumination || '--'}%
                    </h4>
                  </div>
                </div>
              </Card>
            </section>

            {/* Fishing conditions summary */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">
                  Samenvatting voor vissers
                </h3>
              </div>

              <Card className="p-5 md:p-6 border border-border-subtle bg-surface-card rounded-[1.75rem] shadow-premium">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-border-subtle bg-surface-soft/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Waves className="w-4 h-4 text-brand" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                        Luchtdruk
                      </p>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {weather.current.pressure_mb < 1010
                        ? 'Relatief lage luchtdruk. Dat kan activiteit stimuleren, zeker rond weersverandering.'
                        : weather.current.pressure_mb > 1020
                        ? 'Hogere luchtdruk. Vis kan soms iets stabieler maar ook voorzichtiger reageren.'
                        : 'Vrij neutrale luchtdruk. Focus vooral op stekkeuze en timing.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border-subtle bg-surface-soft/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wind className="w-4 h-4 text-brand" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                        Wind
                      </p>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {weather.current.wind_kph > 28
                        ? 'Stevige wind. Zoek beschutte zones of windkant waar voedsel zich kan ophopen.'
                        : weather.current.wind_kph > 15
                        ? 'Matige wind. Interessant voor actieve vis, maar let op presentatie en controle.'
                        : 'Rustigere wind. Goede omstandigheden om precies en subtiel te vissen.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border-subtle bg-surface-soft/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CloudRain className="w-4 h-4 text-brand" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                        Neerslag
                      </p>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {(today?.day?.daily_chance_of_rain ?? 0) > 65
                        ? 'Hogere kans op regen. Overgangen en fronten kunnen interessant zijn voor extra activiteit.'
                        : 'Beperkte regenkans. Gebruik vooral licht, temperatuur en wind als leidraad.'}
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          </>
        ) : (
          <Card className="p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl">
            <Cloud className="w-12 h-12 text-brand/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-text-primary">
              Geen weerdata beschikbaar
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              Controleer je internetverbinding of probeer een andere locatie.
            </p>
            <Button
              onClick={() => {
                setSearchValue('Utrecht');
                setLocation('Utrecht');
              }}
            >
              Herstel locatie
            </Button>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}