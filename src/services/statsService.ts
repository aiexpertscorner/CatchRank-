import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Catch, Session } from '../types';
import { differenceInHours } from 'date-fns';

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

export const statsService = {
  async calculateUserStats(userId: string): Promise<UserStats> {
    // Fetch all catches
    const catchesQuery = query(
      collection(db, 'catches'),
      where('userId', '==', userId)
    );
    const catchesSnapshot = await getDocs(catchesQuery);
    const catches = catchesSnapshot.docs.map(doc => doc.data() as Catch);

    // Fetch all sessions
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('ownerUserId', '==', userId)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);
    const sessions = sessionsSnapshot.docs.map(doc => doc.data() as Session);

    // Calculate basic counts
    const totalCatches = catches.length;
    const totalSessions = sessions.length;
    
    // Unique spots
    const spots = new Set(catches.map(c => c.spotId).filter(Boolean));
    const totalSpots = spots.size;

    // Unique species
    const speciesMap = new Map<string, number>();
    catches.forEach(c => {
      if (c.species) {
        speciesMap.set(c.species, (speciesMap.get(c.species) || 0) + 1);
      }
    });
    const speciesCount = speciesMap.size;

    // Total XP
    const totalXp = catches.reduce((acc, c) => acc + (c.xpEarned || 0), 0) + 
                   sessions.reduce((acc, s) => acc + (s.statsSummary?.totalXp || 0), 0);

    // Total Hours
    let totalHours = 0;
    sessions.forEach(s => {
      if (s.startedAt && s.endedAt) {
        totalHours += Math.abs(differenceInHours(s.endedAt.toDate(), s.startedAt.toDate()));
      }
    });

    // Average catches per session
    const averageCatchesPerSession = totalSessions > 0 ? totalCatches / totalSessions : 0;

    // Top Species
    const topSpecies = Array.from(speciesMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Monthly activity (last 12 months)
    const monthlyActivityMap = new Map<string, number>();
    const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    
    // Initialize last 12 months
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      monthlyActivityMap.set(key, 0);
    }

    catches.forEach(c => {
      if (c.timestamp) {
        const d = c.timestamp.toDate();
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
        if (monthlyActivityMap.has(key)) {
          monthlyActivityMap.set(key, (monthlyActivityMap.get(key) || 0) + 1);
        }
      }
    });

    const monthlyActivity = Array.from(monthlyActivityMap.entries()).map(([month, count]) => ({
      month,
      count
    }));

    return {
      totalCatches,
      totalSessions,
      totalSpots,
      speciesCount,
      totalXp,
      totalHours,
      averageCatchesPerSession,
      topSpecies,
      monthlyActivity
    };
  }
};
