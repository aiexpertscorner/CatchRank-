import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Globe,
  User,
  Fish,
  Crown,
  Medal,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../../App';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { UserProfile } from '../../../types';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card } from '../../../components/ui/Base';
import { motion } from 'motion/react';
import { LevelBadge } from '../../../components/xp/LevelBadge';
import { XpProgressBar } from '../../../components/xp/XpProgressBar';
import { getLevelTitle } from '../../../services/xpService';

/**
 * Rankings Screen — Phase 1: XP + Level leaderboard.
 * Shows all users with XP > 0, sorted by total XP descending.
 * Mobile-first layout: filter pills below tab bar, compact podium.
 */

export default function Rankings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'global' | 'friends' | 'clubs'>('global');
  const [activeFilter, setActiveFilter] = useState<'xp' | 'catches' | 'species'>('xp');
  const [rankings, setRankings] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab !== 'global') {
      setRankings([]);
      setLoading(false);
      return;
    }

    const RANKINGS_CACHE_TTL_MS = 5 * 60 * 1000;
    const cacheKey = '__rankings_cache_v2__';

    type RankingsCache = { data: UserProfile[]; timestamp: number };
    const cached = (window as any)[cacheKey] as RankingsCache | undefined;
    if (cached && Date.now() - cached.timestamp < RANKINGS_CACHE_TTL_MS) {
      setRankings(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Run two parallel queries to cover both field names:
    //  - `xp`       written by web syncUserXpFromCatches()
    //  - `total_xp` written by Flutter migration (users who haven't triggered sync yet)
    Promise.all([
      getDocs(query(collection(db, 'users'), where('xp', '>', 0), orderBy('xp', 'desc'))),
      getDocs(query(collection(db, 'users'), where('total_xp', '>', 0), orderBy('total_xp', 'desc'))),
    ])
      .then(([xpSnap, totalXpSnap]) => {
        const usersMap = new Map<string, UserProfile>();
        xpSnap.docs.forEach(d => usersMap.set(d.id, { uid: d.id, ...d.data() } as UserProfile));
        totalXpSnap.docs.forEach(d => {
          if (!usersMap.has(d.id)) usersMap.set(d.id, { uid: d.id, ...d.data() } as UserProfile);
        });
        const users = Array.from(usersMap.values());
        (window as any)[cacheKey] = { data: users, timestamp: Date.now() };
        setRankings(users);
      })
      .catch((err) => console.error('Rankings fetch error:', err))
      .finally(() => setLoading(false));
  }, [activeTab]);

  // Effective XP — prefer `xp` (written by syncUserXpFromCatches), fall back to
  // `total_xp` (Flutter-migrated users who haven't triggered sync yet).
  const effectiveXp = (u: UserProfile) => (u.xp ?? 0) || (u.total_xp ?? 0);

  // Client-side re-sort based on active filter
  const sortedRankings = [...rankings].sort((a, b) => {
    if (activeFilter === 'catches') return (b.stats?.totalCatches ?? 0) - (a.stats?.totalCatches ?? 0);
    if (activeFilter === 'species')  return (b.stats?.speciesCount ?? 0) - (a.stats?.speciesCount ?? 0);
    return effectiveXp(b) - effectiveXp(a);
  });

  const currentUserRankIndex = profile
    ? sortedRankings.findIndex(u => u.uid === profile.uid)
    : -1;
  const currentUserRank = currentUserRankIndex >= 0 ? currentUserRankIndex + 1 : null;

  const getUserStat = (user: UserProfile) => {
    if (activeFilter === 'catches') return { value: (user.stats?.totalCatches ?? 0).toLocaleString('nl-NL'), label: 'Vangsten' };
    if (activeFilter === 'species')  return { value: (user.stats?.speciesCount ?? 0).toLocaleString('nl-NL'), label: 'Soorten' };
    return { value: effectiveXp(user).toLocaleString('nl-NL'), label: 'XP' };
  };

  const tabs = [
    { id: 'global',  label: 'Globaal',  icon: Globe },
    { id: 'friends', label: 'Vrienden', icon: Users },
    { id: 'clubs',   label: 'Clubs',    icon: Trophy },
  ] as const;

  const filters = [
    { id: 'xp',      label: 'Totaal XP' },
    { id: 'catches', label: 'Vangsten' },
    { id: 'species', label: 'Soorten' },
  ] as const;

  return (
    <PageLayout>
      <PageHeader
        title="Rankings"
        subtitle="Top vissers op basis van XP en level"
      />

      <div className="space-y-4 pb-nav-pad">

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border-subtle mx-2 md:mx-0">
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand text-bg-main shadow-lg shadow-brand/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter pills — horizontal scroll row */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 md:px-0">
          {filters.map(f => (
            <button
              type="button"
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                activeFilter === f.id
                  ? 'bg-brand text-bg-main border-brand shadow-sm shadow-brand/20'
                  : 'bg-surface-card border-border-subtle text-text-muted hover:border-brand/30 hover:text-brand'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedRankings.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-4 py-20 px-6 text-center">
            <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-text-dim" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-text-primary">
                {activeTab === 'global' ? 'Nog geen rankings beschikbaar' : 'Geen vrienden of clubs gevonden'}
              </h3>
              <p className="text-sm text-text-muted">
                {activeTab === 'global'
                  ? 'Voeg vangsten toe om XP te verdienen en in de rankings te verschijnen!'
                  : 'Voeg vrienden toe of sluit je aan bij een club om hier rankings te zien.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {sortedRankings.length >= 3 && (
              <section className="grid grid-cols-3 items-end gap-2 px-2 md:px-0 pt-8">
                <PodiumSlot user={sortedRankings[1]} rank={2} stat={getUserStat(sortedRankings[1])} />
                <PodiumSlot user={sortedRankings[0]} rank={1} stat={getUserStat(sortedRankings[0])} isFirst />
                <PodiumSlot user={sortedRankings[2]} rank={3} stat={getUserStat(sortedRankings[2])} />
              </section>
            )}

            {/* Leaderboard list — rank 4+ */}
            {sortedRankings.length > 3 && (
              <Card
                padding="none"
                className="divide-y divide-border-subtle border border-border-subtle bg-surface-card rounded-2xl overflow-hidden mx-2 md:mx-0"
              >
                {sortedRankings.slice(3).map((user, idx) => {
                  const stat = getUserStat(user);
                  const isMe = user.uid === profile?.uid;
                  return (
                    <motion.div
                      key={user.uid}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`p-3.5 flex items-center gap-3 transition-colors ${isMe ? 'bg-brand/5' : 'hover:bg-surface-soft'}`}
                    >
                      {/* Rank number */}
                      <div className="w-7 text-center font-black text-text-muted text-xs shrink-0">
                        {idx + 4}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-border-subtle shrink-0 bg-surface-soft">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Name + level */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate leading-tight">
                          {user.displayName}
                          {isMe && <span className="text-[9px] text-brand font-black ml-1">• Jij</span>}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <LevelBadge level={user.level || 1} size="xs" />
                          <span className="text-[9px] text-text-muted truncate hidden sm:block">
                            {user.rank_title || getLevelTitle(user.level || 1)}
                          </span>
                        </div>
                      </div>

                      {/* Stat value */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-brand leading-tight">{stat.value}</p>
                        <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">{stat.label}</p>
                      </div>

                      <ChevronRight className="w-3.5 h-3.5 text-text-dim shrink-0" />
                    </motion.div>
                  );
                })}
              </Card>
            )}

            {/* Current user sticky card */}
            {profile && (
              <Card className="p-4 bg-brand/5 border border-brand/20 rounded-2xl mx-2 md:mx-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 text-center font-black text-brand text-sm shrink-0">
                    {currentUserRank ? `#${currentUserRank}` : '#–'}
                  </div>

                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-brand/20 shrink-0 bg-surface-soft">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="Jij" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand">
                        <Fish className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">
                      {profile.displayName || 'Jij'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <LevelBadge level={profile.level || 1} size="xs" showTitle />
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-brand">{getUserStat(profile).value}</p>
                    <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">{getUserStat(profile).label}</p>
                  </div>
                </div>

                <XpProgressBar xp={effectiveXp(profile)} compact />
              </Card>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

interface PodiumSlotProps {
  user: UserProfile;
  rank: 1 | 2 | 3;
  stat: { value: string; label: string };
  isFirst?: boolean;
}

const PODIUM_CONFIG = {
  1: {
    avatarSize:  'w-16 h-16 md:w-20 md:h-20',
    roundedSize: 'rounded-2xl md:rounded-[2rem]',
    borderColor: 'border-brand',
    badgeBg:     'bg-brand text-bg-main border-2 border-surface-card',
    podiumBg:    'bg-brand/10 border-x border-t border-brand/20',
    podiumH:     'h-28 md:h-36',
    shadow:      'shadow-2xl shadow-brand/20',
  },
  2: {
    avatarSize:  'w-12 h-12 md:w-16 md:h-16',
    roundedSize: 'rounded-xl md:rounded-2xl',
    borderColor: 'border-slate-400',
    badgeBg:     'bg-slate-400 text-bg-main border-2 border-surface-card',
    podiumBg:    'bg-surface-soft/50 border-x border-t border-border-subtle',
    podiumH:     'h-20 md:h-28',
    shadow:      '',
  },
  3: {
    avatarSize:  'w-12 h-12 md:w-16 md:h-16',
    roundedSize: 'rounded-xl md:rounded-2xl',
    borderColor: 'border-amber-700',
    badgeBg:     'bg-amber-700 text-bg-main border-2 border-surface-card',
    podiumBg:    'bg-surface-soft/50 border-x border-t border-border-subtle',
    podiumH:     'h-16 md:h-20',
    shadow:      '',
  },
} as const;

const MEDAL_COLOR = { 1: 'text-brand', 2: 'text-slate-400', 3: 'text-amber-700' } as const;

function PodiumSlot({ user, rank, stat, isFirst }: PodiumSlotProps) {
  const cfg = PODIUM_CONFIG[rank];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar + badge */}
      <div className="relative">
        {isFirst && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
            <Crown className="w-6 h-6 text-brand animate-bounce" />
          </div>
        )}
        <div className={`${cfg.avatarSize} ${cfg.roundedSize} border-4 ${cfg.borderColor} overflow-hidden bg-surface-soft ${cfg.shadow}`}>
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <User className={isFirst ? 'w-7 h-7' : 'w-5 h-5'} />
            </div>
          )}
        </div>
        <div className={`absolute -bottom-2 -right-1 ${isFirst ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs'} ${cfg.badgeBg} rounded-xl flex items-center justify-center font-black shadow-lg`}>
          {rank}
        </div>
      </div>

      {/* Name + stat + level */}
      <div className="text-center space-y-0.5 w-full">
        <p className="font-bold text-text-primary truncate text-[11px] md:text-sm px-1">
          {user.displayName}
        </p>
        <div className="flex items-center justify-center gap-1 text-brand">
          <Zap className="w-2.5 h-2.5 fill-current" />
          <span className="text-[9px] md:text-[10px] font-black">{stat.value}</span>
          <span className="text-[8px] text-text-muted font-bold uppercase">{stat.label}</span>
        </div>
        <div className="flex justify-center">
          <LevelBadge level={user.level || 1} size="xs" />
        </div>
      </div>

      {/* Podium block */}
      <div className={`w-full ${cfg.podiumH} ${cfg.podiumBg} rounded-t-xl flex items-center justify-center`}>
        <Medal className={`w-6 h-6 ${MEDAL_COLOR[rank]} opacity-20`} />
      </div>
    </div>
  );
}
