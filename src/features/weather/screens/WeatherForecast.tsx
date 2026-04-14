import React, { useEffect, useMemo, useState } from 'react';
import {
  Cloud, Sun, Wind, Thermometer, Droplets, Search, MapPin,
  Clock, Moon, Compass, Gauge, Eye, ArrowLeft, CloudRain, RefreshCw,
  TrendingDown, TrendingUp, Anchor,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { weatherService, WeatherData } from '../services/weatherService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const DEFAULT_LOCATION = localStorage.getItem('weatherLocation') || 'Utrecht';

type ChartRange = '8u' | '12u' | '24u';
const RANGE_HOURS: Record<ChartRange, number> = { '8u': 8, '12u': 12, '24u': 24 };

// ─────────────────────────────────────────────
// FISH ACTIVITY SCORE
// ─────────────────────────────────────────────

function calcFishScore(
  temp: number, pressure: number, windKph: number,
  rainChance: number, uv: number, moonPhase: string
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
  if (score < 25) return { label: 'SLECHT',     sub: 'Weinig visactiviteit',    color: '#ef4444', tw: 'text-red-400',    bg: 'bg-red-500/8',    border: 'border-red-500/15'    };
  if (score < 42) return { label: 'MATIG',      sub: 'Beperkte kansen',         color: '#f97316', tw: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/15' };
  if (score < 58) return { label: 'NORMAAL',    sub: 'Gemiddelde condities',     color: '#eab308', tw: 'text-yellow-400', bg: 'bg-yellow-500/8', border: 'border-yellow-500/15' };
  if (score < 76) return { label: 'GOED',       sub: 'Gunstige condities',       color: '#22c55e', tw: 'text-green-400',  bg: 'bg-green-500/8',  border: 'border-green-500/15'  };
  return             { label: 'UITSTEKEND', sub: 'Optimale omstandigheden!',  color: '#10b981', tw: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' };
}

function getFishAdvice(temp: number, pressure: number, windKph: number, rainChance: number, uv: number, moonPhase: string): string {
  const mp = (moonPhase || '').toLowerCase();
  if (mp.includes('full') || mp.includes('new')) return 'De maan staat gunstig — vissen zijn actiever tijdens volle en nieuwe maan. Benut de schemering voor de beste beten.';
  if (pressure < 1005 && windKph < 22) return 'Dalende luchtdruk activeert het eetgedrag. Focus op actieve zones en overgangen — de vis staat aan.';
  if (windKph > 30) return 'Harde wind maakt precisie lastig. Zoek beschutte oevers of diepere zones waar vis rustiger staat.';
  if (temp < 6) return 'Lage watertemperatuur vertraagt het metabolisme. Vis trager en focus op diepe stabiele plekken.';
  if (rainChance > 50 && rainChance < 75 && windKph < 20) return 'Naderend regenfront kan activiteit triggeren. Let op drukwisselingen en vis de windkant.';
  if (uv >= 7) return 'Hoge UV drijft vis naar diepte of schaduw. Subtielere presentaties en vroegere uren presteren beter.';
  if (temp >= 14 && temp <= 20 && windKph < 18) return 'Comfortabele temperatuur en rustige wind — ideale basisomstandigheden.';
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

function fmtHour(time: string) {
  try { return new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' }).format(new Date(time)); }
  catch { return time; }
}

function fmtDayLong(date: string) {
  try { return new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(date)); }
  catch { return date; }
}

function getHourlyScroll(weather: WeatherData | null): any[] {
  const hours = ((weather?.forecast?.forecastday?.[0] as any)?.hour ?? []) as any[];
  if (!Array.isArray(hours)) return [];
  const now = Date.now();
  return hours.filter((h: any) => new Date(h.time).getTime() >= now - 3_600_000).slice(0, 14);
}

function getAllForecastHours(weather: WeatherData | null): any[] {
  if (!weather?.forecast?.forecastday) return [];
  return (weather.forecast.forecastday as any[]).flatMap(d => d.hour ?? []);
}

function getHoursForRange(weather: WeatherData | null, rangeH: number): any[] {
  const all = getAllForecastHours(weather);
  const now = Date.now();
  const end = now + rangeH * 3_600_000;
  return all.filter((h: any) => {
    const t = new Date(h.time).getTime();
    return t >= now - 3_600_000 && t <= end;
  });
}

// ─────────────────────────────────────────────
// SVG HELPERS — Upper semicircle
// sweep=0 in SVG = counter-clockwise = upper arc (via top)
// angle: π (left/0%) → 0 (right/100%)  =>  angle = π*(1–pct)
// dotX = cx + R·cos(angle),  dotY = cy − R·sin(angle)
// ─────────────────────────────────────────────

function upperArcPath(cx: number, cy: number, R: number): string {
  return `M ${cx - R} ${cy} A ${R} ${R} 0 0 0 ${cx + R} ${cy}`;
}

function upperArcProgress(cx: number, cy: number, R: number, pct: number): string | null {
  if (pct < 0.005) return null;
  const angle = Math.PI * (1 - pct);
  const dx = +(cx + R * Math.cos(angle)).toFixed(2);
  const dy = +(cy - R * Math.sin(angle)).toFixed(2);
  return `M ${cx - R} ${cy} A ${R} ${R} 0 0 0 ${dx} ${dy}`;
}

function arcDot(cx: number, cy: number, R: number, pct: number): { x: number; y: number } {
  const angle = Math.PI * (1 - pct);
  return {
    x: +(cx + R * Math.cos(angle)).toFixed(2),
    y: +(cy - R * Math.sin(angle)).toFixed(2),
  };
}

// ─────────────────────────────────────────────
// FISH ACTIVITY BAR
// ─────────────────────────────────────────────

function FishActivityBar({ score }: { score: number }) {
  const pct = score / 100;
  const meta = getScoreMeta(score);

  // Clamp pill position so it never overflows card (6% padding each side)
  const pillPct = Math.max(0.06, Math.min(0.94, pct));

  return (
    <div className="relative mt-1 mb-14">
      {/* Bar */}
      <div className="relative h-9 rounded-full overflow-hidden" style={{
        background: 'linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 42%, #84cc16 64%, #22c55e 83%, #10b981 100%)',
      }}>
        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none select-none">
          {['SLECHT', 'NORMAAL', 'GOED'].map(l => (
            <span key={l} className="text-[8.5px] font-black text-white/80 uppercase tracking-wider drop-shadow-sm">{l}</span>
          ))}
        </div>
      </div>

      {/* Triangle pointer — clipped inside bar width */}
      <motion.div className="absolute" style={{ top: '-13px', left: `calc(${pillPct * 100}% - 8px)` }}
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 14, delay: 0.5 }}>
        <div style={{
          width: 0, height: 0,
          borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
          borderTop: `13px solid ${meta.color}`,
          filter: `drop-shadow(0 2px 5px ${meta.color}80)`,
        }} />
      </motion.div>

      {/* Score pill — same clamped position */}
      <motion.div
        className="absolute flex items-center justify-center rounded-full text-[10px] font-black text-white"
        style={{
          top: '44px',
          left: `calc(${pillPct * 100}% - 34px)`,
          minWidth: '68px', height: '22px',
          background: meta.color,
          boxShadow: `0 3px 12px ${meta.color}50`,
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
// PRESSURE GAUGE — full rework
// Upper semicircle, sweep=0 (correct upper arc)
// Gradient: green (left/low/good) → yellow → gray (right/high)
// ─────────────────────────────────────────────

function PressureGauge({ pressure }: { pressure: number }) {
  const MIN = 975, MAX = 1045;
  const pct = Math.max(0, Math.min(1, (pressure - MIN) / (MAX - MIN)));

  const cx = 100, cy = 88, R = 72;
  const track = upperArcPath(cx, cy, R);
  const progress = upperArcProgress(cx, cy, R, pct);
  const dot = arcDot(cx, cy, R, pct);

  const color = pressure < 1000 ? '#22c55e' : pressure < 1013 ? '#eab308' : '#94a3b8';
  const label = pressure < 1000 ? 'Laag · Gunstig' : pressure < 1013 ? 'Normaal' : 'Hoog';

  // Zone ticks at 975, 995, 1013, 1030, 1045
  const zoneTicks = [975, 995, 1013, 1030, 1045].map(v => {
    const p = (v - MIN) / (MAX - MIN);
    const angle = Math.PI * (1 - p);
    const inner = R - 10;
    return {
      x1: +(cx + (R + 4) * Math.cos(angle)).toFixed(1),
      y1: +(cy - (R + 4) * Math.sin(angle)).toFixed(1),
      x2: +(cx + inner * Math.cos(angle)).toFixed(1),
      y2: +(cy - inner * Math.sin(angle)).toFixed(1),
    };
  });

  return (
    <svg viewBox="0 0 200 108" className="w-full">
      <defs>
        {/* userSpaceOnUse ensures gradient maps to physical arc positions */}
        <linearGradient id="pgZone" gradientUnits="userSpaceOnUse"
          x1={cx - R} y1={cy} x2={cx + R} y2={cy}>
          <stop offset="0%"   stopColor="#22c55e" />
          <stop offset="42%"  stopColor="#eab308" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <filter id="pgGlow">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer dark base track */}
      <path d={track} fill="none" stroke="#0c1624" strokeWidth="20" strokeLinecap="round" />

      {/* Zone colour hint (dim) on full track */}
      <path d={track} fill="none" stroke="url(#pgZone)" strokeWidth="16" strokeLinecap="round" opacity="0.28" />

      {/* Zone tick marks */}
      {zoneTicks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="#1e3048" strokeWidth={i === 2 ? 2 : 1.2} />
      ))}

      {/* Progress arc */}
      {progress && (
        <path d={progress} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      )}

      {/* Dot glow layers */}
      <circle cx={dot.x} cy={dot.y} r="16" fill={color} opacity="0.08" />
      <circle cx={dot.x} cy={dot.y} r="10" fill={color} opacity="0.20" />
      <circle cx={dot.x} cy={dot.y} r="6"  fill={color} filter="url(#pgGlow)" />
      <circle cx={dot.x} cy={dot.y} r="3"  fill="white" opacity="0.95" />

      {/* Value */}
      <text x={cx} y={cy - 20} textAnchor="middle"
        fill="white" fontSize="26" fontWeight="900" fontFamily="system-ui, sans-serif">{pressure}</text>
      <text x={cx} y={cy - 4} textAnchor="middle"
        fill="#4b5563" fontSize="9.5" fontFamily="system-ui">hPa</text>
      <text x={cx} y={cy + 11} textAnchor="middle"
        fill={color} fontSize="9" fontWeight="700" fontFamily="system-ui">{label}</text>

      {/* Range labels at endpoints */}
      <text x={cx - R + 8} y={cy + 18} textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="system-ui">975</text>
      <text x={cx + R - 8} y={cy + 18} textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="system-ui">1045</text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// UV INDEX BAR
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
          style={{ left: `calc(${pct * 100}% - 10px)`, background: color, borderColor: 'rgba(9,14,24,0.9)' }}
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, delay: 0.4 }}
        />
      </div>
      <div className="flex items-end justify-between">
        <span className="text-[38px] font-black text-text-primary leading-none">{uv}</span>
        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-white mb-0.5"
          style={{ background: color }}>{label}</span>
      </div>
      <p className="text-[10px] text-text-muted leading-relaxed">
        {uv <= 2 ? 'Geen bescherming nodig' : uv <= 5 ? 'Zonnebrand aanbevolen' : uv <= 7 ? 'Bescherming noodzakelijk' : 'Vermijd direct zonlicht'}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// WIND COMPASS
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
      <svg viewBox="0 0 104 104" className="w-[108px] h-[108px] shrink-0">
        <circle cx={cx} cy={cy} r="48" fill="none" stroke="#1a2840" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="39" fill="none" stroke="#0f1a2a" strokeWidth="0.5" />
        {Array.from({ length: 16 }, (_, i) => {
          const a = ((i * 22.5 - 90) * Math.PI) / 180;
          const major = i % 4 === 0;
          return (
            <line key={i}
              x1={cx + 48 * Math.cos(a)} y1={cy + 48 * Math.sin(a)}
              x2={cx + (major ? 37 : 41) * Math.cos(a)} y2={cy + (major ? 37 : 41) * Math.sin(a)}
              stroke={major ? '#374151' : '#1f2937'} strokeWidth={major ? 1.5 : 0.8} />
          );
        })}
        {([['N', -90, '#f59e0b'], ['E', 0, '#4b5563'], ['S', 90, '#4b5563'], ['W', 180, '#4b5563']] as [string, number, string][]).map(([d, aDeg, col]) => {
          const a = (aDeg * Math.PI) / 180;
          return (
            <text key={d} x={cx + 27 * Math.cos(a)} y={cy + 27 * Math.sin(a) + 3}
              textAnchor="middle" fill={col} fontSize="8" fontWeight="900" fontFamily="system-ui">{d}</text>
          );
        })}
        <g transform={`rotate(${deg}, ${cx}, ${cy})`}>
          <polygon points={`${cx},${cy - 30} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`} fill="white" opacity="0.9" />
          <polygon points={`${cx},${cy + 30} ${cx - 3},${cy + 4} ${cx + 3},${cy + 4}`} fill="#374151" />
        </g>
        <circle cx={cx} cy={cy} r="15" fill="#080f1a" stroke="#1a2840" strokeWidth="1" />
        <text x={cx} y={cy - 1} textAnchor="middle" fill="white" fontSize="8.5" fontWeight="900" fontFamily="system-ui">{Math.round(speed)}</text>
        <text x={cx} y={cy + 8.5} textAnchor="middle" fill="#6b7280" fontSize="5" fontFamily="system-ui">km/h</text>
      </svg>

      <div className="flex-1 min-w-0 space-y-2.5">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-muted mb-0.5">Richting</p>
          <p className="text-[28px] font-black text-text-primary leading-none">{dir?.toUpperCase() || '--'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-soft border border-border-subtle p-2.5">
            <p className="text-[7.5px] font-black uppercase tracking-widest text-text-muted mb-1">Wind</p>
            <p className="text-sm font-bold text-text-primary leading-none">{Math.round(speed)}<span className="text-text-muted text-[9px] ml-0.5">km/u</span></p>
          </div>
          <div className="rounded-xl bg-surface-soft border border-border-subtle p-2.5">
            <p className="text-[7.5px] font-black uppercase tracking-widest text-text-muted mb-1">Stoten</p>
            <p className="text-sm font-bold text-text-primary leading-none">{Math.round(gusts)}<span className="text-text-muted text-[9px] ml-0.5">km/u</span></p>
          </div>
        </div>
        <p className="text-[9.5px] text-text-muted leading-relaxed">
          {speed < 10 ? 'Windstil — ideaal voor precisievissen'
            : speed < 20 ? 'Lichte bries — goed vissen mogelijk'
            : speed < 30 ? 'Matige wind — zoek beschutte zones'
            : 'Stevige wind — moeilijkere condities'}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUN ARC — fixed sweep direction
// ─────────────────────────────────────────────

function SunArc({ sunrise, sunset, localtime }: { sunrise: string; sunset: string; localtime: string }) {
  const srMin = parseAstroTime(sunrise);
  const ssMin = parseAstroTime(sunset);
  const nowMin = parseLocaltime(localtime);
  const isDay = nowMin >= srMin && nowMin <= ssMin;
  const pct = isDay ? Math.max(0, Math.min(1, (nowMin - srMin) / (ssMin - srMin))) : nowMin > ssMin ? 1 : 0;

  const cx = 100, cy = 76, r = 58;
  // Upper arc: sweep=0 (counter-clockwise in SVG = going via the top)
  const fullArc = upperArcPath(cx, cy, r);
  const elapsedArc = upperArcProgress(cx, cy, r, pct);
  const dot = arcDot(cx, cy, r, pct);

  return (
    <svg viewBox="0 0 200 94" className="w-full">
      <defs>
        <linearGradient id="sunArcGrad" gradientUnits="userSpaceOnUse"
          x1={cx - r} y1={cy} x2={cx + r} y2={cy}>
          <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.3" />
          <stop offset="50%"  stopColor="#f59e0b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
        </linearGradient>
        <filter id="sunGlow">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Dashed background arc */}
      <path d={fullArc} fill="none" stroke="#1a2840" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" />

      {/* Elapsed arc */}
      {elapsedArc && pct > 0.01 && (
        <path d={elapsedArc} fill="none" stroke="url(#sunArcGrad)" strokeWidth="2.5" strokeLinecap="round" />
      )}

      {/* Horizon line */}
      <line x1={cx - r - 14} y1={cy} x2={cx + r + 14} y2={cy} stroke="#1a2840" strokeWidth="1" />

      {/* Sun dot (only during day) */}
      {isDay && (
        <>
          <circle cx={dot.x} cy={dot.y} r="16" fill="#f59e0b" opacity="0.08" />
          <circle cx={dot.x} cy={dot.y} r="10" fill="#f59e0b" opacity="0.22" />
          <circle cx={dot.x} cy={dot.y} r="5.5" fill="#f59e0b" filter="url(#sunGlow)" />
        </>
      )}

      {/* Horizon markers */}
      <text x={cx - r - 4}  y={cy - 5} textAnchor="middle" fill="#374151" fontSize="8" fontFamily="system-ui">↑</text>
      <text x={cx + r + 4}  y={cy - 5} textAnchor="middle" fill="#374151" fontSize="8" fontFamily="system-ui">↓</text>
      <text x={cx - r}      y={cy + 14} textAnchor="middle" fill="#6b7280" fontSize="7" fontFamily="system-ui">{sunrise}</text>
      <text x={cx + r}      y={cy + 14} textAnchor="middle" fill="#6b7280" fontSize="7" fontFamily="system-ui">{sunset}</text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// MOON PHASE VISUAL
// ─────────────────────────────────────────────

function MoonVisual({ phase, illumination }: { phase: string; illumination: string | number }) {
  const mp = (phase || '').toLowerCase();
  const pct = parseInt(String(illumination)) / 100;
  const isFull = mp.includes('full');
  const isNew  = mp.includes('new');
  const isWaning = mp.includes('waning');

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-14 h-14 rounded-full shrink-0" style={{
        background: isNew
          ? 'radial-gradient(circle at 40% 38%, #1e293b, #080f1a)'
          : 'radial-gradient(circle at 33% 33%, #f1f5f9 0%, #cbd5e1 42%, #94a3b8 100%)',
        boxShadow: isFull ? '0 0 22px rgba(241,245,249,0.22)' : 'none',
      }}>
        {!isFull && !isNew && (
          <div className="absolute inset-0 rounded-full" style={{
            background: `radial-gradient(ellipse at ${isWaning ? `${(1 - pct) * 115}%` : `${pct * 115}%`} 50%, rgba(8,15,26,0.96) ${22 + (1 - pct) * 32}%, transparent 68%)`,
          }} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1">Maanfase</p>
        <p className="text-base font-bold text-text-primary leading-tight truncate">{phase || '--'}</p>
        <p className="text-xs text-text-muted mt-0.5">{illumination}% verlicht</p>
        {(isFull || isNew) && (
          <span className="inline-block mt-1.5 text-[7.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
            Visbonus +8
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CHART TOOLTIP
// ─────────────────────────────────────────────

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl px-3 py-2 shadow-2xl text-xs">
      <p className="text-text-muted mb-1.5 font-bold text-[10px]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-black text-[11px]">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(p.name === 'Druk' ? 0 : 1) : p.value}{p.unit || ''}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// RANGE TOGGLE BUTTONS
// ─────────────────────────────────────────────

function RangeToggle({ value, onChange }: { value: ChartRange; onChange: (r: ChartRange) => void }) {
  return (
    <div className="flex bg-surface-soft rounded-lg p-0.5 gap-px">
      {(['8u', '12u', '24u'] as ChartRange[]).map(r => (
        <button key={r} onClick={() => onChange(r)}
          className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wide transition-all ${
            value === r
              ? 'bg-brand/20 text-brand border border-brand/25'
              : 'text-text-muted hover:text-text-secondary'
          }`}>
          {r}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// FACTOR PILL
// ─────────────────────────────────────────────

function FactorPill({ label, good }: { label: string; good: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${
      good
        ? 'bg-green-500/8 border-green-500/18 text-green-400'
        : 'bg-red-500/8 border-red-500/18 text-red-400'
    }`}>
      {good ? '↑' : '↓'} {label}
    </span>
  );
}

// ─────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, right }: {
  icon: React.ElementType; title: string; right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-2 px-0.5">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-text-muted" />
        <h3 className="text-sm font-bold text-text-primary tracking-tight">{title}</h3>
      </div>
      {right}
    </div>
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
  const [chartRange, setChartRange] = useState<ChartRange>('8u');

  useEffect(() => {
    setLoading(true);
    weatherService.fetchWeather(location)
      .then(data => setWeather(data))
      .catch(() => toast.error('Fout bij ophalen weerdata'))
      .finally(() => setLoading(false));
  }, [location]);

  const today = weather?.forecast?.forecastday?.[0];
  const hourlyScroll = useMemo(() => getHourlyScroll(weather), [weather]);
  const chartHours   = useMemo(() => getHoursForRange(weather, RANGE_HOURS[chartRange]), [weather, chartRange]);

  const fishScore = useMemo(() => {
    if (!weather) return 50;
    return calcFishScore(
      weather.current.temp_c, weather.current.pressure_mb, weather.current.wind_kph,
      today?.day?.daily_chance_of_rain ?? 0, weather.current.uv, today?.astro?.moon_phase ?? ''
    );
  }, [weather, today]);

  const scoreMeta  = getScoreMeta(fishScore);
  const fishAdvice = useMemo(() => {
    if (!weather) return '';
    return getFishAdvice(
      weather.current.temp_c, weather.current.pressure_mb, weather.current.wind_kph,
      today?.day?.daily_chance_of_rain ?? 0, weather.current.uv, today?.astro?.moon_phase ?? ''
    );
  }, [weather, today]);

  const pressureChartData = useMemo(() =>
    chartHours.map((h: any) => ({ time: fmtHour(h.time), Druk: Math.round(h.pressure_mb ?? 0) })),
    [chartHours]);

  const tempRainChartData = useMemo(() =>
    chartHours.map((h: any) => ({
      time: fmtHour(h.time),
      Temp: parseFloat((h.temp_c ?? 0).toFixed(1)),
      Regen: h.chance_of_rain ?? 0,
    })),
    [chartHours]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = searchValue.trim();
    if (!next) return;
    localStorage.setItem('weatherLocation', next);
    setLocation(next);
  };

  const factors = weather ? [
    { label: `Druk ${weather.current.pressure_mb}`,           good: weather.current.pressure_mb < 1013 },
    { label: `Wind ${Math.round(weather.current.wind_kph)}km`, good: weather.current.wind_kph < 22 },
    { label: `${Math.round(weather.current.temp_c)}°C`,        good: weather.current.temp_c >= 10 && weather.current.temp_c <= 22 },
    { label: `UV ${weather.current.uv}`,                       good: weather.current.uv < 6 },
    { label: `${today?.day?.daily_chance_of_rain ?? 0}% regen`, good: (today?.day?.daily_chance_of_rain ?? 0) < 70 },
    ...((today?.astro?.moon_phase?.toLowerCase().includes('full') || today?.astro?.moon_phase?.toLowerCase().includes('new'))
      ? [{ label: 'Maan gunstig', good: true }] : []),
  ] : [];

  // ──────────── RENDER ────────────
  return (
    <PageLayout>
      <PageHeader
        title="Weer & Visadvies"
        subtitle="Forecast, visscores en realtime condities"
        actions={
          <form onSubmit={handleSearch} className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text" placeholder="Locatie zoeken..."
              value={searchValue} onChange={e => setSearchValue(e.target.value)}
              className="bg-surface-card border border-border-subtle rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand/60 transition-all w-full md:w-52"
            />
          </form>
        }
      />

      <div className="space-y-3 pb-28">
        {/* Nav */}
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => navigate('/')} className="h-9 rounded-xl px-3.5 text-sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Dashboard
          </Button>
          <Button variant="ghost" className="h-9 rounded-xl px-3.5 text-sm"
            onClick={() => { localStorage.setItem('weatherLocation', 'Utrecht'); setSearchValue('Utrecht'); setLocation('Utrecht'); }}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            {[220, 180, 72, 200].map((h, i) => (
              <div key={i} style={{ height: h }} className="bg-surface-card/60 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !weather && (
          <Card className="p-10 text-center border border-dashed border-border-subtle bg-surface-soft/10 rounded-2xl">
            <Cloud className="w-10 h-10 text-brand/15 mx-auto mb-4" />
            <p className="text-base font-bold text-text-primary mb-1.5">Geen weerdata beschikbaar</p>
            <p className="text-sm text-text-secondary mb-5">Controleer je verbinding of probeer een andere locatie.</p>
            <Button onClick={() => { setSearchValue('Utrecht'); setLocation('Utrecht'); }}>Herstel locatie</Button>
          </Card>
        )}

        {/* ──────── CONTENT ──────── */}
        {!loading && weather && (
          <AnimatePresence mode="wait">
            <motion.div key={location}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.28 }}
              className="space-y-3">

              {/* ── 1. HERO ── */}
              <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl relative overflow-hidden">
                {/* Ambient bg glow */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)' }} />

                <div className="relative z-10">
                  {/* Location */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/15 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-brand leading-none mb-0.5">Live locatie</p>
                        <h2 className="text-[18px] font-black text-text-primary tracking-tight leading-tight truncate">{weather.location.name}</h2>
                        <p className="text-[9.5px] text-text-muted truncate">{weather.location.region}, {weather.location.country}</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-surface-soft border border-border-subtle flex items-center justify-center shrink-0">
                      {weather.current.condition.icon
                        ? <img src={weather.current.condition.icon} alt="" className="w-9 h-9" />
                        : <Cloud className="w-5 h-5 text-brand" />}
                    </div>
                  </div>

                  {/* Temp + condition */}
                  <div className="flex items-end gap-3 mb-3.5">
                    <div className="flex items-start leading-none">
                      <span className="text-[64px] font-black text-text-primary tracking-tighter leading-none">
                        {Math.round(weather.current.temp_c)}
                      </span>
                      <span className="text-[28px] font-black text-brand mt-2.5">°C</span>
                    </div>
                    <div className="pb-1.5 min-w-0">
                      <p className="text-sm font-bold text-text-primary capitalize leading-tight truncate">{weather.current.condition.text}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">Gevoel {Math.round(weather.current.feelslike_c)}°C</p>
                      <p className="text-[10px] text-text-muted">
                        ↑ {Math.round(today?.day?.maxtemp_c ?? weather.current.temp_c)}° &nbsp;↓ {Math.round(today?.day?.mintemp_c ?? weather.current.temp_c)}°
                      </p>
                    </div>
                  </div>

                  {/* 4-stat grid */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { icon: Wind,     label: 'Wind',    val: `${Math.round(weather.current.wind_kph)}` },
                      { icon: Compass,  label: 'Richting', val: weather.current.wind_dir?.toUpperCase() ?? '--' },
                      { icon: Gauge,    label: 'Druk',    val: `${weather.current.pressure_mb}` },
                      { icon: Droplets, label: 'Vocht',   val: `${weather.current.humidity}%` },
                    ].map(({ icon: Icon, label, val }) => (
                      <div key={label} className="rounded-xl bg-surface-soft border border-border-subtle p-2 text-center">
                        <Icon className="w-3.5 h-3.5 text-brand mx-auto mb-1" />
                        <p className="text-[7.5px] font-black uppercase tracking-widest text-text-muted leading-none mb-0.5">{label}</p>
                        <p className="text-[11px] font-black text-text-primary leading-none">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* ── 2. FISH ACTIVITY SCORE ── */}
              <div className={`rounded-2xl border p-4 relative overflow-hidden ${scoreMeta.bg} ${scoreMeta.border}`}>
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -mr-16 -mt-16 opacity-15 pointer-events-none"
                  style={{ background: scoreMeta.color }} />
                <div className="relative z-10">
                  {/* Header row */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                      style={{ background: `${scoreMeta.color}18`, borderColor: `${scoreMeta.color}35` }}>
                      <Anchor className="w-5 h-5" style={{ color: scoreMeta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-muted leading-none mb-0.5">Vis Activiteit</p>
                      <p className="text-base font-black text-text-primary leading-tight">{scoreMeta.sub}</p>
                    </div>
                    <motion.div
                      className="w-14 h-14 rounded-xl flex flex-col items-center justify-center border shrink-0"
                      style={{ background: `${scoreMeta.color}12`, borderColor: `${scoreMeta.color}28` }}
                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 140, damping: 12, delay: 0.2 }}
                    >
                      <span className="text-xl font-black leading-none" style={{ color: scoreMeta.color }}>{fishScore}</span>
                      <span className="text-[7px] font-black text-text-muted uppercase tracking-wide">/100</span>
                    </motion.div>
                  </div>

                  <FishActivityBar score={fishScore} />

                  {/* Advice */}
                  <div className="mt-5 rounded-xl bg-surface-soft/30 border border-white/5 p-3">
                    <p className="text-[11.5px] text-text-secondary leading-relaxed">{fishAdvice}</p>
                  </div>

                  {/* Factor pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {factors.map((f, i) => <FactorPill key={i} label={f.label} good={f.good} />)}
                  </div>
                </div>
              </div>

              {/* ── 3. HOURLY SCROLL ── */}
              <div>
                <SectionHeader icon={Clock} title="Komende uren"
                  right={<span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Uurlijks</span>} />
                <Card className="border border-border-subtle bg-surface-card rounded-2xl overflow-hidden">
                  <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {hourlyScroll.length === 0 ? (
                      <div className="flex items-center justify-center w-full py-8 gap-3">
                        <Clock className="w-7 h-7 text-brand/15" />
                        <p className="text-sm text-text-muted">Geen uurforecast</p>
                      </div>
                    ) : hourlyScroll.map((hour: any, i: number) => {
                      const isNow = i === 0;
                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.035 }}
                          className={`flex flex-col items-center gap-1 px-3 py-3.5 shrink-0 relative ${isNow ? 'bg-brand/8' : ''}`}
                          style={{ minWidth: 66 }}>
                          {isNow && <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand rounded-b" />}
                          <p className={`text-[8.5px] font-black uppercase tracking-wider ${isNow ? 'text-brand' : 'text-text-dim'}`}>
                            {isNow ? 'NU' : fmtHour(hour.time)}
                          </p>
                          <img src={hour.condition?.icon} alt="" className="w-7 h-7" />
                          <p className={`text-sm font-black ${isNow ? 'text-brand' : 'text-text-primary'}`}>
                            {Math.round(hour.temp_c)}°
                          </p>
                          <div className="flex items-center gap-0.5">
                            <CloudRain className="w-2.5 h-2.5 text-blue-400" />
                            <p className="text-[8.5px] font-bold text-blue-400">{hour.chance_of_rain ?? 0}%</p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Wind className="w-2 h-2 text-text-dim" />
                            <p className="text-[8px] text-text-dim">{Math.round(hour.wind_kph)}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* ── 4. QUICK METRICS 2×2 ── */}
              {/* min-w-0 on text container prevents Gevoelstemperatuur from overflowing */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Thermometer, label: 'Gevoelstemp.',   val: `${Math.round(weather.current.feelslike_c)}°C`,  color: 'text-orange-400', bg: 'bg-orange-500/8' },
                  { icon: Eye,         label: 'Zicht',           val: `${Math.round(weather.current.vis_km)} km`,      color: 'text-sky-400',    bg: 'bg-sky-500/8'    },
                  { icon: Wind,        label: 'Windstoten',      val: `${Math.round(weather.current.gust_kph)} km/u`,  color: 'text-brand',      bg: 'bg-brand/8'      },
                  { icon: Droplets,    label: 'Vochtigheid',     val: `${weather.current.humidity}%`,                  color: 'text-cyan-400',   bg: 'bg-cyan-500/8'   },
                ].map(({ icon: Icon, label, val, color, bg }) => (
                  <Card key={label} className="p-3.5 border border-border-subtle bg-surface-card rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${bg} border border-border-subtle flex items-center justify-center ${color} shrink-0`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      {/* min-w-0 crucial: prevents child text from overflowing */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-black text-text-muted uppercase tracking-wide leading-none mb-1 truncate">{label}</p>
                        <p className="text-[17px] font-black text-text-primary leading-none">{val}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* ── 5. PRESSURE GAUGE + UV ── */}
              <div className="grid grid-cols-2 gap-2.5">
                <Card className="p-3.5 border border-border-subtle bg-surface-card rounded-2xl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gauge className="w-3.5 h-3.5 text-brand" />
                    <p className="text-[8.5px] font-black uppercase tracking-widest text-text-muted">Luchtdruk</p>
                  </div>
                  <PressureGauge pressure={weather.current.pressure_mb} />
                </Card>
                <Card className="p-3.5 border border-border-subtle bg-surface-card rounded-2xl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-[8.5px] font-black uppercase tracking-widest text-text-muted">UV Index</p>
                  </div>
                  <UVBar uv={weather.current.uv} />
                </Card>
              </div>

              {/* ── 6. WIND COMPASS ── */}
              <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl">
                <SectionHeader icon={Compass} title="Wind & Richting" />
                <WindCompass dir={weather.current.wind_dir} speed={weather.current.wind_kph} gusts={weather.current.gust_kph} />
              </Card>

              {/* ── 7. SUN + MOON ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <Card className="p-3.5 border border-border-subtle bg-surface-card rounded-2xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-[8.5px] font-black uppercase tracking-widest text-text-muted">Zonneboog</p>
                  </div>
                  <SunArc sunrise={today?.astro?.sunrise ?? ''} sunset={today?.astro?.sunset ?? ''} localtime={weather.location.localtime ?? ''} />
                </Card>
                <Card className="p-3.5 border border-border-subtle bg-surface-card rounded-2xl">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Moon className="w-3.5 h-3.5 text-purple-400" />
                    <p className="text-[8.5px] font-black uppercase tracking-widest text-text-muted">Maanfase</p>
                  </div>
                  <MoonVisual phase={today?.astro?.moon_phase ?? '--'} illumination={today?.astro?.moon_illumination ?? 0} />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { l: 'Opkomst', v: today?.astro?.moonrise || '--' },
                      { l: 'Ondergang', v: today?.astro?.moonset || '--' },
                    ].map(({ l, v }) => (
                      <div key={l} className="rounded-xl bg-surface-soft border border-border-subtle p-2">
                        <p className="text-[7.5px] font-black uppercase tracking-widest text-text-muted mb-0.5">{l}</p>
                        <p className="text-[11px] font-bold text-text-primary">{v}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* ── 8. 3-DAY FORECAST ── */}
              <div>
                <SectionHeader icon={Cloud} title="Meerdaagse forecast"
                  right={<span className="text-[8px] font-black uppercase tracking-widest text-text-dim">3 dagen</span>} />
                <div className="space-y-2">
                  {weather.forecast.forecastday.map((day, i) => {
                    const ds = calcFishScore(
                      day.day.avgtemp_c, weather.current.pressure_mb, day.day.maxwind_kph * 0.6,
                      day.day.daily_chance_of_rain, day.day.uv, today?.astro?.moon_phase ?? ''
                    );
                    const dm = getScoreMeta(ds);
                    return (
                      <Card key={day.date} className="p-3.5 border border-border-subtle bg-surface-card rounded-2xl">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-text-primary">
                              {i === 0 ? 'Vandaag' : i === 1 ? 'Morgen' : fmtDayLong(day.date)}
                            </p>
                            <p className="text-[9.5px] text-text-muted capitalize truncate">{day.day.condition.text}</p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Fish score badge */}
                            <div className="w-9 h-9 rounded-lg border flex flex-col items-center justify-center"
                              style={{ background: `${dm.color}12`, borderColor: `${dm.color}28`, color: dm.color }}>
                              <span className="text-[13px] font-black leading-none">{ds}</span>
                              <span className="text-[6px] leading-none mt-px">vis</span>
                            </div>
                            <img src={day.day.condition.icon} alt="" className="w-10 h-10" />
                            <div className="text-right">
                              <p className="text-sm font-black text-brand">
                                {Math.round(day.day.maxtemp_c)}°
                                <span className="text-text-dim font-normal text-xs"> / {Math.round(day.day.mintemp_c)}°</span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { l: 'Regen',   v: `${day.day.daily_chance_of_rain}%` },
                            { l: 'Neersl.', v: `${day.day.totalprecip_mm}mm` },
                            { l: 'Wind',    v: `${Math.round(day.day.maxwind_kph)}` },
                            { l: 'UV',      v: String(day.day.uv) },
                          ].map(({ l, v }) => (
                            <div key={l} className="rounded-lg bg-surface-soft border border-border-subtle p-1.5 text-center">
                              <p className="text-[7px] font-black uppercase tracking-wide text-text-muted mb-0.5">{l}</p>
                              <p className="text-[11px] font-bold text-text-primary">{v}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* ── 9. PRESSURE TREND CHART ── */}
              {pressureChartData.length > 1 && (
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-3.5 h-3.5 text-brand" />
                      <p className="text-[8.5px] font-black uppercase tracking-widest text-text-muted">Luchtdruk trend</p>
                    </div>
                    <RangeToggle value={chartRange} onChange={setChartRange} />
                  </div>
                  <ResponsiveContainer width="100%" height={124}>
                    <AreaChart data={pressureChartData} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pgChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="var(--color-brand,#22c55e)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--color-brand,#22c55e)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 6" stroke="#111d2e" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#4b5563', fontSize: 8 }} axisLine={false} tickLine={false}
                        interval="preserveStartEnd" />
                      <YAxis tick={{ fill: '#4b5563', fontSize: 8 }} axisLine={false} tickLine={false}
                        domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip content={<ChartTip />} />
                      <Area type="monotone" dataKey="Druk" name="Druk"
                        stroke="var(--color-brand,#22c55e)" strokeWidth={1.8}
                        fill="url(#pgChartGrad)" dot={false} unit=" hPa" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-[9.5px] text-text-muted mt-2 leading-relaxed">
                    Dalende druk = activerende vis. Stijgende druk = rustiger gedrag.
                  </p>
                </Card>
              )}

              {/* ── 10. TEMP + RAIN CHART ── */}
              {tempRainChartData.length > 1 && (
                <Card className="p-4 border border-border-subtle bg-surface-card rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      <p className="text-[8.5px] font-black uppercase tracking-widest text-text-muted">Temperatuur & Neerslag</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-0.5 bg-amber-400 rounded" />
                        <span className="text-[8px] text-text-dim font-bold">°C</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-0.5 bg-sky-400 rounded" style={{ borderStyle: 'dashed' }} />
                        <span className="text-[8px] text-text-dim font-bold">%regen</span>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={130}>
                    <AreaChart data={tempRainChartData} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#38bdf8" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 6" stroke="#111d2e" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#4b5563', fontSize: 8 }} axisLine={false} tickLine={false}
                        interval="preserveStartEnd" />
                      <YAxis tick={{ fill: '#4b5563', fontSize: 8 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Area type="monotone" dataKey="Temp" name="Temp"
                        stroke="#f59e0b" strokeWidth={1.8} fill="url(#tempGrad)" dot={false} unit="°C" />
                      <Area type="monotone" dataKey="Regen" name="Regen"
                        stroke="#38bdf8" strokeWidth={1.4} strokeDasharray="4 3"
                        fill="url(#rainGrad)" dot={false} unit="%" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* ── 11. FISHING ANALYSIS ── */}
              <div>
                <SectionHeader icon={Anchor} title="Vissers analyse" />
                <Card className="p-3.5 border border-border-subtle bg-surface-card rounded-2xl">
                  <div className="space-y-2">
                    {[
                      {
                        icon: Gauge,
                        label: 'Luchtdruk',
                        status: weather.current.pressure_mb < 1010 ? 'good' : weather.current.pressure_mb > 1022 ? 'neutral' : 'ok',
                        text: weather.current.pressure_mb < 1000
                          ? 'Opvallend lage druk — actief aasgedrag verwacht.'
                          : weather.current.pressure_mb < 1010
                          ? 'Lage druk stimuleert visactiviteit; focus op drukwisselingen.'
                          : weather.current.pressure_mb > 1022
                          ? 'Hogere druk. Vis kan voorzichtiger zijn — focus op timing.'
                          : 'Neutrale druk. Laat stek en soort leidend zijn.',
                      },
                      {
                        icon: Wind,
                        label: 'Wind & Golfslag',
                        status: weather.current.wind_kph < 15 ? 'good' : weather.current.wind_kph > 28 ? 'bad' : 'ok',
                        text: weather.current.wind_kph < 10
                          ? 'Windstil — ideaal voor nauwkeurig vissen over alle technieken.'
                          : weather.current.wind_kph < 20
                          ? 'Lichte wind. Goed voor actieve vis; windkant-stekken interessant.'
                          : weather.current.wind_kph < 30
                          ? 'Stevige wind. Zoek beschutte oevers of diepere plekken.'
                          : 'Sterke wind. Diepwater of beschutte stekken presteren beter.',
                      },
                      {
                        icon: CloudRain,
                        label: 'Neerslag & Front',
                        status: (today?.day?.daily_chance_of_rain ?? 0) > 55 && weather.current.wind_kph < 22 ? 'good' : 'ok',
                        text: (today?.day?.daily_chance_of_rain ?? 0) > 60
                          ? `${today?.day?.daily_chance_of_rain}% kans op regen. Naderend front activeert aasgedrag — bij lage druk zeker interessant.`
                          : `Beperkte regenkans (${today?.day?.daily_chance_of_rain ?? 0}%). Gebruik licht en wind als primair kompas.`,
                      },
                      {
                        icon: Sun,
                        label: 'Licht & UV',
                        status: weather.current.uv < 4 ? 'good' : weather.current.uv >= 7 ? 'neutral' : 'ok',
                        text: weather.current.uv <= 2
                          ? 'Laag UV. Vis staat minder diep en is actiever in ondiepe zones.'
                          : weather.current.uv <= 5
                          ? 'Matig UV. Schemertijden geven de beste actie.'
                          : weather.current.uv <= 7
                          ? 'Hoog UV. Vis trekt naar schaduw of diepte.'
                          : 'Zeer hoog UV. Vroeg ochtend of avond is de beste keuze.',
                      },
                    ].map(({ icon: Icon, label, status, text }) => (
                      <div key={label} className="flex gap-3 rounded-xl bg-surface-soft border border-border-subtle p-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          status === 'good'    ? 'bg-green-500/10 text-green-400'
                            : status === 'bad' ? 'bg-red-500/10 text-red-400'
                            : 'bg-brand/8 text-brand'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">{label}</p>
                            <span className={`text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                              status === 'good'    ? 'bg-green-500/15 text-green-400'
                                : status === 'bad' ? 'bg-red-500/15 text-red-400'
                                : 'bg-brand/15 text-brand'
                            }`}>
                              {status === 'good' ? 'Gunstig' : status === 'bad' ? 'Ongunstig' : 'Neutraal'}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary leading-relaxed">{text}</p>
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