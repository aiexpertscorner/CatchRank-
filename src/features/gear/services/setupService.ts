/**
 * setupService.ts
 *
 * V2 Setup CRUD for user_gear_setups collection.
 * Uses GearSetupV2 / GearSetupSlot types with discipline-aware slot templates.
 *
 * Backward-compatible with existing user_setups (gearService) — both can coexist.
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { GearSetupV2, GearSetupSlot } from '../../../types';

/* -------------------------------------------------------------------------- */
/* Discipline slot templates                                                   */
/* -------------------------------------------------------------------------- */

export const DISCIPLINE_SLOT_TEMPLATES: Record<string, GearSetupSlot[]> = {
  karper: [
    { slotKey: 'rod',        label: 'Karperhengel',       required: true  },
    { slotKey: 'reel',       label: 'Molen / Baitrunner', required: true  },
    { slotKey: 'mainLine',   label: 'Hoofdlijn',          required: true  },
    { slotKey: 'hooklink',   label: 'Onderlijnen',        required: false },
    { slotKey: 'rig',        label: 'Rig',                required: false },
    { slotKey: 'bait',       label: 'Aas (boilie/wafter)',required: false },
    { slotKey: 'bite_alarm', label: 'Bite Alarm',         required: false },
    { slotKey: 'rod_pod',    label: 'Rod Pod / Statieven',required: false },
  ],
  roofvis: [
    { slotKey: 'rod',        label: 'Spinhengel',         required: true  },
    { slotKey: 'reel',       label: 'Spinningsmolen',     required: true  },
    { slotKey: 'line',       label: 'Lijn / Braid',       required: true  },
    { slotKey: 'lure',       label: 'Kunstaas',           required: false },
  ],
  witvis: [
    { slotKey: 'rod',        label: 'Feeder- / Matchhengel', required: true  },
    { slotKey: 'reel',       label: 'Molen',                 required: true  },
    { slotKey: 'line',       label: 'Hoofdlijn',             required: true  },
    { slotKey: 'groundbait', label: 'Grondvoer / Aas',       required: false },
  ],
  nachtvissen: [
    { slotKey: 'bite_alarm', label: 'Bite Alarm set',     required: true  },
    { slotKey: 'bivvy',      label: 'Bivvy / Shelter',    required: false },
    { slotKey: 'sleepSystem',label: 'Slaapsysteem',       required: false },
    { slotKey: 'lighting',   label: 'Verlichting',        required: false },
  ],
  vrij: [],
};

export const DISCIPLINE_LABELS: Record<string, string> = {
  karper:      'Karper',
  roofvis:     'Roofvis',
  witvis:      'Witvis',
  nachtvissen: 'Nachtvissen',
  vrij:        'Vrije Setup',
};

export const DISCIPLINE_ICONS: Record<string, string> = {
  karper:      '🐟',
  roofvis:     '🦈',
  witvis:      '🎣',
  nachtvissen: '🌙',
  vrij:        '⚙️',
};

/* -------------------------------------------------------------------------- */
/* Completeness calculator                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Returns 0-100 indicating what percentage of required slots are filled.
 */
export function computeCompleteness(slots: GearSetupSlot[]): number {
  const required = slots.filter((s) => s.required);
  if (required.length === 0) {
    // No required slots — completeness based on any filled slot
    const filled = slots.filter((s) => s.gearItemId || s.productId || s.notes);
    return slots.length === 0 ? 100 : Math.round((filled.length / slots.length) * 100);
  }
  const filled = required.filter((s) => s.gearItemId || s.productId || s.notes);
  return Math.round((filled.length / required.length) * 100);
}

/* -------------------------------------------------------------------------- */
/* CRUD                                                                        */
/* -------------------------------------------------------------------------- */

export const setupService = {
  /**
   * Fetch all V2 setups for a user.
   */
  async getSetups(userId: string): Promise<GearSetupV2[]> {
    const q = query(
      collection(db, 'user_gear_setups'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GearSetupV2));
  },

  /**
   * Create a new V2 setup. Returns the new document ID.
   */
  async createSetup(
    userId: string,
    data: Omit<GearSetupV2, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const payload = {
      ...data,
      userId,
      completeness: computeCompleteness(data.slots ?? []),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'user_gear_setups'), payload);
    return ref.id;
  },

  /**
   * Update an existing V2 setup (partial update).
   */
  async updateSetup(
    setupId: string,
    data: Partial<Omit<GearSetupV2, 'id' | 'userId' | 'createdAt'>>
  ): Promise<void> {
    const payload: Record<string, any> = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    if (data.slots) {
      payload.completeness = computeCompleteness(data.slots);
    }
    await updateDoc(doc(db, 'user_gear_setups', setupId), payload);
  },

  /**
   * Delete a V2 setup.
   */
  async deleteSetup(setupId: string): Promise<void> {
    await deleteDoc(doc(db, 'user_gear_setups', setupId));
  },

  /**
   * Build a fresh slot list for a given discipline from the template.
   * Returns a deep copy so the template is not mutated.
   */
  getSlotsForDiscipline(discipline: string): GearSetupSlot[] {
    const template = DISCIPLINE_SLOT_TEMPLATES[discipline] ?? [];
    return template.map((s) => ({ ...s }));
  },
};
