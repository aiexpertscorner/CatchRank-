import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Fish, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Filter, 
  Zap, 
  Trophy,
  Waves,
  Wind,
  Thermometer,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { statsService, UserStats } from '../../../services/statsService';
import { useAuth } from '../../../App';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { StatCard, ProgressBar } from '../../../components/ui/Data';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Stats Screen
 * Part of the 'stats' feature module.
 * Provides deep analytics and visualizations of user performance.
 */

export default function Stats() {
  const { profile } = useAuth();
  const [activeRange, setActiveRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const loadStats = async () => {
      try {
        const userStats = await statsService.calculateUserStats(profile.uid);
        setStats(userStats);
      } catch (error) {
        console.error("Error calculating stats:", error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [profile]);

  const ranges = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Maand' },
    { id: 'year', label: 'Jaar' },
    { id: 'all', label: 'Totaal' },
  ] as const;

  return (
    <PageLayout>
      <PageHeader 
        title="Statistieken" 
        subtitle="Diepgaande analyse van je vangsten"
        actions={
          <div className="flex bg-surface-card border border-border-subtle rounded-xl p-1">
            {ranges.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveRange(r.id)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeRange === r.id ? 'bg-brand text-bg-main' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-10 pb-32">
        {/* Key Metrics Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 md:px-0">
          <StatCard 
            label="Vangsten" 
            value={stats?.totalCatches.toString() || "0"} 
            icon={Fish} 
            variant="blue" 
            trend={{ value: '+12%', direction: 'up' }}
            className="rounded-2xl md:rounded-[2rem] p-6 bg-surface-card border-border-subtle shadow-premium" 
          />
          <StatCard 
            label="Sessies" 
            value={stats?.totalSessions.toString() || "0"} 
            icon={Clock} 
            variant="success" 
            trend={{ value: '+5%', direction: 'up' }}
            className="rounded-2xl md:rounded-[2rem] p-6 bg-surface-card border-border-subtle shadow-premium" 
          />
          <StatCard 
            label="XP Verdiend" 
            value={stats?.totalXp ? (stats.totalXp > 1000 ? `${(stats.totalXp / 1000).toFixed(1)}k` : stats.totalXp.toString()) : "0"} 
            icon={Zap} 
            variant="accent" 
            trend={{ value: '+24%', direction: 'up' }}
            className="rounded-2xl md:rounded-[2rem] p-6 bg-surface-card border-border-subtle shadow-premium" 
          />
          <StatCard 
            label="PR's" 
            value={profile?.stats?.totalPrs?.toString() || "0"} 
            icon={Trophy} 
            variant="aqua" 
            className="rounded-2xl md:rounded-[2rem] p-6 bg-surface-card border-border-subtle shadow-premium" 
          />
        </section>

        {/* Activity Chart */}
        <section className="px-2 md:px-0">
          <Card className="p-8 border border-border-subtle bg-surface-card rounded-[2.5rem] shadow-premium relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-text-primary tracking-tight">Vangst Activiteit</h3>
                <p className="text-xs text-text-secondary font-medium">Overzicht van vangsten per maand</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-brand rounded-full" />
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-surface-soft rounded-full" />
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">2025</span>
                </div>
              </div>
            </div>
            
            <div className="h-64 flex items-end gap-2 md:gap-4 px-4 relative z-10">
              {(stats?.monthlyActivity || []).map((data, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                  <div className="w-full bg-surface-soft/30 rounded-t-xl relative overflow-hidden" style={{ height: `${Math.min(100, (data.count / (Math.max(...(stats?.monthlyActivity.map(m => m.count) || [1])) || 1)) * 100)}%` }}>
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      transition={{ delay: i * 0.05, duration: 0.8, ease: "easeOut" }}
                      className="absolute inset-0 bg-brand/30 group-hover:bg-brand/50 transition-colors" 
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand shadow-[0_0_10px_rgba(244,194,13,0.5)]" />
                  </div>
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{data.month.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2 md:px-0">
          {/* Species Distribution */}
          <section className="space-y-6">
            <h3 className="text-xl font-bold text-text-primary tracking-tight px-2">Soorten Verdeling</h3>
            <Card className="p-8 border border-border-subtle bg-surface-card rounded-[2rem] shadow-premium">
              <div className="flex items-center justify-center mb-10">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-surface-soft stroke-current" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-brand stroke-current" strokeWidth="3" strokeDasharray="45, 100" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-blue-400 stroke-current" strokeWidth="3" strokeDasharray="25, 100" strokeDashoffset="-45" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-success stroke-current" strokeWidth="3" strokeDasharray="15, 100" strokeDashoffset="-70" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-3xl font-bold text-text-primary">42</p>
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Totaal</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {(stats?.topSpecies || []).map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full bg-brand`} />
                      <span className="text-sm font-bold text-text-secondary">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-text-primary">{s.count}</span>
                      <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">{Math.round((s.count / (stats?.totalCatches || 1)) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* Top Performance */}
          <section className="space-y-6">
            <h3 className="text-xl font-bold text-text-primary tracking-tight px-2">Top Prestaties</h3>
            <div className="space-y-4">
              <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl flex items-center justify-between group cursor-pointer hover:border-brand/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand border border-brand/20 group-hover:scale-110 transition-transform duration-500">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Grootste Vangst</p>
                    <h4 className="text-lg font-bold text-text-primary tracking-tight">Snoek 108cm</h4>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand">+150 XP</p>
                  <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">Bonus</p>
                </div>
              </Card>
              <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl flex items-center justify-between group cursor-pointer hover:border-brand/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success border border-success/20 group-hover:scale-110 transition-transform duration-500">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Beste Sessie</p>
                    <h4 className="text-lg font-bold text-text-primary tracking-tight">8 Vangsten</h4>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-success">Sloterplas</p>
                  <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">Locatie</p>
                </div>
              </Card>
              <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl flex items-center justify-between group cursor-pointer hover:border-brand/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-400/10 flex items-center justify-center text-blue-400 border border-blue-400/20 group-hover:scale-110 transition-transform duration-500">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Meeste XP / Uur</p>
                    <h4 className="text-lg font-bold text-text-primary tracking-tight">420 XP/u</h4>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-400">Verticalen</p>
                  <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">Techniek</p>
                </div>
              </Card>
            </div>
          </section>
        </div>

        {/* Environmental Success Factors */}
        <section className="px-2 md:px-0">
          <h3 className="text-xl font-bold text-text-primary tracking-tight px-2 mb-6">Succes Factoren</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl space-y-6">
              <div className="flex items-center gap-3">
                <Thermometer className="w-5 h-5 text-brand" />
                <h4 className="text-sm font-bold text-text-primary uppercase tracking-tight">Temperatuur</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-secondary">0°C - 10°C</span>
                  <span className="text-text-primary">65% succes</span>
                </div>
                <ProgressBar value={65} className="h-1.5 bg-surface-soft" />
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-secondary">10°C - 20°C</span>
                  <span className="text-text-primary">25% succes</span>
                </div>
                <ProgressBar value={25} className="h-1.5 bg-surface-soft" />
              </div>
            </Card>
            <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl space-y-6">
              <div className="flex items-center gap-3">
                <Wind className="w-5 h-5 text-brand" />
                <h4 className="text-sm font-bold text-text-primary uppercase tracking-tight">Windkracht</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-secondary">1 - 3 Bft</span>
                  <span className="text-text-primary">80% succes</span>
                </div>
                <ProgressBar value={80} className="h-1.5 bg-surface-soft" />
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-secondary">4+ Bft</span>
                  <span className="text-text-primary">15% succes</span>
                </div>
                <ProgressBar value={15} className="h-1.5 bg-surface-soft" />
              </div>
            </Card>
            <Card className="p-6 border border-border-subtle bg-surface-card rounded-2xl space-y-6">
              <div className="flex items-center gap-3">
                <Waves className="w-5 h-5 text-brand" />
                <h4 className="text-sm font-bold text-text-primary uppercase tracking-tight">Luchtdruk</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-secondary">Dalend</span>
                  <span className="text-text-primary">90% succes</span>
                </div>
                <ProgressBar value={90} className="h-1.5 bg-surface-soft" />
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-secondary">Stijgend</span>
                  <span className="text-text-primary">30% succes</span>
                </div>
                <ProgressBar value={30} className="h-1.5 bg-surface-soft" />
              </div>
            </Card>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
