/**
 * migrateCollections.ts — One-time admin migration script
 *
 * Normalizes catches_v2, sessions_v2, and spots_v2 documents from the
 * old Flutter-app schema to the canonical web app v2 schema.
 *
 * HOW TO RUN:
 *   Import and call from a temporary admin UI page, or from migrateAll().
 *
 * SAFE: Uses batched writes + dry-run mode (default).
 *   Will only patch fields that are missing or in the old format.
 *   Will not overwrite fields that already have the correct value.
 *
 * ============================================================
 * CATCHES_V2 FIELD MAPPINGS
 * ============================================================
 *   photoURL / image / imageUrl    → mainImage
 *   extra_images / images          → extraImages
 *   species / speciesType          → speciesGeneral
 *   bait (string)                  → baitGeneral
 *   lat / lng / location.lat/lng   → latitude / longitude
 *   (missing status)               → 'draft'
 *   (missing schemaVersion)        → 2
 *   (missing userId)               → ownerUserId || ''
 *
 * ============================================================
 * SESSIONS_V2 FIELD MAPPINGS
 * ============================================================
 *   ownerUserId                    → userId + createdBy
 *   title                          → name
 *   startedAt                      → startTime
 *   endedAt                        → endTime
 *   participantUserIds             → participantIds
 *   type (string)                  → mode
 *   (missing status)               → 'completed'
 *   (missing isActive)             → false
 *   (missing schemaVersion)        → 2
 *
 * ============================================================
 * SPOTS_V2 FIELD MAPPINGS
 * ============================================================
 *   name                           → title (and vice versa)
 *   createdBy                      → userId (and vice versa)
 *   coordinates.lat/lng            → lat + lng + latitude + longitude
 *   lat/lng                        → latitude + longitude + coordinates
 *   mainPhotoURL                   → mainImage (and vice versa)
 *   privacy                        → visibility (and vice versa)
 *   water_type                     → waterType
 *   bottom_type                    → bottomType
 *   night_fishing_allowed          → nightFishingAllowed
 *   spot_size                      → spotSize
 *   water_size                     → waterSize
 *   (missing schemaVersion)        → 2
 */

import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const BATCH_LIMIT = 400;

export interface CollectionMigrationResult {
  collection: string;
  total: number;
  patched: number;
  skipped: number;
  errors: string[];
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                       */
/* ------------------------------------------------------------------ */

function firstDefined<T>(...values: (T | undefined | null)[]): T | undefined {
  for (const v of values) {
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

function normalizeString(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = String(value).trim();
  return v.length ? v : undefined;
}

/* ------------------------------------------------------------------ */
/* catches_v2 patch                                                    */
/* ------------------------------------------------------------------ */

function computeCatchPatch(
  data: Record<string, any>
): Record<string, any> | null {
  const patch: Record<string, any> = {};

  // schemaVersion
  if (!data.schemaVersion) {
    patch.schemaVersion = 2;
  }

  // userId
  if (!data.userId) {
    patch.userId = data.ownerUserId || '';
  }

  // status
  if (!data.status) {
    patch.status = 'draft';
  }

  // mainImage — normalize from legacy single-image fields
  if (!data.mainImage) {
    const legacy = firstDefined(data.photoURL, data.image, data.imageUrl);
    if (legacy) {
      patch.mainImage = legacy;
    }
  }

  // photoURL — keep in sync for read compatibility
  if (!data.photoURL && data.mainImage) {
    patch.photoURL = data.mainImage;
  }
  if (!data.photoURL && patch.mainImage) {
    patch.photoURL = patch.mainImage;
  }

  // extraImages — normalize from Flutter flat array fields
  if (!data.extraImages || !Array.isArray(data.extraImages)) {
    const legacy = firstDefined<string[]>(data.extra_images, data.images);
    patch.extraImages = Array.isArray(legacy) ? legacy : [];
  }

  // speciesGeneral — normalize from Flutter flat species field
  if (!data.speciesGeneral) {
    const legacy = normalizeString(firstDefined(data.species, data.speciesType));
    if (legacy) {
      patch.speciesGeneral = legacy;
    }
  }

  // baitGeneral — normalize from Flutter flat bait field
  if (!data.baitGeneral && !data.baitSpecific) {
    const legacy = normalizeString(data.bait);
    if (legacy) {
      patch.baitGeneral = legacy;
    }
  }

  // latitude / longitude — normalize from Flutter lat/lng or nested location
  if (data.latitude === undefined || data.latitude === null) {
    const lat = firstDefined(data.lat, data.location?.lat);
    if (lat !== undefined) patch.latitude = lat;
  }
  if (data.longitude === undefined || data.longitude === null) {
    const lng = firstDefined(data.lng, data.location?.lng);
    if (lng !== undefined) patch.longitude = lng;
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}

/* ------------------------------------------------------------------ */
/* sessions_v2 patch                                                   */
/* ------------------------------------------------------------------ */

function computeSessionPatch(
  data: Record<string, any>
): Record<string, any> | null {
  const patch: Record<string, any> = {};

  // schemaVersion
  if (!data.schemaVersion) {
    patch.schemaVersion = 2;
  }

  // userId — normalize from ownerUserId or createdBy
  if (!data.userId) {
    const legacy = firstDefined(data.ownerUserId, data.createdBy);
    if (legacy) patch.userId = legacy;
  }

  // createdBy — keep in sync
  if (!data.createdBy) {
    const source = firstDefined(data.userId, data.ownerUserId);
    if (source) patch.createdBy = source;
  }

  // name — normalize from title
  if (!data.name && data.title) {
    patch.name = data.title;
  }

  // title — keep in sync
  if (!data.title && data.name) {
    patch.title = data.name;
  }

  // startTime — normalize from startedAt
  if (!data.startTime && data.startedAt) {
    patch.startTime = data.startedAt;
  }

  // endTime — normalize from endedAt
  if (!data.endTime && data.endedAt) {
    patch.endTime = data.endedAt;
  }

  // participantIds — normalize from participantUserIds
  if (
    (!data.participantIds || !Array.isArray(data.participantIds) || data.participantIds.length === 0) &&
    Array.isArray(data.participantUserIds) &&
    data.participantUserIds.length > 0
  ) {
    patch.participantIds = data.participantUserIds;
  }

  // Ensure owner is in participantIds
  const ownerId = firstDefined(data.userId, data.createdBy, data.ownerUserId, patch.userId);
  const currentParticipantIds: string[] = patch.participantIds || data.participantIds || [];
  if (ownerId && !currentParticipantIds.includes(ownerId)) {
    patch.participantIds = [ownerId, ...currentParticipantIds];
  }

  // mode — normalize from type
  if (!data.mode) {
    patch.mode = normalizeString(data.type) || 'retro';
  }

  // status — add if missing
  if (!data.status) {
    patch.status = data.isActive === true ? 'live' : 'completed';
  }

  // isActive — add if missing
  if (data.isActive === undefined || data.isActive === null) {
    patch.isActive = data.status === 'live';
  }

  // pendingUserIds / invitedUserIds / acceptedUserIds — ensure arrays exist
  if (!Array.isArray(data.pendingUserIds)) {
    patch.pendingUserIds = [];
  }
  if (!Array.isArray(data.invitedUserIds)) {
    patch.invitedUserIds = [];
  }
  if (!Array.isArray(data.acceptedUserIds)) {
    patch.acceptedUserIds = [];
  }

  // linkedCatchIds — ensure array exists
  if (!Array.isArray(data.linkedCatchIds)) {
    patch.linkedCatchIds = [];
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}

/* ------------------------------------------------------------------ */
/* spots_v2 patch                                                      */
/* ------------------------------------------------------------------ */

function computeSpotPatch(
  data: Record<string, any>
): Record<string, any> | null {
  const patch: Record<string, any> = {};

  // schemaVersion
  if (!data.schemaVersion) {
    patch.schemaVersion = 2;
  }

  // userId — normalize from createdBy
  if (!data.userId && data.createdBy) {
    patch.userId = data.createdBy;
  }

  // createdBy — normalize from userId
  if (!data.createdBy && data.userId) {
    patch.createdBy = data.userId;
  }

  // title — normalize from name
  if (!data.title && data.name) {
    patch.title = data.name;
  }

  // name — normalize from title
  if (!data.name && data.title) {
    patch.name = data.title;
  }

  // lat/lng + latitude/longitude — normalize from all Flutter coordinate formats
  const lat = firstDefined(data.lat, data.latitude, data.coordinates?.lat);
  const lng = firstDefined(data.lng, data.longitude, data.coordinates?.lng);

  if (lat !== undefined) {
    if (data.lat === undefined) patch.lat = lat;
    if (data.latitude === undefined) patch.latitude = lat;
  }
  if (lng !== undefined) {
    if (data.lng === undefined) patch.lng = lng;
    if (data.longitude === undefined) patch.longitude = lng;
  }

  // coordinates — ensure nested object exists if we have lat/lng
  if (!data.coordinates && lat !== undefined && lng !== undefined) {
    patch.coordinates = { lat, lng };
  }

  // mainImage — normalize from mainPhotoURL
  if (!data.mainImage && data.mainPhotoURL) {
    patch.mainImage = data.mainPhotoURL;
  }

  // mainPhotoURL — normalize from mainImage
  if (!data.mainPhotoURL && data.mainImage) {
    patch.mainPhotoURL = data.mainImage;
  }

  // extraImages — ensure array
  if (!data.extraImages || !Array.isArray(data.extraImages)) {
    patch.extraImages = Array.isArray(data.photoURLs) ? data.photoURLs : [];
  }

  // photoURLs — keep in sync
  if (!data.photoURLs || !Array.isArray(data.photoURLs)) {
    const source = patch.extraImages || data.extraImages;
    patch.photoURLs = Array.isArray(source) ? source : [];
  }

  // visibility — normalize from privacy
  if (!data.visibility && data.privacy) {
    patch.visibility = data.privacy;
  }

  // privacy — normalize from visibility
  if (!data.privacy && data.visibility) {
    patch.privacy = data.visibility;
  }

  // waterType — normalize from water_type
  if (!data.waterType && data.water_type) {
    patch.waterType = data.water_type;
  }

  // bottomType — normalize from bottom_type
  if (!data.bottomType && data.bottom_type) {
    patch.bottomType = data.bottom_type;
  }

  // nightFishingAllowed — normalize from night_fishing_allowed
  if (data.nightFishingAllowed === undefined && data.night_fishing_allowed !== undefined) {
    patch.nightFishingAllowed = data.night_fishing_allowed;
  }

  // spotSize — normalize from spot_size
  if (!data.spotSize && data.spot_size) {
    patch.spotSize = data.spot_size;
  }

  // waterSize — normalize from water_size
  if (!data.waterSize && data.water_size) {
    patch.waterSize = data.water_size;
  }

  // targetSpecies — normalize from species array (Flutter stored as 'species')
  if (!data.targetSpecies && Array.isArray(data.species)) {
    patch.targetSpecies = data.species;
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}

/* ------------------------------------------------------------------ */
/* Generic migration runner                                            */
/* ------------------------------------------------------------------ */

async function migrateCollection(
  collectionName: string,
  computePatch: (data: Record<string, any>) => Record<string, any> | null,
  dryRun: boolean
): Promise<CollectionMigrationResult> {
  const result: CollectionMigrationResult = {
    collection: collectionName,
    total: 0,
    patched: 0,
    skipped: 0,
    errors: [],
  };

  let snapshot;
  try {
    snapshot = await getDocs(collection(db, collectionName));
  } catch (err: any) {
    result.errors.push(`getDocs failed: ${err.message}`);
    console.error(`[migrate] ${collectionName} getDocs failed:`, err);
    return result;
  }

  result.total = snapshot.size;
  console.log(
    `[migrate] ${collectionName}: ${result.total} docs — dryRun=${dryRun}`
  );

  let batch = writeBatch(db);
  let batchCount = 0;

  for (const document of snapshot.docs) {
    const data = document.data() as Record<string, any>;

    let patch: Record<string, any> | null = null;
    try {
      patch = computePatch(data);
    } catch (err: any) {
      result.errors.push(`${document.id}: computePatch error — ${err.message}`);
      continue;
    }

    if (!patch) {
      result.skipped++;
      continue;
    }

    const label = data.displayName || data.name || data.title || document.id;
    console.log(`[migrate] ${collectionName} PATCH ${document.id} (${label}):`, patch);

    if (!dryRun) {
      try {
        batch.update(doc(db, collectionName, document.id), patch);
        batchCount++;

        if (batchCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      } catch (err: any) {
        result.errors.push(`${document.id}: batch.update failed — ${err.message}`);
      }
    }

    result.patched++;
  }

  if (!dryRun && batchCount > 0) {
    try {
      await batch.commit();
    } catch (err: any) {
      result.errors.push(`Final batch commit failed: ${err.message}`);
    }
  }

  console.log(
    `[migrate] ${collectionName} done — total=${result.total} patched=${result.patched} skipped=${result.skipped} errors=${result.errors.length}`
  );

  return result;
}

/* ------------------------------------------------------------------ */
/* Public exports                                                      */
/* ------------------------------------------------------------------ */

export async function migrateCatches(dryRun = true): Promise<CollectionMigrationResult> {
  return migrateCollection('catches_v2', computeCatchPatch, dryRun);
}

export async function migrateSessions(dryRun = true): Promise<CollectionMigrationResult> {
  return migrateCollection('sessions_v2', computeSessionPatch, dryRun);
}

export async function migrateSpots(dryRun = true): Promise<CollectionMigrationResult> {
  return migrateCollection('spots_v2', computeSpotPatch, dryRun);
}

/**
 * Run all three collection migrations in sequence.
 * Always defaults to dryRun=true — pass false explicitly to write.
 */
export async function migrateAll(
  dryRun = true
): Promise<CollectionMigrationResult[]> {
  console.log(`\n[migrate] === Starting full migration — dryRun=${dryRun} ===\n`);

  const results: CollectionMigrationResult[] = [];

  results.push(await migrateCatches(dryRun));
  results.push(await migrateSessions(dryRun));
  results.push(await migrateSpots(dryRun));

  const totalPatched = results.reduce((sum, r) => sum + r.patched, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  console.log(`\n[migrate] === Done — totalPatched=${totalPatched} totalErrors=${totalErrors} dryRun=${dryRun} ===\n`);

  if (totalErrors > 0) {
    console.error('[migrate] Errors:');
    results.forEach((r) => r.errors.forEach((e) => console.error(`  [${r.collection}] ${e}`)));
  }

  return results;
}
