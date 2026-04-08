import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import {
  GearUserLike,
  GearUserSave,
  GearUserShare,
  GearProductSnapshot,
} from '../../../types';

/**
 * Gear Interaction Service — Gear Feature V2
 *
 * Manages user interactions with catalog products:
 * - Likes    → gear_user_likes/{userId}_{productId}
 * - Saves    → gear_user_saves/{userId}_{productId}   (wishlist)
 * - Shares   → gear_user_shares/{auto-id}
 *
 * Doc ID strategy: deterministic keys for likes/saves so we can:
 * - check existence without querying
 * - delete without querying for the ID
 * - avoid duplicate interactions
 *
 * All writes are low-cost (single doc set/delete).
 * Batch loading uses a single getDocs per tab open.
 */

function likeDocId(userId: string, productId: string) {
  return `${userId}_${productId}`;
}

function saveDocId(userId: string, productId: string) {
  return `${userId}_${productId}`;
}

export const gearInteractionService = {
  // ─── Likes ────────────────────────────────────────────────────────────────

  async likeProduct(userId: string, productId: string): Promise<void> {
    const docId = likeDocId(userId, productId);
    await setDoc(doc(db, 'gear_user_likes', docId), {
      userId,
      productId,
      createdAt: serverTimestamp(),
    } as Omit<GearUserLike, 'id'>);
  },

  async unlikeProduct(userId: string, productId: string): Promise<void> {
    await deleteDoc(doc(db, 'gear_user_likes', likeDocId(userId, productId)));
  },

  async getUserLikedProductIds(userId: string): Promise<Set<string>> {
    const q = query(
      collection(db, 'gear_user_likes'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return new Set(snap.docs.map((d) => d.data().productId as string));
  },

  // ─── Saves / Wishlist ─────────────────────────────────────────────────────

  async saveToWishlist(
    userId: string,
    productId: string,
    snapshot: GearProductSnapshot,
    sourceContext?: string
  ): Promise<void> {
    const docId = saveDocId(userId, productId);
    await setDoc(doc(db, 'gear_user_saves', docId), {
      userId,
      productId,
      saveType: 'wishlist',
      sourceContext: sourceContext ?? 'discover',
      productSnapshot: snapshot,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as Omit<GearUserSave, 'id'>);
  },

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    await deleteDoc(doc(db, 'gear_user_saves', saveDocId(userId, productId)));
  },

  async getUserSavedProductIds(userId: string): Promise<Set<string>> {
    const q = query(
      collection(db, 'gear_user_saves'),
      where('userId', '==', userId),
      where('saveType', '==', 'wishlist')
    );
    const snap = await getDocs(q);
    return new Set(snap.docs.map((d) => d.data().productId as string));
  },

  async getUserWishlist(userId: string): Promise<GearUserSave[]> {
    const q = query(
      collection(db, 'gear_user_saves'),
      where('userId', '==', userId),
      where('saveType', '==', 'wishlist'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GearUserSave));
  },

  // ─── Shares ───────────────────────────────────────────────────────────────

  async recordShare(
    userId: string | undefined,
    productId: string,
    channel: string,
    sourceScreen?: string
  ): Promise<void> {
    await addDoc(collection(db, 'gear_user_shares'), {
      userId: userId ?? null,
      productId,
      channel,
      sourceScreen: sourceScreen ?? 'discover',
      createdAt: serverTimestamp(),
    } as Omit<GearUserShare, 'id'>);
  },
};
