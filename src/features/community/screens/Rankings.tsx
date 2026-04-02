import React, { useState, useEffect } from 'react';
import {
  Trophy,
  TrendingUp,
  Users,
  Globe,
  User,
  Fish,
  Crown,
  Medal,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../../App';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { UserProfile } from '../../../types';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion } from 'motion/react';
import { LevelBadge } from '../../../components/xp/LevelBadge';
import { XpProgressBar } from '../../../components/xp/XpProgressBar';
import { getLevelTitle } from '../../../services/xpService';

/**
 * Rankings Screen
 * Global leaderboard sorted by XP.
 * Shows actual user rank derived from their position in the sorted list.
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

    setLoading(true);

    // Fetch top 50 sorted by XP — this gives us the rank position for each user
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('xp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const users = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        setRankings(users);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching rankings:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeTab]);

  // Derive current user's rank from their position in the sorted list
  const currentUserRankIndex = profile
    ? rankings.findIndex((u) => u.uid === profile.uid)
    : -1;
  const currentUserRank = currentUserRankIndex >= 0 ? currentUserRankIndex + 1 : null;

  const tabs = [
    { id: 'global', label: 'Globaal', icon: Globe },
    { id: 'friends', label: 'Vrienden', icon: Users },
    { id: 'clubs', label: 'Clubs', icon: Trophy },
  ] as const;

  const filters = [
    { id: 'xp', label: 'Totaal XP' },
    { id: 'catches', label: 'Vangsten' },
    { id: 'species', label: 'Soorten' },
  ] as const;

  return (
    <PageLayout>
      <PageHeader
        title="Rankings"
        subtitle="Wie voert de lijst aan?"
        actions={
          <div className="flex bg-surface-card border border-border-subtle rounded-xl p-1">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeFilter === f.id
                    ? 'bg-brand text-bg-main'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-8 pb-32">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border-subtle overflow-x-auto no-scrollbar mx-2 md:mx-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand text-bg-main shadow-lg shadow-brand/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {!loading && rankings.length >= 3 && (
          <section className="grid grid-cols-3 items-end gap-2 md:gap-6 px-2 md:px-0 pt-10">
            {/* Rank 2 */}
            <PodiumSlot user={rankings[1]} rank={2} medalColor="text-slate-400" podiumHeight="h-24 md:h-32" />

            {/* Rank 1 */}
            <PodiumSlot user={rankings[0]} rank={1} medalColor="text-brand" podiumHeight="h-32 md:h-48" isFirst />

            {/* Rank 3 */}
            <PodiumSlot user={rankings[2]} rank={3} medalColor="text-amber-700" podiumHeight="h-20 md:h-24" />
          </section>
        )}

        {/* Leaderboard List — positions 4 and beyond */}
        <section className="space-y-4 px-2 md:px-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rankings.length > 3 ? (
            <Card
              padding="none"
              className="divide-y divide-border-subtle border border-border-subtle bg-surface-card shadow-premium rounded-2xl overflow-hidden"
            >
              {rankings.slice(3).map((user, index) => (
                <div
                  key={user.uid}
                  className={`p-4 flex items-center gap-4 hover:bg-surface-soft transition-colors group cursor-pointer ${
                    user.uid === profile?.uid ? 'bg-brand/5' : ''
                  }`}
                >
                  <div className="w-8 text-center font-black text-text-muted group-hover:text-brand transition-colors text-sm">
                    {index + 4}
                  </div>
                  <div className="w-11 h-11 rounded-xl overflow-hidden border border-border-subtle flex-shrink-0 bg-surface-soft">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-text-primary tracking-tight truncate">
                      {user.displayName}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <LevelBadge level={user.level || 1} size="xs" />
                      <span className="text-[9px] font-bold text-text-muted truncate hidden sm:block">
                        {getLevelTitle(user.level || 1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-brand">{(user.xp || 0).toLocaleString()}</p>
                    <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">XP</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors flex-shrink-0" />
                </div>
              ))}
            </Card>
          ) : !loading && rankings.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center mx-auto text-text-dim">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-text-primary">Geen rankings gevonden</h3>
                <p className="text-sm text-text-muted">
                  Word lid van een club of voeg vrienden toe om rankings te zien.
                </p>
              </div>
            </div>
          ) : null}

          {/* Current User Sticky Card */}
          {profile && (
            <Card className="p-4 bg-brand/5 border border-brand/20 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4 mb-3">
                {/* Rank badge */}
                <div className="w-8 text-center font-black text-brand text-sm flex-shrink-0">
                  {currentUserRank ? `#${currentUserRank}` : '#–'}
                </div>

                {/* Avatar */}
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-brand/20 flex-shrink-0 bg-surface-soft">
                  {profile.photoURL ? (
                    <img
                      src={profile.photoURL}
                      alt="Jij"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand">
                      <Fish className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Name + level */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-text-primary tracking-tight truncate">
                    {profile.displayName || 'Jij'}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <LevelBadge level={profile.level || 1} size="xs" showTitle />
                  </div>
                </div>

                {/* XP total */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-brand">{(profile.xp || 0).toLocaleString()}</p>
                  <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">XP</p>
                </div>
              </div>

              {/* XP progress bar */}
              <XpProgressBar xp={profile.xp || 0} compact />
            </Card>
          )}
        </section>
      </div>
    </PageLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

interface PodiumSlotProps {
  user: UserProfile;
  rank: 1 | 2 | 3;
  medalColor: string;
  podiumHeight: string;
  isFirst?: boolean;
}

const rankBorderColors: Record<number, string> = {
  1: 'border-brand',
  2: 'border-surface-soft',
  3: 'border-surface-soft',
};

const rankBadgeColors: Record<number, string> = {
  1: 'bg-brand text-bg-main border-2 border-surface-card',
  2: 'bg-slate-400 text-bg-main border-2 border-surface-card',
  3: 'bg-amber-700 text-bg-main border-2 border-surface-card',
};

const rankPodiumBg: Record<number, string> = {
  1: 'bg-brand/10 border-x border-t border-brand/20',
  2: 'bg-surface-soft/50 border-x border-t border-border-subtle',
  3: 'bg-surface-soft/50 border-x border-t border-border-subtle',
};

function PodiumSlot({ user, rank, medalColor, podiumHeight, isFirst }: PodiumSlotProps) {
  const avatarSize = isFirst
    ? 'w-20 h-20 md:w-32 md:h-32 rounded-2xl md:rounded-[2.5rem]'
    : 'w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem]';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {isFirst && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2">
            <Crown className="w-7 h-7 text-brand animate-bounce" />
          </div>
        )}
        <div
          className={`${avatarSize} border-4 ${rankBorderColors[rank]} overflow-hidden shadow-xl bg-surface-soft ${isFirst ? 'shadow-2xl shadow-brand/20' : ''}`}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <User className={isFirst ? 'w-10 h-10' : 'w-8 h-8'} />
            </div>
          )}
        </div>
        <div
          className={`absolute -bottom-2 -right-2 ${isFirst ? 'w-10 h-10' : 'w-8 h-8'} ${rankBadgeColors[rank]} rounded-xl flex items-center justify-center font-black shadow-lg text-sm`}
        >
          {rank}
        </div>
      </div>

      <div className="text-center space-y-1">
        <p
          className={`font-bold text-text-primary truncate ${isFirst ? 'text-sm md:text-lg max-w-[100px] md:max-w-none' : 'text-xs md:text-sm max-w-[80px] md:max-w-none'}`}
        >
          {user.displayName}
        </p>
        <p className="text-[9px] md:text-[10px] font-black text-brand uppercase tracking-widest">
          {(user.xp || 0).toLocaleString()} XP
        </p>
        <LevelBadge level={user.level || 1} size="xs" />
      </div>

      <div className={`w-full ${podiumHeight} ${rankPodiumBg[rank]} rounded-t-2xl flex items-center justify-center`}>
        <Medal className={`w-8 h-8 ${medalColor}/20`} />
      </div>
    </div>
  );
}
