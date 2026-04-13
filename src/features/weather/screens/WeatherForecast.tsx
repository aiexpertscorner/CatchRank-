import React, { useEffect, useMemo, useState } from 'react';
import {
  Cloud, Sun, Wind, Thermometer, Droplets, Search, MapPin,
  Clock, Waves, Sunrise, Sunset, Zap, ArrowUpRight,
  Moon, Compass, Gauge, Eye, ArrowLeft, CloudRain, RefreshCw,
  TrendingDown, TrendingUp, Anchor,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { weatherService, WeatherData } from '../services/weatherService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const DEFAULT_LOCATION = localStorage.getItem('weatherLocation') || 'Utrecht';

// ─────────────────────────────────────────────
// FISH ACTIVITY SCORE SYSTEM
// ─────────────────────────────────────────────

function calcFishScore(
  temp: number,
  pressure: number,
  windKph: number,
  rainChance: number,
  uv: number,
  moonPhase: string
): number {
  let score = 50;

  // Temperature sweet spot 10–20°C for Dutch freshwater
  if (temp >= 12 && temp <= 20) score += 10;
  else if (temp >= 8 && temp < 12) score += 4;
  else if (temp > 20 && temp <= 26) score += 3;
  else if (temp < 5) score -= 14;
  else if (temp > 28) score -= 8;

  // Pressure: low/falling = active fish
  if (pressure < 1000) score += 14;
  else if (pressure < 1010) score += 8;
  else if (pressure >= 1010 && pressure < 1015) score += 2;
  else if (pressure > 1025) score -= 5;

  // Wind
  if (windKph < 8) score += 8;
  else if (windKph < 18) score += 4;
  else if (windKph > 30) score -= 15;
  else if (windKph > 45) score -= 22;

  // Approaching front
  if (rainChance > 40 && rainChance < 70 && windKph < 22) score += 8;
  else if (rainChance > 80) score -= 5;

  // UV
  if (uv >= 7) score -= 5;
  else if (uv <= 2) score += 3;

  // Moon
  const mp = (moonPhase || '').toLowerCase();
  if (mp.includes('full')) score += 8;
  else if (mp.includes('new')) score += 6;

  return Math.max(5, Math.min(95, score));
}

function getScoreMeta(score: number) {
  if (score < 25) return { label: 'SLECHT', sublabel: 'Weinig visactiviteit verwacht', color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
  if (score < 42) return { label: 'MATIG', sublabel: 'Beperkte kansen vandaag', color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' };
  if (score < 58) return { label: 'NORMAAL', sublabel: 'Gemiddelde visomstandigheden', color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' };
  if (score < 76) return { label: 'GOED', sublabel: 'Gunstige condities voor vis', color: '#22c55e', bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' };
  return { label: 'UITSTEKEND', sublabel: 'Optimale visomstandigheden!', color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
}

function getFishAdvice(temp: number, pressure: number, windKph: number, rainChance: number, uv: number, moonPhase: string): string {
  const mp = (moonPhase || '').toLowerCase();
  if (mp.includes('full') || mp.includes('new'))
    return 'De maan staat gunstig — vissen zijn actiever tijdens volle en nieuwe maan. Benut de schemering voor de beste beten.';
  if (pressure < 1005 && windKph < 22)
    return 'Dalende luchtdruk activeert het eetgedrag. Focus op actieve zones en overgangen — de vis staat aan.';
  if (windKph > 30)
    return 'Harde wind maakt precisie lastig. Zoek beschutte oevers of diepere zones waar vis rustiger staat.';
  if (temp < 6)
    return 'Lage watertemperatuur vertraagt het metabolisme. Vis trager en focus op diepe stabiele plekken.';
  if (rainChance > 50 && rainChance < 75 && windKph < 20)
    return 'Naderend regenfront kan activiteit triggeren. Let op drukwisselingen en vis de windkant.';
  if (uv >= 7)
    return 'Hoge UV drijft vis naar diepte of schaduw. Subtielere presentaties en vroegere uren presteren beter.';
  if (temp >= 14 && temp <= 20 && windKph < 18)
    return 'Comfortabele temperatuur en rustige wind — ideale basisomstandigheden. Kies stekken op seizoen en soort.';
  return 'Neutrale omstandigheden. Varieer diepte, presentatie en stek om te ontdekken waar de vis actief is.';
}

// ─────────────────────────────────────────────
// TIME HELPERS
// ─────────────────────────────────────────────

function parseAstroTime(t: string): number {
  if (!t) return 0;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function parseLocaltime(lt: string): number {
  if (!lt) return 0;
  const parts = lt.split(' ');
  if (parts.length < 2) return 0;
  const [h, m] = parts[1].split(':').map(Number);
  return h * 60 + m;
}

function formatHourLabel(time: string) {
  try { return new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' }).format(new Date(time)); }
  catch { return time; }
}

function formatDayLong(date: string) {
  try { return new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(date)); }
  catch { return date; }
}

function getHourlyList(weather: WeatherData | null): any[] {
  const hours = ((weather?.forecast?.forecastday?.[0] as any)?.hour ?? []) as any[];
  if (!Array.isArray(hours)) return [];
  const now = Date.now();
  return hours.filter((h: any) => new Date(h.time).getTime() >= now - 60 * 60 * 1000).slice(0, 12);
}

// ─────────────────────────────────────────────
// SVG: FISH ACTIVITY BAR
// ─────────────────────────────────────────────

function FishActivityBar({ score }: { score: number }) {
  const pct = score / 100;
  const meta = getScoreMeta(score);
  return (
    <div className="relative mt-2 mb-12">
      <div className="h-10 rounded-full overflow-visible relative" style={{
        background: 'linear-gradient(to right, #ef4444 0%, #f97316 22%, #eab308 44%, #84cc16 66%, #22c55e 84%, #10b981 100%)',
      }}>
        <div className="absolute inset-0 flex items-center justify-between px-5 pointer-events-none">
          <span className="text-[9px] font-black text-white/85 uppercase tracking-widest drop-shadow-sm">SLECHT</span>
          <span className="text-[9px] font-black text-white/85 uppercase tracking-widest drop-shadow-sm">NORMAAL</span>
          <span className="text-[9px] font-black text-white/85 uppercase tracking-widest drop-shadow-sm">GOED</span>
        </div>
      </div>
      {/* Triangle pointer */}
      <motion.div
        className="absolute"
        style={{ top: '-14px', left: `calc(${pct * 100}% - 9px)` }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90, damping: 14, delay: 0.5 }}
      >
        <div style={{
          width: 0, height: 0,
          borderLeft: '9px solid transparent', borderRight: '9px solid transparent',
          borderTop: `14px solid ${meta.color}`,
          filter: `drop-shadow(0 2px 6px ${meta.color}88)`,
        }} />
      </motion.div>
      {/* Score pill */}
      <motion.div
        className="absolute flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black text-white shadow-lg"
        style={{
          top: '48px', left: `calc(${pct * 100}% - 36px)`,
          background: meta.color, boxShadow: `0 4px 14px ${meta.color}55`,
          minWidth: '72px',
        }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 130, damping: 14, delay: 0.7 }}
      >
        {meta.label}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SVG: PRESSURE GAUGE (semicircle)
// ─────────────────────────────────────────────

function PressureGauge({ pressure }: { pressure: number }) {
  const MIN = 975, MAX = 1045;
  const pct = Math.max(0, Math.min(1, (pressure - MIN) / (MAX - MIN)));
  const cx = 65, cy = 70, r = 52;
  const angle = Math.PI - pct * Math.PI;
  const dotX = cx + r * Math.cos(angle);
  const dotY = cy - r * Math.sin(angle);

  const arcD = (a1: number, a2: number, radius: number) => {
    const x1 = cx + radius * Math.cos(a1), y1 = cy - radius * Math.sin(a1);
    const x2 = cx + radius * Math.cos(a2), y2 = cy - radius * Math.sin(a2);
    const large = Math.abs(a1 - a2) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 0 ${x2} ${y2}`;
  };

  const label = pressure < 1000 ? 'Laag' : pressure < 1013 ? 'Normaal' : 'Hoog';
  const lcolor = pressure < 1000 ? '#22c55e' : pressure < 1013 ? '#eab308' : '#94a3b8';

  const ticks = Array.from({ length: 15 }, (_, i) => {
    const tp = i / 14;
    const ta = Math.PI - tp * Math.PI;
    const isMajor = i % 7 === 0 || i === 7;
    return {
      x1: cx + (r - 2) * Math.cos(ta), y1: cy - (r - 2) * Math.sin(ta),
      x2: cx + (isMajor ? r - 14 : r - 7) * Math.cos(ta),
      y2: cy - (isMajor ? r - 14 : r - 7) * Math.sin(ta),
      major: isMajor,
    };
  });

  return (
    <div className="flex flex-col items-center justify-center">
      <svg viewBox="0 0 130 88" className="w-full max-w-[200px]">
        <defs>
          <linearGradient id="pgGrad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="45%" stopColor="#84cc16" />
            <stop offset="70%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <filter id="pgGlow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <path d={arcD(Math.PI, 0, r)} fill="none" stroke="#1e2d3d" strokeWidth="8" strokeLinecap="round" />
        {/* Ticks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.major ? '#374151' : '#1f2937'} strokeWidth={t.major ? 1.5 : 0.8} />
        ))}
        {/* Progress */}
        <path d={arcD(Math.PI, angle, r)} fill="none" stroke="url(#pgGrad)" strokeWidth="7" strokeLinecap="round" />
        {/* Glow dot */}
        <circle cx={dotX} cy={dotY} r="7" fill={lcolor} opacity="0.22" />
        <circle cx={dotX} cy={dotY} r="4.5" fill={lcolor} filter="url(#pgGlow)" />
        <circle cx={dotX} cy={dotY} r="2.5" fill="white" />
        {/* Center text */}
        <text x={cx} y={cy + 6} textAnchor="middle" fill="white" fontSize="15" fontWeight="900" fontFamily="system-ui">{pressure}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill={lcolor} fontSize="7.5" fontWeight="700" fontFamily="system-ui">hPa · {label}</text>
        {/* Range */}
        <text x="10" y={cy + 6} fill="#374151" fontSize="6" fontFamily="system-ui">975</text>
        <text x="108" y={cy + 6} fill="#374151" fontSize="6" fontFamily="system-ui">1045</text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// SVG: UV INDEX BAR
// ─────────────────────────────────────────────

function UVBar({ uv }: { uv: number }) {
  const pct = Math.min(1, uv / 11);
  const label = uv <= 2 ? 'Laag' : uv <= 5 ? 'Matig' : uv <= 7 ? 'Hoog' : uv <= 10 ? 'Zeer Hoog' : 'Extreem';
  const color = uv <= 2 ? '#22c55e' : uv <= 5 ? '#eab308' : uv <= 7 ? '#f97316' : uv <= 10 ? '#ef4444' : '#7c3aed';
  return (
    <div className="space-y-3">
      <div className="relative h-3 rounded-full overflow-hidden" style={{
        background: 'linear-gradient(to right, #22c55e 0%, #84cc16 18%, #eab308 36%, #f97316 54%, #ef4444 72%, #7c3aed 100%)',
      }}>
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 shadow-lg"
          style={{ left: `calc(${pct * 100}% - 10px)`, background: color, borderColor: 'rgba(15,23,42,0.8)' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, delay: 0.4 }}
        />
      </div>
      <div className="flex items-end justify-between">
        <span className="text-4xl font-black text-text-primary leading-none">{uv}</span>
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-white"
          style={{ background: color }}>{label}</span>
      </div>
      <p className="text-[10px] text-text-muted">
        {uv <= 2 ? 'Geen bescherming nodig' : uv <= 5 ? 'Zonnebrand aanbevolen' : uv <= 7 ? 'Bescherming noodzakelijk' : 'Vermijd direct zonlicht'}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// SVG: WIND COMPASS
// ─────────────────────────────────────────────

function WindCompass({ dir, speed, gusts }: { dir: string; speed: number; gusts: number }) {
  const dirMap: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  const deg = dirMap[dir?.toUpperCase()] ?? 0;
  const cx = 52, cy = 52;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 104 104" className="w-28 h-28 shrink-0">
        <circle cx={cx} cy={cy} r="48" fill="none" stroke="#1e2d3d" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="40" fill="none" stroke="#111827" strokeWidth="0.5" />
        {Array.from({ length: 16 }, (_, i) => {
          const a = ((i * 22.5 - 90) * Math.PI) / 180;
          const major = i % 4 === 0;
          return (
            <line key={i}
              x1={cx + 48 * Math.cos(a)} y1={cy + 48 * Math.sin(a)}
              x2={cx + (major ? 38 : 41) * Math.cos(a)} y2={cy + (major ? 38 : 41) * Math.sin(a)}
              stroke={major ? '#4b5563' : '#1f2937'} strokeWidth={major ? 1.5 : 0.8}
            />
          );
        })}
        {([['N', -90, '#f59e0b'], ['E', 0, '#6b7280'], ['S', 90, '#6b7280'], ['W', 180, '#6b7280']] as [string, number, string][]).map(([d, aDeg, col]) => {
          const a = (aDeg * Math.PI) / 180;
          return (
            <text key={d} x={cx + 28 * Math.cos(a)} y={cy + 28 * Math.sin(a) + 3}
              textAnchor="middle" fill={col} fontSize="8.5" fontWeight="900" fontFamily="system-ui">{d}</text>
          );
        })}
        <g transform={`rotate(${deg}, ${cx}, ${cy})`}>
          <polygon points={`${cx},${cy - 32} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`} fill="white" opacity="0.95" />
          <polygon points={`${cx},${cy + 32} ${cx - 3},${cy + 4} ${cx + 3},${cy + 4}`} fill="#374151" />
        </g>
        <circle cx={cx} cy={cy} r="16" fill="#0d1829" stroke="#1e2d3d" strokeWidth="1" />
        <text x={cx} y={cy - 1} textAnchor="middle" fill="white" fontSize="9" fontWeight="900" fontFamily="system-ui">{Math.round(speed)}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fill="#6b7280" fontSize="5.5" fontFamily="system-ui">km/h</text>
      </svg>
      <div className="flex-1 space-y-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-text-muted mb-0.5">Windrichting</p>
          <p className="text-3xl font-black text-text-primary leading-none">{dir?.toUpperCase() || '--'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-surface-soft border border-border-subtle p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">Wind</p>
            <p className="text-sm font-bold text-text-primary">{Math.round(speed)} <span className="text-text-muted text-[10px]">km/u</span></p>
          </div>
          <div className="rounded-xl bg-surface-soft border border-border-subtle p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">Stoten</p>
            <p className="text-sm font-bold text-text-primary">{Math.round(gusts)} <span className="text-text-muted text-[10px]">km/u</span></p>
          </div>
        </div>
        <p className="text-[10px] text-text-muted leading-relaxed">
          {speed < 10 ? 'Windstil — ideaal voor nauwkeurige presentatie'
            : speed < 20 ? 'Lichte bries — goed vissen mogelijk'
            : speed < 30 ? 'Matige wind — zoek beschutte zones'
            : 'Stevige wind — moeilijkere omstandigheden'}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SVG: SUN ARC
// ─────────────────────────────────────────────

function SunArc({ sunrise, sunset, localtime }: { sunrise: string; sunset: string; localtime: string }) {
  const srMin = parseAstroTime(sunrise);
  const ssMin = parseAstroTime(sunset);
  const nowMin = parseLocaltime(localtime);
  const isDay = nowMin >= srMin && nowMin <= ssMin;
  const pct = isDay ? Math.max(0, Math.min(1, (nowMin - srMin) / (ssMin - srMin))) : nowMin > ssMin ? 1 : 0;

  const cx = 100, cy = 78, r = 62;
  const dotAngle = Math.PI * (1 - pct);
  const dotX = cx + r * Math.cos(dotAngle);
  const dotY = cy - r * Math.sin(dotAngle);
  const fullArc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const elapsedArc = `M ${cx - r} ${cy} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${dotX} ${dotY}`;

  return (
    <div>
      <svg viewBox="0 0 200 96" className="w-full">
        <defs>
          <linearGradient id="sunArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
          </linearGradient>
          <filter id="sunGlow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d={fullArc} fill="none" stroke="#1e2d3d" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 4" />
        {pct > 0.01 && (
          <path d={elapsedArc} fill="none" stroke="url(#sunArcGrad)" strokeWidth="2.5" strokeLinecap="round" />
        )}
        <line x1={cx - r - 12} y1={cy} x2={cx + r + 12} y2={cy} stroke="#1e2d3d" strokeWidth="1" />
        {isDay && (
          <>
            <circle cx={dotX} cy={dotY} r="14" fill="#f59e0b" opacity="0.12" />
            <circle cx={dotX} cy={dotY} r="9" fill="#f59e0b" opacity="0.3" />
            <circle cx={dotX} cy={dotY} r="5.5" fill="#f59e0b" filter="url(#sunGlow)" />
          </>
        )}
        <text x={cx - r} y={cy + 16} textAnchor="middle" fill="#6b7280" fontSize="7.5" fontFamily="system-ui">{sunrise}</text>
        <text x={cx + r} y={cy + 16} textAnchor="middle" fill="#6b7280" fontSize="7.5" fontFamily="system-ui">{sunset}</text>
        <text x={cx - r - 6} y={cy - 4} textAnchor="middle" fill="#374151" fontSize="7" fontFamily="system-ui">↑</text>
        <text x={cx + r + 6} y={cy - 4} textAnchor="middle" fill="#374151" fontSize="7" fontFamily="system-ui">↓</text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// MOON PHASE VISUAL
// ─────────────────────────────────────────────

function MoonVisual({ phase, illumination }: { phase: string; illumination: string | number }) {
  const mp = (phase || '').toLowerCase();
  const pct = parseInt(String(illumination)) / 100;
  const isFull = mp.includes('full');
  const isNew = mp.includes('new');
  const isWaning = mp.includes('waning');

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-14 h-14 rounded-full shrink-0" style={{
        background: isNew
          ? 'radial-gradient(circle at 40% 40%, #1e293b, #0f172a)'
          : 'radial-gradient(circle at 35% 35%, #f1f5f9 0%, #cbd5e1 40%, #94a3b8 100%)',
        boxShadow: isFull ? '0 0 24px rgba(241,245,249,0.25)' : 'none',
      }}>
        {!isFull && !isNew && (
          <div className="absolute inset-0 rounded-full" style={{
            background: `radial-gradient(ellipse at ${isWaning ? `${(1 - pct) * 120}%` : `${pct * 120}%`} 50%, rgba(15,23,42,0.95) ${25 + (1 - pct) * 30}%, transparent 70%)`,
          }} />
        )}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Maanfase</p>
        <p className="text-base font-bold text-text-primary leading-tight">{phase || '--'}</p>
        <p className="text-xs text-text-secondary mt-0.5">{illumination}% verlicht</p>
        {(isFull || isNew) && (
          <span className="inline-block mt-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
            Visbonus +8
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// RECHARTS TOOLTIP
// ─────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-text-muted mb-1 font-bold">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-black">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(p.name === 'Druk' ? 0 : 1) : p.value}{p.unit || ''}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// FACTOR PILL
// ─────────────────────────────────────────────

function FactorPill({ label, good }: { label: string; good: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
      good ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
    }`}>
      {good ? '↑' : '↓'} {label}
    </span>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function WeatherForecast() {
  const navigate = useNavigate();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [searchValue, setSearchValue] = useState(DEFAULT_LOCATION);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await weatherService.fetchWeather(location);
        setWeather(data);
      } catch {
        toast.error('Fout bij ophalen weerdata');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [location]);

  const hourly = useMemo(() => getHourlyList(weather), [weather]);
  const today = weather?.forecast?.forecastday?.[0];

  const fishScore = useMemo(() => {
    if (!weather) return 50;
    return calcFishScore(
      weather.current.temp_c, weather.current.pressure_mb, weather.current.wind_kph,
      today?.day?.daily_chance_of_rain ?? 0, weather.current.uv, today?.astro?.moon_phase ?? ''
    );
  }, [weather, today]);

  const scoreMeta = getScoreMeta(fishScore);

  const fishAdvice = useMemo(() => {
    if (!weather) return '';
    return getFishAdvice(
      weather.current.temp_c, weather.current.pressure_mb, weather.current.wind_kph,
      today?.day?.daily_chance_of_rain ?? 0, weather.current.uv, today?.astro?.moon_phase ?? ''
    );
  }, [weather, today]);

  const pressureChartData = useMemo(() =>
    hourly.slice(0, 8).map((h: any) => ({ time: formatHourLabel(h.time), Druk: Math.round(h.pressure_mb ?? 0) })),
    [hourly]);

  const tempRainChartData = useMemo(() =>
    hourly.slice(0, 8).map((h: any) => ({
      time: formatHourLabel(h.time),
      Temp: parseFloat((h.temp_c ?? 0).toFixed(1)),
      Regen: h.chance_of_rain ?? 0,
    })),
    [hourly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = searchValue.trim();
    if (!next) return;
    localStorage.setItem('weatherLocation', next);
    setLocation(next);
  };

  const factors = weather ? [
    { label: 'Lage druk', good: weather.current.pressure_mb < 1013 },
    { label: `${Math.round(weather.current.wind_kph)} km/u`, good: weather.current.wind_kph < 22 },
    { label: `${Math.round(weather.current.temp_c)}°C`, good: weather.current.temp_c >= 10 && weather.current.temp_c <= 22 },
    { label: `UV ${weather.current.uv}`, good: weather.current.uv < 6 },
    { label: `${today?.day?.daily_chance_of_rain ?? 0}% regen`, good: (today?.day?.daily_chance_of_rain ?? 0) < 70 },
    ...((today?.astro?.moon_phase?.toLowerCase().includes('full') || today?.astro?.moon_phase?.toLowerCase().includes('new'))
      ? [{ label: 'Gunstige maan', good: true }] : []),
  ] : [];

  return (
    <PageLayout>
      <PageHeader
        title="Weer & Visadvies"
        subtitle="Uitgebreide forecast, visscores en realtime omstandigheden"
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

      <div className="space-y-4 pb-32 px-1 md:px-0">
        {/* Nav */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/')} className="h-10 rounded-xl px-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <Button variant="ghost" onClick={() => { localStorage.setItem('weatherLocation', 'Utrecht'); setSearchValue('Utrecht'); setLocation('Utrecht'); }} className="h-10 rounded-xl px-4">
            <RefreshCw className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            {[260, 200, 80, 220].map((h, i) => (
              <div key={i} style={{ height: h }} className="bg-surface-card rounded-[1.75rem]" />
            ))}
          </div>
        )}

        {/* No data */}
        {!loading && !weather && (
          <Card className="p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl">
            <Cloud className="w-12 h-12 text-brand/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-text-primary">Geen weerdata beschikbaar</h3>
            <p className="text-sm text-text-secondary mb-6">Controleer je verbinding of probeer een andere locatie.</p>
            <Button onClick={() => { setSearchValue('Utrecht'); setLocation('Utrecht'); }}>Herstel locatie</Button>
          </Card>
        )}

        {/* ─── MAIN CONTENT ─── */}
        {!loading && weather && (
          <AnimatePresence mode="wait">
            <motion.div key={location} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-4">

              {/* 1. HERO */}
              <Card className="p-5 border border-border-subtle bg-surface-card rounded-[2rem] relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl -mr-24 -mt-24 opacity-60"
                    style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)' }} />
                </div>
                <div className="relative z-10">
                  {/* Location */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-brand" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-brand">Live locatie</p>
                        <h2 className="text-xl font-black text-text-primary tracking-tight leading-none">{weather.location.name}</h2>
                        <p className="text-[10px] text-text-muted mt-0.5">{weather.location.region}, {weather.location.country}</p>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-surface-soft border border-border-subtle flex items-center justify-center shrink-0">
                      {weather.current.condition.icon
                        ? <img src={weather.current.condition.icon} alt="weer" className="w-10 h-10" />
                        : <Cloud className="w-6 h-6 text-brand" />}
                    </div>
                  </div>
                  {/* Temp */}
                  <div className="flex items-end gap-4 mb-4">
                    <div className="flex items-start">
                      <span className="text-[68px] font-black text-text-primary leading-none tracking-tighter">
                        {Math.round(weather.current.temp_c)}
                      </span>
                      <span className="text-3xl font-black text-brand mt-3">°C</span>
                    </div>
                    <div className="pb-2">
                      <p className="text-base font-bold text-text-primary capitalize leading-tight">{weather.current.condition.text}</p>
                      <p className="text-xs text-text-secondary">Gevoel {Math.round(weather.current.feelslike_c)}°C</p>
                      <p className="text-xs text-text-secondary">↑ {Math.round(today?.day?.maxtemp_c ?? weather.current.temp_c)}° &nbsp;↓ {Math.round(today?.day?.mintemp_c ?? weather.current.temp_c)}°</p>
                    </div>
                  </div>
                  {/* 4-stat grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { icon: Wind, label: 'Wind', val: `${Math.round(weather.current.wind_kph)}` },
                      { icon: Compass, label: 'Richting', val: weather.current.wind_dir?.toUpperCase() },
                      { icon: Gauge, label: 'Druk', val: `${weather.current.pressure_mb}` },
                      { icon: Droplets, label: 'Vocht', val: `${weather.current.humidity}%` },
                    ].map(({ icon: Icon, label, val }) => (
                      <div key={label} className="rounded-2xl bg-surface-soft border border-border-subtle p-2.5 text-center">
                        <Icon className="w-4 h-4 text-brand mx-auto mb-1" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-text-muted leading-none mb-1">{label}</p>
                        <p className="text-xs font-black text-text-primary leading-none">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* 2. FISH ACTIVITY SCORE */}
              <Card className={`p-5 border rounded-[1.75rem] relative overflow-hidden ${scoreMeta.bg} ${scoreMeta.border}`}>
                <div className="absolute top-0 right-0 w-52 h-52 rounded-full blur-3xl -mr-20 -mt-20 opacity-20"
                  style={{ background: scoreMeta.color }} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0"
                        style={{ background: `${scoreMeta.color}20`, borderColor: `${scoreMeta.color}40` }}>
                        <Anchor className="w-6 h-6" style={{ color: scoreMeta.color }} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">Vis Activiteit Score</p>
                        <p className="text-lg font-black text-text-primary leading-tight">{scoreMeta.sublabel}</p>
                      </div>
                    </div>
                    <motion.div
                      className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border shrink-0"
                      style={{ background: `${scoreMeta.color}15`, borderColor: `${scoreMeta.color}30` }}
                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 140, damping: 12, delay: 0.2 }}
                    >
                      <span className="text-2xl font-black leading-none" style={{ color: scoreMeta.color }}>{fishScore}</span>
                      <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">/100</span>
                    </motion.div>
                  </div>
                  <FishActivityBar score={fishScore} />
                  <div className="mt-6 rounded-xl bg-surface-soft/40 border border-border-subtle p-3.5">
                    <p className="text-sm text-text-secondary leading-relaxed">{fishAdvice}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {factors.map((f, i) => <FactorPill key={i} label={f.label} good={f.good} />)}
                  </div>
                </div>
              </Card>

              {/* 3. HOURLY SCROLL */}
              <div>
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                  <h3 className="text-base font-bold text-text-primary tracking-tight">Komende uren</h3>
                  <Badge variant="accent" className="text-[8px] font-black uppercase tracking-widest">Uurlijks</Badge>
                </div>
                <Card className="border border-border-subtle bg-surface-card rounded-[1.75rem] overflow-hidden">
                  <div className="flex overflow-x-auto py-1" style={{ scrollbarWidth: 'none' }}>
                    {hourly.length === 0 ? (
                      <div className="flex items-center justify-center w-full py-10 gap-3">
                        <Clock className="w-8 h-8 text-brand/20" />
                        <p className="text-sm text-text-muted">Geen uurforecast beschikbaar</p>
                      </div>
                    ) : hourly.map((hour: any, i: number) => {
                      const isNow = i === 0;
                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className={`flex flex-col items-center gap-1.5 px-3.5 py-4 shrink-0 relative ${isNow ? 'bg-brand/10' : ''}`}
                          style={{ minWidth: 70 }}
                        >
                          {isNow && <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand rounded-full" />}
                          <p className={`text-[9px] font-black uppercase tracking-widest ${isNow ? 'text-brand' : 'text-text-muted'}`}>
                            {isNow ? 'NU' : formatHourLabel(hour.time)}
                          </p>
                          <img src={hour.condition?.icon} alt="" className="w-8 h-8" />
                          <p className={`text-sm font-black ${isNow ? 'text-brand' : 'text-text-primary'}`}>
                            {Math.round(hour.temp_c)}°
                          </p>
                          <div className="flex items-center gap-0.5">
                            <CloudRain className="w-2.5 h-2.5 text-blue-400" />
                            <p className="text-[9px] font-bold text-blue-400">{hour.chance_of_rain ?? 0}%</p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Wind className="w-2.5 h-2.5 text-text-muted" />
                            <p className="text-[9px] text-text-muted">{Math.round(hour.wind_kph)}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* 4. QUICK METRICS */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Thermometer, label: 'Gevoelstemperatuur', val: `${Math.round(weather.current.feelslike_c)}°C`, color: 'text-orange-400' },
                  { icon: Eye, label: 'Zicht', val: `${Math.round(weather.current.vis_km)} km`, color: 'text-blue-400' },
                  { icon: Wind, label: 'Windstoten', val: `${Math.round(weather.current.gust_kph)} km/u`, color: 'text-brand' },
                  { icon: Droplets, label: 'Vochtigheid', val: `${weather.current.humidity}%`, color: 'text-cyan-400' },
                ].map(({ icon: Icon, label, val, color }) => (
                  <Card key={label} className="p-4 border border-border-subtle bg-surface-card rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-surface-soft border border-border-subtle flex items-center justify-center ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-0.5">{label}</p>
                        <p className="text-base font-black text-text-primary">{val}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* 5. PRESSURE GAUGE + UV */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Gauge className="w-4 h-4 text-brand" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Luchtdruk</p>
                  </div>
                  <PressureGauge pressure={weather.current.pressure_mb} />
                </Card>
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">UV Index</p>
                  </div>
                  <UVBar uv={weather.current.uv} />
                </Card>
              </div>

              {/* 6. WIND COMPASS */}
              <Card className="p-5 border border-border-subtle bg-surface-card rounded-[1.75rem]">
                <div className="flex items-center gap-2 mb-4">
                  <Compass className="w-4 h-4 text-brand" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Wind & Richting</p>
                </div>
                <WindCompass dir={weather.current.wind_dir} speed={weather.current.wind_kph} gusts={weather.current.gust_kph} />
              </Card>

              {/* 7. SUN ARC + MOON */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[1.75rem]">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Zonneboog</p>
                  </div>
                  <SunArc sunrise={today?.astro?.sunrise ?? ''} sunset={today?.astro?.sunset ?? ''} localtime={weather.location.localtime ?? ''} />
                </Card>
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[1.75rem]">
                  <div className="flex items-center gap-2 mb-3">
                    <Moon className="w-4 h-4 text-purple-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Maanfase</p>
                  </div>
                  <MoonVisual phase={today?.astro?.moon_phase ?? '--'} illumination={today?.astro?.moon_illumination ?? 0} />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-surface-soft border border-border-subtle p-2.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">Maanopkomst</p>
                      <p className="text-xs font-bold text-text-primary">{today?.astro?.moonrise || '--'}</p>
                    </div>
                    <div className="rounded-xl bg-surface-soft border border-border-subtle p-2.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">Maanondergang</p>
                      <p className="text-xs font-bold text-text-primary">{today?.astro?.moonset || '--'}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* 8. 3-DAY FORECAST */}
              <div>
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                  <h3 className="text-base font-bold text-text-primary">Meerdaagse forecast</h3>
                  <Badge variant="accent" className="text-[8px] font-black uppercase tracking-widest">3 dagen</Badge>
                </div>
                <div className="space-y-3">
                  {weather.forecast.forecastday.map((day, i) => {
                    const dayScore = calcFishScore(
                      day.day.avgtemp_c, weather.current.pressure_mb, day.day.maxwind_kph * 0.6,
                      day.day.daily_chance_of_rain, day.day.uv, today?.astro?.moon_phase ?? ''
                    );
                    const dm = getScoreMeta(dayScore);
                    return (
                      <Card key={day.date} className="p-4 border border-border-subtle bg-surface-card rounded-[1.5rem]">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-black text-text-primary">
                              {i === 0 ? 'Vandaag' : i === 1 ? 'Morgen' : formatDayLong(day.date)}
                            </p>
                            <p className="text-[10px] text-text-muted capitalize">{day.day.condition.text}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl border text-xs font-black"
                              style={{ background: `${dm.color}15`, borderColor: `${dm.color}30`, color: dm.color }}>
                              <span className="text-sm leading-none">{dayScore}</span>
                              <span className="text-[7px] leading-none mt-0.5">vis</span>
                            </div>
                            <img src={day.day.condition.icon} alt="" className="w-11 h-11" />
                            <div className="text-right">
                              <p className="text-base font-black text-brand">
                                {Math.round(day.day.maxtemp_c)}°
                                <span className="text-text-dim font-normal text-sm"> / {Math.round(day.day.mintemp_c)}°</span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { l: 'Regen', v: `${day.day.daily_chance_of_rain}%` },
                            { l: 'Neerslag', v: `${day.day.totalprecip_mm}mm` },
                            { l: 'Max wind', v: `${Math.round(day.day.maxwind_kph)}km/u` },
                            { l: 'UV', v: String(day.day.uv) },
                          ].map(({ l, v }) => (
                            <div key={l} className="rounded-xl bg-surface-soft border border-border-subtle p-2 text-center">
                              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-0.5">{l}</p>
                              <p className="text-xs font-bold text-text-primary">{v}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* 9. PRESSURE TREND */}
              {pressureChartData.length > 1 && (
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[1.75rem]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-brand" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Luchtdruk trend</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded bg-brand" />
                      <span className="text-[9px] text-text-muted font-bold">hPa</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={130}>
                    <AreaChart data={pressureChartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pgChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-brand,#22c55e)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-brand,#22c55e)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 6" stroke="#1e2d3d" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="Druk" stroke="var(--color-brand,#22c55e)"
                        strokeWidth={2} fill="url(#pgChartGrad)" dot={false} unit=" hPa" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                    Stabiele druk = rustige vis. Dalende druk = verhoogde activiteit.
                  </p>
                </Card>
              )}

              {/* 10. TEMP + RAIN CHART */}
              {tempRainChartData.length > 1 && (
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[1.75rem]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Temperatuur & Neerslag</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-amber-400 rounded" /><span className="text-[9px] text-text-muted font-bold">°C</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-blue-400 rounded" /><span className="text-[9px] text-text-muted font-bold">%</span></div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={tempRainChartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 6" stroke="#1e2d3d" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="Temp" stroke="#f59e0b" strokeWidth={2}
                        fill="url(#tempGrad)" dot={false} unit="°C" />
                      <Area type="monotone" dataKey="Regen" stroke="#60a5fa" strokeWidth={1.5}
                        strokeDasharray="4 3" fill="url(#rainGrad)" dot={false} unit="%" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* 11. FISHING ANALYSIS */}
              <div>
                <div className="flex items-center gap-2 mb-2.5 px-0.5">
                  <Anchor className="w-4 h-4 text-brand" />
                  <h3 className="text-base font-bold text-text-primary">Vissers analyse</h3>
                </div>
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-[1.75rem]">
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      {
                        icon: Gauge, label: 'Luchtdruk',
                        status: weather.current.pressure_mb < 1010 ? 'good' : weather.current.pressure_mb > 1022 ? 'neutral' : 'ok',
                        text: weather.current.pressure_mb < 1000
                          ? 'Opvallend lage druk — actief aasgedrag verwacht. Vis is nu vatbaarder voor aas.'
                          : weather.current.pressure_mb < 1010
                          ? 'Relatief lage druk stimuleert visactiviteit, met name rond drukwisselingen.'
                          : weather.current.pressure_mb > 1022
                          ? 'Hogere druk. Vis kan voorzichtiger zijn; focus op timing en presentatie.'
                          : 'Neutrale druk — laat stek en soort leidend zijn.',
                      },
                      {
                        icon: Wind, label: 'Wind & Golfslag',
                        status: weather.current.wind_kph < 15 ? 'good' : weather.current.wind_kph > 28 ? 'bad' : 'ok',
                        text: weather.current.wind_kph < 10
                          ? 'Windstil — ideaal voor nauwkeurig en subtiel vissen over alles.'
                          : weather.current.wind_kph < 20
                          ? 'Lichte tot matige wind. Goed voor actieve vis; windkant-stekken zijn interessant.'
                          : weather.current.wind_kph < 30
                          ? 'Stevige wind. Zoek beschutte oevers of diepere plekken.'
                          : 'Sterke wind. Presentatie moeilijker; focus op diepwater of beschut.',
                      },
                      {
                        icon: CloudRain, label: 'Neerslag & Front',
                        status: (today?.day?.daily_chance_of_rain ?? 0) > 55 && weather.current.wind_kph < 22 ? 'good' : 'ok',
                        text: (today?.day?.daily_chance_of_rain ?? 0) > 60
                          ? `${today?.day?.daily_chance_of_rain}% regenkans. Naderend front activeert aasgedrag — bij lage druk zeker interessant.`
                          : `Beperkte regenkans (${today?.day?.daily_chance_of_rain ?? 0}%). Gebruik licht en wind als primair kompas.`,
                      },
                      {
                        icon: Sun, label: 'Licht & UV',
                        status: weather.current.uv < 4 ? 'good' : weather.current.uv >= 7 ? 'neutral' : 'ok',
                        text: weather.current.uv <= 2
                          ? 'Laag UV en bewolkt licht. Vis staat minder diep en is actiever in ondiepe zones.'
                          : weather.current.uv <= 5
                          ? 'Matig UV. Schemertijden en bewolkte periodes geven de beste actie.'
                          : weather.current.uv <= 7
                          ? 'Hoog UV. Vis trekt naar schaduw of diepte — vroegere uren presteren beter.'
                          : 'Zeer hoog UV. Vroeg ochtend of avond is de beste keuze voor actieve vis.',
                      },
                    ].map(({ icon: Icon, label, status, text }) => (
                      <div key={label} className="flex gap-3 rounded-xl bg-surface-soft border border-border-subtle p-3.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          status === 'good' ? 'bg-green-500/10 text-green-400'
                            : status === 'bad' ? 'bg-red-500/10 text-red-400'
                            : 'bg-brand/10 text-brand'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">{label}</p>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                              status === 'good' ? 'bg-green-500/20 text-green-400'
                                : status === 'bad' ? 'bg-red-500/20 text-red-400'
                                : 'bg-brand/20 text-brand'
                            }`}>
                              {status === 'good' ? 'Gunstig' : status === 'bad' ? 'Ongunstig' : 'Neutraal'}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
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