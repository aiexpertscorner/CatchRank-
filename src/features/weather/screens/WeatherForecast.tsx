import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  Cloud,
  CloudRain,
  Compass,
  Droplets,
  Expand,
  Eye,
  Fish,
  Gauge,
  LocateFixed,
  MapPin,
  Minimize,
  Moon,
  RefreshCw,
  Search,
  Sun,
  Thermometer,
  TrendingDown,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { weatherService, WeatherData } from '../services/weatherService';
import { getFishingForecastAdvice } from '../services/weatherForecastAdviceEngine';

const DEFAULT_LOCATION = localStorage.getItem('weatherLocation') || 'Utrecht';
const GEO_STORAGE_KEY = 'weatherGeo';
const GEO_MODE_KEY = 'weatherGeoMode';

type ChartRange = '8u' | '12u' | '24u' | '48u';
type MapOverlay = 'wind' | 'radar' | 'rain';
type FishingDiscipline = 'karper' | 'roofvis';

const RANGE_HOURS: Record<ChartRange, number> = {
  '8u': 8,
  '12u': 12,
  '24u': 24,
  '48u': 48,
};

type StoredGeo = {
  lat: number;
  lon: number;
};

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

function toUnixSecondsFromWeatherApiTime(time: string) {
  return Math.floor(new Date(time).getTime() / 1000);
}

function parseAstroToUnix(baseDate: string, value?: string): number | undefined {
  if (!value || !baseDate) return undefined;

  const match = value.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return undefined;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function moonPhaseStringToNumber(phase?: string): number | undefined {
  const p = (phase || '').toLowerCase();

  if (p.includes('new')) return 0;
  if (p.includes('waxing crescent')) return 0.125;
  if (p.includes('first quarter')) return 0.25;
  if (p.includes('waxing gibbous')) return 0.375;
  if (p.includes('full')) return 0.5;
  if (p.includes('waning gibbous')) return 0.625;
  if (p.includes('last quarter')) return 0.75;
  if (p.includes('waning crescent')) return 0.875;

  return 0.5;
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
      sub: 'Gemiddeld',
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
    sub: 'Sterke kansen',
    color: '#10b981',
    text: 'text-emerald-400',
    soft: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  };
}

function getFishBarColor(score: number) {
  if (score < 25) return '#ef4444';
  if (score < 42) return '#f97316';
  if (score < 58) return '#eab308';
  if (score < 76) return '#22c55e';
  return '#10b981';
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
    <div className="flex bg-surface-soft rounded-xl p-1 gap-1 overflow-x-auto">
      {(['8u', '12u', '24u', '48u'] as ChartRange[]).map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${
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

function DisciplineToggle({
  value,
  onChange,
}: {
  value: FishingDiscipline;
  onChange: (v: FishingDiscipline) => void;
}) {
  return (
    <div className="flex bg-surface-soft rounded-xl p-1 gap-1">
      {(['karper', 'roofvis'] as FishingDiscipline[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
            value === item
              ? 'bg-brand/20 text-brand border border-brand/25'
              : 'text-text-muted'
          }`}
        >
          {item}
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
    { key: 'radar', label: 'Regen' },
    { key: 'wind', label: 'Wind' },
    { key: 'rain', label: 'Neerslag' },
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

function ScoreRing({
  score,
  size = 88,
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
        <span className="text-[20px] font-black text-text-primary leading-none">{score}</span>
        <span className={`text-[8px] font-black uppercase tracking-wider ${meta.text}`}>vis</span>
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

function WindyFrame({
  lat,
  lon,
  overlay,
  compact = false,
}: {
  lat: number;
  lon: number;
  overlay: MapOverlay;
  compact?: boolean;
}) {
  const windyOverlay = overlay === 'rain' ? 'rain' : overlay === 'radar' ? 'radar' : 'wind';

  const src = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&zoom=${compact ? 8 : 9}&level=surface&overlay=${windyOverlay}&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=false&metricWind=default&metricTemp=default&radarRange=-1`;

  return (
    <iframe
      title="Windy live weather map"
      src={src}
      width="100%"
      height="100%"
      style={{ border: 0 }}
      loading="lazy"
      allowFullScreen
    />
  );
}

function FullscreenMapModal({
  open,
  onClose,
  lat,
  lon,
  overlay,
  onOverlayChange,
}: {
  open: boolean;
  onClose: () => void;
  lat: number;
  lon: number;
  overlay: MapOverlay;
  onOverlayChange: (overlay: MapOverlay) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm p-3">
      <div className="h-full w-full rounded-[28px] border border-white/10 bg-[#090d14] overflow-hidden flex flex-col">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
          <MapOverlayToggle value={overlay} onChange={onOverlayChange} />
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shrink-0"
          >
            <Minimize className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 px-3 pb-3">
          <div className="h-full w-full rounded-[24px] overflow-hidden border border-white/10 bg-black">
            <WindyFrame lat={lat} lon={lon} overlay={overlay} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WindyMapCard({
  lat,
  lon,
  overlay,
  onOverlayChange,
  onOpenFullscreen,
}: {
  lat: number;
  lon: number;
  overlay: MapOverlay;
  onOverlayChange: (overlay: MapOverlay) => void;
  onOpenFullscreen: () => void;
}) {
  return (
    <Card className="p-0 border border-border-subtle bg-surface-card rounded-[28px] overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <MapOverlayToggle value={overlay} onChange={onOverlayChange} />
        <div className="flex items-center gap-2 shrink-0">
          <Badge>Live</Badge>
          <button
            type="button"
            onClick={onOpenFullscreen}
            className="h-10 w-10 rounded-xl border border-border-subtle bg-surface-soft flex items-center justify-center"
            aria-label="Open fullscreen map"
          >
            <Expand className="w-4 h-4 text-text-primary" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-[24px] overflow-hidden border border-border-subtle bg-black">
          <div className="aspect-[16/10] min-h-[270px] max-h-[340px]">
            <WindyFrame lat={lat} lon={lon} overlay={overlay} compact />
          </div>
        </div>
      </div>
    </Card>
  );
}

function FishScoreBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="#111d2e" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip content={<ChartTip />} />
        <Bar dataKey="Score" name="Score" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={getFishBarColor(entry.Score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RainBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="#111d2e" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip content={<ChartTip />} />
        <Bar dataKey="Regen" name="Regen" fill="#38bdf8" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TempAreaChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="tempGradMobile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F4C20D" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#F4C20D" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="#111d2e" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTip />} />
        <Area
          type="monotone"
          dataKey="Temp"
          name="Temp"
          stroke="#F4C20D"
          strokeWidth={2.3}
          fill="url(#tempGradMobile)"
          dot={false}
          unit="°C"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PressureAreaChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="pressureGradMobile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#84cc16" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#84cc16" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="#111d2e" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
        <Tooltip content={<ChartTip />} />
        <Area
          type="monotone"
          dataKey="Druk"
          name="Druk"
          stroke="#84cc16"
          strokeWidth={2.1}
          fill="url(#pressureGradMobile)"
          dot={false}
          unit=" hPa"
        />
      </AreaChart>
    </ResponsiveContainer>
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
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-muted">Luchtdruk</p>
      </div>

      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-[34px] font-black text-text-primary leading-none">{pressure}</p>
          <p className="text-xs text-text-muted mt-1">hPa · {label}</p>
        </div>

        <div
          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            goodZone
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
          }`}
        >
          {goodZone ? 'Gunstiger' : 'Minder gunstig'}
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
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-muted">UV Index</p>
      </div>

      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-[34px] font-black text-text-primary leading-none">{uv}</p>
          <p className="text-xs text-text-muted mt-1">{label}</p>
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
        <div className="relative w-20 h-20 shrink-0 rounded-full border border-border-subtle bg-surface-soft flex items-center justify-center">
          <div
            className="absolute w-1 h-7 rounded-full bg-white origin-bottom"
            style={{
              transform: `translateY(-6px) rotate(${rotation}deg)`,
              boxShadow: '0 0 10px rgba(255,255,255,0.15)',
            }}
          />
          <div className="w-9 h-9 rounded-full bg-black/30 border border-white/10 flex flex-col items-center justify-center">
            <span className="text-[12px] font-black text-white leading-none">{Math.round(speed)}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Richting</p>
          <p className="text-[30px] font-black text-text-primary leading-none mb-3">{dir?.toUpperCase() || '--'}</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">Wind</p>
              <p className="text-base font-black text-text-primary leading-none">
                {Math.round(speed)}
                <span className="text-[10px] text-text-muted ml-1">km/u</span>
              </p>
            </div>

            <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">Stoten</p>
              <p className="text-base font-black text-text-primary leading-none">
                {Math.round(gusts)}
                <span className="text-[10px] text-text-muted ml-1">km/u</span>
              </p>
            </div>
          </div>
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
        <div className="relative w-14 h-14 shrink-0 rounded-full overflow-hidden border border-white/10 bg-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#d8dee8_40%,#8b95a7_100%)]" />
          {style === 'new' && <div className="absolute inset-0 bg-[#08101a]" />}
          {style === 'half' && <div className="absolute inset-y-0 right-0 w-1/2 bg-[#08101a]" />}
          {style === 'waxing' && <div className="absolute inset-y-0 right-0 w-2/3 rounded-l-full bg-[#08101a]" />}
          {style === 'waning' && <div className="absolute inset-y-0 left-0 w-2/3 rounded-r-full bg-[#08101a]" />}
          {style === 'full' && <div className="absolute inset-0 shadow-[0_0_18px_rgba(255,255,255,0.24)]" />}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Maanfase</p>
          <p className="text-[22px] font-black text-text-primary leading-tight truncate">{phase}</p>
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
              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">{label}</p>
            </div>
            <p className="text-sm font-black text-text-primary leading-none">{value || '--'}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function buildForecastEngineInput(weather: WeatherData, discipline: FishingDiscipline) {
  const hourly = getAllForecastHours(weather).map((h: any) => ({
    dt: toUnixSecondsFromWeatherApiTime(h.time),
    temp: h.temp_c ?? 0,
    feels_like: h.feelslike_c ?? h.temp_c ?? 0,
    pressure: h.pressure_mb ?? weather.current.pressure_mb ?? 1013,
    humidity: h.humidity ?? weather.current.humidity ?? 0,
    dew_point: h.dewpoint_c ?? undefined,
    uvi: h.uv ?? weather.current.uv ?? 0,
    clouds: h.cloud ?? weather.current.cloud ?? 0,
    visibility: h.vis_km != null ? h.vis_km * 1000 : weather.current.vis_km * 1000,
    wind_speed: h.wind_kph != null ? h.wind_kph / 3.6 : weather.current.wind_kph / 3.6,
    wind_gust: h.gust_kph != null ? h.gust_kph / 3.6 : weather.current.gust_kph / 3.6,
    wind_deg: h.wind_degree ?? weather.current.wind_degree ?? 0,
    pop: h.chance_of_rain != null ? h.chance_of_rain / 100 : 0,
    rain: { '1h': h.precip_mm ?? 0 },
    weather: [{ main: h.condition?.text ?? '' }],
  }));

  const daily = (weather.forecast?.forecastday ?? []).map((d: any) => ({
    dt: Math.floor(new Date(d.date).getTime() / 1000),
    moon_phase: moonPhaseStringToNumber(d.astro?.moon_phase),
    sunrise: parseAstroToUnix(d.date, d.astro?.sunrise),
    sunset: parseAstroToUnix(d.date, d.astro?.sunset),
    moonrise: parseAstroToUnix(d.date, d.astro?.moonrise),
    moonset: parseAstroToUnix(d.date, d.astro?.moonset),
  }));

  return {
    discipline,
    hourly,
    daily,
    month: new Date().getMonth() + 1,
  };
}

export default function WeatherForecast() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [searchValue, setSearchValue] = useState(DEFAULT_LOCATION);
  const [chartRange, setChartRange] = useState<ChartRange>('12u');
  const [mapOverlay, setMapOverlay] = useState<MapOverlay>('radar');
  const [discipline, setDiscipline] = useState<FishingDiscipline>('karper');
  const [usingGeolocation, setUsingGeolocation] = useState(localStorage.getItem(GEO_MODE_KEY) === '1');
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
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

  const engineInput = useMemo(() => {
    if (!weather) return null;
    return buildForecastEngineInput(weather, discipline);
  }, [weather, discipline]);

  const forecastAdvice = useMemo(() => {
    if (!engineInput) return null;
    try {
      return getFishingForecastAdvice(engineInput, { limitHours: 48 });
    } catch {
      return null;
    }
  }, [engineInput]);

  const engineNow = forecastAdvice?.bestNow ?? forecastAdvice?.hourlyScores?.[0];
  const fishScore = engineNow?.score ?? 50;
  const scoreMeta = getScoreMeta(fishScore);

  const fishChartData = useMemo(() => {
    return (forecastAdvice?.hourlyScores ?? [])
      .slice(0, RANGE_HOURS[chartRange])
      .map((h: any) => ({
        time: new Date(h.dt * 1000).toLocaleTimeString('nl-NL', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        Score: h.score,
      }));
  }, [forecastAdvice, chartRange]);

  const pressureChartData = useMemo(() => {
    return chartHours.map((h: any) => ({
      time: fmtHour(h.time),
      Druk: Math.round(h.pressure_mb ?? 0),
    }));
  }, [chartHours]);

  const tempChartData = useMemo(() => {
    return chartHours.map((h: any) => ({
      time: fmtHour(h.time),
      Temp: parseFloat((h.temp_c ?? 0).toFixed(1)),
    }));
  }, [chartHours]);

  const rainChartData = useMemo(() => {
    return chartHours.map((h: any) => ({
      time: fmtHour(h.time),
      Regen: h.chance_of_rain ?? 0,
    }));
  }, [chartHours]);

  const topWindows = forecastAdvice?.topWindows ?? [];
  const parameterHighlights = forecastAdvice?.parameterHighlights?.slice(0, 4) ?? [];
  const sessionAdvice = forecastAdvice?.sessionAdvice?.slice(0, 5) ?? [];
  const bestHours = forecastAdvice?.bestHours?.slice(0, 3) ?? [];

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
        subtitle="Live forecast, kaarten en slimme vissersoutput"
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

        <DisciplineToggle value={discipline} onChange={setDiscipline} />

        {loading && (
          <div className="space-y-3 animate-pulse">
            {[220, 320, 220, 170, 170, 170, 150, 210].map((height, idx) => (
              <div key={idx} style={{ height }} className="bg-surface-card/60 rounded-[28px]" />
            ))}
          </div>
        )}

        {!loading && !weather && (
          <Card className="p-10 text-center border border-dashed border-border-subtle bg-surface-soft/10 rounded-[28px]">
            <Cloud className="w-10 h-10 text-brand/15 mx-auto mb-4" />
            <p className="text-base font-bold text-text-primary mb-1.5">Geen weerdata beschikbaar</p>
            <p className="text-sm text-text-secondary mb-5">Controleer je verbinding of probeer een andere locatie.</p>
            <Button onClick={resetToDefault}>Herstel locatie</Button>
          </Card>
        )}

        {!loading && weather && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${weather.location.name}-${location}-${discipline}`}
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

                      <h2 className="text-[24px] font-black text-text-primary leading-tight truncate">
                        {weather.location.name}
                      </h2>

                      <p className="text-[11px] text-text-muted truncate">
                        {weather.location.region}, {weather.location.country}
                      </p>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <Badge>{weather.current.condition.text}</Badge>
                        <Badge>{discipline}</Badge>
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
                        <span className="text-[58px] font-black text-text-primary tracking-tighter leading-none">
                          {Math.round(weather.current.temp_c)}
                        </span>
                        <span className="text-[24px] font-black text-brand mb-2">°C</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Gevoel</p>
                      <p className="text-base font-black text-text-primary">{Math.round(weather.current.feelslike_c)}°</p>
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
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Slim advies nu</p>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {forecastAdvice?.overallSummary || 'Forecast analyse wordt opgebouwd.'}
                    </p>
                    {engineNow?.primaryAdvice?.[0] && (
                      <p className="text-[12px] text-text-primary font-semibold mt-2">{engineNow.primaryAdvice[0]}</p>
                    )}
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <SectionHeader
                  icon={Waves}
                  title="Live kaart"
                  right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Map first</span>}
                />
                <WindyMapCard
                  lat={weather.location.lat}
                  lon={weather.location.lon}
                  overlay={mapOverlay}
                  onOverlayChange={setMapOverlay}
                  onOpenFullscreen={() => setMapFullscreen(true)}
                />
              </div>

              <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <SectionHeader icon={Fish} title="Visscore per uur" />
                  <RangeToggle value={chartRange} onChange={setChartRange} />
                </div>
                <FishScoreBarChart data={fishChartData} />
                <p className="text-[11px] text-text-muted mt-2">
                  Groen = sterkere uren. Geel = gemiddeld. Oranje/rood = lastiger.
                </p>
              </Card>

              <div className="grid grid-cols-1 gap-3">
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                  <SectionHeader
                    icon={Zap}
                    title="Beste planvensters"
                    right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Planning</span>}
                  />
                  <div className="space-y-2.5">
                    {topWindows.length ? (
                      topWindows.map((window: any, index: number) => {
                        const start = new Date(window.startDt * 1000);
                        const end = new Date(window.endDt * 1000);
                        const meta = getScoreMeta(window.avgScore);

                        return (
                          <div key={index} className="rounded-2xl bg-surface-soft border border-border-subtle px-3.5 py-3">
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <p className="text-sm font-black text-text-primary">
                                {start.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} –{' '}
                                {end.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <span
                                className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                                style={{
                                  color: meta.color,
                                  background: `${meta.color}18`,
                                  border: `1px solid ${meta.color}30`,
                                }}
                              >
                                {window.avgScore}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-muted">
                              Mooie aaneengesloten uren om gericht te plannen, te verkassen of langer te blijven zitten.
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3.5 py-3">
                        <p className="text-sm text-text-muted">
                          Geen uitgesproken blokken gevonden. Focus dan op losse beste uren en flexibel vissen.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                  <SectionHeader
                    icon={Anchor}
                    title="Waarom nu goed of lastig"
                    right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Drivers</span>}
                  />
                  <div className="space-y-2.5">
                    {(engineNow?.reasons ?? []).slice(0, 4).map((reason: string, index: number) => (
                      <div key={index} className="rounded-2xl bg-surface-soft border border-border-subtle px-3.5 py-3">
                        <p className="text-sm text-text-secondary leading-relaxed">{reason}</p>
                      </div>
                    ))}
                    {!engineNow?.reasons?.length && (
                      <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3.5 py-3">
                        <p className="text-sm text-text-muted">Nog geen specifieke drivers beschikbaar.</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                <SectionHeader
                  icon={CloudRain}
                  title="Neerslag forecast"
                  right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">{chartRange}</span>}
                />
                <RainBarChart data={rainChartData} />
              </Card>

              <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                <SectionHeader
                  icon={Thermometer}
                  title="Temperatuur trend"
                  right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">{chartRange}</span>}
                />
                <TempAreaChart data={tempChartData} />
              </Card>

              <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                <SectionHeader
                  icon={TrendingDown}
                  title="Luchtdruk trend"
                  right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">{chartRange}</span>}
                />
                <PressureAreaChart data={pressureChartData} />
              </Card>

              <div>
                <SectionHeader
                  icon={Zap}
                  title="Komende uren"
                  right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Altijd 5 uur</span>}
                />
                <Card className="p-3 border border-border-subtle bg-surface-card rounded-[28px] overflow-hidden">
                  <div className="grid grid-cols-5 gap-2">
                    {nextFiveHours.map((hour: any, idx: number) => {
                      const matchingEngineHour =
                        forecastAdvice?.hourlyScores?.find(
                          (item: any) => item.dt === toUnixSecondsFromWeatherApiTime(hour.time)
                        ) ?? null;
                      const score = matchingEngineHour?.score ?? 50;

                      return (
                        <div
                          key={`${hour.time}-${idx}`}
                          className={`rounded-2xl border px-2 py-3 text-center min-w-0 ${
                            idx === 0 ? 'bg-brand/10 border-brand/25' : 'bg-surface-soft border-border-subtle'
                          }`}
                        >
                          <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${idx === 0 ? 'text-brand' : 'text-text-muted'}`}>
                            {idx === 0 ? 'Nu' : fmtHour(hour.time)}
                          </p>

                          <img src={hour.condition?.icon} alt="" className="w-8 h-8 mx-auto mb-1" />

                          <p className="text-lg font-black text-text-primary leading-none">{Math.round(hour.temp_c)}°</p>

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
                            <span className="text-[10px] font-black text-emerald-400">{score}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                  <SectionHeader
                    icon={Fish}
                    title="Sessieadvies"
                    right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Engine</span>}
                  />
                  <div className="space-y-2.5">
                    {sessionAdvice.length ? (
                      sessionAdvice.map((tip: string, index: number) => (
                        <div key={index} className="rounded-2xl bg-surface-soft border border-border-subtle px-3.5 py-3">
                          <p className="text-sm text-text-secondary leading-relaxed">{tip}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3.5 py-3">
                        <p className="text-sm text-text-muted">Nog geen sessieadvies beschikbaar.</p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                  <SectionHeader
                    icon={Gauge}
                    title="Top parameters"
                    right={<span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Belangrijkste invloeden</span>}
                  />
                  <div className="space-y-2.5">
                    {parameterHighlights.length ? (
                      parameterHighlights.map((item: any, index: number) => (
                        <div key={index} className="rounded-2xl bg-surface-soft border border-border-subtle px-3.5 py-3">
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <p className="text-sm font-black text-text-primary">{item.label}</p>
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                                item.scoreImpact >= 3
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                  : item.scoreImpact <= -3
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              }`}
                            >
                              {item.valueLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary leading-relaxed">{item.summary}</p>
                          {item.tips?.[0] && <p className="text-[11px] text-text-muted mt-1.5">{item.tips[0]}</p>}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-surface-soft border border-border-subtle px-3.5 py-3">
                        <p className="text-sm text-text-muted">Nog geen parameter-highlights beschikbaar.</p>
                      </div>
                    )}
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
                    const dayStart = Math.floor(new Date(day.date).getTime() / 1000);
                    const dayHourScores =
                      forecastAdvice?.hourlyScores?.filter((item: any) => {
                        const d = new Date(item.dt * 1000);
                        const dateOnly = new Date(dayStart * 1000);
                        return (
                          d.getFullYear() === dateOnly.getFullYear() &&
                          d.getMonth() === dateOnly.getMonth() &&
                          d.getDate() === dateOnly.getDate()
                        );
                      }) ?? [];

                    const dayAvg =
                      dayHourScores.length > 0
                        ? Math.round(dayHourScores.reduce((sum: number, item: any) => sum + item.score, 0) / dayHourScores.length)
                        : 50;

                    const meta = getScoreMeta(dayAvg);

                    return (
                      <Card key={day.date} className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <p className="text-[16px] font-black text-text-primary">
                              {idx === 0 ? 'Vandaag' : idx === 1 ? 'Morgen' : fmtDayLong(day.date)}
                            </p>
                            <p className="text-[11px] text-text-muted capitalize truncate">{day.day.condition.text}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <img src={day.day.condition.icon} alt="" className="w-10 h-10" />
                            <div
                              className="w-12 h-12 rounded-2xl border flex flex-col items-center justify-center"
                              style={{
                                background: `${meta.color}18`,
                                borderColor: `${meta.color}30`,
                                color: meta.color,
                              }}
                            >
                              <span className="text-[15px] font-black leading-none">{dayAvg}</span>
                              <span className="text-[7px] leading-none mt-0.5">vis</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { label: 'Temp', value: `${Math.round(day.day.maxtemp_c)}° / ${Math.round(day.day.mintemp_c)}°` },
                            { label: 'Regen kans', value: `${day.day.daily_chance_of_rain}%` },
                            { label: 'Neerslag', value: `${day.day.totalprecip_mm} mm` },
                            { label: 'Wind', value: `${Math.round(day.day.maxwind_kph)} km/u` },
                            { label: 'Vocht', value: `${Math.round(day.day.avghumidity ?? 0)}%` },
                            { label: 'UV', value: String(day.day.uv) },
                          ].map((item) => (
                            <div key={item.label} className="rounded-2xl bg-surface-soft border border-border-subtle px-3 py-2.5">
                              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">{item.label}</p>
                              <p className="text-[12px] font-black text-text-primary leading-tight">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div>
                <SectionHeader icon={Anchor} title="Beste uren vandaag" />
                <div className="space-y-2.5">
                  {bestHours.length ? (
                    bestHours.map((hour: any, index: number) => {
                      const meta = getScoreMeta(hour.score);
                      return (
                        <Card key={index} className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div>
                              <p className="text-sm font-black text-text-primary">
                                {new Date(hour.dt * 1000).toLocaleTimeString('nl-NL', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="text-[11px] text-text-muted">
                                Confidence {Math.round((hour.confidence ?? 0.7) * 100)}%
                              </p>
                            </div>
                            <span
                              className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                              style={{
                                color: meta.color,
                                background: `${meta.color}18`,
                                border: `1px solid ${meta.color}30`,
                              }}
                            >
                              {hour.score}
                            </span>
                          </div>

                          {hour.primaryAdvice?.slice(0, 2).map((tip: string, i: number) => (
                            <p key={i} className="text-sm text-text-secondary leading-relaxed mb-1">
                              {tip}
                            </p>
                          ))}
                        </Card>
                      );
                    })
                  ) : (
                    <Card className="p-4 border border-border-subtle bg-surface-card rounded-[28px]">
                      <p className="text-sm text-text-muted">Nog geen uitgesproken beste uren gevonden.</p>
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {weather && (
        <FullscreenMapModal
          open={mapFullscreen}
          onClose={() => setMapFullscreen(false)}
          lat={weather.location.lat}
          lon={weather.location.lon}
          overlay={mapOverlay}
          onOverlayChange={setMapOverlay}
        />
      )}
    </PageLayout>
  );
}