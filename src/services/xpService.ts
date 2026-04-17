import {
  doc,
  updateDoc,
  increment,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

/**
 * XP & Level Service — aligned to Dart LevelingService (leveling_service.dart)
 *
 * Level thresholds and rank titles match the Flutter app exactly so that
 * migrated catch XP values produce the same level results in both platforms.
 */

export interface LevelConfig {
  level: number;
  xpRequired: number;
  title: string;
}

export interface LevelProgress {
  level: number;
  title: string;
  currentXp: number;
  levelStartXp: number;
  nextLevelXp: number;
  progressPercent: number;
  xpToNextLevel: number;
  isMaxLevel: boolean;
}

export interface XpResult {
  prevXp: number;
  newXp: number;
  prevLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  xpAdded: number;
}

/**
 * Level thresholds — exact match to Dart LevelingService.levelXpFloor.
 *
 * L2=150, L4=800, L6=2200, L8=4800, L10=10000
 */
export const LEVEL_CONFIG: LevelConfig[] = [
  { level: 1,  xpRequired: 0,     title: 'Beginner' },
  { level: 2,  xpRequired: 150,   title: 'Rookie' },
  { level: 3,  xpRequired: 400,   title: 'Rookie' },
  { level: 4,  xpRequired: 800,   title: 'Gevorderd' },
  { level: 5,  xpRequired: 1400,  title: 'Gevorderd' },
  { level: 6,  xpRequired: 2200,  title: 'Pro Visser' },
  { level: 7,  xpRequired: 3300,  title: 'Pro Visser' },
  { level: 8,  xpRequired: 4800,  title: 'Big Game Angler' },
  { level: 9,  xpRequired: 6800,  title: 'Big Game Angler' },
  { level: 10, xpRequired: 10000, title: 'CatchRank Legend' },
];

export const MAX_LEVEL = 10;

/**
 * XP multiplier per level — Dart LevelingService.xpMultiplierForLevel().
 * Applied when awarding XP so higher-level players earn slightly less per catch.
 *   L1–3:  1.0×
 *   L4–6:  0.9×
 *   L7–9:  0.8×
 *   L10:   0.7×
 */
export function xpMultiplierForLevel(level: number): number {
  if (level >= 10) return 0.7;
  if (level >= 7)  return 0.8;
  if (level >= 4)  return 0.9;
  return 1.0;
}

/**
 * Apply level multiplier to a base XP amount — Dart applyLevelMultiplier().
 */
export function applyLevelMultiplier(baseXp: number, userLevel: number): number {
  return Math.round(baseXp * xpMultiplierForLevel(userLevel));
}

/**
 * Calculates the level for a given XP total.
 */
export function calculateLevelFromXp(xp: number): number {
  let level = 1;
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_CONFIG[i].xpRequired) {
      level = LEVEL_CONFIG[i].level;
      break;
    }
  }
  return Math.min(level, MAX_LEVEL);
}

/**
 * Returns the display title for a given level (Dart getRankTitle equivalent).
 */
export function getLevelTitle(level: number): string {
  const config = LEVEL_CONFIG.find(l => l.level === level);
  return config?.title ?? 'Beginner';
}

/**
 * Calculates full level progress data for a given XP total.
 * Used to render progress bars and level badges throughout the app.
 */
export function getLevelProgress(xp: number): LevelProgress {
  const level = calculateLevelFromXp(xp);
  const levelConfig = LEVEL_CONFIG.find(l => l.level === level)!;
  const nextConfig = LEVEL_CONFIG.find(l => l.level === level + 1);
  const isMaxLevel = level === MAX_LEVEL;

  const levelStartXp = levelConfig.xpRequired;
  const nextLevelXp = nextConfig?.xpRequired ?? levelStartXp;

  const xpInCurrentLevel = xp - levelStartXp;
  const xpRangeInLevel = isMaxLevel ? 1 : nextLevelXp - levelStartXp;
  const progressPercent = isMaxLevel
    ? 100
    : Math.min(100, Math.round((xpInCurrentLevel / xpRangeInLevel) * 100));

  return {
    level,
    title: levelConfig.title,
    currentXp: xp,
    levelStartXp,
    nextLevelXp: isMaxLevel ? xp : nextLevelXp,
    progressPercent,
    xpToNextLevel: isMaxLevel ? 0 : nextLevelXp - xp,
    isMaxLevel,
  };
}

/**
 * Awards XP to a user and updates their level if they crossed a threshold.
 *
 * Applies the level multiplier from Dart's applyLevelMultiplier() so higher-
 * level users earn slightly less per catch.
 *
 * Uses Firestore increment() for atomic XP addition.
 * One read + one write per XP event.
 */
export const xpService = {
  async addXpToUser(userId: string, amount: number): Promise<XpResult> {
    if (!userId || amount <= 0) {
      return { prevXp: 0, newXp: 0, prevLevel: 1, newLevel: 1, didLevelUp: false, xpAdded: 0 };
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { prevXp: 0, newXp: 0, prevLevel: 1, newLevel: 1, didLevelUp: false, xpAdded: 0 };
    }

    const userData = userSnap.data();
    const prevXp: number = userData?.xp ?? 0;
    const prevLevel: number = userData?.level ?? 1;

    // Apply level multiplier (Dart applyLevelMultiplier)
    const adjustedAmount = applyLevelMultiplier(amount, prevLevel);

    const newXp = prevXp + adjustedAmount;
    const newLevel = calculateLevelFromXp(newXp);
    const didLevelUp = newLevel > prevLevel;

    const updateData: Record<string, unknown> = {
      xp: increment(adjustedAmount),
      total_xp: increment(adjustedAmount),
    };
    if (newLevel !== prevLevel) {
      updateData.level = newLevel;
      updateData.rank_title = getLevelTitle(newLevel);
    }

    await updateDoc(userRef, updateData);

    if (didLevelUp) {
      toast.success(`Level Up! Je bent nu Level ${newLevel}`, {
        description: `${getLevelTitle(newLevel)} — blijf vangen voor meer XP!`,
        duration: 6000,
      });
    } else {
      toast.success(`+${adjustedAmount} XP verdiend`, {
        description: 'Goed gedaan! Blijf loggen voor meer progressie.',
        duration: 2500,
      });
    }

    return { prevXp, newXp, prevLevel, newLevel, didLevelUp, xpAdded: adjustedAmount };
  },
};

/**
 * Full XP sync — matches Dart LevelingService.syncUserStats().
 *
 * Reads ALL catches_v2 for the user, sums xpEarned (fallback: xp field),
 * recalculates level and rank_title, writes back to users/{uid}.
 *
 * Called once per session from the dashboard backfill hook to ensure
 * migrated Flutter catches are properly reflected in user.xp.
 */
export async function syncUserXpFromCatches(userId: string): Promise<void> {
  if (!userId) return;

  const catchesSnap = await getDocs(
    query(collection(db, 'catches_v2'), where('userId', '==', userId))
  );

  let totalXp = 0;
  let catchCount = 0;

  catchesSnap.docs.forEach(d => {
    const c = d.data();
    const raw = c.xpEarned ?? c.xp ?? 0;
    const xp = typeof raw === 'number' ? raw : (parseInt(String(raw)) || 0);
    totalXp += xp;
    catchCount++;
  });

  if (totalXp < 0) totalXp = 0;

  const level = calculateLevelFromXp(totalXp);
  const rankTitle = getLevelTitle(level);

  await updateDoc(doc(db, 'users', userId), {
    xp: totalXp,
    total_xp: totalXp,
    level,
    rank_title: rankTitle,
    catch_count: catchCount,
    last_stats_update: serverTimestamp(),
  });
}
