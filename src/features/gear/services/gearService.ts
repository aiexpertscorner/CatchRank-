import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  arrayUnion,
  arrayRemove,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { GearItem, GearSetup, GearCategory } from '../../../types';

/**
 * Gear Service
 * Handles all Firestore operations for Mijn Visgear:
 * - GearItems (user_gear collection)
 * - GearSetups (user_setups collection)
 * - Favorites (isFavorite field on GearItem)
 * - Cross-module linking (catches, sessions)
 */

// ─── GearItem CRUD ─────────────────────────────────────────────────────────

export const gearService = {

  /**
   * Add a new gear item for a user.
   */
  async addGearItem(userId: string, data: Omit<GearItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const gearData: Omit<GearItem, 'id'> = {
      ...data,
      userId,
      isFavorite: data.isFavorite ?? false,
      linkedCatchIds: data.linkedCatchIds ?? [],
      linkedSessionIds: data.linkedSessionIds ?? [],
      linkedSetupIds: data.linkedSetupIds ?? [],
      usageCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'user_gear'), gearData);
    return docRef.id;
  },

  /**
   * Update an existing gear item.
   */
  async updateGearItem(itemId: string, data: Partial<GearItem>): Promise<void> {
    await updateDoc(doc(db, 'user_gear', itemId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Delete a gear item and remove it from any setups.
   */
  async deleteGearItem(itemId: string, linkedSetupIds: string[] = []): Promise<void> {
    // Remove from setups first
    for (const setupId of linkedSetupIds) {
      await updateDoc(doc(db, 'user_setups', setupId), {
        gearIds: arrayRemove(itemId),
        updatedAt: serverTimestamp(),
      });
    }

    await deleteDoc(doc(db, 'user_gear', itemId));
  },

  /**
   * Toggle favorite status on a gear item.
   */
  async toggleFavorite(itemId: string, currentValue: boolean): Promise<void> {
    await updateDoc(doc(db, 'user_gear', itemId), {
      isFavorite: !currentValue,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Subscribe to all gear items for a user (real-time).
   * Returns unsubscribe function.
   */
  subscribeToUserGear(
    userId: string,
    callback: (items: GearItem[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'user_gear'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as GearItem));
        callback(items);
      },
      onError
    );
  },

  /**
   * One-time fetch of user gear for selectors (e.g. in CatchForm, SetupModal).
   */
  async getUserGear(userId: string): Promise<GearItem[]> {
    const q = query(
      collection(db, 'user_gear'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GearItem));
  },

  /**
   * Get gear items filtered by category (for setup building).
   */
  async getUserGearByCategory(userId: string, category: GearCategory): Promise<GearItem[]> {
    const q = query(
      collection(db, 'user_gear'),
      where('userId', '==', userId),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GearItem));
  },

  // ─── GearSetup CRUD ─────────────────────────────────────────────────────

  /**
   * Create a new gear setup.
   */
  async createSetup(userId: string, data: Omit<GearSetup, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const setupData: Omit<GearSetup, 'id'> = {
      ...data,
      userId,
      gearIds: data.gearIds ?? [],
      catchCount: 0,
      sessionCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'user_setups'), setupData);

    // Mark each gear item as linked to this setup
    for (const gearId of setupData.gearIds) {
      await updateDoc(doc(db, 'user_gear', gearId), {
        linkedSetupIds: arrayUnion(docRef.id),
        updatedAt: serverTimestamp(),
      });
    }

    return docRef.id;
  },

  /**
   * Update an existing setup.
   */
  async updateSetup(setupId: string, data: Partial<GearSetup>): Promise<void> {
    await updateDoc(doc(db, 'user_setups', setupId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Delete a setup and clean up gear links.
   */
  async deleteSetup(setupId: string, gearIds: string[] = []): Promise<void> {
    for (const gearId of gearIds) {
      await updateDoc(doc(db, 'user_gear', gearId), {
        linkedSetupIds: arrayRemove(setupId),
        updatedAt: serverTimestamp(),
      });
    }

    await deleteDoc(doc(db, 'user_setups', setupId));
  },

  /**
   * Subscribe to all setups for a user (real-time).
   */
  subscribeToUserSetups(
    userId: string,
    callback: (setups: GearSetup[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'user_setups'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const setups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as GearSetup));
        callback(setups);
      },
      onError
    );
  },

  /**
   * One-time fetch of user setups (for selectors).
   */
  async getUserSetups(userId: string): Promise<GearSetup[]> {
    const q = query(
      collection(db, 'user_setups'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GearSetup));
  },

  // ─── Cross-module linking ────────────────────────────────────────────────

  /**
   * Link gear items and optionally a setup to a catch.
   * Called after a catch is created/completed.
   * Updates usage counts on gear items.
   */
  async linkGearToCatch(gearIds: string[], catchId: string, setupId?: string): Promise<void> {
    for (const gearId of gearIds) {
      await updateDoc(doc(db, 'user_gear', gearId), {
        linkedCatchIds: arrayUnion(catchId),
        usageCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    if (setupId) {
      await updateDoc(doc(db, 'user_setups', setupId), {
        catchCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
  },

  /**
   * Link gear to a session (called on session end).
   */
  async linkGearToSession(gearIds: string[], sessionId: string, setupId?: string): Promise<void> {
    for (const gearId of gearIds) {
      await updateDoc(doc(db, 'user_gear', gearId), {
        linkedSessionIds: arrayUnion(sessionId),
        updatedAt: serverTimestamp(),
      });
    }

    if (setupId) {
      await updateDoc(doc(db, 'user_setups', setupId), {
        sessionCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
  },
};
