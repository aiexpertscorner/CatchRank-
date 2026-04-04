import React from 'react';
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
  const config = {
    sm: {
      full: 'h-7 w-auto',
      icon: 'h-8 w-8',
      wrapper: 'gap-2',
    },
    md: {
      full: 'h-9 w-auto',
      icon: 'h-10 w-10',
      wrapper: 'gap-2.5',
    },
    lg: {
      full: 'h-12 w-auto',
      icon: 'h-14 w-14',
      wrapper: 'gap-3',
    },
  };

  const current = config[size];
  const src = `${import.meta.env.BASE_URL}${withText ? 'logo-full.svg' : 'logo-icon.svg'}`;
  const alt = withText ? 'CatchRank logo' : 'CatchRank icon';

  return (
    <div
      className={cn(
        'inline-flex items-center shrink-0 select-none group',
        current.wrapper,
        className
      )}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={cn(
          'block shrink-0 object-contain align-middle transition-transform duration-300 group-hover:scale-[1.02]',
          withText ? current.full : current.icon
        )}
      />
    </div>
  );
}