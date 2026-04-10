import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

/**
 * XP & Level Service
 * Central source of truth for all XP/level progression logic.
 * Handles XP accumulation, level calculation, and toast notifications.
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
 * Level thresholds and titles.
 * Designed for a fishing app: ~10-15 complete catches per level in early game,
 * scaling to require consistent long-term activity at higher levels.
 */
export const LEVEL_CONFIG: LevelConfig[] = [
  { level: 1,  xpRequired: 0,      title: 'Beginner' },
  { level: 2,  xpRequired: 150,    title: 'Hobby Visser' },
  { level: 3,  xpRequired: 400,    title: 'Visser' },
  { level: 4,  xpRequired: 800,    title: 'Actieve Visser' },
  { level: 5,  xpRequired: 1400,   title: 'Ervaren Visser' },
  { level: 6,  xpRequired: 2200,   title: 'Gevorderde Visser' },
  { level: 7,  xpRequired: 3200,   title: 'Doorgewinterde Visser' },
  { level: 8,  xpRequired: 4500,   title: 'Expert Visser' },
  { level: 9,  xpRequired: 6000,   title: 'Senior Expert' },
  { level: 10, xpRequired: 8000,   title: 'Pro Visser' },
  { level: 11, xpRequired: 10500,  title: 'Elite Visser' },
  { level: 12, xpRequired: 13500,  title: 'Master Visser' },
  { level: 13, xpRequired: 17000,  title: 'Champion Visser' },
  { level: 14, xpRequired: 21500,  title: 'Grand Champion' },
  { level: 15, xpRequired: 27000,  title: 'Meestervisser' },
  { level: 16, xpRequired: 34000,  title: 'Senior Meester' },
  { level: 17, xpRequired: 43000,  title: 'Grand Master' },
  { level: 18, xpRequired: 54000,  title: 'Legende' },
  { level: 19, xpRequired: 68000,  title: 'Onsterfelijke Visser' },
  { level: 20, xpRequired: 85000,  title: 'De Vis Meester' },
];

export const MAX_LEVEL = LEVEL_CONFIG.length;

/**
 * XP bonus by species general category (rarity tier).
 * Maps common Dutch sport fish to an extra XP bonus on top of the catch base.
 */
const SPECIES_XP_BONUS: Record<string, number> = {
  'meerval': 20,
  'karper': 15,
  'zeebaars': 12,
  'snoekbaars': 10,
  'snoek': 8,
  'roofblei': 6,
  'forel': 5,
  'winde': 3,
  'baars': 0,
  'brasem': 0,
};

/**
 * XP bonus for specific species variants (on top of general bonus).
 * Rewards catching rare or notable variants of common species.
 */
const SPECIES_SPECIFIC_XP_BONUS: Record<string, number> = {
  // Carp variants
  'wilde karper': 8,
  'spiegelkarper': 5,
  'lederkarper': 7,
  'grasskarper': 4,
  'koikarper': 3,
  // Pike-perch variants
  'spiegelsnoekbaars': 5,
  // Trout variants
  'regenboogforel': 3,
  'beekforel': 5,
  'zeeforel': 8,
  'meerforel': 6,
  // Catfish
  'europese meerval': 20,
  'amerikaanse hondsvis': 5,
  // Bass / other
  'grote mond baars': 8,
  'kleine mond baars': 6,
  'zeebaars': 12,
  // Pike
  'snoek': 8,
};

/**
 * Returns extra XP bonus based on species.
 * Checks speciesSpecific first (more precise), falls through to speciesGeneral.
 * Case-insensitive match against Dutch common names.
 */
export function getSpeciesXpBonus(speciesGeneral: string, speciesSpecific?: string): number {
  if (speciesSpecific) {
    const specificKey = speciesSpecific.toLowerCase().trim();
    const specificBonus = SPECIES_SPECIFIC_XP_BONUS[specificKey];
    if (specificBonus !== undefined) return specificBonus;
  }
  const key = speciesGeneral.toLowerCase().trim();
  return SPECIES_XP_BONUS[key] ?? 0;
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
 * Returns the display title for a given level.
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
 * Uses Firestore increment() for atomic XP addition.
 * One read + one write per XP event — acceptable for this use frequency.
 * Shows toast notifications for XP gain and level-ups.
 *
 * Dev-safe: returns early if userId or amount is invalid without throwing.
 */
export const xpService = {
  async addXpToUser(userId: string, amount: number): Promise<XpResult> {
    if (!userId || amount <= 0) {
      return { prevXp: 0, newXp: 0, prevLevel: 1, newLevel: 1, didLevelUp: false, xpAdded: 0 };
    }

    const userRef = doc(db, 'users', userId);

    // Single read to get current state for level comparison
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { prevXp: 0, newXp: 0, prevLevel: 1, newLevel: 1, didLevelUp: false, xpAdded: 0 };
    }

    const userData = userSnap.data();
    const prevXp: number = userData?.xp ?? 0;
    const prevLevel: number = userData?.level ?? 1;

    const newXp = prevXp + amount;
    const newLevel = calculateLevelFromXp(newXp);
    const didLevelUp = newLevel > prevLevel;

    // Atomic write — use increment() to avoid race conditions
    const updateData: Record<string, unknown> = {
      xp: increment(amount),
    };
    if (newLevel !== prevLevel) {
      updateData.level = newLevel;
    }

    await updateDoc(userRef, updateData);

    // Toast notifications — level-up gets priority over regular XP toast
    if (didLevelUp) {
      toast.success(`Level Up! Je bent nu Level ${newLevel}`, {
        description: `${getLevelTitle(newLevel)} — blijf vangen voor meer XP!`,
        duration: 6000,
      });
    } else {
      toast.success(`+${amount} XP verdiend`, {
        description: 'Goed gedaan! Blijf loggen voor meer progressie.',
        duration: 2500,
      });
    }

    return { prevXp, newXp, prevLevel, newLevel, didLevelUp, xpAdded: amount };
  },
};
