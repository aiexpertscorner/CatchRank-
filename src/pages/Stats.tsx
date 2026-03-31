import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Fish, 
  Target, 
  Zap, 
  Trophy,
  ChevronDown,
  Filter,
  Download,
  MapPin,
  Clock,
  Waves,
  Maximize2,
  Search,
  X
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Catch, Session, Spot } from '../types';
import { Button, Card, Badge } from '../components/ui/Base';
import { StatCard } from '../components/ui/Data';
import { Input } from '../components/ui/Inputs';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval, 
  subMonths, 
  isWithinInterval, 
  startOfDay, 
  endOfDay,
  subDays,
  startOfYear,
  getYear,
  getMonth,
  getHours
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const COLORS = ['#2457D6', '#2F7C91', '#1F8A5B', '#C9891A', '#C94B4B', '#7E95B8', '#5A5A40', '#D9C7A2'];

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export default function Stats() {
  const { profile } = useAuth();
  const [catches, setCatches] = useState<Catch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedSpot, setSelectedSpot] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const catchesQuery = query(
      collection(db, 'catches'),
      where('userId', '==', profile.uid)
    );

    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', profile.uid)
    );

    const spotsQuery = query(
      collection(db, 'spots'),
      where('userId', '==', profile.uid)
    );

    const unsubCatches = onSnapshot(catchesQuery, (snapshot) => {
      setCatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Catch)));
    });

    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
    });

    const unsubSpots = onSnapshot(spotsQuery, (snapshot) => {
      setSpots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Spot)));
      setLoading(false);
    });

    return () => {
      unsubCatches();
      unsubSessions();
      unsubSpots();
    };
  }, [profile]);

  // Filtered Data
  const filteredCatches = useMemo(() => {
    let data = catches.filter(c => c.status === 'complete');
    
    // Time Range Filter
    const now = new Date();
    let startDate: Date | null = null;
    if (timeRange === '7d') startDate = subDays(now, 7);
    else if (timeRange === '30d') startDate = subDays(now, 30);
    else if (timeRange === '90d') startDate = subDays(now, 90);
    else if (timeRange === '1y') startDate = subDays(now, 365);

    if (startDate) {
      data = data.filter(c => {
        if (!c.timestamp) return false;
        return c.timestamp.toDate() >= startDate!;
      });
    }

    // Species Filter
    if (selectedSpecies !== 'all') {
      data = data.filter(c => c.species === selectedSpecies);
    }

    // Spot Filter
    if (selectedSpot !== 'all') {
      data = data.filter(c => c.spotId === selectedSpot || c.spotName === selectedSpot);
    }

    return data;
  }, [catches, timeRange, selectedSpecies, selectedSpot]);

  // Data processing for charts
  const catchesByTime = useMemo(() => {
    if (timeRange === '7d' || timeRange === '30d') {
      // Group by day
      const days = timeRange === '7d' ? 7 : 30;
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const label = format(date, 'd MMM', { locale: nl });
        const count = filteredCatches.filter(c => {
          if (!c.timestamp) return false;
          const cDate = c.timestamp.toDate();
          return startOfDay(cDate).getTime() === startOfDay(date).getTime();
        }).length;
        data.push({ name: label, count });
      }
      return data;
    } else {
      // Group by month
      const months = timeRange === '90d' ? 3 : 12;
      const data = [];
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const label = format(date, 'MMM', { locale: nl });
        const count = filteredCatches.filter(c => {
          if (!c.timestamp) return false;
          const cDate = c.timestamp.toDate();
          return getMonth(cDate) === getMonth(date) && getYear(cDate) === getYear(date);
        }).length;
        data.push({ name: label, count });
      }
      return data;
    }
  }, [filteredCatches, timeRange]);

  const catchesBySpecies = useMemo(() => {
    const speciesMap: Record<string, number> = {};
    filteredCatches.forEach(c => {
      const s = c.species || 'Onbekend';
      speciesMap[s] = (speciesMap[s] || 0) + 1;
    });
    return Object.entries(speciesMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredCatches]);

  const catchesBySpot = useMemo(() => {
    const spotMap: Record<string, number> = {};
    filteredCatches.forEach(c => {
      const s = c.spotName || 'Onbekende plek';
      spotMap[s] = (spotMap[s] || 0) + 1;
    });
    return Object.entries(spotMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredCatches]);

  const catchesByHour = useMemo(() => {
    const hourMap: Record<number, number> = {};
    // Initialize all hours
    for (let i = 0; i < 24; i++) hourMap[i] = 0;
    
    filteredCatches.forEach(c => {
      if (!c.timestamp) return;
      const hour = getHours(c.timestamp.toDate());
      hourMap[hour]++;
    });
    
    return Object.entries(hourMap).map(([hour, count]) => ({
      name: `${hour}:00`,
      count
    }));
  }, [filteredCatches]);

  const catchesByBait = useMemo(() => {
    const baitMap: Record<string, number> = {};
    filteredCatches.forEach(c => {
      const b = c.bait || 'Onbekend';
      baitMap[b] = (baitMap[b] || 0) + 1;
    });
    return Object.entries(baitMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredCatches]);

  const stats = useMemo(() => {
    const totalCatches = filteredCatches.length;
    const totalSessions = sessions.filter(s => {
      if (timeRange === 'all') return true;
      const now = new Date();
      let startDate: Date | null = null;
      if (timeRange === '7d') startDate = subDays(now, 7);
      else if (timeRange === '30d') startDate = subDays(now, 30);
      else if (timeRange === '90d') startDate = subDays(now, 90);
      else if (timeRange === '1y') startDate = subDays(now, 365);
      
      if (!startDate || !s.startTime) return true;
      return s.startTime.toDate() >= startDate;
    }).length;

    const avgLength = filteredCatches.length > 0 
      ? (filteredCatches.reduce((acc, c) => acc + (c.length || 0), 0) / filteredCatches.filter(c => c.length).length).toFixed(1)
      : '0';

    const sessionSuccess = totalSessions > 0 
      ? Math.round((filteredCatches.length / totalSessions) * 10) / 10
      : 0;

    return {
      totalCatches,
      totalSessions,
      avgLength,
      sessionSuccess
    };
  }, [filteredCatches, sessions, timeRange]);

  const uniqueSpecies = useMemo(() => {
    const set = new Set(catches.map(c => c.species).filter(Boolean));
    return Array.from(set).sort();
  }, [catches]);

  const uniqueSpots = useMemo(() => {
    const set = new Set(catches.map(c => c.spotName || c.spotId).filter(Boolean));
    return Array.from(set).sort();
  }, [catches]);

  const handleExport = () => {
    toast.success('Rapport wordt gegenereerd...', {
      description: 'Je ontvangt een melding zodra de download klaar is.'
    });
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-surface-soft rounded-[2.5rem]" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-surface-soft rounded-3xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 h-96 bg-surface-soft rounded-[2.5rem]" />
            <div className="lg:col-span-4 h-96 bg-surface-soft rounded-[2.5rem]" />
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Statistieken & Trends"
        subtitle="Krijg diepgaand inzicht in je vangstpatronen en prestaties."
        badge="Analytics"
        actions={
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              icon={<Download className="w-5 h-5" />}
              className="rounded-xl h-12 px-6 font-bold border-border-subtle hover:bg-surface-soft"
              onClick={handleExport}
            >
              Export
            </Button>
            <Button 
              variant={isFilterOpen ? "primary" : "secondary"}
              icon={<Filter className="w-5 h-5" />}
              className={cn(
                "rounded-xl h-12 px-6 font-bold border-border-subtle transition-all",
                !isFilterOpen && "hover:bg-surface-soft"
              )}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              Filters
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-10"
          >
            <Card className="p-8 border-none shadow-premium bg-white rounded-[2rem]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Periode</label>
                  <div className="flex flex-wrap gap-2">
                    {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map(range => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                          timeRange === range 
                            ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                            : "bg-surface-soft text-text-secondary border-transparent hover:border-border-subtle"
                        )}
                      >
                        {range === '7d' ? '7 Dagen' : range === '30d' ? '30 Dagen' : range === '90d' ? '90 Dagen' : range === '1y' ? '1 Jaar' : 'Altijd'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Vissoort</label>
                  <select 
                    value={selectedSpecies}
                    onChange={(e) => setSelectedSpecies(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface-soft border-transparent font-bold text-text-primary focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  >
                    <option value="all">Alle Soorten</option>
                    {uniqueSpecies.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Stek</label>
                  <select 
                    value={selectedSpot}
                    onChange={(e) => setSelectedSpot(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface-soft border-transparent font-bold text-text-primary focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  >
                    <option value="all">Alle Stekken</option>
                    {uniqueSpots.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end mt-8 pt-6 border-t border-border-subtle">
                <Button 
                  variant="ghost" 
                  className="text-text-muted font-bold hover:text-primary"
                  onClick={() => {
                    setTimeRange('30d');
                    setSelectedSpecies('all');
                    setSelectedSpot('all');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          label="Vangsten"
          value={stats.totalCatches}
          icon={Fish}
          variant="blue"
          trend={{ value: `${timeRange === 'all' ? 'Totaal' : 'In periode'}`, direction: 'up' }}
        />
        <StatCard 
          label="Gem. Lengte"
          value={`${stats.avgLength} cm`}
          icon={Maximize2}
          variant="aqua"
        />
        <StatCard 
          label="Vangsten / Sessie"
          value={stats.sessionSuccess}
          icon={Zap}
          variant="success"
        />
        <StatCard 
          label="Sessies"
          value={stats.totalSessions}
          icon={Calendar}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Main Chart: Catches over Time */}
        <Card className="lg:col-span-8 p-8 border-none shadow-sm rounded-[2.5rem]">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-text-primary tracking-tight">Vangsten Trend</h3>
              <p className="text-xs text-text-muted uppercase tracking-widest font-black">
                {timeRange === '7d' ? 'Laatste week' : timeRange === '30d' ? 'Laatste 30 dagen' : 'Historisch overzicht'}
              </p>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={catchesByTime}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2457D6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2457D6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#7B8798' }}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#7B8798' }}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    padding: '16px',
                    fontWeight: 'bold'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#2457D6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Species Distribution */}
        <Card className="lg:col-span-4 p-8 border-none shadow-sm rounded-[2.5rem]">
          <div className="space-y-1 mb-8">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">Top Vissoorten</h3>
            <p className="text-xs text-text-muted uppercase tracking-widest font-black">Verdeling per soort</p>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={catchesBySpecies}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {catchesBySpecies.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4 mt-8">
            {catchesBySpecies.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-sm font-bold text-text-secondary group-hover:text-primary transition-colors">{s.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-text-primary">{s.value}</span>
                  <span className="text-[10px] font-black text-text-muted uppercase">{stats.totalCatches > 0 ? Math.round((s.value / stats.totalCatches) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Spot Performance */}
        <Card className="lg:col-span-6 p-8 border-none shadow-sm rounded-[2.5rem]">
          <div className="space-y-1 mb-8">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">Stek Prestaties</h3>
            <p className="text-xs text-text-muted uppercase tracking-widest font-black">Meest succesvolle locaties</p>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catchesBySpot} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 800, fill: '#142033' }}
                  width={120}
                />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC', radius: 12 }}
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#2457D6" 
                  radius={[0, 12, 12, 0]} 
                  barSize={32}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Time of Day Analysis */}
        <Card className="lg:col-span-6 p-8 border-none shadow-sm rounded-[2.5rem]">
          <div className="space-y-1 mb-8">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">Tijdstip Analyse</h3>
            <p className="text-xs text-text-muted uppercase tracking-widest font-black">Wanneer vang je de meeste vis?</p>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={catchesByHour}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#7B8798' }}
                  interval={3}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#2F7C91" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#2F7C91', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                  animationDuration={2000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-between items-center mt-6 px-4 py-3 bg-surface-soft rounded-2xl">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-brand" />
              <span className="text-sm font-bold text-text-secondary">Beste tijdstip:</span>
            </div>
            <span className="text-lg font-black text-brand">
              {catchesByHour.length > 0 ? catchesByHour.reduce((prev, current) => (prev.count > current.count) ? prev : current).name : '--:--'}
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Bait & Technique Success */}
        <Card className="lg:col-span-4 p-8 border-none shadow-sm rounded-[2.5rem]">
          <div className="space-y-1 mb-8">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">Aas Succes</h3>
            <p className="text-xs text-text-muted uppercase tracking-widest font-black">Meest effectieve aassoorten</p>
          </div>
          
          <div className="space-y-6">
            {catchesByBait.map((b, i) => (
              <div key={b.name} className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-text-secondary">{b.name}</span>
                  <span className="text-text-primary">{b.value} vangsten</span>
                </div>
                <div className="h-3 w-full bg-surface-soft rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.totalCatches > 0 ? (b.value / stats.totalCatches) * 100 : 0}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full bg-brand rounded-full"
                  />
                </div>
              </div>
            ))}
            {catchesByBait.length === 0 && (
              <div className="py-12 text-center text-text-muted font-bold">Geen data beschikbaar</div>
            )}
          </div>
        </Card>

        {/* Activity Heatmap */}
        <Card className="lg:col-span-8 p-8 border-none shadow-sm rounded-[2.5rem]">
          <div className="space-y-1 mb-8">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">Vangst Activiteit</h3>
            <p className="text-xs text-text-muted uppercase tracking-widest font-black">Consistentie over de laatste 4 weken</p>
          </div>
          
          <div className="grid grid-cols-7 gap-3">
            {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
              <div key={day} className="text-center text-[10px] font-black text-text-muted uppercase mb-2 tracking-widest">{day}</div>
            ))}
            {Array.from({ length: 28 }).map((_, i) => {
              const date = subDays(new Date(), 27 - i);
              const count = catches.filter(c => {
                if (!c.timestamp) return false;
                return startOfDay(c.timestamp.toDate()).getTime() === startOfDay(date).getTime();
              }).length;
              
              return (
                <div 
                  key={i}
                  title={`${count} vangsten op ${format(date, 'd MMM')}`}
                  className={cn(
                    "aspect-square rounded-xl transition-all duration-500 hover:scale-110 cursor-pointer shadow-sm",
                    count === 0 ? "bg-surface-soft" : 
                    count === 1 ? "bg-brand/20" :
                    count === 2 ? "bg-brand/40" :
                    count === 3 ? "bg-brand/70" : "bg-brand"
                  )}
                />
              );
            })}
          </div>
          
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border-subtle">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success"></div>
                <span className="text-xs font-bold text-text-secondary">Beste dag: Zaterdag</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Minder</span>
              <div className="flex gap-1.5">
                {[0, 0.2, 0.4, 0.7, 1].map(op => (
                  <div key={op} className="w-4 h-4 rounded-md bg-brand" style={{ opacity: op || 0.1 }}></div>
                ))}
              </div>
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Meer</span>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
