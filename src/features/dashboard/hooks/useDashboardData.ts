/**
 * useDashboardData — primary data hook for the Dashboard screen.
 *
 * Responsibilities:
 *  1. Real-time listeners for recent catches + sessions (onSnapshot)
 *  2. One-time load of stats (cached), spots and gear as secondary data
 *  3. XP backfill: catches_v2 records without xpEarned get their XP
 *     calculated and written back. User profile XP is updated if the
 *     derived total exceeds what is currently stored. Runs once per
 *     browser session (localStorage gate).
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
  updateDoc,
  increment,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch, Session, Spot, GearItem } from '../../../types';
import { statsService, UserStats } from '../../../services/statsService';
import { gearService } from '../../gear/services/gearService';
import {
  getSpeciesXpBonus,
  calculateLevelFromXp,
} from '../../../services/xpService';
import { getSpotCatchCount } from '../utils/dashboardHelpers';

const COLLECTIONS = {
  CATCHES: 'catches_v2',
  SPOTS: 'spots_v2',
  SESSIONS: 'sessions_v2',
} as const;

const XP_BASE_CATCH = 10; // base XP for a complete catch

const backfillKey = (uid: string) => `catchrank_xp_backfill_${uid}`;

/* ─────────────────────────────────────────────────────────────────
   XP backfill — runs once per browser session per user
   ───────────────────────────────────────────────────────────────── */

async function runXpBackfillIfNeeded(
  userId: string,
  catches: Catch[]
): Promise<void> {
  // Gate: only run once per session
  if (sessionStorage.getItem(backfillKey(userId))) return;
  sessionStorage.setItem(backfillKey(userId), '1');

  // Catches that are complete and have no xpEarned set
  const needsXp = catches.filter(
    (c) =>
      c.status === 'complete' &&
      (c.xpEarned === undefined || c.xpEarned === null || c.xpEarned === 0)
  );

  if (needsXp.length === 0) return;

  // Calculate & batch-write xpEarned per catch
  const batch = writeBatch(db);
  let totalNewXp = 0;

  for (const c of needsXp) {
    const speciesGeneral =
      (c as any).speciesGeneral || c.species || '';
    const speciesSpecific =
      (c as any).speciesSpecific || '';
    const speciesBonus = getSpeciesXpBonus(speciesGeneral, speciesSpecific);
    const xpEarned = XP_BASE_CATCH + speciesBonus;

    if (c.id) {
      batch.update(doc(db, COLLECTIONS.CATCHES, c.id), { xpEarned });
    }
    totalNewXp += xpEarned;
  }

  await batch.commit();

  if (totalNewXp <= 0) return;

  // Add the newly calculated XP to the user's profile (atomic increment)
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const currentXp: number = userSnap.data()?.xp ?? 0;
  const newXp = currentXp + totalNewXp;
  const newLevel = calculateLevelFromXp(newXp);

  await updateDoc(userRef, {
    xp: increment(totalNewXp),
    level: newLevel,
  });
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

        // XP backfill for migrated catches
        await runXpBackfillIfNeeded(userId, allCatches);
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
        setRecentCatches(all.filter((c) => c.status === 'complete').slice(0, 6));
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
