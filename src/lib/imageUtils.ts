const urlCache = new Map<string, string>();

export function getCachedImageUrl(url: string): string {
  if (!url) return url;
  const cached = urlCache.get(url);
  if (cached) return cached;
  urlCache.set(url, url);
  return url;
}

export function isBase64Image(value: string | undefined | null): boolean {
  return !!value?.startsWith('data:image/');
}

export function isValidImageSrc(value: string | undefined | null): boolean {
  if (!value) return false;
  return (
    value.startsWith('http') ||
    value.startsWith('data:image/') ||
    value.startsWith('blob:') ||
    value.startsWith('assets/') ||
    value.startsWith('/assets/') ||
    value.startsWith('images/') ||
    value.startsWith('gs://')
  );
}

export function normalizeImageSrc(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  return value;
}