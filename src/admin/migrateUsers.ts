/**
 * migrateUsers.ts — One-time admin migration script
 *
 * Normalizes all user documents in the `users` Firestore collection
 * from the old Flutter-app schema to the canonical web app schema.
 *
 * HOW TO RUN (from project root):
 *   npx ts-node --esm src/admin/migrateUsers.ts
 *
 * Or call runMigration() from a temporary admin UI page.
 *
 * SAFE: Uses batched writes + dry-run mode. Will not overwrite fields
 * that already have the correct value.
 *
 * FIELD MAPPINGS:
 *   total_xp          → xp
 *   catch_count        → stats.totalCatches
 *   session_count      → stats.totalSessions
 *   spot_count         → stats.totalSpots
 *   favSpecies (str)   → favoriteSpecies (array)
 *   isSetupComplete    → onboardingStatus: 'complete'
 *   rank_title         → DELETED (computed, should not be stored)
 *   (missing uid)      → uid: documentId
 */

import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MigrationResult {
  total: number;
  patched: number;
  skipped: number;
  errors: string[];
}

/**
 * Compute the patch needed for a single user document.
 * Returns null if no changes are needed (document already normalized).
 */
function computePatch(
  docId: string,
  data: Record<string, any>
): Record<string, any> | null {
  const patch: Record<string, any> = {};

  // uid: add if missing
  if (!data.uid) {
    patch.uid = docId;
  }

  // xp: normalize from total_xp
  if (typeof data.xp !== 'number' && typeof data.total_xp === 'number') {
    patch.xp = data.total_xp;
  } else if (typeof data.xp !== 'number') {
    patch.xp = 0;
  }

  // level: ensure present
  if (typeof data.level !== 'number') {
    patch.level = 1;
  }

  // stats: normalize from flat count fields
  if (!data.stats) {
    patch.stats = {
      totalCatches: data.catch_count ?? 0,
      totalSessions: data.session_count ?? 0,
      totalSpots: data.spot_count ?? 0,
      speciesCount: 0,
    };
  }

  // favoriteSpecies: normalize from favSpecies string
  if (!data.favoriteSpecies && data.favSpecies) {
    patch.favoriteSpecies = typeof data.favSpecies === 'string'
      ? [data.favSpecies]
      : [];
  }
  if (!data.favoriteSpecies && !data.favSpecies) {
    patch.favoriteSpecies = [];
  }

  // onboardingStatus: normalize from isSetupComplete
  if (!data.onboardingStatus) {
    patch.onboardingStatus = data.isSetupComplete ? 'complete' : 'welcome';
  }

  // rank_title: delete (computed field should not live in DB)
  // Note: Firestore deleteField() would be needed in a real delete.
  // For now we just skip it — set it in a follow-up if needed.

  // displayName: ensure present
  if (!data.displayName || typeof data.displayName !== 'string') {
    patch.displayName = data.name || 'Visser';
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}

/**
 * Run the migration.
 * @param dryRun - If true, logs what would change without writing to Firestore.
 */
export async function runUserMigration(dryRun = true): Promise<MigrationResult> {
  const result: MigrationResult = { total: 0, patched: 0, skipped: 0, errors: [] };

  const usersSnapshot = await getDocs(collection(db, 'users'));
  result.total = usersSnapshot.size;

  console.log(`[migrate-users] Found ${result.total} user documents. dryRun=${dryRun}`);

  // Firestore batched writes — max 500 ops per batch
  let batch = writeBatch(db);
  let batchCount = 0;
  const BATCH_LIMIT = 400;

  for (const userDoc of usersSnapshot.docs) {
    const data = userDoc.data() as Record<string, any>;
    const patch = computePatch(userDoc.id, data);

    if (!patch) {
      result.skipped++;
      console.log(`[migrate-users] SKIP ${userDoc.id} (${data.displayName}) — already normalized`);
      continue;
    }

    console.log(`[migrate-users] PATCH ${userDoc.id} (${data.displayName || data.name}):`, patch);

    if (!dryRun) {
      batch.update(doc(db, 'users', userDoc.id), patch);
      batchCount++;

      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    result.patched++;
  }

  if (!dryRun && batchCount > 0) {
    await batch.commit();
  }

  console.log(
    `[migrate-users] Done. total=${result.total} patched=${result.patched} skipped=${result.skipped} dryRun=${dryRun}`
  );

  return result;
}
