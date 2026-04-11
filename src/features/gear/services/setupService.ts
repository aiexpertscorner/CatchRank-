/**
 * setupService.ts
 *
 * V2 + V3 (SessionSetup) CRUD for user_gear_setups.
 *
 * V2: GearSetupV2 / GearSetupSlot  — discipline slot templates (existing)
 * V3: SessionSetup                  — template-based, completeness-aware (new)
 *
 * Both V2 and V3 live in the same `user_gear_setups` collection.
 * V3 docs are identified by the presence of `templateId` or `version: 3`.
 * Backward-compatible — V2 reads/writes are unchanged.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { GearSetupV2, GearSetupSlot, SessionSetup, CompletenessResult } from '../../../types';

/* -------------------------------------------------------------------------- */
/* V2 discipline slot templates (keep for backward compatibility)              */
/* -------------------------------------------------------------------------- */

export const DISCIPLINE_SLOT_TEMPLATES: Record<string, GearSetupSlot[]> = {
  karper: [
    { slotKey: 'rod',        label: 'Karperhengel',        required: true  },
    { slotKey: 'reel',       label: 'Molen / Baitrunner',  required: true  },
    { slotKey: 'mainLine',   label: 'Hoofdlijn',           required: true  },
    { slotKey: 'hooklink',   label: 'Onderlijnen',         required: false },
    { slotKey: 'rig',        label: 'Rig',                 required: false },
    { slotKey: 'bait',       label: 'Aas (boilie/wafter)', required: false },
    { slotKey: 'bite_alarm', label: 'Bite Alarm',          required: false },
    { slotKey: 'rod_pod',    label: 'Rod Pod / Statieven', required: false },
  ],
  roofvis: [
    { slotKey: 'rod',        label: 'Spinhengel',          required: true  },
    { slotKey: 'reel',       label: 'Spinningsmolen',      required: true  },
    { slotKey: 'line',       label: 'Lijn / Braid',        required: true  },
    { slotKey: 'lure',       label: 'Kunstaas',            required: false },
  ],
  witvis: [
    { slotKey: 'rod',        label: 'Feeder- / Matchhengel', required: true  },
    { slotKey: 'reel',       label: 'Molen',                 required: true  },
    { slotKey: 'line',       label: 'Hoofdlijn',             required: true  },
    { slotKey: 'groundbait', label: 'Grondvoer / Aas',       required: false },
  ],
  nachtvissen: [
    { slotKey: 'bite_alarm', label: 'Bite Alarm set',      required: true  },
    { slotKey: 'bivvy',      label: 'Bivvy / Shelter',     required: false },
    { slotKey: 'sleepSystem',label: 'Slaapsysteem',        required: false },
    { slotKey: 'lighting',   label: 'Verlichting',         required: false },
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
/* V2 completeness (keep for backward compat)                                 */
/* -------------------------------------------------------------------------- */

export function computeCompleteness(slots: GearSetupSlot[]): number {
  const required = slots.filter((s) => s.required);
  if (required.length === 0) {
    const filled = slots.filter((s) => s.gearItemId || s.productId || s.notes);
    return slots.length === 0 ? 100 : Math.round((filled.length / slots.length) * 100);
  }
  const filled = required.filter((s) => s.gearItemId || s.productId || s.notes);
  return Math.round((filled.length / required.length) * 100);
}

/* -------------------------------------------------------------------------- */
/* Session type labels (V3)                                                    */
/* -------------------------------------------------------------------------- */

export const SESSION_TYPE_LABELS: Record<string, string> = {
  korte_nacht:    'Korte Nacht',
  weekender:      'Weekender',
  struinen:       'Struinset',
  polder_ondiep:  'Polder Ondiep',
  vrij:           'Vrije Setup',
};

/* -------------------------------------------------------------------------- */
/* setupService                                                                */
/* -------------------------------------------------------------------------- */

export const setupService = {

  /* ── V2: existing methods (unchanged) ─────────────────────────────────── */

  async getSetups(userId: string): Promise<GearSetupV2[]> {
    const q = query(
      collection(db, 'user_gear_setups'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GearSetupV2));
  },

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

  async updateSetup(
    setupId: string,
    data: Partial<Omit<GearSetupV2, 'id' | 'userId' | 'createdAt'>>
  ): Promise<void> {
    const payload: Record<string, any> = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    if (data.slots) payload.completeness = computeCompleteness(data.slots);
    await updateDoc(doc(db, 'user_gear_setups', setupId), payload);
  },

  async deleteSetup(setupId: string): Promise<void> {
    await deleteDoc(doc(db, 'user_gear_setups', setupId));
  },

  getSlotsForDiscipline(discipline: string): GearSetupSlot[] {
    const template = DISCIPLINE_SLOT_TEMPLATES[discipline] ?? [];
    return template.map((s) => ({ ...s }));
  },

  /* ── V3: Session Setup CRUD ─────────────────────────────────────────────  */

  /**
   * Get all session setups (V3) for a user.
   * V3 docs have `version: 3` or `templateId` set.
   */
  async getSessionSetups(userId: string): Promise<SessionSetup[]> {
    const q = query(
      collection(db, 'user_gear_setups'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as SessionSetup))
      .filter((s) => (s as any).version === 3 || !!(s as any).templateId);
  },

  /**
   * Get ALL setups (V2 + V3) for display in the Setup Coach home.
   */
  async getAllSetups(userId: string): Promise<SessionSetup[]> {
    const q = query(
      collection(db, 'user_gear_setups'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SessionSetup));
  },

  /**
   * Create a new V3 SessionSetup.
   * Stores completeness detail + missingKeys at creation time.
   * These are re-computed each time the Setup Coach home loads.
   */
  async createSessionSetup(
    userId: string,
    data: {
      name:                string;
      discipline:          string;
      templateId?:         string;
      sessionType?:        string;
      notes?:              string;
      completenessResult?: CompletenessResult;
    }
  ): Promise<string> {
    const payload = {
      version:    3,
      userId,
      name:       data.name,
      discipline: data.discipline,
      templateId: data.templateId ?? null,
      sessionType: data.sessionType ?? null,
      notes:      data.notes ?? null,
      slots:      [],       // V3 setups use requirements, not slots, but keep field for compat
      // Completeness snapshot at creation time (updated later by sessiecheck)
      completeness: data.completenessResult?.overallPct ?? 0,
      completenessDetail: data.completenessResult
        ? {
            essentialsPct:  data.completenessResult.essentialsPct,
            recommendedPct: data.completenessResult.recommendedPct,
            overallPct:     data.completenessResult.overallPct,
          }
        : null,
      missingKeys: data.completenessResult?.missingItems.map((m) => m.requirementKey) ?? [],
      lastCheckedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, 'user_gear_setups'), payload);
    return ref.id;
  },

  /**
   * Update completeness snapshot on an existing setup.
   * Called after user changes their tacklebox or runs sessiecheck.
   */
  async updateCompletenessSnapshot(
    setupId:   string,
    result:    CompletenessResult,
    checked:   boolean = false
  ): Promise<void> {
    const payload: Record<string, any> = {
      completeness: result.overallPct,
      completenessDetail: {
        essentialsPct:  result.essentialsPct,
        recommendedPct: result.recommendedPct,
        overallPct:     result.overallPct,
      },
      missingKeys: result.missingItems.map((m) => m.requirementKey),
      updatedAt: serverTimestamp(),
    };
    if (checked) payload.lastCheckedAt = serverTimestamp();
    await updateDoc(doc(db, 'user_gear_setups', setupId), payload);
  },

  /**
   * Update name/notes of a setup.
   */
  async updateSetupMeta(
    setupId: string,
    data: { name?: string; notes?: string }
  ): Promise<void> {
    await updateDoc(doc(db, 'user_gear_setups', setupId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },
};
