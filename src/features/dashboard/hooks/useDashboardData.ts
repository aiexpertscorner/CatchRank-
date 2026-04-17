/**
 * useDashboardData — primary data hook for the Dashboard screen.
 *
 * Responsibilities:
 *  1. Real-time listeners for recent catches + sessions (onSnapshot)
 *  2. One-time load of stats (cached), spots and gear as secondary data
 *  3. XP sync: backfills any catches missing xpEarned with the Dart formula,
 *     then runs a full syncUserXpFromCatches() to sum ALL catch XP (including
 *     migrated Flutter catches) into user.xp. Runs once per browser session.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch, Session, Spot, GearItem } from '../../../types';
import { statsService, UserStats } from '../../../services/statsService';
import { gearService } from '../../gear/services/gearService';
import { syncUserXpFromCatches } from '../../../services/xpService';
import { loggingService } from '../../logging/services/loggingService';
import { getSpotCatchCount } from '../utils/dashboardHelpers';

const COLLECTIONS = {
  CATCHES: 'catches_v2',
  SPOTS: 'spots_v2',
  SESSIONS: 'sessions_v2',
} as const;

/**
 * Session storage key — use _v2_ suffix to force one-time re-run on all
 * existing browser sessions after the XP formula update.
 */
const syncKey = (uid: string) => `catchrank_xp_sync_v2_${uid}`;

/* ─────────────────────────────────────────────────────────────────
   XP sync — runs once per browser session per user.

   Step A: backfill any catches that are missing xpEarned (e.g. new
           catches created before XP was calculated) using the Dart formula.
   Step B: full sync — sum ALL catches' xpEarned (including migrated Flutter
           catches) into user.xp via syncUserXpFromCatches().
   ───────────────────────────────────────────────────────────────── */

async function syncUserXpIfStale(
  userId: string,
  catches: Catch[]
): Promise<void> {
  if (sessionStorage.getItem(syncKey(userId))) return;
  sessionStorage.setItem(syncKey(userId), '1');

  // Step A: backfill catches missing xpEarned with Dart formula
  const needsXp = catches.filter(
    (c) =>
      c.status !== 'draft' &&
      (c.xpEarned == null || c.xpEarned === 0)
  );

  if (needsXp.length > 0) {
    const batch = writeBatch(db);
    for (const c of needsXp) {
      const xp = loggingService.calculateXP(c);
      if (c.id) {
        batch.update(doc(db, COLLECTIONS.CATCHES, c.id), { xpEarned: xp });
      }
    }
    await batch.commit();
  }

  // Step B: full sync — reads all catches_v2, sums xpEarned, writes user profile
  await syncUserXpFromCatches(userId);
}

/* ─────────────────────────────────────────────────────────────────
   Hook
   ───────────────────────────────────────────────────────────────── */

export interface DashboardData {
  recentCatches: Catch[];
  incompleteCatches: Catch[];
  recentSessions: Session[];
  favoriteSpots: Spot[];
  spotsCount: number;
  gearItems: GearItem[];
  stats: UserStats | null;
  loading: boolean;
}

export function useDashboardData(userId: string | undefined): DashboardData {
  const [recentCatches, setRecentCatches] = useState<Catch[]>([]);
  const [incompleteCatches, setIncompleteCatches] = useState<Catch[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [favoriteSpots, setFavoriteSpots] = useState<Spot[]>([]);
  const [spotsCount, setSpotsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadSecondaryData = useCallback(
    async (allCatches: Catch[]) => {
      if (!userId) return;
      try {
        const [userStats, gear] = await Promise.all([
          statsService.calculateUserStats(userId),
          gearService.getUserGear(userId),
        ]);

        setStats(userStats);

        const sortedGear = [...gear]
          .sort(
            (a, b) =>
              (b.isFavorite ? 1000 : 0) +
              (b.usageCount || 0) -
              ((a.isFavorite ? 1000 : 0) + (a.usageCount || 0))
          )
          .slice(0, 4);
        setGearItems(sortedGear);

        const spotsSnap = await getDocs(
          query(
            collection(db, COLLECTIONS.SPOTS),
            where('userId', '==', userId),
            limit(50)
          )
        );
        const spots = spotsSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Spot)
        );
        setSpotsCount(spots.length);

        const sortedSpots = [...spots]
          .sort(
            (a, b) =>
              ((b as any).isFavorite ? 1000 : 0) +
              getSpotCatchCount(b) -
              (((a as any).isFavorite ? 1000 : 0) + getSpotCatchCount(a))
          )
          .slice(0, 4);
        setFavoriteSpots(sortedSpots);

        // XP sync: backfill missing xpEarned + full sum into user profile
        await syncUserXpIfStale(userId, allCatches);
      } catch (err) {
        console.error('[Dashboard] secondary data error:', err);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    const catchesQuery = query(
      collection(db, COLLECTIONS.CATCHES),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(12)
    );

    const sessionsQuery = query(
      collection(db, COLLECTIONS.SESSIONS),
      where('userId', '==', userId),
      orderBy('startTime', 'desc'),
      limit(6)
    );

    let secondaryLoaded = false;

    const unsubCatches = onSnapshot(
      catchesQuery,
      (snap) => {
        const all = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Catch)
        );
        // Accept records that are not explicitly drafts — migrated records may have no status field
        setRecentCatches(all.filter((c) => c.status !== 'draft').slice(0, 6));
        setIncompleteCatches(all.filter((c) => c.status === 'draft').slice(0, 2));

        // Load secondary data once after first catch snapshot
        if (!secondaryLoaded) {
          secondaryLoaded = true;
          loadSecondaryData(all);
        }
      },
      (err) => {
        console.error('[Dashboard] catches listener error:', err);
        setLoading(false);
      }
    );

    const unsubSessions = onSnapshot(
      sessionsQuery,
      (snap) => {
        setRecentSessions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)).slice(0, 4)
        );
      },
      (err) => console.error('[Dashboard] sessions listener error:', err)
    );

    return () => {
      unsubCatches();
      unsubSessions();
    };
  }, [userId, loadSecondaryData]);

  return {
    recentCatches,
    incompleteCatches,
    recentSessions,
    favoriteSpots,
    spotsCount,
    gearItems,
    stats,
    loading,
  };
}
