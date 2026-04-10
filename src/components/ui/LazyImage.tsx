import React, { useEffect, useRef, useState } from 'react';
import { Fish } from 'lucide-react';
import { cn } from '../../lib/utils';
import { normalizeImageSrc } from '../../lib/imageUtils';

interface LazyImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** Extra classes for the wrapper div */
  wrapperClassName?: string;
  /** Fallback icon size (default 32) */
  fallbackIconSize?: number;
  /** object-fit style (default 'cover') */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  onClick?: () => void;
}

/**
 * Lazy-loading image component for CatchRank.
 *
 * - Shows an animated skeleton while the image is loading
 * - Falls back to a fish placeholder on error or when src is empty
 * - Handles Firebase Storage URLs and legacy base64 strings via normalizeImageSrc()
 * - Uses native `loading="lazy"` + IntersectionObserver for viewport-aware loading
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  wrapperClassName,
  fallbackIconSize = 32,
  objectFit = 'cover',
  onClick,
}) => {
  const normalizedSrc = normalizeImageSrc(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [normalizedSrc]);

  // IntersectionObserver for lazy loading — triggers image load when near viewport
  useEffect(() => {
    if (!normalizedSrc) return;

    const el = wrapperRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // pre-load 200px before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [normalizedSrc]);

  const showFallback = !normalizedSrc || hasError;
  const showSkeleton = normalizedSrc && !hasError && !isLoaded;

  return (
    <div
      ref={wrapperRef}
      className={cn('relative overflow-hidden bg-surface-soft', wrapperClassName)}
      onClick={onClick}
    >
      {/* Skeleton shimmer while loading */}
      {showSkeleton && (
        <div className="absolute inset-0 animate-pulse bg-surface-soft" />
      )}

      {/* Fallback — fish icon placeholder */}
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-soft">
          <Fish
            size={fallbackIconSize}
            className="text-gold/30"
          />
        </div>
      )}

      {/* Actual image — only rendered once visible */}
      {normalizedSrc && isVisible && (
        <img
          src={normalizedSrc}
          alt={alt}
          loading="lazy"
          className={cn(
            'w-full h-full transition-opacity duration-300',
            objectFit === 'cover' ? 'object-cover' :
            objectFit === 'contain' ? 'object-contain' :
            objectFit === 'fill' ? 'object-fill' : 'object-none',
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
