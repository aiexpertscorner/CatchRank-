/**
 * catchDataRepair.ts
 *
 * Runtime fire-and-forget utility for CatchDetail.
 * Silently patches migrated catch documents with missing derived fields:
 *   - spotName: if spotId present but spotName empty, fetch from spots_v2 and patch
 *   - sessionId: if sessionId present but the session no longer exists, clear the link
 *
 * Never throws — all errors are silently swallowed to avoid UI impact.
 * Call after catch data is loaded in CatchDetail (fire-and-forget).
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface RepairableCatch {
  id: string;
  spotId?: string;
  spotName?: string;
  sessionId?: string;
}

export async function repairCatchData(catchDoc: RepairableCatch): Promise<void> {
  const patches: Record<string, unknown> = {};

  try {
    // Patch 1: spotName missing but spotId present → fetch spot and fill spotName
    if (catchDoc.spotId && !catchDoc.spotName) {
      try {
        const spotSnap = await getDoc(doc(db, 'spots_v2', catchDoc.spotId));
        if (spotSnap.exists()) {
          const spotName =
            (spotSnap.data() as Record<string, unknown>).name as string | undefined;
          if (spotName) {
            patches.spotName = spotName;
          }
        }
      } catch {
        // spot fetch failed — skip this patch
      }
    }

    // Patch 2: sessionId present but session no longer exists → clear stale link
    if (catchDoc.sessionId) {
      try {
        const sessionSnap = await getDoc(doc(db, 'sessions_v2', catchDoc.sessionId));
        if (!sessionSnap.exists()) {
          patches.sessionId = null;
        }
      } catch {
        // session check failed — skip this patch
      }
    }

    // Apply patches if any
    if (Object.keys(patches).length > 0) {
      await updateDoc(doc(db, 'catches_v2', catchDoc.id), patches);
    }
  } catch {
    // Outer guard: silently swallow any unexpected error
  }
}
