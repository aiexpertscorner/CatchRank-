import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  ArrowLeft,
  Cloud,
  CloudRain,
  Compass,
  Droplets,
  Eye,
  Fish,
  Gauge,
  LocateFixed,
  MapPin,
  Moon,
  RefreshCw,
  Search,
  Sun,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { weatherService, WeatherData } from '../services/weatherService';

const DEFAULT_LOCATION = localStorage.getItem('weatherLocation') || 'Utrecht';
const GEO_STORAGE_KEY = 'weatherGeo';
const GEO_MODE_KEY = 'weatherGeoMode';

type ChartRange = '8u' | '12u' | '24u';
type MapOverlay = 'wind' | 'radar' | 'rain';

const RANGE_HOURS: Record<ChartRange, number> = {
  '8u': 8,
  '12u': 12,
  '24u': 24,
};

type StoredGeo = {
  lat: number;
  lon: number;
};

function calcFishScore(
  temp: number,
  pressure: number,
  windKph: number,
  rainChance: number,
  uv: number,
  moonPhase: string
): number {
  let s = 50;

  if (temp >= 12 && temp <= 20) s += 10;
  else if (temp >= 8 && temp < 12) s += 4;
  else if (temp > 20 && temp <= 26) s += 3;
  else if (temp < 5) s -= 14;
  else if (temp > 28) s -= 8;

  if (pressure < 1000) s += 14;
  else if (pressure < 1010) s += 8;
  else if (pressure < 1015) s += 2;
  else if (pressure > 1025) s -= 5;

  if (windKph < 8) s += 8;
  else if (windKph < 18) s += 4;
  else if (windKph > 30) s -= 15;
  else if (windKph > 45) s -= 22;

  if (rainChance > 40 && rainChance < 70 && windKph < 22) s += 8;
  else if (rainChance > 80) s -= 5;

  if (uv >= 7) s -= 5;
  else if (uv <= 2) s += 3;

  const mp = (moonPhase || '').toLowerCase();
  if (mp.includes('full')) s += 8;
  else if (mp.includes('new')) s += 6;

  return Math.max(5, Math.min(95, s));
}

function getScoreMeta(score: number) {
  if (score < 25) {
    return {
      label: 'Slecht',
      sub: 'Weinig activiteit',
      color: '#ef4444',
      text: 'text-red-400',
      soft: 'bg-red-500/10',
      border: 'border-red-500/20',
    };
  }
  if (score < 42) {
    return {
      label: 'Matig',
      sub: 'Beperkte kansen',
      color: '#f97316',
      text: 'text-orange-400',
      soft: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    };
  }
  if (score < 58) {
    return {
      label: 'Normaal',
      sub: 'Gemiddelde condities',
      color: '#eab308',
      text: 'text-yellow-400',
      soft: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
    };
  }
  if (score < 76) {
    return {
      label: 'Goed',
      sub: 'Gunstige condities',
      color: '#22c55e',
      text: 'text-green-400',
      soft: 'bg-green-500/10',
      border: 'border-green-500/20',
    };
  }
  return {
    label: 'Top',
    sub: 'Sterke viskansen',
    color: '#10b981',
    text: 'text-emerald-400',
    soft: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  };
}

function getFishAdvice(
  temp: number,
  pressure: number,
  windKph: number,
  rainChance: number,
  uv: number,
  moonPhase: string
): string {
  const mp = (moonPhase || '').toLowerCase();

  if (mp.includes('full') || mp.includes('new')) {
    return 'Maanstand werkt mee. Focus extra op overgangsmomenten en schemeruren.';
  }
  if (pressure < 1005 && windKph < 22) {
    return 'Lagere druk en beheersbare wind geven vaak actiever aasgedrag.';
  }
  if (windKph > 30) {
    return 'Harde wind maakt stekkeuze belangrijk. Zoek luwtes, taluds en beschutte zones.';
  }
  if (temp < 6) {
    return 'Koude omstandigheden vragen om trager vissen, compacter aas en stabiele dieptes.';
  }
  if (rainChance > 50 && rainChance < 75 && windKph < 20) {
    return 'Een naderend front kan vis in beweging zetten. Let op windkant en ondiepere zones.';
  }
  if (uv >= 7) {
    return 'Hoge UV maakt ochtend, avond, schaduw en dieper water interessanter.';
  }
  if (temp >= 14 && temp <= 20 && windKph < 18) {
    return 'Sterke basiscondities voor actieve vis. Goed moment om mobiel en scherp te vissen.';
  }

  return 'Neutrale omstandigheden. Laat stekkeuze, timing en presentatie de doorslag geven.';
}

function fmtHour(time: string) {
  try {
    return new Intl.DateTimeFormat('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(time));
  } catch {
    return time;
  }
}

function fmtDayLong(date: string) {
  try {
    return new Intl.DateTimeFormat('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function getAllForecastHours(weather: WeatherData | null): any[] {
  if (!weather?.forecast?.forecastday) return [];
  return (weather.forecast.forecastday as any[]).flatMap((day) => day.hour ?? []);
}

function getNextHours(weather: WeatherData | null, count: number): any[] {
  const all = getAllForecastHours(weather);
  const now = Date.now();

  return all
    .filter((h: any) => new Date(h.time).getTime() >= now - 30 * 60 * 1000)
    .slice(0, count);
}

function getHoursForRange(weather: WeatherData | null, rangeH: number): any[] {
  const all = getAllForecastHours(weather);
  const now = Date.now();
  const end = now + rangeH * 60 * 60 * 1000;

  return all.filter((h: any) => {
    const t = new Date(h.time).getTime();
    return t >= now - 60 * 60 * 1000 && t <= end;
  });
}

function getBestFishingWindows(weather: WeatherData | null) {
  const all = getAllForecastHours(weather);
  const now = Date.now();

  return all
    .filter((h: any) => {
      const t = new Date(h.time).getTime();
      return t >= now - 60 * 60 * 1000 && t <= now + 24 * 60 * 60 * 1000;
    })
    .map((h: any) => {
      const score = calcFishScore(
        h.temp_c ?? 0,
        h.pressure_mb ?? weather?.current?.pressure_mb ?? 1013,
        h.wind_kph ?? 0,
        h.chance_of_rain ?? 0,
        h.uv ?? weather?.current?.uv ?? 0,
        weather?.forecast?.forecastday?.[0]?.astro?.moon_phase ?? ''
      );

      return {
        time: h.time,
        hour: fmtHour(h.time),
        score,
        temp: Math.round(h.temp_c ?? 0),
        wind: Math.round(h.wind_kph ?? 0),
        rain: Math.round(h.chance_of_rain ?? 0),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

function getWindLabel(speed: number) {
  if (speed < 8) return 'Rustig';
  if (speed < 18) return 'Beheersbaar';
  if (speed < 28) return 'Stevige drift';
  return 'Hard';
}

function getPressureLabel(pressure: number) {
  if (pressure < 1000) return 'Laag';
  if (pressure < 1013) return 'Redelijk';
  if (pressure < 1022) return 'Neutraal';
  return 'Hoog';
}

function getUvLabel(uv: number) {
  if (uv <= 2) return 'Laag';
  if (uv <= 5) return 'Matig';
  if (uv <= 7) return 'Hoog';
  if (uv <= 10) return 'Zeer hoog';
  return 'Extreem';
}

function getMoonVisualStyle(phase: string) {
  const p = (phase || '').toLowerCase();

  if (p.includes('new')) return 'new';
  if (p.includes('full')) return 'full';
  if (p.includes('waxing')) return 'waxing';
  if (p.includes('waning')) return 'waning';
  return 'half';
}

function safeReadGeo(): StoredGeo | null {
  try {
    const raw = localStorage.getItem(GEO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lon === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function ScoreRing({
  score,
  size = 94,
  stroke = 9,
}: {
  score: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const dashoffset = circumference - (pct / 100) * circumference;
  const meta = getScoreMeta(score);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={meta.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-black text-text-primary leading-none">{score}</span>
        <span className={`text-[9px] font-black uppercase tracking-wider ${meta.text}`}>vis</span>
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5 min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-brand shrink-0" />
        <span className="text-[8px] font-black uppercase tracking-widest text-text-muted truncate">
          {label}
        </span>
      </div>
      <p className="text-sm font-black text-text-primary leading-none truncate">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  right,
}: {
  icon: React.ElementType;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <h3 className="text-sm font-black text-text-primary tracking-tight truncate">
          {title}
        </h3>
      </div>
      {right}
    </div>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-[10px] font-black text-text-muted mb-1">{label}</p>
      {payload.map((p: any, idx: number) => (
        <p key={idx} style={{ color: p.color }} className="text-[11px] font-black">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(p.name === 'Druk' ? 0 : 1) : p.value}
          {p.unit || ''}
        </p>
      ))}
    </div>
  );
}

function RangeToggle({
  value,
  onChange,
}: {
  value: ChartRange;
  onChange: (r: ChartRange) => void;
}) {
  return (
    <div className="flex bg-surface-soft rounded-xl p-1 gap-1">
      {(['8u', '12u', '24u'] as ChartRange[]).map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
            value === range
              ? 'bg-brand/20 text-brand border border-brand/25'
              : 'text-text-muted'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
}

function MapOverlayToggle({
  value,
  onChange,
}: {
  value: MapOverlay;
  onChange: (v: MapOverlay) => void;
}) {
  const options: Array<{ key: MapOverlay; label: string }> = [
    { key: 'wind', label: 'Wind' },
    { key: 'radar', label: 'Radar' },
    { key: 'rain', label: 'Regen' },
  ];

  return (
    <div className="flex bg-black/25 rounded-xl p-1 gap-1 overflow-x-auto">
      {options.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide whitespace-nowrap transition-all ${
            value === item.key
              ? 'bg-brand/20 text-brand border border-brand/25'
              : 'text-white/70'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function WindyEmbed({
  lat,
  lon,
  overlay,
  locationLabel,
}: {
  lat: number;
  lon: number;
  overlay: MapOverlay;
  locationLabel: string;
}) {
  const windyOverlay = overlay === 'rain' ? 'rain' : overlay === 'radar' ? 'radar' : 'wind';

  const src = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=760&zoom=8&level=surface&overlay=${windyOverlay}&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=true&metricWind=default&metricTemp=default&radarRange=-1`;

  return (
    <Card className="p-0 border border-border-subtle bg-surface-card rounded-[28px] overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Waves className="w-4 h-4 text-brand" />
            <p className="text-xl font-black text-text-primary tracking-tight">Live weerkaart</p>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Realtime laag voor {locationLabel}. Snel wind, buien en fronten mobiel bekijken.
          </p>
        </div>
        <Badge className="shrink-0">Live</Badge>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-[24px] overflow-hidden border border-border-subtle bg-black">
          <div className="aspect-[16/12] sm:aspect-[16/10] min-h-[360px]">
            <iframe
              title="Windy live weather map"
              src={src}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function SimplePressureCard({ pressure }: { pressure: number }) {
  const label = getPressureLabel(pressure);
  const normalized = Math.max(975, Math.min(1045, pressure));
  const pct = ((normalized - 975) / (1045 - 975)) * 100;
  const goodZone = pressure < 1013;

  return (
    <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-4 h-4 text-brand" />
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-muted">
          Luchtdruk
        </p>
      </div>

      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-[40px] font-black text-text-primary leading-none">{pressure}</p>
          <p className="text-xs text-text-muted mt-1">hPa · {label}</p>
        </div>

        <div
          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            goodZone
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
          }`}
        >
          {goodZone ? 'Relatief gunstig' : 'Minder gunstig'}
        </div>
      </div>

      <div className="h-3 rounded-full overflow-hidden bg-surface-soft border border-border-subtle">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, #22c55e 0%, #84cc16 32%, #eab308 56%, #64748b 100%)',
          }}
        />
      </div>

      <div className="flex justify-between mt-2 text-[10px] text-text-dim">
        <span>975</span>
        <span>1013</span>
        <span>1045</span>
      </div>
    </Card>
  );
}

function SimpleUvCard({ uv }: { uv: number }) {
  const label = getUvLabel(uv);
  const pct = Math.min(100, (uv / 11) * 100);

  return (
    <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
      <div className="flex items-center gap-2 mb-3">
        <Sun className="w-4 h-4 text-brand" />
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-muted">
          UV Index
        </p>
      </div>

      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-[40px] font-black text-text-primary leading-none">{uv}</p>
          <p className="text-xs text-text-muted mt-1">
            {uv <= 2
              ? 'Geen bescherming nodig'
              : uv <= 5
              ? 'Zonnebrand slim'
              : uv <= 7
              ? 'Bescherming nodig'
              : 'Schaduw aanbevelen'}
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border bg-green-500/10 text-green-400 border-green-500/20">
          {label}
        </div>
      </div>

      <div className="h-3 rounded-full overflow-hidden bg-surface-soft border border-border-subtle">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, #22c55e 0%, #84cc16 20%, #eab308 40%, #f97316 62%, #ef4444 82%, #7c3aed 100%)',
          }}
        />
      </div>

      <div className="flex justify-between mt-2 text-[10px] text-text-dim">
        <span>0</span>
        <span>5</span>
        <span>11+</span>
      </div>
    </Card>
  );
}

function WindDirectionCompact({
  dir,
  speed,
  gusts,
}: {
  dir: string;
  speed: number;
  gusts: number;
}) {
  const map: Record<string, number> = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5,
  };

  const rotation = map[dir?.toUpperCase()] ?? 0;

  return (
    <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
      <SectionHeader icon={Compass} title="Wind & richting" />

      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0 rounded-full border border-border-subtle bg-surface-soft flex items-center justify-center">
          <div className="absolute inset-2 rounded-full border border-white/5" />
          <span className="absolute top-2 text-[10px] text-brand font-black">N</span>
          <span className="absolute bottom-2 text-[10px] text-text-dim font-black">S</span>
          <span className="absolute left-2 text-[10px] text-text-dim font-black">W</span>
          <span className="absolute right-2 text-[10px] text-text-dim font-black">E</span>

          <div
            className="absolute w-1 h-9 rounded-full bg-white origin-bottom"
            style={{
              transform: `translateY(-8px) rotate(${rotation}deg)`,
              boxShadow: '0 0 10px rgba(255,255,255,0.15)',
            }}
          />

          <div className="w-10 h-10 rounded-full bg-black/30 border border-white/10 flex flex-col items-center justify-center">
            <span className="text-[13px] font-black text-white leading-none">{Math.round(speed)}</span>
            <span className="text-[7px] text-text-muted leading-none mt-0.5">km/u</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
            Richting
          </p>
          <p className="text-[34px] font-black text-text-primary leading-none mb-3">
            {dir?.toUpperCase() || '--'}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">
                Wind
              </p>
              <p className="text-lg font-black text-text-primary leading-none">
                {Math.round(speed)}
                <span className="text-[10px] text-text-muted ml-1">km/u</span>
              </p>
            </div>

            <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">
                Stoten
              </p>
              <p className="text-lg font-black text-text-primary leading-none">
                {Math.round(gusts)}
                <span className="text-[10px] text-text-muted ml-1">km/u</span>
              </p>
            </div>
          </div>

          <p className="text-[11px] text-text-muted mt-3">
            {getWindLabel(speed)} — {speed < 20 ? 'goed mobiel visbaar' : 'meer drift en controleverlies'}
          </p>
        </div>
      </div>
    </Card>
  );
}

function MoonSunCard({
  phase,
  illumination,
  moonrise,
  moonset,
  sunrise,
  sunset,
}: {
  phase: string;
  illumination: string | number;
  moonrise: string;
  moonset: string;
  sunrise: string;
  sunset: string;
}) {
  const style = getMoonVisualStyle(phase);

  return (
    <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
      <SectionHeader icon={Moon} title="Maanfase & zon" />

      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden border border-white/10 bg-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#d8dee8_40%,#8b95a7_100%)]" />
          {style === 'new' && <div className="absolute inset-0 bg-[#08101a]" />}
          {style === 'half' && <div className="absolute inset-y-0 right-0 w-1/2 bg-[#08101a]" />}
          {style === 'waxing' && <div className="absolute inset-y-0 right-0 w-2/3 rounded-l-full bg-[#08101a]" />}
          {style === 'waning' && <div className="absolute inset-y-0 left-0 w-2/3 rounded-r-full bg-[#08101a]" />}
          {style === 'full' && (
            <div className="absolute inset-0 shadow-[0_0_18px_rgba(255,255,255,0.24)]" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
            Maanfase
          </p>
          <p className="text-[26px] font-black text-text-primary leading-tight truncate">{phase}</p>
          <p className="text-sm text-text-muted">{illumination}% verlicht</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Zonsopkomst', value: sunrise, icon: Sun },
          { label: 'Zonsondergang', value: sunset, icon: Sun },
          { label: 'Maan op', value: moonrise, icon: Moon },
          { label: 'Maan onder', value: moonset, icon: Moon },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3 h-3 text-brand shrink-0" />
              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">
                {label}
              </p>
            </div>
            <p className="text-base font-black text-text-primary leading-none">{value || '--'}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function WeatherForecast() {
  const navigate = useNavigate();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [searchValue, setSearchValue] = useState(DEFAULT_LOCATION);
  const [chartRange, setChartRange] = useState<ChartRange>('8u');
  const [mapOverlay, setMapOverlay] = useState<MapOverlay>('wind');
  const [usingGeolocation, setUsingGeolocation] = useState(localStorage.getItem(GEO_MODE_KEY) === '1');
  const [geoLoading, setGeoLoading] = useState(false);
  const initialLoadRef = useRef(false);

  const fetchWeatherForLocation = async (query: string) => {
    setLoading(true);
    try {
      const data = await weatherService.fetchWeather(query);
      setWeather(data);
      localStorage.setItem('weatherLocation', query);
      setLocation(query);
    } catch {
      toast.error('Fout bij ophalen weerdata');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherForCoords = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const query = `${lat},${lon}`;
      const data = await weatherService.fetchWeather(query);
      setWeather(data);
      localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify({ lat, lon }));
      localStorage.setItem(GEO_MODE_KEY, '1');
      setUsingGeolocation(true);
      setLocation(query);
    } catch {
      toast.error('Locatie ophalen mislukt, Utrecht wordt gebruikt.');
      localStorage.removeItem(GEO_MODE_KEY);
      setUsingGeolocation(false);
      await fetchWeatherForLocation(DEFAULT_LOCATION);
    } finally {
      setLoading(false);
      setGeoLoading(false);
    }
  };

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocatie wordt niet ondersteund op dit apparaat.');
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await fetchWeatherForCoords(position.coords.latitude, position.coords.longitude);
      },
      async () => {
        setGeoLoading(false);
        localStorage.removeItem(GEO_MODE_KEY);
        setUsingGeolocation(false);
        toast.error('Geen locatietoestemming. Aangepaste locatie of Utrecht wordt gebruikt.');
        const stored = localStorage.getItem('weatherLocation') || 'Utrecht';
        setSearchValue(stored);
        await fetchWeatherForLocation(stored);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 15 * 60 * 1000,
      }
    );
  };

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const geoMode = localStorage.getItem(GEO_MODE_KEY) === '1';
    const storedGeo = safeReadGeo();

    if (geoMode && storedGeo) {
      fetchWeatherForCoords(storedGeo.lat, storedGeo.lon);
      return;
    }

    if (navigator.permissions && navigator.geolocation) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          if (result.state === 'granted') {
            requestUserLocation();
          } else {
            fetchWeatherForLocation(DEFAULT_LOCATION);
          }
        })
        .catch(() => {
          fetchWeatherForLocation(DEFAULT_LOCATION);
        });
    } else {
      fetchWeatherForLocation(DEFAULT_LOCATION);
    }
  }, []);

  const today = weather?.forecast?.forecastday?.[0];
  const nextFiveHours = useMemo(() => getNextHours(weather, 5), [weather]);
  const chartHours = useMemo(() => getHoursForRange(weather, RANGE_HOURS[chartRange]), [weather, chartRange]);
  const bestWindows = useMemo(() => getBestFishingWindows(weather), [weather]);

  const fishScore = useMemo(() => {
    if (!weather) return 50;
    return calcFishScore(
      weather.current.temp_c,
      weather.current.pressure_mb,
      weather.current.wind_kph,
      today?.day?.daily_chance_of_rain ?? 0,
      weather.current.uv,
      today?.astro?.moon_phase ?? ''
    );
  }, [weather, today]);

  const scoreMeta = getScoreMeta(fishScore);

  const fishAdvice = useMemo(() => {
    if (!weather) return '';
    return getFishAdvice(
      weather.current.temp_c,
      weather.current.pressure_mb,
      weather.current.wind_kph,
      today?.day?.daily_chance_of_rain ?? 0,
      weather.current.uv,
      today?.astro?.moon_phase ?? ''
    );
  }, [weather, today]);

  const pressureChartData = useMemo(() => {
    return chartHours.map((h: any) => ({
      time: fmtHour(h.time),
      Druk: Math.round(h.pressure_mb ?? 0),
    }));
  }, [chartHours]);

  const tempRainChartData = useMemo(() => {
    return chartHours.map((h: any) => ({
      time: fmtHour(h.time),
      Temp: parseFloat((h.temp_c ?? 0).toFixed(1)),
      Regen: h.chance_of_rain ?? 0,
    }));
  }, [chartHours]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = searchValue.trim();
    if (!next) return;

    localStorage.removeItem(GEO_MODE_KEY);
    setUsingGeolocation(false);
    await fetchWeatherForLocation(next);
  };

  const resetToDefault = async () => {
    localStorage.removeItem(GEO_MODE_KEY);
    setUsingGeolocation(false);
    setSearchValue('Utrecht');
    await fetchWeatherForLocation('Utrecht');
  };

  const liveSummary = weather
    ? [
        { icon: Wind, label: 'Wind', value: `${Math.round(weather.current.wind_kph)} km/u` },
        { icon: Compass, label: 'Richting', value: weather.current.wind_dir?.toUpperCase() || '--' },
        { icon: Gauge, label: 'Druk', value: `${weather.current.pressure_mb} hPa` },
        { icon: Droplets, label: 'Vocht', value: `${weather.current.humidity}%` },
      ]
    : [];

  return (
    <PageLayout>
      <PageHeader
        title="Weer & Visadvies"
        subtitle="Live kaarten, trends en visrelevante condities"
        actions={
          <form onSubmit={handleSearch} className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Zoek locatie..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="bg-surface-card border border-border-subtle rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand/60 transition-all w-full md:w-52"
            />
          </form>
        }
      />

      <div className="space-y-3 pb-28">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="secondary" onClick={() => navigate('/')} className="h-9 rounded-xl px-3.5 text-sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Dashboard
          </Button>

          <Button
            variant="ghost"
            className="h-9 rounded-xl px-3.5 text-sm"
            onClick={requestUserLocation}
            disabled={geoLoading}
          >
            <LocateFixed className="w-3.5 h-3.5 mr-1.5" />
            {geoLoading ? 'Locatie...' : 'Gebruik mijn locatie'}
          </Button>

          <Button variant="ghost" className="h-9 rounded-xl px-3.5 text-sm" onClick={resetToDefault}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Utrecht
          </Button>
        </div>

        {loading && (
          <div className="space-y-3 animate-pulse">
            {[230, 500, 200, 190, 160, 160, 220].map((height, idx) => (
              <div key={idx} style={{ height }} className="bg-surface-card/60 rounded-[28px]" />
            ))}
          </div>
        )}

        {!loading && !weather && (
          <Card className="p-10 text-center border border-dashed border-border-subtle bg-surface-soft/10 rounded-[28px]">
            <Cloud className="w-10 h-10 text-brand/15 mx-auto mb-4" />
            <p className="text-base font-bold text-text-primary mb-1.5">Geen weerdata beschikbaar</p>
            <p className="text-sm text-text-secondary mb-5">
              Controleer je verbinding of probeer een andere locatie.
            </p>
            <Button onClick={resetToDefault}>Herstel locatie</Button>
          </Card>
        )}

        {!loading && weather && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${weather.location.name}-${location}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="space-y-3"
            >
              <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px] relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${scoreMeta.color}18 0%, transparent 70%)`,
                  }}
                />

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-brand shrink-0" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                          {usingGeolocation ? 'Mijn locatie' : 'Live locatie'}
                        </p>
                      </div>

                      <h2 className="text-[24px] sm:text-[28px] font-black text-text-primary leading-tight truncate">
                        {weather.location.name}
                      </h2>

                      <p className="text-[11px] text-text-muted truncate">
                        {weather.location.region}, {weather.location.country}
                      </p>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <Badge>{weather.current.condition.text}</Badge>
                        <Badge>{scoreMeta.label}</Badge>
                      </div>
                    </div>

                    <ScoreRing score={fishScore} />
                  </div>

                  <div className="flex items-end justify-between gap-3 mb-4">
                    <div className="flex items-end gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-surface-soft border border-border-subtle flex items-center justify-center shrink-0">
                        {weather.current.condition.icon ? (
                          <img src={weather.current.condition.icon} alt="" className="w-10 h-10" />
                        ) : (
                          <Cloud className="w-5 h-5 text-brand" />
                        )}
                      </div>

                      <div className="flex items-end gap-2">
                        <span className="text-[64px] sm:text-[72px] font-black text-text-primary tracking-tighter leading-none">
                          {Math.round(weather.current.temp_c)}
                        </span>
                        <span className="text-[28px] font-black text-brand mb-2">°C</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                        Gevoel
                      </p>
                      <p className="text-base font-black text-text-primary">
                        {Math.round(weather.current.feelslike_c)}°
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                    {liveSummary.map((item) => (
                      <StatPill key={item.label} icon={item.icon} label={item.label} value={item.value} />
                    ))}
                  </div>

                  <div className={`rounded-2xl border px-3.5 py-3 ${scoreMeta.soft} ${scoreMeta.border}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Fish className={`w-4 h-4 ${scoreMeta.text}`} />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                        Visadvies nu
                      </p>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{fishAdvice}</p>
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <SectionHeader
                  icon={Waves}
                  title="Live kaart"
                  right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Windy</span>}
                />
                <MapOverlayToggle value={mapOverlay} onChange={setMapOverlay} />
                <WindyEmbed
                  lat={weather.location.lat}
                  lon={weather.location.lon}
                  overlay={mapOverlay}
                  locationLabel={weather.location.name}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {pressureChartData.length > 1 && (
                  <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-brand" />
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-muted">
                          Luchtdruk trend
                        </p>
                      </div>
                      <RangeToggle value={chartRange} onChange={setChartRange} />
                    </div>

                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={pressureChartData} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-brand,#F4C20D)" stopOpacity={0.34} />
                            <stop offset="100%" stopColor="var(--color-brand,#F4C20D)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 6" stroke="#111d2e" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                        <Tooltip content={<ChartTip />} />
                        <Area
                          type="monotone"
                          dataKey="Druk"
                          name="Druk"
                          stroke="var(--color-brand,#F4C20D)"
                          strokeWidth={2.4}
                          fill="url(#pressureGrad)"
                          dot={false}
                          unit=" hPa"
                        />
                      </AreaChart>
                    </ResponsiveContainer>

                    <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
                      Dalende druk = vaker activerende vis. Stijgende druk = vaker rustiger gedrag.
                    </p>
                  </Card>
                )}

                {tempRainChartData.length > 1 && (
                  <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand" />
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-muted">
                          Temperatuur & neerslag
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-0.5 bg-brand rounded" />
                          <span className="text-[9px] text-text-dim font-bold">°C</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-0.5 bg-sky-400 rounded" />
                          <span className="text-[9px] text-text-dim font-bold">%regen</span>
                        </div>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={190}>
                      <AreaChart data={tempRainChartData} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F4C20D" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#F4C20D" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 6" stroke="#111d2e" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTip />} />
                        <Area
                          type="monotone"
                          dataKey="Temp"
                          name="Temp"
                          stroke="#F4C20D"
                          strokeWidth={2.2}
                          fill="url(#tempGrad)"
                          dot={false}
                          unit="°C"
                        />
                        <Area
                          type="monotone"
                          dataKey="Regen"
                          name="Regen"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          fill="url(#rainGrad)"
                          dot={false}
                          unit="%"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>

              <div>
                <SectionHeader
                  icon={Zap}
                  title="Komende uren"
                  right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Altijd 5 uur</span>}
                />
                <Card className="p-3 border border-border-subtle bg-surface-card rounded-[28px] overflow-hidden">
                  <div className="grid grid-cols-5 gap-2">
                    {nextFiveHours.map((hour: any, idx: number) => {
                      const hourScore = calcFishScore(
                        hour.temp_c ?? 0,
                        hour.pressure_mb ?? weather.current.pressure_mb,
                        hour.wind_kph ?? 0,
                        hour.chance_of_rain ?? 0,
                        hour.uv ?? weather.current.uv,
                        today?.astro?.moon_phase ?? ''
                      );

                      return (
                        <div
                          key={`${hour.time}-${idx}`}
                          className={`rounded-2xl border px-2 py-3 text-center min-w-0 ${
                            idx === 0
                              ? 'bg-brand/10 border-brand/25'
                              : 'bg-surface-soft border-border-subtle'
                          }`}
                        >
                          <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${idx === 0 ? 'text-brand' : 'text-text-muted'}`}>
                            {idx === 0 ? 'Nu' : fmtHour(hour.time)}
                          </p>

                          <img src={hour.condition?.icon} alt="" className="w-8 h-8 mx-auto mb-1" />

                          <p className="text-xl font-black text-text-primary leading-none">
                            {Math.round(hour.temp_c)}°
                          </p>

                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-center gap-1 text-[10px] text-sky-400">
                              <CloudRain className="w-3 h-3" />
                              <span className="font-bold">{hour.chance_of_rain ?? 0}%</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-[10px] text-text-dim">
                              <Wind className="w-3 h-3" />
                              <span>{Math.round(hour.wind_kph)} km/u</span>
                            </div>
                          </div>

                          <div className="mt-2 inline-flex px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15">
                            <span className="text-[10px] font-black text-emerald-400">{hourScore}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                  <SectionHeader icon={Anchor} title="Live samenvatting" />
                  <div className="space-y-2.5">
                    <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">Windbeeld</p>
                      <p className="text-lg font-black text-text-primary">{getWindLabel(weather.current.wind_kph)}</p>
                      <p className="text-[10px] text-text-muted">{Math.round(weather.current.wind_kph)} km/u</p>
                    </div>

                    <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">Drukstatus</p>
                      <p className="text-lg font-black text-text-primary">{getPressureLabel(weather.current.pressure_mb)}</p>
                      <p className="text-[10px] text-text-muted">{weather.current.pressure_mb} hPa</p>
                    </div>

                    <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">Zicht</p>
                      <p className="text-lg font-black text-text-primary">{Math.round(weather.current.vis_km)} km</p>
                      <p className="text-[10px] text-text-muted">Actuele zichtconditie</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                  <SectionHeader icon={Fish} title="Beste uren" />
                  <div className="space-y-2.5">
                    {bestWindows.map((item, index) => {
                      const meta = getScoreMeta(item.score);

                      return (
                        <div key={`${item.time}-${index}`} className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-black text-text-primary">{item.hour}</p>
                            <span
                              className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                              style={{
                                color: meta.color,
                                background: `${meta.color}18`,
                                border: `1px solid ${meta.color}30`,
                              }}
                            >
                              {item.score}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-muted">
                            {item.temp}°C · {item.wind} km/u · {item.rain}% regen
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SimplePressureCard pressure={weather.current.pressure_mb} />
                <SimpleUvCard uv={weather.current.uv} />
              </div>

              <WindDirectionCompact
                dir={weather.current.wind_dir}
                speed={weather.current.wind_kph}
                gusts={weather.current.gust_kph}
              />

              <MoonSunCard
                phase={today?.astro?.moon_phase ?? '--'}
                illumination={today?.astro?.moon_illumination ?? 0}
                moonrise={today?.astro?.moonrise ?? '--'}
                moonset={today?.astro?.moonset ?? '--'}
                sunrise={today?.astro?.sunrise ?? '--'}
                sunset={today?.astro?.sunset ?? '--'}
              />

              <div>
                <SectionHeader
                  icon={Cloud}
                  title="Meerdaagse forecast"
                  right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">3 dagen</span>}
                />
                <div className="space-y-2.5">
                  {weather.forecast.forecastday.map((day, idx) => {
                    const dayScore = calcFishScore(
                      day.day.avgtemp_c,
                      weather.current.pressure_mb,
                      day.day.maxwind_kph * 0.6,
                      day.day.daily_chance_of_rain,
                      day.day.uv,
                      day.astro?.moon_phase ?? ''
                    );

                    const meta = getScoreMeta(dayScore);

                    return (
                      <Card key={day.date} className="p-3.5 border border-border-subtle bg-surface-card rounded-[28px]">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <p className="text-base font-black text-text-primary">
                              {idx === 0 ? 'Vandaag' : idx === 1 ? 'Morgen' : fmtDayLong(day.date)}
                            </p>
                            <p className="text-[11px] text-text-muted capitalize truncate">
                              {day.day.condition.text}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <img src={day.day.condition.icon} alt="" className="w-10 h-10" />
                            <div
                              className="w-11 h-11 rounded-2xl border flex flex-col items-center justify-center"
                              style={{
                                background: `${meta.color}18`,
                                borderColor: `${meta.color}30`,
                                color: meta.color,
                              }}
                            >
                              <span className="text-[14px] font-black leading-none">{dayScore}</span>
                              <span className="text-[7px] leading-none mt-0.5">vis</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'Temp', value: `${Math.round(day.day.maxtemp_c)}° / ${Math.round(day.day.mintemp_c)}°` },
                            { label: 'Regen', value: `${day.day.daily_chance_of_rain}%` },
                            { label: 'Wind', value: `${Math.round(day.day.maxwind_kph)} km/u` },
                            { label: 'UV', value: String(day.day.uv) },
                          ].map((item) => (
                            <div key={item.label} className="rounded-2xl bg-surface-soft border border-border-subtle px-2 py-2 text-center">
                              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">
                                {item.label}
                              </p>
                              <p className="text-[11px] font-black text-text-primary leading-tight">
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div>
                <SectionHeader icon={Anchor} title="Vissers analyse" />
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                  <div className="space-y-3">
                    {[
                      {
                        icon: Gauge,
                        title: 'Luchtdruk',
                        text:
                          weather.current.pressure_mb < 1000
                            ? 'Opvallend lage druk. Vaak interessanter voor actiever aasgedrag.'
                            : weather.current.pressure_mb < 1013
                            ? 'Redelijk gunstige druk. Overgangen en aaswissels kunnen goed werken.'
                            : 'Hogere druk. Vis vaker subtieler en strakker op stekkeuze.',
                      },
                      {
                        icon: Wind,
                        title: 'Wind',
                        text:
                          weather.current.wind_kph < 12
                            ? 'Rustige wind. Nauwkeuriger vissen en subtiel presenteren is makkelijker.'
                            : weather.current.wind_kph < 22
                            ? 'Prima mobiele viscondities. Windkant en actieve zones blijven interessant.'
                            : 'Meer drift en controleverlies. Zoek beschutte oevers en stabiele zones.',
                      },
                      {
                        icon: CloudRain,
                        title: 'Front & regen',
                        text:
                          (today?.day?.daily_chance_of_rain ?? 0) > 55
                            ? 'Grotere regenkans kan vis in beweging zetten, zeker rond drukverandering.'
                            : 'Beperkte regenkans. Gebruik vooral druk, licht en wind als leidraad.',
                      },
                      {
                        icon: Sun,
                        title: 'Licht',
                        text:
                          weather.current.uv <= 2
                            ? 'Laag UV. Vis durft vaak vrijer en hoger in de kolom te komen.'
                            : weather.current.uv <= 5
                            ? 'Matig UV. Prima balans tussen zicht en activiteit.'
                            : 'Hoger UV. Ochtend, avond, schaduw en dieper water worden interessanter.',
                      },
                    ].map(({ icon: Icon, title, text }) => (
                      <div key={title} className="rounded-2xl bg-surface-soft border border-border-subtle p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/15 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-brand" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted mb-1">
                              {title}
                            </p>
                            <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </PageLayout>
  );
}