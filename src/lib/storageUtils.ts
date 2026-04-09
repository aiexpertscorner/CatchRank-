import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

export type UploadContext = 'catches' | 'spots' | 'sessions';
export type PhotoSlot = 'main' | `extra_${number}`;

/**
 * Uploads a File to Firebase Storage and returns the public download URL.
 *
 * Path convention:
 *   users/{userId}/{context}/{entityId}/{slot}.{ext}
 *
 * For new entities (not yet in Firestore), pass a pre-generated UUID as entityId
 * and use that same UUID as the Firestore document ID (setDoc, not addDoc).
 */
export async function uploadPhoto(
  userId: string,
  context: UploadContext,
  entityId: string,
  file: File,
  slot: PhotoSlot = 'main'
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `users/${userId}/${context}/${entityId}/${slot}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

/**
 * Deletes a photo from Firebase Storage by its download URL.
 * Safe to call even if the file does not exist.
 */
export async function deletePhoto(downloadUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, downloadUrl);
    await deleteObject(storageRef);
  } catch (err: any) {
    if (err?.code !== 'storage/object-not-found') throw err;
  }
}

/**
 * Returns true if the given string looks like a base64 data URL (legacy storage).
 * Used to gate display logic: base64 strings can still be rendered as <img src> but
 * should not be passed to deletePhoto (which expects Storage URLs).
 */
export function isBase64Image(value: string | undefined): boolean {
  return !!value?.startsWith('data:image/');
}
