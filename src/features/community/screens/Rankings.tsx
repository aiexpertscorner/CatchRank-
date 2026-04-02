import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  Target, 
  ChevronRight, 
  Search, 
  Filter, 
  Zap, 
  Award, 
  Star,
  Medal,
  Crown,
  ChevronUp,
  ChevronDown,
  Globe,
  MapPin,
  User,
  Fish
} from 'lucide-react';
import { useAuth } from '../../../App';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { UserProfile } from '../../../types';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { RankingCard } from '../../../components/ui/Data';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Rankings Screen
 * Part of the 'community' feature module.
 * Displays global, friends, and club leaderboards with various filters.
 */

export default function Rankings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'global' | 'friends' | 'clubs'>('global');
  const [activeFilter, setActiveFilter] = useState<'xp' | 'catches' | 'species'>('xp');
  const [rankings, setRankings] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'global') {
      setLoading(true);
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('xp', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as UserProfile));
        setRankings(users);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching rankings:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // For friends and clubs, we'd need more complex logic
      // For now, let's just show an empty state or mock data
      setRankings([]);
      setLoading(false);
    }
  }, [activeTab, activeFilter]);

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
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeFilter === f.id ? 'bg-brand text-bg-main' : 'text-text-muted hover:text-text-primary'
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
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] border-4 border-surface-soft overflow-hidden shadow-xl bg-surface-soft">
                  {rankings[1].photoURL ? (
                    <img src={rankings[1].photoURL} alt={rankings[1].displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-400 text-bg-main rounded-lg flex items-center justify-center font-black shadow-lg border-2 border-surface-card">2</div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs md:text-sm font-bold text-text-primary truncate max-w-[80px] md:max-w-none">{rankings[1].displayName}</p>
                <p className="text-[9px] md:text-[10px] font-black text-brand uppercase tracking-widest">{(rankings[1].xp || 0).toLocaleString()} XP</p>
              </div>
              <div className="w-full h-24 md:h-32 bg-surface-soft/50 rounded-t-2xl border-x border-t border-border-subtle flex items-center justify-center">
                <Medal className="w-8 h-8 text-slate-400/20" />
              </div>
            </div>

            {/* Rank 1 */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Crown className="w-8 h-8 text-brand animate-bounce" />
                </div>
                <div className="w-20 h-20 md:w-32 md:h-32 rounded-2xl md:rounded-[2.5rem] border-4 border-brand overflow-hidden shadow-2xl shadow-brand/20 bg-surface-soft">
                  {rankings[0].photoURL ? (
                    <img src={rankings[0].photoURL} alt={rankings[0].displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand text-bg-main rounded-xl flex items-center justify-center font-black shadow-lg border-2 border-surface-card">1</div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm md:text-lg font-bold text-text-primary truncate max-w-[100px] md:max-w-none">{rankings[0].displayName}</p>
                <p className="text-[10px] md:text-xs font-black text-brand uppercase tracking-widest">{(rankings[0].xp || 0).toLocaleString()} XP</p>
              </div>
              <div className="w-full h-32 md:h-48 bg-brand/10 rounded-t-2xl border-x border-t border-brand/20 flex items-center justify-center">
                <Trophy className="w-12 h-12 text-brand/20" />
              </div>
            </div>

            {/* Rank 3 */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] border-4 border-surface-soft overflow-hidden shadow-xl bg-surface-soft">
                  {rankings[2].photoURL ? (
                    <img src={rankings[2].photoURL} alt={rankings[2].displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-700 text-bg-main rounded-lg flex items-center justify-center font-black shadow-lg border-2 border-surface-card">3</div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs md:text-sm font-bold text-text-primary truncate max-w-[80px] md:max-w-none">{rankings[2].displayName}</p>
                <p className="text-[9px] md:text-[10px] font-black text-brand uppercase tracking-widest">{(rankings[2].xp || 0).toLocaleString()} XP</p>
              </div>
              <div className="w-full h-20 md:h-24 bg-surface-soft/50 rounded-t-2xl border-x border-t border-border-subtle flex items-center justify-center">
                <Medal className="w-8 h-8 text-amber-700/20" />
              </div>
            </div>
          </section>
        )}

        {/* Leaderboard List */}
        <section className="space-y-4 px-2 md:px-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rankings.length > 3 ? (
            <Card padding="none" className="divide-y divide-border-subtle border border-border-subtle bg-surface-card shadow-premium rounded-2xl overflow-hidden">
              {rankings.slice(3).map((user, index) => (
                <div key={user.uid} className={`p-4 flex items-center gap-4 hover:bg-surface-soft transition-colors group cursor-pointer ${user.uid === profile?.uid ? 'bg-brand/5' : ''}`}>
                  <div className="w-8 text-center font-black text-text-muted group-hover:text-brand transition-colors">{index + 4}</div>
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-border-subtle flex-shrink-0 bg-surface-soft">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-text-primary tracking-tight truncate">{user.displayName}</h4>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      <span className="flex items-center gap-1">Level {user.level || 1}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand">{(user.xp || 0).toLocaleString()}</p>
                    <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">XP</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                </div>
              ))}
            </Card>
          ) : !loading && rankings.length === 0 && (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center mx-auto text-text-dim">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-text-primary">Geen rankings gevonden</h3>
                <p className="text-sm text-text-muted">Word lid van een club of voeg vrienden toe om rankings te zien.</p>
              </div>
            </div>
          )}

          {/* Current User Rank Stickey */}
          {profile && (
            <Card className="p-4 bg-brand/10 border border-brand/30 rounded-2xl flex items-center gap-4 shadow-premium-accent/10">
              <div className="w-8 text-center font-black text-brand">#--</div>
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-brand/20 flex-shrink-0 bg-surface-soft">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand"><Fish className="w-6 h-6" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-text-primary tracking-tight truncate">{profile?.displayName || 'Jij'}</h4>
                <p className="text-[10px] font-black text-brand uppercase tracking-widest">Blijf vangen om te stijgen!</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand">{(profile?.xp || 0).toLocaleString()}</p>
                <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">XP</p>
              </div>
            </Card>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
