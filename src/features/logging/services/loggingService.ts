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
  getDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch, Session, Spot, UserProfile } from '../../../types';
import { xpService, getSpeciesXpBonus } from '../../../services/xpService';
import { bustStatsCache } from '../../../services/statsService';

/**
 * Logging Service
 * Handles all Firestore operations for catches and sessions.
 * Part of the 'logging' feature module.
 */

export const loggingService = {
  /**
   * Quick Catch: Minimal entry point, saves as draft.
   * Awards 10 base XP immediately for logging effort.
   */
  async quickCatch(userId: string, photoURL: string, spotId?: string, location?: { lat: number; lng: number }): Promise<string> {
    const xpEarned = 10;
    const catchData: Partial<Catch> = {
      userId,
      photoURL,
      location,
      spotId,
      timestamp: serverTimestamp(),
      status: 'draft',
      incompleteFields: ['species', 'weight', 'length', !spotId ? 'spotId' : ''].filter(Boolean),
      xpEarned,
    };

    const docRef = await addDoc(collection(db, 'catches'), catchData);

    // Award XP to user — fire-and-forget, non-blocking for UX
    xpService.addXpToUser(userId, xpEarned).catch(err =>
      console.error('XP award failed (quickCatch):', err)
    );

    return docRef.id;
  },

  /**
   * Create a new catch (full or draft).
   * Awards XP to the user after saving. XP includes species rarity bonus.
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

    // Award XP only for complete catches (drafts earn XP when completed via updateCatch)
    if (catchData.status === 'complete' && xpEarned > 0) {
      xpService.addXpToUser(userId, xpEarned).catch(err =>
        console.error('XP award failed (createCatch):', err)
      );
      bustStatsCache(userId);
    }

    // Update spot catch counter (fire-and-forget, non-blocking)
    if (catchData.status === 'complete' && data.spotId) {
      updateDoc(doc(db, 'spots', data.spotId), {
        'stats.totalCatches': increment(1),
      }).catch(e => console.warn('spot stats update failed', e));
    }

    return docRef.id;
  },

  /**
   * Update an existing catch.
   * If the catch transitions from draft → complete, award XP to the user.
   */
  async updateCatch(catchId: string, data: Partial<Catch>, userId?: string): Promise<void> {
    const docRef = doc(db, 'catches', catchId);
    const incompleteFields = this.calculateIncompleteFields(data);
    const xpEarned = this.calculateXP(data);
    const newStatus = data.status || (incompleteFields.length === 0 ? 'complete' : 'draft');

    // Check if this is a draft → complete transition to award XP
    let wasAlreadyComplete = false;
    if (userId && newStatus === 'complete') {
      const existing = await getDoc(docRef);
      wasAlreadyComplete = existing.data()?.status === 'complete';
    }

    await updateDoc(docRef, {
      ...data,
      status: newStatus,
      incompleteFields,
      xpEarned,
    });

    // Award XP only on first-time completion (draft → complete)
    if (userId && newStatus === 'complete' && !wasAlreadyComplete && xpEarned > 0) {
      xpService.addXpToUser(userId, xpEarned).catch(err =>
        console.error('XP award failed (updateCatch):', err)
      );
      bustStatsCache(userId);
    }
  },

  /**
   * Create a new spot.
   */
  async createSpot(userId: string, data: Partial<Spot>): Promise<string> {
    const spotData: Partial<Spot> = {
      ...data,
      userId,
      visibility: data.visibility || 'private',
      isPrivate: data.visibility === 'private',
      isFavorite: data.isFavorite || false,
      coordinates: data.coordinates || { lat: 52.3676, lng: 4.9041 },
      techniques: data.techniques || [],
      targetSpecies: data.targetSpecies || [],
      amenities: data.amenities || [],
      linkedGearIds: data.linkedGearIds || [],
      linkedSetupIds: data.linkedSetupIds || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      stats: {
        totalCatches: 0,
        totalSessions: 0,
        topSpecies: [],
        avgRating: 0,
        ratingCount: 0
      },
    };

    const docRef = await addDoc(collection(db, 'spots'), spotData);
    return docRef.id;
  },

  /**
   * Update an existing spot.
   */
  async updateSpot(spotId: string, data: Partial<Spot>): Promise<void> {
    const docRef = doc(db, 'spots', spotId);
    await updateDoc(docRef, {
      ...data,
      isPrivate: data.visibility === 'private',
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Calculate XP based on catch data.
   * Base: 25 XP + species rarity bonus + data richness bonuses.
   */
  calculateXP(data: Partial<Catch>): number {
    let xp = 25; // Base XP for a logged catch

    // Species rarity bonus (activates species.xpValue that was previously unused)
    if (data.species) {
      xp += getSpeciesXpBonus(data.species);
    }

    // Size bonuses
    if (data.length && data.length > 50) xp += 15;
    if (data.weight && data.weight > 2000) xp += 20;

    // Data richness bonuses (incentivise complete logging)
    if (data.photoURL) xp += 10;
    if (data.weather) xp += 5;
    if (data.gear && Object.values(data.gear).some(Boolean)) xp += 5;
    if (data.notes && data.notes.length > 20) xp += 5;

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
   * Search users by display name or email.
   */
  async searchUsers(searchTerm: string): Promise<UserProfile[]> {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    // Note: Firestore doesn't support full-text search easily.
    // This is a simple prefix search for demo purposes.
    const q = query(
      collection(db, 'users'),
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  },

  /**
   * Invite a participant to a session.
   */
  async inviteParticipant(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await updateDoc(sessionRef, {
      invitedUserIds: arrayUnion(userId),
      pendingUserIds: arrayUnion(userId),
      [`acceptanceStateByUser.${userId}`]: 'pending',
      updatedAt: serverTimestamp(),
    });

    // In a real app, you'd also create a notification document here.
  },

  /**
   * Accept a session invitation.
   */
  async acceptInvitation(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    // Use a transaction or multiple updates to ensure consistency
    await updateDoc(sessionRef, {
      participantUserIds: arrayUnion(userId),
      acceptedUserIds: arrayUnion(userId),
      pendingUserIds: arrayRemove(userId),
      [`acceptanceStateByUser.${userId}`]: 'accepted',
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Decline a session invitation.
   */
  async declineInvitation(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await updateDoc(sessionRef, {
      pendingUserIds: arrayRemove(userId),
      [`acceptanceStateByUser.${userId}`]: 'declined',
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Get session details.
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const docRef = doc(db, 'sessions', sessionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Session;
    }
    return null;
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
   * Awards a session completion bonus to the owner (50 XP base).
   * The ownerUserId is read from the session document.
   */
  async endSession(sessionId: string, notes?: string, stats?: any): Promise<void> {
    const docRef = doc(db, 'sessions', sessionId);

    // Read session to get owner for XP award
    const sessionSnap = await getDoc(docRef);
    const ownerUserId: string | undefined = sessionSnap.data()?.ownerUserId;

    await updateDoc(docRef, {
      endedAt: serverTimestamp(),
      status: 'completed',
      notes,
      statsSummary: stats,
      updatedAt: serverTimestamp(),
    });

    // Award session completion XP to owner — fire-and-forget
    if (ownerUserId) {
      const SESSION_COMPLETION_XP = 50;
      xpService.addXpToUser(ownerUserId, SESSION_COMPLETION_XP).catch(err =>
        console.error('XP award failed (endSession):', err)
      );
      bustStatsCache(ownerUserId);
    }

    // Update totalSessions counter on all spots linked to this session — fire-and-forget
    const linkedSpotIds: string[] = sessionSnap.data()?.linkedSpotIds || [];
    for (const spotId of linkedSpotIds) {
      updateDoc(doc(db, 'spots', spotId), {
        'stats.totalSessions': increment(1),
      }).catch(e => console.warn('spot session stats update failed', e));
    }
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
