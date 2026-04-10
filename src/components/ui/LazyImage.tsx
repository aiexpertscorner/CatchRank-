import React, { useEffect, useRef, useState } from 'react';
import { Fish } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStorageUrl } from '../../hooks/useStorageUrl';

interface LazyImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  fallbackIconSize?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  onClick?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  wrapperClassName,
  fallbackIconSize = 32,
  objectFit = 'cover',
  onClick,
}) => {
  const { url: resolvedSrc } = useStorageUrl(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setIsVisible(false);
  }, [resolvedSrc]);

  useEffect(() => {
    if (!resolvedSrc) return;

    const el = wrapperRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [resolvedSrc]);

  const showFallback = !resolvedSrc || hasError;
  const showSkeleton = resolvedSrc && !hasError && !isLoaded;

  return (
    <div
      ref={wrapperRef}
      className={cn('relative overflow-hidden bg-surface-soft', wrapperClassName)}
      onClick={onClick}
    >
      {showSkeleton && (
        <div className="absolute inset-0 animate-pulse bg-surface-soft" />
      )}

      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-soft">
          <Fish size={fallbackIconSize} className="text-gold/30" />
        </div>
      )}

      {resolvedSrc && isVisible && (
        <img
          src={resolvedSrc}
          alt={alt}
          loading="lazy"
          className={cn(
            'w-full h-full transition-opacity duration-300',
            objectFit === 'cover'
              ? 'object-cover'
              : objectFit === 'contain'
              ? 'object-contain'
              : objectFit === 'fill'
              ? 'object-fill'
              : 'object-none',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
};