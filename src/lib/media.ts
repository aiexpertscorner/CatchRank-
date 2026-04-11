import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from './firebase';

const resolvedUrlCache = new Map<string, string>();
const pendingUrlCache = new Map<string, Promise<string>>();

export function isBase64Image(value: string | undefined | null): boolean {
  return !!value?.startsWith('data:image/');
}

export function isBlobImage(value: string | undefined | null): boolean {
  return !!value?.startsWith('blob:');
}

export function isHttpImage(value: string | undefined | null): boolean {
  return !!value?.startsWith('http://') || !!value?.startsWith('https://');
}

/**
 * normalizeMediaPath
 *
 * Converts any stored media path to a clean relative Storage path.
 *   gs://bucket/images/sessions/foo.jpg  →  images/sessions/foo.jpg
 *   /assets/images/vangsten/foo.jpg      →  assets/images/vangsten/foo.jpg
 *   assets/images/spots/foo.jpg          →  assets/images/spots/foo.jpg  (passthrough)
 */
export function normalizeMediaPath(path?: string | null): string {
  if (!path || typeof path !== 'string') return '';

  const trimmed = path.trim();
  if (!trimmed) return '';

  // Strip gs:// Storage URIs — support both bucket name formats
  if (trimmed.startsWith('gs://')) {
    const GS_PREFIXES = [
      'gs://dbfishing-web.firebasestorage.app/',
      'gs://dbfishing-web.appspot.com/',
    ];
    for (const prefix of GS_PREFIXES) {
      if (trimmed.startsWith(prefix)) {
        return trimmed.replace(prefix, '');
      }
    }
    // Unknown gs:// bucket — return empty to avoid bad getDownloadURL call
    return '';
  }

  if (trimmed.startsWith('/')) {
    return trimmed.slice(1);
  }

  return trimmed;
}

/**
 * LOCAL_PATH_MAP
 *
 * Maps Firebase Storage folder prefixes to their equivalent paths under
 * public/assets/images/ (served as static files by Vite / GitHub Pages).
 *
 * Priority: local static file is always tried first.
 * Fallback: Firebase getDownloadURL for new user-uploaded content.
 *
 * Keys must NOT have a trailing slash.
 */
const LOCAL_PATH_MAP: { prefix: string; localFolder: string }[] = [
  // Migrated Flutter flat paths
  { prefix: 'images/sessions',   localFolder: 'assets/images/sessions' },
  { prefix: 'images/vangsten',   localFolder: 'assets/images/vangsten' },
  { prefix: 'images/catches',    localFolder: 'assets/images/vangsten' },
  { prefix: 'images/spots',      localFolder: 'assets/images/spots' },
  { prefix: 'images/stekken',    localFolder: 'assets/images/spots' },
  { prefix: 'images/thumbnails', localFolder: 'assets/images/sessions' },

  // Already-normalised paths that include 'assets/images/'
  { prefix: 'assets/images/sessions', localFolder: 'assets/images/sessions' },
  { prefix: 'assets/images/vangsten', localFolder: 'assets/images/vangsten' },
  { prefix: 'assets/images/catches',  localFolder: 'assets/images/vangsten' },
  { prefix: 'assets/images/spots',    localFolder: 'assets/images/spots' },
];

/**
 * tryLocalPath
 *
 * If the normalized path matches a known migrated folder, return the
 * Vite-base-relative URL pointing to public/assets/.
 * Returns null when no local mapping exists (→ fall through to Firebase).
 */
function tryLocalPath(normalized: string): string | null {
  for (const { prefix, localFolder } of LOCAL_PATH_MAP) {
    if (normalized.startsWith(prefix + '/') || normalized === prefix) {
      // Extract just the filename (last segment after the prefix)
      const filename = normalized.slice(prefix.length + 1); // strip "prefix/"
      if (!filename) return null;

      // import.meta.env.BASE_URL is '/CatchRank-/' in production, '/' in dev
      const base = (import.meta as any).env?.BASE_URL ?? '/';
      const url = `${base}${localFolder}/${filename}`;
      return url;
    }
  }
  return null;
}

/**
 * resolveMediaUrl
 *
 * Resolves any stored media value to a usable <img src> URL.
 *
 * Resolution order:
 *  1. Already a usable URL (http/https, base64, blob)       → return as-is
 *  2. Matches a known local static folder (migrated images) → return local URL
 *  3. Otherwise                                              → Firebase getDownloadURL
 */
export async function resolveMediaUrl(path?: string | null): Promise<string> {
  const normalized = normalizeMediaPath(path);
  if (!normalized) return '';

  // Already a direct URL
  if (isHttpImage(normalized) || isBase64Image(normalized) || isBlobImage(normalized)) {
    return normalized;
  }

  // Return from cache immediately
  if (resolvedUrlCache.has(normalized)) {
    return resolvedUrlCache.get(normalized)!;
  }

  // Check local static mapping first
  const localUrl = tryLocalPath(normalized);
  if (localUrl) {
    resolvedUrlCache.set(normalized, localUrl);
    return localUrl;
  }

  // Deduplicate in-flight Firebase requests
  if (pendingUrlCache.has(normalized)) {
    return pendingUrlCache.get(normalized)!;
  }

  // Fall back to Firebase Storage (new user-uploaded content)
  const promise = getDownloadURL(ref(storage, normalized))
    .then((url) => {
      resolvedUrlCache.set(normalized, url);
      pendingUrlCache.delete(normalized);
      return url;
    })
    .catch((error) => {
      console.warn('resolveMediaUrl: Firebase fallback failed for', normalized, error?.code);
      pendingUrlCache.delete(normalized);
      return '';
    });

  pendingUrlCache.set(normalized, promise);
  return promise;
}
