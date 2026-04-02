import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch, Session } from '../../../types';

/**
 * Logging Service
 * Handles all Firestore operations for catches and sessions.
 * Part of the 'logging' feature module.
 */

export const loggingService = {
  /**
   * Quick Catch: Minimal entry point, saves as draft.
   */
  async quickCatch(userId: string, photoURL: string, location?: { lat: number; lng: number }): Promise<string> {
    const catchData: Partial<Catch> = {
      userId,
      photoURL,
      location,
      timestamp: serverTimestamp(),
      status: 'draft',
      incompleteFields: ['species', 'weight', 'length', 'spotId'],
      xpEarned: 10, // Base XP for quick catch
    };

    const docRef = await addDoc(collection(db, 'catches'), catchData);
    return docRef.id;
  },

  /**
   * Create a new catch (full or draft).
   */
  async createCatch(userId: string, data: Partial<Catch>): Promise<string> {
    const incompleteFields = this.calculateIncompleteFields(data);
    const xpEarned = this.calculateXP(data);
    
    const catchData: Partial<Catch> = {
      ...data,
      userId,
      timestamp: data.timestamp || serverTimestamp(),
      status: data.status || (incompleteFields.length === 0 ? 'complete' : 'draft'),
      incompleteFields,
      xpEarned,
    };

    const docRef = await addDoc(collection(db, 'catches'), catchData);
    return docRef.id;
  },

  /**
   * Update an existing catch.
   */
  async updateCatch(catchId: string, data: Partial<Catch>): Promise<void> {
    const docRef = doc(db, 'catches', catchId);
    const incompleteFields = this.calculateIncompleteFields(data);
    const xpEarned = this.calculateXP(data);
    
    await updateDoc(docRef, {
      ...data,
      status: data.status || (incompleteFields.length === 0 ? 'complete' : 'draft'),
      incompleteFields,
      xpEarned,
    });
  },

  /**
   * Calculate XP based on catch data.
   */
  calculateXP(data: Partial<Catch>): number {
    let xp = 25; // Base XP for a complete catch
    if (data.length && data.length > 50) xp += 15;
    if (data.weight && data.weight > 2000) xp += 20;
    if (data.photoURL) xp += 10;
    if (data.weather) xp += 5; // Bonus for environmental data
    if (data.gear) xp += 5; // Bonus for gear data
    if (data.notes && data.notes.length > 20) xp += 5; // Bonus for detailed notes
    return xp;
  },

  /**
   * Calculate which required fields are missing.
   */
  calculateIncompleteFields(data: Partial<Catch>): string[] {
    const required = ['species', 'weight', 'length', 'spotId', 'photoURL'];
    return required.filter(field => !data[field as keyof Catch]);
  },

  /**
   * Start a new fishing session.
   */
  async startSession(userId: string, location?: { lat: number; lng: number; name?: string }): Promise<string> {
    const sessionData: Partial<Session> = {
      userId,
      startTime: serverTimestamp(),
      status: 'active',
      spotIds: [],
      catchIds: [],
      location,
      isActive: true,
    };

    const docRef = await addDoc(collection(db, 'sessions'), sessionData);
    return docRef.id;
  },

  /**
   * End an active session.
   */
  async endSession(sessionId: string, notes?: string): Promise<void> {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, {
      endTime: serverTimestamp(),
      status: 'completed',
      isActive: false,
      notes,
    });
  },

  /**
   * Link a catch to a session and ensure the spot is also linked to the session.
   */
  async linkCatchToSession(catchId: string, sessionId: string, spotId?: string): Promise<void> {
    const catchRef = doc(db, 'catches', catchId);
    await updateDoc(catchRef, { sessionId });

    const sessionRef = doc(db, 'sessions', sessionId);
    const updateData: any = {
      catchIds: arrayUnion(catchId)
    };

    if (spotId) {
      updateData.spotIds = arrayUnion(spotId);
    }

    await updateDoc(sessionRef, updateData);
  },

  /**
   * Smart Suggestions: Get the most likely species, spot, bait, and technique.
   */
  async getSmartSuggestions(userId: string) {
    const q = query(
      collection(db, 'catches'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const history = snapshot.docs.map(doc => doc.data() as Catch);

    if (history.length === 0) {
      return {
        species: ['Snoekbaars', 'Baars', 'Snoek'],
        spots: [],
        baits: ['Shads', 'Pluggen', 'Dood aas'],
        techniques: ['Verticalen', 'Werpend', 'Trollen']
      };
    }

    // Get top 3 of each
    const species = this.getTopN(history.map(h => h.species), 3);
    const spots = this.getTopN(history.map(h => h.spotId).filter(Boolean) as string[], 3);
    const baits = this.getTopN(history.map(h => h.baitId).filter(Boolean) as string[], 3);
    const techniques = this.getTopN(history.map(h => h.techniqueId).filter(Boolean) as string[], 3);

    return { species, spots, baits, techniques };
  },

  getTopN(arr: string[], n: number): string[] {
    if (arr.length === 0) return [];
    const counts = arr.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, n);
  },

  getMostFrequent(arr: string[]): string | undefined {
    return this.getTopN(arr, 1)[0];
  }
};
