/**
 * Shared image resolution helpers for catches, spots and sessions.
 *
 * Priority order follows v2 schema first (mainImage), then legacy fallbacks.
 * These helpers ONLY resolve the raw string from Firestore — actual URL
 * resolution / getDownloadURL happens in media.ts via useStorageUrl / LazyImage.
 */

/**
 * Resolve the primary image source for a catch document.
 * Priority: mainImage → photoURL → image → imageUrl
 */
export function resolveCatchImageSrc(c: Record<string, any>): string {
  return c.mainImage || c.photoURL || c.image || c.imageUrl || '';
}

/**
 * Resolve the primary image source for a spot document.
 * Priority: mainImage → mainPhotoURL → imageUrl
 */
export function resolveSpotImageSrc(s: Record<string, any>): string {
  return s.mainImage || s.mainPhotoURL || s.imageUrl || '';
}

/**
 * Resolve the primary image source for a session document.
 */
export function resolveSessionImageSrc(s: Record<string, any>): string {
  return s.mainImage || s.photoURL || s.imageUrl || '';
}

/**
 * Resolve the display species label for a catch, prioritising speciesSpecific.
 */
export function resolveCatchSpecies(c: Record<string, any>): string {
  return c.speciesSpecific || c.speciesGeneral || c.species || 'Onbekende soort';
}

/**
 * Resolve the display bait label for a catch.
 */
export function resolveCatchBait(c: Record<string, any>): string {
  return c.baitSpecific || c.baitGeneral || c.bait || '';
}
