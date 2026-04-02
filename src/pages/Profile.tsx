import React, { useState } from 'react';
import { 
  User, 
  Settings as SettingsIcon, 
  LogOut, 
  Trophy, 
  Fish, 
  History,
  TrendingUp,
  Award,
  Calendar,
  MapPin,
  ChevronRight,
  Star,
  Zap,
  Camera
} from 'lucide-react';
import { useAuth } from '../App';
import { Button, Card, Badge } from '../components/ui/Base';
import { PageLayout } from '../components/layout/PageLayout';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

type ProfileTab = 'overview' | 'catches' | 'sessions' | 'stats' | 'achievements';

export default function Profile() {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overzicht', icon: <User className="w-4 h-4" /> },
    { id: 'catches', label: 'Vangsten', icon: <Fish className="w-4 h-4" /> },
    { id: 'sessions', label: 'Sessies', icon: <History className="w-4 h-4" /> },
    { id: 'stats', label: 'Stats', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'achievements', label: 'Awards', icon: <Award className="w-4 h-4" /> },
  ];

  return (
    <PageLayout maxWidth="max-w-6xl">
      <div className="space-y-6 pb-24">
        {/* Profile Header */}
        <div className="relative">
          {/* Cover Image Placeholder */}
          <div className="h-32 md:h-48 w-full bg-gradient-to-r from-brand/20 to-brand/5 rounded-2xl md:rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 grayscale" />
          </div>

          <div className="px-4 md:px-8 -mt-12 md:-mt-16 flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
            <div className="relative group self-start">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-3xl overflow-hidden border-4 border-bg-main shadow-2xl bg-surface-card">
                <img 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=F4C20D&color=050505`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-brand text-bg-main rounded-xl shadow-lg hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-krub font-bold text-text-primary tracking-tight">
                    {profile?.displayName}
                  </h1>
                  <Badge variant="accent" className="h-5 px-2 text-[8px] font-black uppercase tracking-widest">
                    Level {profile?.level}
                  </Badge>
                </div>
                <p className="text-sm text-text-muted max-w-md line-clamp-1">
                  {profile?.bio || 'Gepassioneerde sportvisser op zoek naar de volgende PR.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/settings">
                  <Button variant="secondary" size="sm" className="h-10 px-4 rounded-xl font-bold text-xs">
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Instellingen
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={logout} className="h-10 px-4 rounded-xl font-bold text-xs border-border-subtle">
                  <LogOut className="w-4 h-4 mr-2" />
                  Uitloggen
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-1">
          <StatCard label="Totaal Vangsten" value={profile?.stats?.totalCatches || 0} icon={<Fish className="w-4 h-4" />} />
          <StatCard label="Sessies" value={profile?.stats?.totalSessions || 0} icon={<History className="w-4 h-4" />} />
          <StatCard label="XP Punten" value={profile?.xp || 0} icon={<Zap className="w-4 h-4" />} color="text-brand" />
          <StatCard label="Rank" value={`#${profile?.rank || '?'}`} icon={<Trophy className="w-4 h-4" />} />
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-brand text-bg-main shadow-lg shadow-brand/10' 
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && <OverviewTab profile={profile} />}
              {activeTab === 'catches' && <CatchesTab />}
              {activeTab === 'sessions' && <SessionsTab />}
              {activeTab === 'stats' && <StatsTab profile={profile} />}
              {activeTab === 'achievements' && <AchievementsTab profile={profile} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageLayout>
  );
}

function StatCard({ label, value, icon, color = "text-text-primary" }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <Card className="p-3 md:p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-text-muted">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-xl md:text-2xl font-krub font-bold ${color}`}>{value}</span>
    </Card>
  );
}

function OverviewTab({ profile }: { profile: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Recent Activity */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-krub font-bold uppercase tracking-tight">Recente Activiteit</h3>
            <Button variant="ghost" size="sm" className="text-brand text-xs font-bold">Bekijk alles</Button>
          </div>
          <div className="space-y-3">
            <ActivityItem 
              type="catch"
              title="Grote Snoek gevangen"
              subtitle="92cm • 6.4kg • De Vecht"
              time="2 uur geleden"
              image="https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=400&auto=format&fit=crop"
            />
            <ActivityItem 
              type="session"
              title="Avondsessie voltooid"
              subtitle="4 vangsten • 125 XP • Loosdrecht"
              time="Gisteren"
            />
            <ActivityItem 
              type="milestone"
              title="Nieuwe Milestone!"
              subtitle="10 verschillende soorten gevangen"
              time="3 dagen geleden"
              icon={<Trophy className="w-5 h-5 text-brand" />}
            />
          </div>
        </section>

        {/* Favorite Gear Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-krub font-bold uppercase tracking-tight">Mijn Favoriete Gear</h3>
            <Link to="/gear">
              <Button variant="ghost" size="sm" className="text-brand text-xs font-bold">Beheer gear</Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <GearItem name="Shimano Stradic" category="Molen" />
            <GearItem name="Westin W3" category="Hengel" />
            <GearItem name="Savage Gear Line Thru" category="Aas" />
          </div>
        </section>
      </div>

      <div className="space-y-6">
        {/* Stats Summary */}
        <Card className="p-5 space-y-6">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-muted">Stats Summary</h3>
          <div className="space-y-4">
            <SummaryRow label="Favoriete Soort" value="Snoekbaars" icon={<Fish className="w-4 h-4" />} />
            <SummaryRow label="Beste Spot" value="Gooimeer" icon={<MapPin className="w-4 h-4" />} />
            <SummaryRow label="Gem. Lengte" value="44 cm" icon={<TrendingUp className="w-4 h-4" />} />
            <SummaryRow label="Dagen Streak" value="5 dagen" icon={<Zap className="w-4 h-4 text-brand" />} />
          </div>
          <Button variant="secondary" className="w-full font-bold text-xs py-3">
            Volledige Analyse
          </Button>
        </Card>

        {/* Achievements Preview */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-muted">Awards</h3>
            <span className="text-[10px] font-bold text-brand">12 / 48</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square rounded-lg bg-surface-soft flex items-center justify-center border border-border-subtle group cursor-pointer hover:bg-brand/10 transition-colors">
                <Award className="w-5 h-5 text-text-muted group-hover:text-brand transition-colors" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ActivityItem({ type, title, subtitle, time, image, icon }: { type: string; title: string; subtitle: string; time: string; image?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-3 flex items-center gap-4 hover:bg-surface-soft transition-colors cursor-pointer">
      {image ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-surface-soft flex items-center justify-center flex-shrink-0 border border-border-subtle">
          {icon || (type === 'session' ? <History className="w-6 h-6 text-text-muted" /> : <Fish className="w-6 h-6 text-text-muted" />)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-text-primary truncate">{title}</h4>
        <p className="text-xs text-text-muted truncate">{subtitle}</p>
      </div>
      <div className="text-[10px] font-medium text-text-dim whitespace-nowrap">
        {time}
      </div>
    </Card>
  );
}

function GearItem({ name, category }: { name: string; category: string }) {
  return (
    <div className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">{category}</p>
      <p className="text-xs font-bold text-text-primary truncate">{name}</p>
    </div>
  );
}

function SummaryRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-text-muted">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-xs font-bold text-text-primary">{value}</span>
    </div>
  );
}

// Placeholder tabs
function CatchesTab() {
  const catches = [
    { id: 1, species: 'Snoek', length: 92, weight: 6.4, date: '2 apr 2026', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=400&auto=format&fit=crop' },
    { id: 2, species: 'Baars', length: 42, weight: 1.2, date: '30 mrt 2026', image: 'https://images.unsplash.com/photo-1529230117010-b6c652a3d1f1?q=80&w=400&auto=format&fit=crop' },
    { id: 3, species: 'Snoekbaars', length: 74, weight: 4.1, date: '25 mrt 2026', image: 'https://images.unsplash.com/photo-1583240779096-737719c7a9d2?q=80&w=400&auto=format&fit=crop' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {catches.map(c => (
        <Card key={c.id} className="overflow-hidden group cursor-pointer border-none bg-surface-card">
          <div className="aspect-[4/3] relative">
            <img src={c.image} alt={c.species} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-main/80 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-xs font-bold text-white">{c.species}</p>
              <p className="text-[10px] text-text-muted">{c.length}cm • {c.weight}kg</p>
            </div>
          </div>
        </Card>
      ))}
      <button className="aspect-[4/3] rounded-2xl border-2 border-dashed border-border-subtle flex flex-col items-center justify-center gap-2 text-text-muted hover:border-brand hover:text-brand transition-all">
        <Fish className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase">Nieuwe Vangst</span>
      </button>
    </div>
  );
}

function SessionsTab() {
  const sessions = [
    { id: 1, title: 'Avondsessie Vecht', date: '2 apr 2026', catches: 4, duration: '3.5u', location: 'Weesp' },
    { id: 2, title: 'Ochtend op het Gooimeer', date: '30 mrt 2026', catches: 2, duration: '5u', location: 'Huizen' },
    { id: 3, title: 'Streetfishing Utrecht', date: '25 mrt 2026', catches: 7, duration: '4u', location: 'Utrecht' },
  ];

  return (
    <div className="space-y-3">
      {sessions.map(s => (
        <Card key={s.id} className="p-4 flex items-center justify-between hover:bg-surface-soft transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">{s.title}</h4>
              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.location}</span>
                <span>•</span>
                <span>{s.date}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-text-primary">{s.catches} Vangsten</p>
            <p className="text-[10px] text-text-muted">{s.duration}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function StatsTab({ profile }: { profile: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Persoonlijke Records</h3>
          <div className="space-y-3">
            <PRRow species="Snoek" length="112 cm" weight="11.4 kg" />
            <PRRow species="Baars" length="51 cm" weight="2.1 kg" />
            <PRRow species="Snoekbaars" length="88 cm" weight="6.2 kg" />
          </div>
        </Card>
        <Card className="p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Activiteit Analyse</h3>
          <div className="space-y-3">
            <SummaryRow label="Meest actieve dag" value="Zaterdag" icon={<Calendar className="w-4 h-4" />} />
            <SummaryRow label="Beste tijdstip" value="18:00 - 21:00" icon={<Zap className="w-4 h-4" />} />
            <SummaryRow label="Success Rate" value="84%" icon={<TrendingUp className="w-4 h-4" />} />
          </div>
        </Card>
      </div>
      
      <Card className="p-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-text-muted mb-4">Vangsten per Maand</h3>
        <div className="h-32 flex items-end gap-2">
          {[40, 65, 30, 85, 45, 60, 90, 55, 70, 40, 35, 50].map((h, i) => (
            <div key={i} className="flex-1 bg-surface-soft rounded-t-md relative group">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                className="absolute bottom-0 left-0 right-0 bg-brand/40 rounded-t-md group-hover:bg-brand transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[8px] font-bold text-text-dim uppercase tracking-tighter">
          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>Mei</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Okt</span><span>Nov</span><span>Dec</span>
        </div>
      </Card>
    </div>
  );
}

function PRRow({ species, length, weight }: { species: string; length: string; weight: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-surface-soft/50">
      <span className="text-xs font-bold text-text-primary">{species}</span>
      <div className="text-right">
        <span className="text-xs font-bold text-brand">{length}</span>
        <span className="text-[10px] text-text-muted ml-2">{weight}</span>
      </div>
    </div>
  );
}

function AchievementsTab({ profile }: { profile: any }) {
  const achievements = [
    { id: 1, name: 'Eerste Vangst', description: 'Log je allereerste vangst', earned: true, icon: <Fish className="w-6 h-6" /> },
    { id: 2, name: 'Nachtbraker', description: 'Vang een vis tussen 00:00 en 04:00', earned: true, icon: <Zap className="w-6 h-6" /> },
    { id: 3, name: 'Soortenjager', description: 'Vang 10 verschillende vissoorten', earned: true, icon: <Trophy className="w-6 h-6" /> },
    { id: 4, name: 'Grootmeester', description: 'Behaal level 20', earned: false, icon: <Award className="w-6 h-6" /> },
    { id: 5, name: 'Sessie Koning', description: 'Vis meer dan 10 uur op één dag', earned: false, icon: <History className="w-6 h-6" /> },
    { id: 6, name: 'Sociale Visser', description: 'Word lid van je eerste club', earned: true, icon: <User className="w-6 h-6" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {achievements.map(a => (
        <Card key={a.id} className={`p-4 flex flex-col items-center text-center gap-3 ${a.earned ? 'bg-surface-card' : 'bg-surface-soft opacity-50 grayscale'}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${a.earned ? 'bg-brand/20 text-brand' : 'bg-bg-main text-text-dim'}`}>
            {a.icon}
          </div>
          <div>
            <h4 className="text-xs font-bold text-text-primary">{a.name}</h4>
            <p className="text-[10px] text-text-muted mt-1 leading-tight">{a.description}</p>
          </div>
          {a.earned && (
            <div className="mt-auto pt-2">
              <Badge variant="accent" className="text-[8px] px-2 py-0.5">Voltooid</Badge>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
