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
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch, Session, Spot, UserProfile } from '../../../types';
import { xpService, getSpeciesXpBonus } from '../../../services/xpService';
import { bustStatsCache } from '../../../services/statsService';

/**
 * Logging Service v2
 * Aligned to:
 * - catches_v2
 * - sessions_v2
 * - spots_v2
 *
 * Notes:
 * - Uses v2 collection names
 * - Maps legacy frontend fields to observed v2 Firestore fields
 * - Keeps a few compatibility fields where useful during migration
 */

const COLLECTIONS = {
  CATCHES: 'catches_v2',
  SESSIONS: 'sessions_v2',
  SPOTS: 'spots_v2',
  USERS: 'users',
} as const;

type LatLng = { lat: number; lng: number };

const normalizeString = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const v = String(value).trim();
  return v.length ? v : undefined;
};

const firstDefined = <T>(...values: (T | undefined | null)[]): T | undefined => {
  for (const v of values) {
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
};

const dedupeStrings = (arr: (string | undefined | null)[] = []) =>
  [...new Set(arr.filter(Boolean).map((v) => String(v)))];

const mapCatchLocation = (data: Partial<Catch>): { latitude?: number; longitude?: number } => {
  const latitude = firstDefined(
    (data as any).latitude,
    (data as any).lat,
    (data as any).location?.lat
  );
  const longitude = firstDefined(
    (data as any).longitude,
    (data as any).lng,
    (data as any).location?.lng
  );

  return { latitude, longitude };
};

const mapCatchImage = (data: Partial<Catch>) =>
  firstDefined(
    (data as any).mainImage,
    (data as any).photoURL,
    (data as any).image,
    (data as any).imageUrl
  );

const mapCatchExtraImages = (data: Partial<Catch>) =>
  firstDefined<string[]>(
    (data as any).extraImages,
    (data as any).extra_images,
    (data as any).images
  ) || [];

const mapCatchSpeciesGeneral = (data: Partial<Catch>) =>
  normalizeString(
    firstDefined(
      (data as any).speciesGeneral,
      (data as any).species,
      (data as any).speciesType
    )
  );

const mapCatchSpeciesSpecific = (data: Partial<Catch>) =>
  normalizeString(
    firstDefined(
      (data as any).speciesSpecific,
      (data as any).speciesSubType,
      (data as any).speciesDetail
    )
  );

const mapCatchBaitGeneral = (data: Partial<Catch>) =>
  normalizeString(firstDefined((data as any).baitGeneral, (data as any).baitType));

const mapCatchBaitSpecific = (data: Partial<Catch>) =>
  normalizeString(firstDefined((data as any).baitSpecific, (data as any).baitName));

const mapSpotLatLng = (data: Partial<Spot>) => {
  const lat = firstDefined(
    (data as any).lat,
    (data as any).latitude,
    (data as any).coordinates?.lat
  );
  const lng = firstDefined(
    (data as any).lng,
    (data as any).longitude,
    (data as any).coordinates?.lng
  );
  return { lat, lng };
};

const toSessionStats = (stats?: any) => {
  if (!stats) return {};
  return stats;
};

export const loggingService = {
  /**
   * Quick Catch: Minimal entry point, saves as draft in catches_v2.
   * Awards 10 base XP immediately for logging effort.
   */
  async quickCatch(
    userId: string,
    photoURL: string,
    spotId?: string,
    location?: LatLng
  ): Promise<string> {
    const xpEarned = 10;

    const catchData = {
      userId,
      id: undefined,
      mainImage: photoURL,
      extraImages: [],
      latitude: location?.lat,
      longitude: location?.lng,
      spotId: spotId || null,
      timestamp: serverTimestamp(),
      catchTime: serverTimestamp(),
      status: 'draft',
      incompleteFields: ['speciesGeneral', 'weight', 'length', !spotId ? 'spotId' : '']
        .filter(Boolean),
      xpEarned,
      schemaVersion: 2,
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.CATCHES), catchData);

    await updateDoc(doc(db, COLLECTIONS.CATCHES, docRef.id), {
      id: docRef.id,
    });

    xpService.addXpToUser(userId, xpEarned).catch((err) =>
      console.error('XP award failed (quickCatch):', err)
    );

    return docRef.id;
  },

  /**
   * Create a new catch (full or draft) in catches_v2.
   */
  async createCatch(userId: string, data: Partial<Catch>): Promise<string> {
    const incompleteFields = this.calculateIncompleteFields(data);
    const xpEarned = this.calculateXP(data);

    const { latitude, longitude } = mapCatchLocation(data);
    const mainImage = mapCatchImage(data);
    const extraImages = mapCatchExtraImages(data);
    const speciesGeneral = mapCatchSpeciesGeneral(data);
    const speciesSpecific = mapCatchSpeciesSpecific(data);
    const baitGeneral = mapCatchBaitGeneral(data);
    const baitSpecific = mapCatchBaitSpecific(data);

    const timestampValue = (data as any).timestamp || serverTimestamp();
    const status =
      (data as any).status || (incompleteFields.length === 0 ? 'complete' : 'draft');

    const catchData: Record<string, any> = {
      userId,
      id: undefined,
      timestamp: timestampValue,
      catchTime: firstDefined((data as any).catchTime, timestampValue),
      status,
      incompleteFields,
      xpEarned,

      mainImage,
      extraImages,
      latitude,
      longitude,

      city: normalizeString((data as any).city),
      notes: normalizeString((data as any).notes),
      moonPhase: normalizeString((data as any).moonPhase),
      weather: firstDefined((data as any).weather, (data as any).weatherSnapshot),

      weight: firstDefined((data as any).weight, undefined),
      length: firstDefined((data as any).length, undefined),

      spotId: normalizeString((data as any).spotId),
      spotName: normalizeString((data as any).spotName),

      speciesGeneral,
      speciesSpecific,

      baitGeneral,
      baitSpecific,

      video: normalizeString((data as any).video),
      schemaVersion: 2,
    };

    Object.keys(catchData).forEach((key) => {
      if (catchData[key] === undefined) delete catchData[key];
    });

    const docRef = await addDoc(collection(db, COLLECTIONS.CATCHES), catchData);

    await updateDoc(doc(db, COLLECTIONS.CATCHES, docRef.id), {
      id: docRef.id,
    });

    if (status === 'complete' && xpEarned > 0) {
      xpService.addXpToUser(userId, xpEarned).catch((err) =>
        console.error('XP award failed (createCatch):', err)
      );
      bustStatsCache(userId);
    }

    if (status === 'complete' && catchData.spotId) {
      updateDoc(doc(db, COLLECTIONS.SPOTS, catchData.spotId), {
        updatedAt: serverTimestamp(),
      }).catch((e) => console.warn('spot v2 update failed after createCatch', e));
    }

    return docRef.id;
  },

  /**
   * Update an existing catch in catches_v2.
   * Awards XP when transitioning draft -> complete.
   */
  async updateCatch(catchId: string, data: Partial<Catch>, userId?: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CATCHES, catchId);
    const incompleteFields = this.calculateIncompleteFields(data);
    const xpEarned = this.calculateXP(data);
    const newStatus =
      (data as any).status || (incompleteFields.length === 0 ? 'complete' : 'draft');

    let wasAlreadyComplete = false;
    if (userId && newStatus === 'complete') {
      const existing = await getDoc(docRef);
      wasAlreadyComplete = existing.data()?.status === 'complete';
    }

    const { latitude, longitude } = mapCatchLocation(data);
    const mainImage = mapCatchImage(data);
    const extraImages = mapCatchExtraImages(data);
    const speciesGeneral = mapCatchSpeciesGeneral(data);
    const speciesSpecific = mapCatchSpeciesSpecific(data);
    const baitGeneral = mapCatchBaitGeneral(data);
    const baitSpecific = mapCatchBaitSpecific(data);

    const updateData: Record<string, any> = {
      status: newStatus,
      incompleteFields,
      xpEarned,

      ...(mainImage !== undefined ? { mainImage } : {}),
      ...(extraImages.length ? { extraImages } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),

      ...(normalizeString((data as any).city) !== undefined
        ? { city: normalizeString((data as any).city) }
        : {}),
      ...(normalizeString((data as any).notes) !== undefined
        ? { notes: normalizeString((data as any).notes) }
        : {}),
      ...(normalizeString((data as any).moonPhase) !== undefined
        ? { moonPhase: normalizeString((data as any).moonPhase) }
        : {}),
      ...((data as any).weather !== undefined || (data as any).weatherSnapshot !== undefined
        ? { weather: firstDefined((data as any).weather, (data as any).weatherSnapshot) }
        : {}),

      ...((data as any).weight !== undefined ? { weight: (data as any).weight } : {}),
      ...((data as any).length !== undefined ? { length: (data as any).length } : {}),
      ...(normalizeString((data as any).spotId) !== undefined
        ? { spotId: normalizeString((data as any).spotId) }
        : {}),
      ...(normalizeString((data as any).spotName) !== undefined
        ? { spotName: normalizeString((data as any).spotName) }
        : {}),

      ...(speciesGeneral !== undefined ? { speciesGeneral } : {}),
      ...(speciesSpecific !== undefined ? { speciesSpecific } : {}),

      ...(baitGeneral !== undefined ? { baitGeneral } : {}),
      ...(baitSpecific !== undefined ? { baitSpecific } : {}),

      ...(normalizeString((data as any).video) !== undefined
        ? { video: normalizeString((data as any).video) }
        : {}),
    };

    await updateDoc(docRef, updateData);

    if (userId && newStatus === 'complete' && !wasAlreadyComplete && xpEarned > 0) {
      xpService.addXpToUser(userId, xpEarned).catch((err) =>
        console.error('XP award failed (updateCatch):', err)
      );
      bustStatsCache(userId);
    }
  },

  /**
   * Create a new spot in spots_v2.
   */
  async createSpot(userId: string, data: Partial<Spot>): Promise<string> {
    const { lat, lng } = mapSpotLatLng(data);

    const title = normalizeString(
      firstDefined((data as any).title, (data as any).name)
    );

    const spotData: Record<string, any> = {
      title,
      description: normalizeString((data as any).description),

      lat,
      lng,

      city: normalizeString((data as any).city),
      province: normalizeString((data as any).province),

      privacy: normalizeString(
        firstDefined((data as any).privacy, (data as any).visibility, 'private')
      ),

      species: firstDefined((data as any).species, (data as any).targetSpecies, []),
      bottomType: normalizeString(
        firstDefined((data as any).bottomType, (data as any).bottom_type)
      ),
      waterType: normalizeString(
        firstDefined((data as any).waterType, (data as any).water_type)
      ),
      waterSize: normalizeString(
        firstDefined((data as any).waterSize, (data as any).water_size)
      ),
      spotSize: normalizeString(
        firstDefined((data as any).spotSize, (data as any).spot_size)
      ),
      radius: firstDefined((data as any).radius, undefined),

      nightFishingAllowed: firstDefined(
        (data as any).nightFishingAllowed,
        (data as any).night_fishing_allowed,
        false
      ),

      mainImage: firstDefined((data as any).mainImage, (data as any).main_image),
      extraImages:
        firstDefined((data as any).extraImages, (data as any).extra_images, []) || [],

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      userId,
      schemaVersion: 2,
    };

    Object.keys(spotData).forEach((key) => {
      if (spotData[key] === undefined) delete spotData[key];
    });

    const docRef = await addDoc(collection(db, COLLECTIONS.SPOTS), spotData);
    return docRef.id;
  },

  /**
   * Update an existing spot in spots_v2.
   */
  async updateSpot(spotId: string, data: Partial<Spot>): Promise<void> {
    const { lat, lng } = mapSpotLatLng(data);

    const updateData: Record<string, any> = {
      ...(normalizeString(firstDefined((data as any).title, (data as any).name)) !== undefined
        ? { title: normalizeString(firstDefined((data as any).title, (data as any).name)) }
        : {}),
      ...(normalizeString((data as any).description) !== undefined
        ? { description: normalizeString((data as any).description) }
        : {}),

      ...(lat !== undefined ? { lat } : {}),
      ...(lng !== undefined ? { lng } : {}),

      ...(normalizeString((data as any).city) !== undefined
        ? { city: normalizeString((data as any).city) }
        : {}),
      ...(normalizeString((data as any).province) !== undefined
        ? { province: normalizeString((data as any).province) }
        : {}),

      ...(normalizeString(firstDefined((data as any).privacy, (data as any).visibility)) !==
      undefined
        ? {
            privacy: normalizeString(
              firstDefined((data as any).privacy, (data as any).visibility)
            ),
          }
        : {}),

      ...((data as any).species !== undefined ? { species: (data as any).species } : {}),
      ...(normalizeString(firstDefined((data as any).bottomType, (data as any).bottom_type)) !==
      undefined
        ? {
            bottomType: normalizeString(
              firstDefined((data as any).bottomType, (data as any).bottom_type)
            ),
          }
        : {}),
      ...(normalizeString(firstDefined((data as any).waterType, (data as any).water_type)) !==
      undefined
        ? {
            waterType: normalizeString(
              firstDefined((data as any).waterType, (data as any).water_type)
            ),
          }
        : {}),
      ...(normalizeString(firstDefined((data as any).waterSize, (data as any).water_size)) !==
      undefined
        ? {
            waterSize: normalizeString(
              firstDefined((data as any).waterSize, (data as any).water_size)
            ),
          }
        : {}),
      ...(normalizeString(firstDefined((data as any).spotSize, (data as any).spot_size)) !==
      undefined
        ? {
            spotSize: normalizeString(
              firstDefined((data as any).spotSize, (data as any).spot_size)
            ),
          }
        : {}),
      ...((data as any).radius !== undefined ? { radius: (data as any).radius } : {}),
      ...((data as any).nightFishingAllowed !== undefined
        ? { nightFishingAllowed: (data as any).nightFishingAllowed }
        : {}),

      ...(firstDefined((data as any).mainImage, (data as any).main_image) !== undefined
        ? { mainImage: firstDefined((data as any).mainImage, (data as any).main_image) }
        : {}),
      ...((data as any).extraImages !== undefined
        ? { extraImages: (data as any).extraImages }
        : {}),
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, COLLECTIONS.SPOTS, spotId), updateData);
  },

  /**
   * Calculate XP based on catch data.
   */
  calculateXP(data: Partial<Catch>): number {
    let xp = 25;

    const speciesGeneral = mapCatchSpeciesGeneral(data);
    if (speciesGeneral) {
      xp += getSpeciesXpBonus(speciesGeneral);
    }

    if ((data as any).length && (data as any).length > 50) xp += 15;
    if ((data as any).weight && (data as any).weight > 2000) xp += 20;

    if (mapCatchImage(data)) xp += 10;
    if ((data as any).weather || (data as any).weatherSnapshot) xp += 5;
    if ((data as any).notes && String((data as any).notes).length > 20) xp += 5;

    return xp;
  },

  /**
   * Calculate which required fields are missing for v2 catch structure.
   */
  calculateIncompleteFields(data: Partial<Catch>): string[] {
    const requiredChecks = [
      { key: 'speciesGeneral', value: mapCatchSpeciesGeneral(data) },
      { key: 'weight', value: (data as any).weight },
      { key: 'length', value: (data as any).length },
      { key: 'spotId', value: (data as any).spotId },
      { key: 'mainImage', value: mapCatchImage(data) },
    ];

    return requiredChecks
      .filter((item) => !item.value)
      .map((item) => item.key);
  },

  /**
   * Create a new session in sessions_v2.
   */
  async createSession(userId: string, data: Partial<Session>): Promise<string> {
    const participantIds = dedupeStrings([
      userId,
      ...(((data as any).participantIds || (data as any).participantUserIds || []) as string[]),
    ]);

    const startTime =
      (data as any).startTime ||
      (data as any).startedAt ||
      serverTimestamp();

    const endTime =
      (data as any).endTime ||
      (data as any).endedAt ||
      undefined;

    const isActive =
      firstDefined((data as any).isActive, (data as any).status === 'live', (data as any).mode === 'live', false) ===
      true;

    const sessionData: Record<string, any> = {
      userId,
      createdBy: userId,

      participantIds,
      spotId: normalizeString(
        firstDefined((data as any).spotId, (data as any).activeSpotId)
      ),
      spotName: normalizeString((data as any).spotName),

      name: normalizeString((data as any).name),
      notes: normalizeString((data as any).notes),
      type: normalizeString(firstDefined((data as any).type, (data as any).mode, 'retro')),

      startTime,
      endTime,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),

      isActive,
      canonical: firstDefined((data as any).canonical, true),
      stats: toSessionStats((data as any).stats || (data as any).statsSummary),
      weatherStart: firstDefined((data as any).weatherStart, (data as any).weather),

      mainImage: firstDefined((data as any).mainImage, (data as any).main_image),
      extraImages:
        firstDefined((data as any).extraImages, (data as any).extra_images, []) || [],
      video: normalizeString((data as any).video),

      // Compatibility / relation helpers
      linkedCatchIds: (data as any).linkedCatchIds || [],
      linkedSetupIds: (data as any).linkedSetupIds || [],
      linkedGearIds: (data as any).linkedGearIds || [],
      linkedProductIds: (data as any).linkedProductIds || [],

      dedupeKey: normalizeString((data as any).dedupeKey),
      isDuplicate: firstDefined((data as any).isDuplicate, false),
      duplicateOf: normalizeString((data as any).duplicateOf),
    };

    Object.keys(sessionData).forEach((key) => {
      if (sessionData[key] === undefined) delete sessionData[key];
    });

    const docRef = await addDoc(collection(db, COLLECTIONS.SESSIONS), sessionData);
    return docRef.id;
  },

  /**
   * Search users by display name.
   */
  async searchUsers(searchTerm: string): Promise<UserProfile[]> {
    if (!searchTerm || searchTerm.length < 2) return [];

    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
  },

  /**
   * Invite participant to session_v2.
   */
  async inviteParticipant(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      invitedUserIds: arrayUnion(userId),
      pendingUserIds: arrayUnion(userId),
      [`acceptanceStateByUser.${userId}`]: 'pending',
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  /**
   * Accept session invitation.
   */
  async acceptInvitation(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      participantIds: arrayUnion(userId),
      acceptedUserIds: arrayUnion(userId),
      pendingUserIds: arrayRemove(userId),
      [`acceptanceStateByUser.${userId}`]: 'accepted',
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  /**
   * Decline session invitation.
   */
  async declineInvitation(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      pendingUserIds: arrayRemove(userId),
      [`acceptanceStateByUser.${userId}`]: 'declined',
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  /**
   * Get session details from sessions_v2.
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const docRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Session;
    }

    return null;
  },

  /**
   * Start a new live session.
   */
  async startSession(userId: string, data: Partial<Session>): Promise<string> {
    return this.createSession(userId, {
      ...data,
      type: 'live',
      isActive: true,
      startTime: (data as any).startTime || serverTimestamp(),
    } as any);
  },

  /**
   * End an active session in sessions_v2.
   */
  async endSession(sessionId: string, notes?: string, stats?: any): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    const sessionSnap = await getDoc(docRef);
    const sessionData = sessionSnap.data() || {};
    const ownerUserId: string | undefined = sessionData.userId || sessionData.createdBy;

    await updateDoc(docRef, {
      endTime: serverTimestamp(),
      notes: notes ?? sessionData.notes ?? null,
      stats: toSessionStats(stats ?? sessionData.stats ?? {}),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      isActive: false,
    });

    if (ownerUserId) {
      const SESSION_COMPLETION_XP = 50;
      xpService.addXpToUser(ownerUserId, SESSION_COMPLETION_XP).catch((err) =>
        console.error('XP award failed (endSession):', err)
      );
      bustStatsCache(ownerUserId);
    }

    const spotId: string | undefined = sessionData.spotId;
    if (spotId) {
      updateDoc(doc(db, COLLECTIONS.SPOTS, spotId), {
        updatedAt: serverTimestamp(),
      }).catch((e) => console.warn('spot session update failed', e));
    }
  },

  /**
   * Switch spot within a session.
   */
  async switchSessionSpot(
    sessionId: string,
    newSpotId: string,
    newSpotName: string
  ): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      spotId: newSpotId,
      spotName: newSpotName,
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      notes: arrayUnion(`Verplaatst naar ${newSpotName}`),
    });
  },

  /**
   * Link a catch to a session.
   */
  async linkCatchToSession(catchId: string, sessionId: string, spotId?: string): Promise<void> {
    const catchRef = doc(db, COLLECTIONS.CATCHES, catchId);

    await updateDoc(catchRef, {
      sessionId,
      ...(spotId ? { spotId } : {}),
    });

    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
    const updateData: Record<string, any> = {
      linkedCatchIds: arrayUnion(catchId),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    };

    if (spotId) {
      updateData.spotId = spotId;
    }

    await updateDoc(sessionRef, updateData);
  },

  /**
   * Add a note to session.
   */
  async addSessionNote(sessionId: string, note: string): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      notes: arrayUnion(note),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  /**
   * Pause active session.
   */
  async pauseSession(sessionId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(docRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  /**
   * Resume paused session.
   */
  async resumeSession(sessionId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(docRef, {
      isActive: true,
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  /**
   * Smart suggestions based on recent catches_v2.
   */
  async getSmartSuggestions(userId: string) {
    const q = query(
      collection(db, COLLECTIONS.CATCHES),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const history = snapshot.docs.map((d) => d.data() as Catch);

    if (history.length === 0) {
      return {
        species: ['Snoekbaars', 'Baars', 'Snoek'],
        spots: [],
        baits: ['Boilie', 'Shad', 'Plug'],
        techniques: ['Werpend', 'Verticalen', 'Statisch'],
      };
    }

    const species = this.getTopN(
      history
        .map((h: any) => h.speciesGeneral || h.species)
        .filter(Boolean),
      3
    );

    const spots = this.getTopN(
      history
        .map((h: any) => h.spotId || h.spotName)
        .filter(Boolean),
      3
    );

    const baits = this.getTopN(
      history
        .map((h: any) => h.baitSpecific || h.baitGeneral)
        .filter(Boolean),
      3
    );

    const techniques = this.getTopN(
      history
        .map((h: any) => h.techniqueId || h.technique || h.method)
        .filter(Boolean),
      3
    );

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
  },
};