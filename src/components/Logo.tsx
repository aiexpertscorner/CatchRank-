import React, { useState } from 'react';
import { Fish } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  withText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({
  className,
  withText = true,
  size = 'md',
}: LogoProps) {
  const [imgError, setImgError] = useState(false);

  const config = {
    sm: { full: 'h-7 w-auto', icon: 'h-8 w-8', iconInner: 'w-5 h-5', wrapper: 'gap-2', text: 'text-lg' },
    md: { full: 'h-9 w-auto', icon: 'h-10 w-10', iconInner: 'w-6 h-6', wrapper: 'gap-2.5', text: 'text-xl' },
    lg: { full: 'h-12 w-auto', icon: 'h-14 w-14', iconInner: 'w-9 h-9', wrapper: 'gap-3', text: 'text-3xl' },
  };

  const current = config[size];
  // Use JPEG logos from public/ (rename from WhatsApp exports)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (import.meta as any).env?.BASE_URL ?? '/CatchRank-/';
  const src = `${base}${withText ? 'logo-text.jpeg' : 'logo-icon.jpeg'}`;
  const alt = withText ? 'CatchRank logo' : 'CatchRank icon';

  if (!imgError) {
    return (
      <div className={cn('inline-flex items-center shrink-0 select-none group', current.wrapper, className)}>
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={cn(
            'block shrink-0 object-contain align-middle transition-transform duration-300 group-hover:scale-[1.02]',
            withText ? current.full : current.icon
          )}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback: Fish icon + text using CatchRank gold accent
  return (
    <div className={cn('flex items-center group', current.wrapper, className)}>
      <div className={cn(
        'bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20 transition-transform group-hover:scale-105 duration-300 shrink-0',
        current.icon
      )}>
        <Fish className={cn('text-bg-main', current.iconInner)} />
      </div>
      {withText && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-display font-bold text-accent tracking-tight', current.text)}>
            CatchRank
          </span>
          {size === 'lg' && (
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">
              Log. Leer. Vang meer.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
