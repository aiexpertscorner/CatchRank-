import { useEffect, useState } from 'react';
import { resolveMediaUrl } from '../lib/media';

export function useStorageUrl(path?: string | null) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(Boolean(path));

  useEffect(() => {
    let active = true;

    if (!path) {
      setUrl('');
      setLoading(false);
      return;
    }

    setLoading(true);

    resolveMediaUrl(path).then((resolved) => {
      if (!active) return;
      setUrl(resolved);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [path]);

  return { url, loading };
}