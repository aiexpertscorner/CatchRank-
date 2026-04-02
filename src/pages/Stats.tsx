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
  X,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Weight,
  History
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Catch, Session, Spot } from '../types';
import { Button, Card, Badge } from '../components/ui/Base';
import { StatCard } from '../components/stats/StatCard';
import { ChartWrapper } from '../components/stats/ChartWrapper';
import { FilterBar } from '../components/stats/FilterBar';
import { CompareBlock } from '../components/stats/CompareBlock';
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
type StatsTab = 'overview' | 'catches' | 'species' | 'sessions' | 'spots' | 'trends';

export default function Stats() {
  const { profile } = useAuth();
  const [catches, setCatches] = useState<Catch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');

  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedSpot, setSelectedSpot] = useState<string>('all');
  const [selectedTechnique, setSelectedTechnique] = useState<string>('all');
  const [selectedBait, setSelectedBait] = useState<string>('all');
  const [selectedSessionType, setSelectedSessionType] = useState<string>('all');
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

    // Technique Filter
    if (selectedTechnique !== 'all') {
      data = data.filter(c => c.technique === selectedTechnique);
    }

    // Bait Filter
    if (selectedBait !== 'all') {
      data = data.filter(c => c.bait === selectedBait);
    }

    // Session Type Filter
    if (selectedSessionType !== 'all') {
      data = data.filter(c => {
        const session = sessions.find(s => s.id === c.sessionId);
        return session?.type === selectedSessionType;
      });
    }

    return data;
  }, [catches, timeRange, selectedSpecies, selectedSpot, selectedTechnique, selectedBait, selectedSessionType, sessions]);

  // Previous Period Data for Comparison
  const previousPeriodCatches = useMemo(() => {
    let data = catches.filter(c => c.status === 'complete');
    
    const now = new Date();
    let startDate: Date | null = null;
    let previousStartDate: Date | null = null;
    
    if (timeRange === '7d') {
      startDate = subDays(now, 7);
      previousStartDate = subDays(now, 14);
    } else if (timeRange === '30d') {
      startDate = subDays(now, 30);
      previousStartDate = subDays(now, 60);
    } else if (timeRange === '90d') {
      startDate = subDays(now, 90);
      previousStartDate = subDays(now, 180);
    } else if (timeRange === '1y') {
      startDate = subDays(now, 365);
      previousStartDate = subDays(now, 730);
    }

    if (startDate && previousStartDate) {
      return data.filter(c => {
        if (!c.timestamp) return false;
        const cDate = c.timestamp.toDate();
        return cDate >= previousStartDate! && cDate < startDate!;
      });
    }

    return [];
  }, [catches, timeRange]);

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

    const totalWeight = filteredCatches.reduce((acc, c) => acc + (c.weight || 0), 0);
    
    const catchesWithLength = filteredCatches.filter(c => c.length && c.length > 0);
    const avgLength = catchesWithLength.length > 0 
      ? (catchesWithLength.reduce((acc, c) => acc + (c.length || 0), 0) / catchesWithLength.length).toFixed(1)
      : "0";

    const sessionSuccess = totalSessions > 0 
      ? (totalCatches / totalSessions).toFixed(1)
      : "0";

    const prLength = filteredCatches.length > 0 
      ? Math.max(...filteredCatches.map(c => c.length || 0))
      : 0;

    const prWeight = filteredCatches.length > 0 
      ? Math.max(...filteredCatches.map(c => c.weight || 0))
      : 0;

    // Comparison with previous period
    const prevTotalCatches = previousPeriodCatches.length;
    const catchTrend = prevTotalCatches > 0 
      ? Math.round(((totalCatches - prevTotalCatches) / prevTotalCatches) * 100)
      : 0;

    // Best Month & Season
    const monthCounts: Record<number, number> = {};
    filteredCatches.forEach(c => {
      if (!c.timestamp) return;
      const month = getMonth(c.timestamp.toDate());
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    
    const bestMonthIndex = Object.keys(monthCounts).length > 0
      ? parseInt(Object.entries(monthCounts).reduce((a, b) => b[1] > a[1] ? b : a)[0])
      : -1;
    
    const bestMonth = bestMonthIndex !== -1 
      ? format(new Date(2024, bestMonthIndex, 1), 'MMMM', { locale: nl })
      : 'N/A';

    const seasons = {
      'Lente': [2, 3, 4],
      'Zomer': [5, 6, 7],
      'Herfst': [8, 9, 10],
      'Winter': [11, 0, 1]
    };

    const seasonCounts: Record<string, number> = { 'Lente': 0, 'Zomer': 0, 'Herfst': 0, 'Winter': 0 };
    filteredCatches.forEach(c => {
      if (!c.timestamp) return;
      const month = getMonth(c.timestamp.toDate());
      for (const [season, months] of Object.entries(seasons)) {
        if (months.includes(month)) {
          seasonCounts[season]++;
          break;
        }
      }
    });

    const bestSeason = Object.entries(seasonCounts).reduce((a, b) => b[1] > a[1] ? b : a)[0];

    return {
      totalCatches,
      totalSessions,
      avgLength,
      sessionSuccess,
      totalWeight,
      prLength,
      prWeight,
      catchTrend,
      bestMonth,
      bestSeason
    };
  }, [filteredCatches, previousPeriodCatches, sessions, timeRange]);

  const uniqueTechniques = useMemo(() => {
    const set = new Set(catches.map(c => c.technique).filter(Boolean));
    return Array.from(set).sort();
  }, [catches]);

  const uniqueBaits = useMemo(() => {
    const set = new Set(catches.map(c => c.bait).filter(Boolean));
    return Array.from(set).sort();
  }, [catches]);

  const uniqueSpecies = useMemo(() => {
    const set = new Set(catches.map(c => c.species).filter(Boolean));
    return Array.from(set).sort();
  }, [catches]);

  const uniqueSpots = useMemo(() => {
    const set = new Set(catches.map(c => c.spotName || c.spotId).filter(Boolean));
    return Array.from(set).sort();
  }, [catches]);

  const uniqueSessionTypes = useMemo(() => {
    const set = new Set(sessions.map(s => s.type).filter(Boolean));
    return Array.from(set).sort();
  }, [sessions]);

  const sessionStats = useMemo(() => {
    const periodSessions = sessions.filter(s => {
      if (timeRange === 'all') return true;
      const now = new Date();
      let startDate: Date | null = null;
      if (timeRange === '7d') startDate = subDays(now, 7);
      else if (timeRange === '30d') startDate = subDays(now, 30);
      else if (timeRange === '90d') startDate = subDays(now, 90);
      else if (timeRange === '1y') startDate = subDays(now, 365);
      
      if (!startDate || !s.startTime) return true;
      return s.startTime.toDate() >= startDate;
    });

    let totalMinutes = 0;
    let nightSessions = 0;

    periodSessions.forEach(s => {
      if (s.startTime && s.endTime) {
        const diff = s.endTime.toDate().getTime() - s.startTime.toDate().getTime();
        totalMinutes += Math.floor(diff / (1000 * 60));
      }
      if (s.type === 'Nacht') nightSessions++;
    });

    const avgMinutes = periodSessions.length > 0 ? Math.floor(totalMinutes / periodSessions.length) : 0;
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const avgHours = Math.floor(avgMinutes / 60);
    const avgRemainingMinutes = avgMinutes % 60;

    return {
      totalTime: `${totalHours}u ${remainingMinutes}m`,
      avgDuration: `${avgHours}u ${avgRemainingMinutes}m`,
      nightSessions,
      count: periodSessions.length
    };
  }, [sessions, timeRange]);

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

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'overview', label: 'Overzicht', icon: Activity },
          { id: 'trends', label: 'Trends', icon: LineChartIcon },
          { id: 'catches', label: 'Vangsten', icon: Fish },
          { id: 'species', label: 'Soorten', icon: PieChartIcon },
          { id: 'sessions', label: 'Sessies', icon: History },
          { id: 'spots', label: 'Stekken', icon: MapPin },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as StatsTab)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap border-2",
              activeTab === tab.id 
                ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                : "bg-white text-text-secondary border-transparent hover:border-border-subtle"
            )}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

                <div className="space-y-3">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Techniek</label>
                  <select 
                    value={selectedTechnique}
                    onChange={(e) => setSelectedTechnique(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface-soft border-transparent font-bold text-text-primary focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  >
                    <option value="all">Alle Technieken</option>
                    {uniqueTechniques.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Aas</label>
                  <select 
                    value={selectedBait}
                    onChange={(e) => setSelectedBait(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface-soft border-transparent font-bold text-text-primary focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  >
                    <option value="all">Alle Aassoorten</option>
                    {uniqueBaits.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Sessie Type</label>
                  <select 
                    value={selectedSessionType}
                    onChange={(e) => setSelectedSessionType(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface-soft border-transparent font-bold text-text-primary focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  >
                    <option value="all">Alle Types</option>
                    {uniqueSessionTypes.map(t => <option key={t} value={t}>{t}</option>)}
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
                    setSelectedTechnique('all');
                    setSelectedBait('all');
                    setSelectedSessionType('all');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content based on Active Tab */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-10">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  label="Vangsten"
                  value={stats.totalCatches}
                  icon={Fish}
                  variant="blue"
                  trend={{ value: `${Math.abs(stats.catchTrend)}%`, direction: stats.catchTrend >= 0 ? 'up' : 'down' }}
                  description="Totaal aantal vangsten"
                />
                <StatCard 
                  label="Gem. Lengte"
                  value={`${stats.avgLength} cm`}
                  icon={Maximize2}
                  variant="aqua"
                  description="Gemiddelde lengte vis"
                />
                <StatCard 
                  label="Vangsten / Sessie"
                  value={stats.sessionSuccess}
                  icon={Zap}
                  variant="success"
                  description="Efficiëntie per sessie"
                />
                <StatCard 
                  label="Sessies"
                  value={stats.totalSessions}
                  icon={Calendar}
                  variant="warning"
                  description="Totaal aantal sessies"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Chart: Catches over Time */}
                <div className="lg:col-span-8">
                  <ChartWrapper 
                    title="Vangsten Trend" 
                    subtitle={timeRange === '7d' ? 'Laatste week' : timeRange === '30d' ? 'Laatste 30 dagen' : 'Historisch overzicht'}
                    icon={LineChartIcon}
                  >
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
                  </ChartWrapper>
                </div>

                {/* Comparison Block */}
                <div className="lg:col-span-4">
                  <Card className="p-8 border-none shadow-premium rounded-[2.5rem] h-full flex flex-col">
                    <div className="space-y-1 mb-8">
                      <h3 className="text-2xl font-bold text-text-primary tracking-tight">Vergelijking</h3>
                      <p className="text-xs text-text-muted uppercase tracking-widest font-black">Huidige vs Vorige periode</p>
                    </div>
                    
                    <div className="space-y-8 flex-1">
                      <CompareBlock 
                        label="Vangsten"
                        current={stats.totalCatches}
                        previous={previousPeriodCatches.length}
                        unit=""
                      />
                      <CompareBlock 
                        label="Sessies"
                        current={stats.totalSessions}
                        previous={sessions.length - stats.totalSessions} // Simplified
                        unit=""
                      />
                      <CompareBlock 
                        label="Gem. Lengte"
                        current={parseFloat(stats.avgLength)}
                        previous={previousPeriodCatches.length > 0 ? parseFloat((previousPeriodCatches.reduce((acc, c) => acc + (c.length || 0), 0) / previousPeriodCatches.filter(c => c.length).length).toFixed(1)) : 0}
                        unit="cm"
                      />
                    </div>

                    <div className="mt-8 space-y-4">
                      <div className="p-6 bg-surface-soft rounded-3xl border border-border-subtle flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Beste Maand</p>
                          <p className="text-lg font-black text-text-primary">{stats.bestMonth}</p>
                        </div>
                        <Calendar className="w-8 h-8 text-brand/20" />
                      </div>
                      <div className="p-6 bg-surface-soft rounded-3xl border border-border-subtle flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Beste Seizoen</p>
                          <p className="text-lg font-black text-text-primary">{stats.bestSeason}</p>
                        </div>
                        <Waves className="w-8 h-8 text-aqua/20" />
                      </div>
                    </div>

                    <div className="mt-8 p-6 bg-brand-soft rounded-3xl border border-brand/10">
                      <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-brand" />
                        <span className="text-sm font-bold text-brand">Groeimindset</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        Je vangsten zijn met <span className="font-black text-brand">{stats.catchTrend}%</span> {stats.catchTrend >= 0 ? 'gestegen' : 'gedaald'} ten opzichte van de vorige periode. Blijf experimenteren met nieuwe stekken!
                      </p>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Activity Heatmap */}
                <div className="lg:col-span-12">
                  <ChartWrapper 
                    title="Vangst Activiteit" 
                    subtitle="Consistentie over de laatste 4 weken"
                    icon={Activity}
                  >
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
                  </ChartWrapper>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-12">
                  <ChartWrapper 
                    title="Seizoensgebonden Trends" 
                    subtitle="Vangsten per maand over het hele jaar"
                    icon={LineChartIcon}
                  >
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={catchesByTime}>
                          <defs>
                            <linearGradient id="colorTrends" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2F7C91" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#2F7C91" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#7B8798' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#7B8798' }} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }} />
                          <Area type="monotone" dataKey="count" stroke="#2F7C91" strokeWidth={4} fillOpacity={1} fill="url(#colorTrends)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartWrapper>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartWrapper title="Beste Tijdstippen" subtitle="Vangstkans per uur van de dag" icon={Clock}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={catchesByHour}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#7B8798' }} interval={3} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }} />
                        <Bar dataKey="count" fill="#2457D6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartWrapper>

                <div className="grid grid-cols-1 gap-6">
                  <Card className="p-8 border-none shadow-premium rounded-[2.5rem] bg-surface-soft">
                    <h3 className="text-xl font-bold text-text-primary mb-6">Trend Analyse</h3>
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center shrink-0">
                          <TrendingUp className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <h4 className="font-bold text-text-primary">Stijgende Lijn</h4>
                          <p className="text-sm text-text-secondary">Je vangsten in {stats.bestMonth} waren uitzonderlijk hoog. Dit wijst op een goede match met je techniek in deze periode.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center shrink-0">
                          <Target className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                          <h4 className="font-bold text-text-primary">Focus Punt</h4>
                          <p className="text-sm text-text-secondary">De meeste vangsten gebeuren tussen 18:00 en 21:00. Overweeg meer avondsessies voor optimaal resultaat.</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'catches' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  label="Totaal Gewicht"
                  value={`${stats.totalWeight.toLocaleString()} g`}
                  icon={Weight}
                  variant="aqua"
                  description="Gecumuleerd gewicht"
                />
                <StatCard 
                  label="PR Lengte"
                  value={`${stats.prLength} cm`}
                  icon={Trophy}
                  variant="warning"
                  description="Grootste vis ooit"
                />
                <StatCard 
                  label="PR Gewicht"
                  value={`${stats.prWeight} g`}
                  icon={Trophy}
                  variant="success"
                  description="Zwaarste vis ooit"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartWrapper title="Aas Succes" subtitle="Meest effectieve aassoorten" icon={Target}>
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
                  </div>
                </ChartWrapper>

                <ChartWrapper title="Tijdstip Analyse" subtitle="Wanneer vang je de meeste vis?" icon={Clock}>
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
                </ChartWrapper>
              </div>
            </div>
          )}

          {activeTab === 'species' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5">
                <ChartWrapper title="Top Vissoorten" subtitle="Verdeling per soort" icon={PieChartIcon}>
                  <div className="h-[300px] w-full">
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
                </ChartWrapper>
              </div>
              <div className="lg:col-span-7">
                <Card className="p-8 border-none shadow-premium rounded-[2.5rem] h-full">
                  <div className="space-y-1 mb-8">
                    <h3 className="text-2xl font-bold text-text-primary tracking-tight">Soort Specifieke Records</h3>
                    <p className="text-xs text-text-muted uppercase tracking-widest font-black">Je persoonlijke bests per vissoort</p>
                  </div>
                  <div className="space-y-4">
                    {uniqueSpecies.map(species => {
                      const speciesCatches = catches.filter(c => c.species === species);
                      const maxLen = Math.max(...speciesCatches.map(c => c.length || 0));
                      const maxWeight = Math.max(...speciesCatches.map(c => c.weight || 0));
                      return (
                        <div key={species} className="p-6 bg-surface-soft rounded-3xl flex items-center justify-between hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-brand/10 group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:bg-brand-soft transition-colors">
                              <Fish className="w-6 h-6 text-brand" />
                            </div>
                            <div>
                              <h4 className="font-bold text-text-primary">{species}</h4>
                              <p className="text-xs text-text-muted font-black uppercase tracking-widest">{speciesCatches.length} vangsten</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">PR Lengte</p>
                              <p className="font-black text-brand">{maxLen} cm</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">PR Gewicht</p>
                              <p className="font-black text-aqua">{maxWeight} g</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ChartWrapper title="Sessie Succes" subtitle="Vangsten per sessie over tijd" icon={Zap}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sessions.slice(-10).map(s => ({
                        name: format(s.startTime?.toDate() || new Date(), 'd MMM', { locale: nl }),
                        catches: catches.filter(c => c.sessionId === s.id).length
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#7B8798' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#7B8798' }} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }} />
                        <Bar dataKey="catches" fill="#2457D6" radius={[8, 8, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartWrapper>
                <div className="space-y-6">
                  <Card className="p-8 border-none shadow-premium rounded-[2.5rem] bg-brand text-white overflow-hidden relative">
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold mb-2">Sessie Efficiëntie</h3>
                      <p className="text-brand-soft text-sm mb-6">Je gemiddelde vangst per sessie is deze periode gestegen.</p>
                      <div className="text-5xl font-black mb-2">{stats.sessionSuccess}</div>
                      <div className="text-xs font-black uppercase tracking-widest opacity-70">Vangsten per sessie</div>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute top-0 right-0 p-8">
                      <TrendingUp className="w-12 h-12 text-white/20" />
                    </div>
                  </Card>
                  <Card className="p-8 border-none shadow-premium rounded-[2.5rem]">
                    <h3 className="text-xl font-bold text-text-primary mb-6">Sessie Statistieken</h3>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary font-bold">Totaal Tijd aan Water</span>
                        <span className="text-text-primary font-black">{sessionStats.totalTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary font-bold">Gem. Sessie Duur</span>
                        <span className="text-text-primary font-black">{sessionStats.avgDuration}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary font-bold">Nacht Sessies</span>
                        <span className="text-text-primary font-black">{sessionStats.nightSessions}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'spots' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartWrapper title="Stek Prestaties" subtitle="Meest succesvolle locaties" icon={MapPin}>
                  <div className="h-[400px] w-full">
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
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                        />
                        <Bar dataKey="value" fill="#2457D6" radius={[0, 12, 12, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartWrapper>
                <div className="space-y-6">
                  {catchesBySpot.map((spot, i) => (
                    <Card key={spot.name} className="p-6 border-none shadow-sm rounded-3xl flex items-center justify-between hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                          i === 0 ? "bg-brand text-white" : "bg-surface-soft text-text-muted"
                        )}>
                          {i + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-text-primary">{spot.name}</h4>
                          <p className="text-xs text-text-muted font-black uppercase tracking-widest">{spot.value} vangsten</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-xl font-bold text-brand">Bekijk Stek</Button>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </PageLayout>
  );
}
