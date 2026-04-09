import {
  collection,
  addDoc,
  setDoc,
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
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Catch, Session, Spot, UserProfile } from '../../../types';
import { xpService, getSpeciesXpBonus } from '../../../services/xpService';
import { bustStatsCache } from '../../../services/statsService';

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
    data.location?.lat
  );
  const longitude = firstDefined(
    (data as any).longitude,
    (data as any).lng,
    data.location?.lng
  );

  return { latitude, longitude };
};

const mapCatchImage = (data: Partial<Catch>) =>
  firstDefined(
    (data as any).mainImage,
    data.photoURL,
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
      data.speciesGeneral,
      data.species,
      (data as any).speciesType
    )
  );

const mapCatchSpeciesSpecific = (data: Partial<Catch>) =>
  normalizeString(
    firstDefined(
      data.speciesSpecific,
      (data as any).speciesSubType,
      (data as any).speciesDetail
    )
  );

const mapCatchBaitGeneral = (data: Partial<Catch>) =>
  normalizeString(firstDefined(data.baitGeneral, (data as any).baitType, data.bait));

const mapCatchBaitSpecific = (data: Partial<Catch>) =>
  normalizeString(firstDefined(data.baitSpecific, (data as any).baitName, data.bait));

const mapSpotLatLng = (data: Partial<Spot>) => {
  const lat = firstDefined(
    data.lat,
    data.latitude,
    data.coordinates?.lat
  );
  const lng = firstDefined(
    data.lng,
    data.longitude,
    data.coordinates?.lng
  );
  return { lat, lng };
};

export const loggingService = {
  /**
   * Save a quick catch with a pre-generated ID.
   *
   * @param userId     — authenticated user ID
   * @param catchId    — pre-generated UUID (used as Firestore doc ID and Storage path)
   * @param mainImage  — already-uploaded Firebase Storage URL, or undefined if no photo
   * @param speciesGeneral — optional species already selected in quick-form
   * @param spotId     — optional spot link
   * @param location   — optional GPS coordinates (from navigator.geolocation)
   */
  async quickCatch(
    userId: string,
    catchId: string,
    mainImage?: string,
    speciesGeneral?: string,
    spotId?: string,
    location?: LatLng
  ): Promise<string> {
    const xpEarned = 10;

    const incompleteFields = [
      !speciesGeneral ? 'speciesGeneral' : '',
      'weight',
      'length',
      !spotId ? 'spotId' : '',
      !mainImage ? 'mainImage' : '',
    ].filter(Boolean);

    const catchData: Record<string, any> = {
      id: catchId,
      userId,
      mainImage: mainImage || null,
      photoURL: mainImage || null,
      extraImages: [],
      speciesGeneral: speciesGeneral || null,
      species: speciesGeneral || null,
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
      location: location ? { lat: location.lat, lng: location.lng } : null,
      spotId: spotId || null,
      timestamp: serverTimestamp(),
      catchTime: null,
      status: 'draft',
      incompleteFields,
      xpEarned,
      schemaVersion: 2,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Remove explicit nulls so Firestore fields stay clean
    Object.keys(catchData).forEach((key) => {
      if (catchData[key] === null) delete catchData[key];
    });

    await setDoc(doc(db, COLLECTIONS.CATCHES, catchId), catchData);

    xpService.addXpToUser(userId, xpEarned).catch((err) =>
      console.error('XP award failed (quickCatch):', err)
    );

    return catchId;
  },

  /**
   * Create a catch. If data.id is provided it is used as the Firestore document ID
   * (required when a photo was pre-uploaded to Storage using that ID as the entity ID).
   * Otherwise a new UUID is generated client-side.
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
      data.status || (incompleteFields.length === 0 ? 'complete' : 'draft');

    const catchData: Record<string, any> = {
      userId,
      timestamp: timestampValue,
      catchTime: firstDefined((data as any).catchTime, timestampValue),
      status,
      incompleteFields,
      xpEarned,

      mainImage,
      photoURL: mainImage,
      extraImages,

      latitude,
      longitude,
      location:
        latitude !== undefined && longitude !== undefined
          ? { lat: latitude, lng: longitude }
          : undefined,

      city: normalizeString((data as any).city),
      notes: normalizeString(data.notes),
      moonPhase: normalizeString((data as any).moonPhase),

      weatherSnapshot: firstDefined(data.weatherSnapshot, data.weather),
      weather: firstDefined(data.weather, data.weatherSnapshot),

      water: data.water,

      weight: data.weight,
      length: data.length,

      spotId: normalizeString(data.spotId),
      spotName: normalizeString(data.spotName),
      sessionId: normalizeString(data.sessionId),

      speciesGeneral,
      speciesSpecific,
      species: speciesGeneral || '',
      speciesId: data.speciesId,

      baitGeneral,
      baitSpecific,
      bait: baitSpecific || baitGeneral,
      baitId: data.baitId,

      technique: normalizeString(data.technique),
      techniqueId: normalizeString(data.techniqueId),

      gearSetupId: normalizeString((data.gear as any)?.setupId || data.gearSetupId),
      gearIds: dedupeStrings([
        data.gearSetupId,
        ...(data.gearIds || []),
        data.gear?.rodId,
        data.gear?.reelId,
        data.gear?.lineId,
        data.gear?.leaderId,
        data.gear?.lureId,
      ]),
      gear: data.gear,

      isPrivate: data.isPrivate ?? false,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      schemaVersion: 2,
    };

    Object.keys(catchData).forEach((key) => {
      if (catchData[key] === undefined) delete catchData[key];
    });

    // Use a pre-generated ID if provided (photo was already uploaded to Storage under this ID)
    // Otherwise generate one client-side so no second write is needed for the `id` field.
    const catchId = (data as any).id || crypto.randomUUID();
    catchData.id = catchId;

    await setDoc(doc(db, COLLECTIONS.CATCHES, catchId), catchData);

    if (status === 'complete' && xpEarned > 0) {
      xpService.addXpToUser(userId, xpEarned).catch((err) =>
        console.error('XP award failed (createCatch):', err)
      );
      bustStatsCache(userId);
    }

    return catchId;
  },

  async updateCatch(catchId: string, data: Partial<Catch>, userId?: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CATCHES, catchId);
    const incompleteFields = this.calculateIncompleteFields(data);
    const xpEarned = this.calculateXP(data);
    const newStatus =
      data.status || (incompleteFields.length === 0 ? 'complete' : 'draft');

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
      updatedAt: serverTimestamp(),

      ...(mainImage !== undefined ? { mainImage, photoURL: mainImage } : {}),
      ...(extraImages !== undefined ? { extraImages } : {}),

      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
      ...(latitude !== undefined && longitude !== undefined
        ? { location: { lat: latitude, lng: longitude } }
        : {}),

      ...(normalizeString((data as any).city) !== undefined
        ? { city: normalizeString((data as any).city) }
        : {}),
      ...(normalizeString(data.notes) !== undefined
        ? { notes: normalizeString(data.notes) }
        : {}),
      ...(normalizeString((data as any).moonPhase) !== undefined
        ? { moonPhase: normalizeString((data as any).moonPhase) }
        : {}),

      ...(data.weather !== undefined || data.weatherSnapshot !== undefined
        ? {
            weather: firstDefined(data.weather, data.weatherSnapshot),
            weatherSnapshot: firstDefined(data.weatherSnapshot, data.weather),
          }
        : {}),

      ...(data.water !== undefined ? { water: data.water } : {}),

      ...(data.weight !== undefined ? { weight: data.weight } : {}),
      ...(data.length !== undefined ? { length: data.length } : {}),

      ...(normalizeString(data.spotId) !== undefined ? { spotId: normalizeString(data.spotId) } : {}),
      ...(normalizeString(data.spotName) !== undefined ? { spotName: normalizeString(data.spotName) } : {}),
      ...(normalizeString(data.sessionId) !== undefined ? { sessionId: normalizeString(data.sessionId) } : {}),

      ...(speciesGeneral !== undefined ? { speciesGeneral, species: speciesGeneral } : {}),
      ...(speciesSpecific !== undefined ? { speciesSpecific } : {}),
      ...(data.speciesId !== undefined ? { speciesId: data.speciesId } : {}),

      ...(baitGeneral !== undefined ? { baitGeneral } : {}),
      ...(baitSpecific !== undefined ? { baitSpecific, bait: baitSpecific } : {}),
      ...(normalizeString(data.baitId) !== undefined ? { baitId: normalizeString(data.baitId) } : {}),

      ...(normalizeString(data.technique) !== undefined ? { technique: normalizeString(data.technique) } : {}),
      ...(normalizeString(data.techniqueId) !== undefined ? { techniqueId: normalizeString(data.techniqueId) } : {}),

      ...(data.gear !== undefined ? { gear: data.gear } : {}),
      ...(data.gearIds !== undefined ? { gearIds: data.gearIds } : {}),
      ...(data.gearSetupId !== undefined ? { gearSetupId: data.gearSetupId } : {}),

      ...(data.isPrivate !== undefined ? { isPrivate: data.isPrivate } : {}),
    };

    await updateDoc(docRef, updateData);

    if (userId && newStatus === 'complete' && !wasAlreadyComplete && xpEarned > 0) {
      xpService.addXpToUser(userId, xpEarned).catch((err) =>
        console.error('XP award failed (updateCatch):', err)
      );
      bustStatsCache(userId);
    }
  },

  async createSpot(userId: string, data: Partial<Spot>): Promise<string> {
    const { lat, lng } = mapSpotLatLng(data);
    const title = normalizeString(firstDefined(data.title, data.name));

    const spotData: Record<string, any> = {
      title,
      name: title,
      description: normalizeString(data.description),

      lat,
      lng,
      latitude: lat,
      longitude: lng,
      coordinates: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,

      city: normalizeString((data as any).city),
      province: normalizeString((data as any).province),

      privacy: normalizeString(firstDefined(data.privacy, data.visibility, 'private')),
      visibility: normalizeString(firstDefined(data.visibility, data.privacy, 'private')),

      targetSpecies: (data as any).targetSpecies || [],
      species: (data as any).species || (data as any).targetSpecies || [],
      techniques: data.techniques || [],
      amenities: data.amenities || [],

      bottomType: normalizeString(firstDefined((data as any).bottomType, (data as any).bottom_type)),
      waterType: normalizeString(firstDefined(data.waterType, (data as any).water_type)),
      waterSize: normalizeString(firstDefined((data as any).waterSize, (data as any).water_size)),
      spotSize: normalizeString(firstDefined((data as any).spotSize, (data as any).spot_size)),
      radius: firstDefined((data as any).radius, undefined),

      nightFishingAllowed: firstDefined(
        (data as any).nightFishingAllowed,
        (data as any).night_fishing_allowed,
        false
      ),

      mainImage: firstDefined((data as any).mainImage, data.mainPhotoURL),
      mainPhotoURL: firstDefined(data.mainPhotoURL, (data as any).mainImage),
      extraImages: firstDefined((data as any).extraImages, []) || [],
      photoURLs: firstDefined(data.photoURLs, (data as any).extraImages, []) || [],

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      userId,
      schemaVersion: 2,
    };

    Object.keys(spotData).forEach((key) => {
      if (spotData[key] === undefined) delete spotData[key];
    });

    const spotId = (data as any).id || crypto.randomUUID();
    await setDoc(doc(db, COLLECTIONS.SPOTS, spotId), { ...spotData, id: spotId });
    return spotId;
  },

  async updateSpot(spotId: string, data: Partial<Spot>): Promise<void> {
    const { lat, lng } = mapSpotLatLng(data);

    const updateData: Record<string, any> = {
      ...(normalizeString(firstDefined(data.title, data.name)) !== undefined
        ? {
            title: normalizeString(firstDefined(data.title, data.name)),
            name: normalizeString(firstDefined(data.title, data.name)),
          }
        : {}),
      ...(normalizeString(data.description) !== undefined
        ? { description: normalizeString(data.description) }
        : {}),

      ...(lat !== undefined ? { lat, latitude: lat } : {}),
      ...(lng !== undefined ? { lng, longitude: lng } : {}),
      ...(lat !== undefined && lng !== undefined ? { coordinates: { lat, lng } } : {}),

      ...(normalizeString((data as any).city) !== undefined ? { city: normalizeString((data as any).city) } : {}),
      ...(normalizeString((data as any).province) !== undefined ? { province: normalizeString((data as any).province) } : {}),

      ...(normalizeString(firstDefined(data.privacy, data.visibility)) !== undefined
        ? {
            privacy: normalizeString(firstDefined(data.privacy, data.visibility)),
            visibility: normalizeString(firstDefined(data.visibility, data.privacy)),
          }
        : {}),

      ...(data.targetSpecies !== undefined ? { targetSpecies: data.targetSpecies, species: data.targetSpecies } : {}),
      ...(data.techniques !== undefined ? { techniques: data.techniques } : {}),
      ...(data.amenities !== undefined ? { amenities: data.amenities } : {}),

      ...(normalizeString(firstDefined((data as any).bottomType, (data as any).bottom_type)) !== undefined
        ? { bottomType: normalizeString(firstDefined((data as any).bottomType, (data as any).bottom_type)) }
        : {}),
      ...(normalizeString(firstDefined(data.waterType, (data as any).water_type)) !== undefined
        ? { waterType: normalizeString(firstDefined(data.waterType, (data as any).water_type)) }
        : {}),
      ...(normalizeString(firstDefined((data as any).waterSize, (data as any).water_size)) !== undefined
        ? { waterSize: normalizeString(firstDefined((data as any).waterSize, (data as any).water_size)) }
        : {}),
      ...(normalizeString(firstDefined((data as any).spotSize, (data as any).spot_size)) !== undefined
        ? { spotSize: normalizeString(firstDefined((data as any).spotSize, (data as any).spot_size)) }
        : {}),
      ...((data as any).nightFishingAllowed !== undefined
        ? { nightFishingAllowed: (data as any).nightFishingAllowed }
        : {}),
      ...((data as any).radius !== undefined ? { radius: (data as any).radius } : {}),

      ...(firstDefined((data as any).mainImage, data.mainPhotoURL) !== undefined
        ? {
            mainImage: firstDefined((data as any).mainImage, data.mainPhotoURL),
            mainPhotoURL: firstDefined(data.mainPhotoURL, (data as any).mainImage),
          }
        : {}),
      ...(data.extraImages !== undefined ? { extraImages: data.extraImages } : {}),

      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, COLLECTIONS.SPOTS, spotId), updateData);
  },

  calculateXP(data: Partial<Catch>): number {
    let xp = 25;

    const speciesGeneral = mapCatchSpeciesGeneral(data);
    if (speciesGeneral) xp += getSpeciesXpBonus(speciesGeneral);

    if (data.length && data.length > 50) xp += 15;
    if (data.weight && data.weight > 2000) xp += 20;
    if (mapCatchImage(data)) xp += 10;
    if (data.weather || data.weatherSnapshot) xp += 5;
    if (data.notes && String(data.notes).length > 20) xp += 5;

    return xp;
  },

  calculateIncompleteFields(data: Partial<Catch>): string[] {
    const requiredChecks = [
      { key: 'speciesGeneral', value: mapCatchSpeciesGeneral(data) },
      { key: 'weight', value: data.weight },
      { key: 'length', value: data.length },
      { key: 'spotId', value: data.spotId },
      { key: 'mainImage', value: mapCatchImage(data) },
    ];

    return requiredChecks.filter((item) => !item.value).map((item) => item.key);
  },

  async createSession(userId: string, data: Partial<Session>): Promise<string> {
    const participantIds = dedupeStrings([
      userId,
      ...(data.participantIds || data.participantUserIds || []),
    ]);

    const startTime = data.startTime || data.startedAt || serverTimestamp();
    const endTime = data.endTime || data.endedAt || undefined;

    const isActive =
      firstDefined(data.isActive, data.status === 'live', data.mode === 'live', false) === true;

    const type = normalizeString(firstDefined(data.type, data.mode, 'retro')) as 'live' | 'retro' | undefined;
    const name = normalizeString(firstDefined(data.name, data.title));

    const sessionData: Record<string, any> = {
      userId,
      createdBy: userId,
      ownerUserId: userId,

      participantIds,
      participantUserIds: participantIds,
      invitedUserIds: data.invitedUserIds || [],
      acceptedUserIds: data.acceptedUserIds || [],
      pendingUserIds: data.pendingUserIds || [],

      spotId: normalizeString(firstDefined(data.spotId, data.activeSpotId)),
      activeSpotId: normalizeString(firstDefined(data.activeSpotId, data.spotId)),
      spotName: normalizeString((data as any).spotName),

      name,
      title: name,
      description: normalizeString(data.description),
      notes: data.notes,
      sessionType: normalizeString(data.sessionType),

      type,
      mode: (type === 'live' ? 'live' : 'retro'),
      status: data.status || (isActive ? 'live' : 'completed'),

      startTime,
      startedAt: startTime,
      endTime,
      endedAt: endTime,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),

      isActive,
      visibility: data.visibility || 'private',

      linkedSpotIds: data.linkedSpotIds || [],
      spotTimeline: data.spotTimeline || [],
      linkedCatchIds: data.linkedCatchIds || [],
      linkedSetupIds: data.linkedSetupIds || [],
      linkedGearIds: data.linkedGearIds || [],
      linkedProductIds: data.linkedProductIds || [],

      stats: data.stats || data.statsSummary || {},
      statsSummary: data.statsSummary || data.stats || {},
      weatherStart: firstDefined((data as any).weatherStart, data.weatherSnapshotStart),
      weatherSnapshotStart: firstDefined(data.weatherSnapshotStart, (data as any).weatherStart),

      acceptanceStateByUser: data.acceptanceStateByUser || {},

      canonical: firstDefined((data as any).canonical, true),
      schemaVersion: 2,
    };

    Object.keys(sessionData).forEach((key) => {
      if (sessionData[key] === undefined) delete sessionData[key];
    });

    // Use pre-generated ID if provided (photo was already uploaded to Storage under this ID)
    const sessionId = (data as any).id || crypto.randomUUID();
    sessionData.id = sessionId;

    await setDoc(doc(db, COLLECTIONS.SESSIONS, sessionId), sessionData);
    return sessionId;
  },

  async searchUsers(searchTerm: string): Promise<UserProfile[]> {
    if (!searchTerm || searchTerm.length < 2) return [];

    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data() } as UserProfile));
  },

  async inviteParticipant(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      invitedUserIds: arrayUnion(userId),
      pendingUserIds: arrayUnion(userId),
      acceptanceStateByUser: {
        [userId]: 'pending',
      },
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  async acceptInvitation(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      participantIds: arrayUnion(userId),
      participantUserIds: arrayUnion(userId),
      acceptedUserIds: arrayUnion(userId),
      pendingUserIds: arrayRemove(userId),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  async declineInvitation(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      pendingUserIds: arrayRemove(userId),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  async getSession(sessionId: string): Promise<Session | null> {
    const docRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Session;
    }

    return null;
  },

  async startSession(userId: string, data: Partial<Session>): Promise<string> {
    return this.createSession(userId, {
      ...data,
      type: 'live',
      mode: 'live',
      status: 'live',
      isActive: true,
      startTime: data.startTime || serverTimestamp(),
    });
  },

  async endSession(sessionId: string, notes?: string, stats?: any): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    const sessionSnap = await getDoc(docRef);
    const sessionData = sessionSnap.data() || {};
    const ownerUserId: string | undefined = sessionData.userId || sessionData.createdBy || sessionData.ownerUserId;

    await updateDoc(docRef, {
      endTime: serverTimestamp(),
      endedAt: serverTimestamp(),
      ...(notes !== undefined ? { notes } : {}),
      ...(stats !== undefined ? { stats, statsSummary: stats } : {}),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      isActive: false,
      status: 'completed',
    });

    if (ownerUserId) {
      const SESSION_COMPLETION_XP = 50;
      xpService.addXpToUser(ownerUserId, SESSION_COMPLETION_XP).catch((err) =>
        console.error('XP award failed (endSession):', err)
      );
      bustStatsCache(ownerUserId);
    }
  },

  async switchSessionSpot(sessionId: string, newSpotId: string, newSpotName: string): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      spotId: newSpotId,
      activeSpotId: newSpotId,
      spotName: newSpotName,
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  async linkCatchToSession(catchId: string, sessionId: string, spotId?: string): Promise<void> {
    const catchRef = doc(db, COLLECTIONS.CATCHES, catchId);

    await updateDoc(catchRef, {
      sessionId,
      ...(spotId ? { spotId } : {}),
      updatedAt: serverTimestamp(),
    });

    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
    const updateData: Record<string, any> = {
      linkedCatchIds: arrayUnion(catchId),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    };

    if (spotId) {
      updateData.spotId = spotId;
      updateData.activeSpotId = spotId;
    }

    await updateDoc(sessionRef, updateData);
  },

  async addSessionNote(sessionId: string, note: string): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      notes: arrayUnion(note),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  async pauseSession(sessionId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(docRef, {
      isActive: false,
      status: 'paused',
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

  async resumeSession(sessionId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(docRef, {
      isActive: true,
      status: 'live',
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  },

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
      history.map((h: any) => h.speciesGeneral || h.species).filter(Boolean),
      3
    );

    const spots = this.getTopN(
      history.map((h: any) => h.spotName || h.spotId).filter(Boolean),
      3
    );

    const baits = this.getTopN(
      history.map((h: any) => h.baitSpecific || h.baitGeneral || h.bait).filter(Boolean),
      3
    );

    const techniques = this.getTopN(
      history.map((h: any) => h.technique || h.techniqueId || h.method).filter(Boolean),
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