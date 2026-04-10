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

export function normalizeMediaPath(path?: string | null): string {
  if (!path || typeof path !== 'string') return '';

  const trimmed = path.trim();
  if (!trimmed) return '';

  // Local assets paths are NOT in Firebase Storage — return empty to show fallback
  if (trimmed.startsWith('assets/') || trimmed.startsWith('/assets/')) return '';

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

export async function resolveMediaUrl(path?: string | null): Promise<string> {
  const normalized = normalizeMediaPath(path);
  if (!normalized) return '';

  if (
    isHttpImage(normalized) ||
    isBase64Image(normalized) ||
    isBlobImage(normalized)
  ) {
    return normalized;
  }

  if (resolvedUrlCache.has(normalized)) {
    return resolvedUrlCache.get(normalized)!;
  }

  if (pendingUrlCache.has(normalized)) {
    return pendingUrlCache.get(normalized)!;
  }

  const promise = getDownloadURL(ref(storage, normalized))
    .then((url) => {
      resolvedUrlCache.set(normalized, url);
      pendingUrlCache.delete(normalized);
      return url;
    })
    .catch((error) => {
      console.error('resolveMediaUrl failed:', normalized, error);
      pendingUrlCache.delete(normalized);
      return '';
    });

  pendingUrlCache.set(normalized, promise);
  return promise;
}