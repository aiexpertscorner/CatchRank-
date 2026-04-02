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
   * Create a new fishing session (live or retro).
   */
  async createSession(userId: string, data: Partial<Session>): Promise<string> {
    const sessionData: Partial<Session> = {
      ...data,
      ownerUserId: userId,
      participantUserIds: [userId, ...(data.participantUserIds || [])],
      status: data.status || (data.mode === 'live' ? 'live' : 'completed'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      linkedSpotIds: data.linkedSpotIds || [],
      linkedCatchIds: data.linkedCatchIds || [],
      linkedSetupIds: data.linkedSetupIds || [],
      linkedGearIds: data.linkedGearIds || [],
      linkedProductIds: data.linkedProductIds || [],
      spotTimeline: data.spotTimeline || [],
      visibility: data.visibility || 'public',
    };

    const docRef = await addDoc(collection(db, 'sessions'), sessionData);
    return docRef.id;
  },

  /**
   * Start a new live fishing session.
   */
  async startSession(userId: string, data: Partial<Session>): Promise<string> {
    return this.createSession(userId, {
      ...data,
      mode: 'live',
      status: 'live',
      startedAt: serverTimestamp(),
    });
  },

  /**
   * End an active session.
   */
  async endSession(sessionId: string, notes?: string, stats?: any): Promise<void> {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, {
      endedAt: serverTimestamp(),
      status: 'completed',
      notes,
      statsSummary: stats,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Switch spot within a session.
   */
  async switchSessionSpot(sessionId: string, newSpotId: string, newSpotName: string): Promise<void> {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await updateDoc(sessionRef, {
      activeSpotId: newSpotId,
      linkedSpotIds: arrayUnion(newSpotId),
      spotTimeline: arrayUnion({
        spotId: newSpotId,
        name: newSpotName,
        arrivedAt: serverTimestamp(),
      }),
      notes: arrayUnion({
        text: `Verplaatst naar ${newSpotName}`,
        timestamp: serverTimestamp(),
        type: 'spot_change'
      }),
      updatedAt: serverTimestamp(),
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
      linkedCatchIds: arrayUnion(catchId),
      updatedAt: serverTimestamp()
    };

    if (spotId) {
      updateData.linkedSpotIds = arrayUnion(spotId);
    }

    await updateDoc(sessionRef, updateData);
  },

  /**
   * Add a note/event to the session timeline.
   */
  async addSessionNote(sessionId: string, note: string): Promise<void> {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      notes: arrayUnion({
        text: note,
        timestamp: serverTimestamp(),
      }),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Pause an active session.
   */
  async pauseSession(sessionId: string): Promise<void> {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, {
      status: 'paused',
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Resume a paused session.
   */
  async resumeSession(sessionId: string): Promise<void> {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, {
      status: 'live',
      updatedAt: serverTimestamp(),
    });
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
