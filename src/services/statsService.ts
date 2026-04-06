import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Catch, Session } from '../types';
import { differenceInHours } from 'date-fns';

/**
 * Stats cache — localStorage with 1-hour TTL per user.
 * Prevents re-reading all catches + sessions on every Dashboard visit.
 * Cache is busted when a new catch or session is created (call bustStatsCache).
 */
const STATS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const STATS_CACHE_KEY = (uid: string) => `catchrank_stats_${uid}`;

const COLLECTIONS = {
  CATCHES: 'catches_v2',
  SESSIONS: 'sessions_v2',
} as const;

function readStatsCache(userId: string): UserStats | null {
  try {
    const raw = localStorage.getItem(STATS_CACHE_KEY(userId));
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > STATS_CACHE_TTL_MS) {
      localStorage.removeItem(STATS_CACHE_KEY(userId));
      return null;
    }
    return data as UserStats;
  } catch {
    return null;
  }
}

function writeStatsCache(userId: string, stats: UserStats): void {
  try {
    localStorage.setItem(
      STATS_CACHE_KEY(userId),
      JSON.stringify({ data: stats, timestamp: Date.now() })
    );
  } catch {
    // ignore
  }
}

/**
 * Call this after a new catch or session is saved to bust the stats cache.
 */
export function bustStatsCache(userId: string): void {
  try {
    localStorage.removeItem(STATS_CACHE_KEY(userId));
  } catch {
    // ignore
  }
}

export interface UserStats {
  totalCatches: number;
  totalSessions: number;
  totalSpots: number;
  speciesCount: number;
  totalXp: number;
  totalHours: number;
  averageCatchesPerSession: number;
  topSpecies: { name: string; count: number }[];
  monthlyActivity: { month: string; count: number }[];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function toDateSafe(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getCatchSpecies(c: Partial<Catch>): string | null {
  return (
    (c as any).speciesSpecific ||
    (c as any).speciesGeneral ||
    c.species ||
    null
  );
}

function getCatchTimestamp(c: Partial<Catch>): Date | null {
  return toDateSafe((c as any).timestamp || (c as any).catchTime);
}

function getSessionStart(s: Partial<Session>): Date | null {
  return toDateSafe((s as any).startTime || (s as any).startedAt);
}

function getSessionEnd(s: Partial<Session>): Date | null {
  return toDateSafe((s as any).endTime || (s as any).endedAt);
}

function getSessionXp(s: Partial<Session>): number {
  return (
    (s as any)?.stats?.totalXp ||
    (s as any)?.statsSummary?.totalXp ||
    0
  );
}

function getSessionOwnerLike(s: Partial<Session>): string | null {
  return (
    (s as any).userId ||
    (s as any).createdBy ||
    (s as any).ownerUserId ||
    null
  );
}

function getCatchSpotId(c: Partial<Catch>): string | null {
  return c.spotId || null;
}

export const statsService = {
  async calculateUserStats(
    userId: string,
    { forceRefresh = false } = {}
  ): Promise<UserStats> {
    if (!forceRefresh) {
      const cached = readStatsCache(userId);
      if (cached) return cached;
    }

    // Fetch all catches from catches_v2
    const catchesQuery = query(
      collection(db, COLLECTIONS.CATCHES),
      where('userId', '==', userId)
    );
    const catchesSnapshot = await getDocs(catchesQuery);
    const catches = catchesSnapshot.docs.map((doc) => doc.data() as Catch);

    // Fetch sessions_v2 by possible owner fields and merge unique docs client-side
    const [sessionsByUserIdSnap, sessionsByCreatedBySnap, sessionsByOwnerSnap] =
      await Promise.all([
        getDocs(query(collection(db, COLLECTIONS.SESSIONS), where('userId', '==', userId))),
        getDocs(query(collection(db, COLLECTIONS.SESSIONS), where('createdBy', '==', userId))),
        getDocs(query(collection(db, COLLECTIONS.SESSIONS), where('ownerUserId', '==', userId))),
      ]);

    const sessionMap = new Map<string, Session>();

    for (const snap of [sessionsByUserIdSnap, sessionsByCreatedBySnap, sessionsByOwnerSnap]) {
      snap.docs.forEach((doc) => {
        sessionMap.set(doc.id, { id: doc.id, ...doc.data() } as Session);
      });
    }

    const sessions = Array.from(sessionMap.values()).filter((s) => {
      const owner = getSessionOwnerLike(s);
      return owner === userId;
    });

    // Calculate basic counts
    const totalCatches = catches.length;
    const totalSessions = sessions.length;

    // Unique spots
    const spots = new Set(
      catches.map((c) => getCatchSpotId(c)).filter(Boolean) as string[]
    );
    const totalSpots = spots.size;

    // Unique species
    const speciesMap = new Map<string, number>();
    catches.forEach((c) => {
      const species = getCatchSpecies(c);
      if (species) {
        speciesMap.set(species, (speciesMap.get(species) || 0) + 1);
      }
    });
    const speciesCount = speciesMap.size;

    // Total XP
    const totalXp =
      catches.reduce((acc, c) => acc + (c.xpEarned || 0), 0) +
      sessions.reduce((acc, s) => acc + getSessionXp(s), 0);

    // Total Hours
    let totalHours = 0;
    sessions.forEach((s) => {
      const start = getSessionStart(s);
      const end = getSessionEnd(s);
      if (start && end) {
        totalHours += Math.abs(differenceInHours(end, start));
      }
    });

    // Average catches per session
    const averageCatchesPerSession =
      totalSessions > 0 ? totalCatches / totalSessions : 0;

    // Top Species
    const topSpecies = Array.from(speciesMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Monthly activity (last 12 months)
    const monthlyActivityMap = new Map<string, number>();
    const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      monthlyActivityMap.set(key, 0);
    }

    catches.forEach((c) => {
      const d = getCatchTimestamp(c);
      if (!d) return;

      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (monthlyActivityMap.has(key)) {
        monthlyActivityMap.set(key, (monthlyActivityMap.get(key) || 0) + 1);
      }
    });

    const monthlyActivity = Array.from(monthlyActivityMap.entries()).map(
      ([month, count]) => ({
        month,
        count,
      })
    );

    const result: UserStats = {
      totalCatches,
      totalSessions,
      totalSpots,
      speciesCount,
      totalXp,
      totalHours,
      averageCatchesPerSession,
      topSpecies,
      monthlyActivity,
    };

    writeStatsCache(userId, result);
    return result;
  },
};