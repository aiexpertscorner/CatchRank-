/**
 * Image utilities for CatchRank.
 * Provides simple in-memory URL caching for Firebase Storage download URLs.
 * Firebase Storage URLs are already full public download URLs — no extra fetch needed.
 * The cache prevents redundant getDownloadURL calls when the same image
 * is rendered multiple times in a session (e.g. in a list + in a detail screen).
 */

const urlCache = new Map<string, string>();

/**
 * Returns the cached URL for a given storage URL.
 * On first call, stores the URL in cache and returns it.
 */
export function getCachedImageUrl(storageUrl: string): string {
  if (!storageUrl) return storageUrl;
  const cached = urlCache.get(storageUrl);
  if (cached) return cached;
  urlCache.set(storageUrl, storageUrl);
  return storageUrl;
}

/**
 * Returns true if the given string is a legacy base64 data URL.
 * These can be used as <img src> directly but must not be passed to deletePhoto.
 */
export function isBase64Image(value: string | undefined | null): boolean {
  return !!value?.startsWith('data:image/');
}

/**
 * Returns true if the value looks like a valid image source (Storage URL or base64).
 */
export function isValidImageSrc(value: string | undefined | null): boolean {
  if (!value) return false;
  return value.startsWith('http') || value.startsWith('data:image/') || value.startsWith('blob:');
}

/**
 * Normalizes an image source for display — returns the URL directly for Storage/http URLs,
 * returns as-is for base64 strings, returns undefined if invalid.
 */
export function normalizeImageSrc(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  if (isBase64Image(value)) return value;
  if (value.startsWith('blob:')) return value;
  if (value.startsWith('http')) return getCachedImageUrl(value);
  return undefined;
}
