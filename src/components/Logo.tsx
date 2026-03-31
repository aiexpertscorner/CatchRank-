import React from 'react';
import { Fish } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  withText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className, withText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return (
    <div className={cn("flex items-center gap-3 group", className)}>
      <div className={cn(
        "bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/20 transition-transform group-hover:scale-105 duration-300",
        sizes[size]
      )}>
        {/* In a real app, we would use the provided image as an <img> tag here */}
        {/* For now, we use a stylized Fish icon to match the brand identity */}
        <Fish className={cn("text-white", iconSizes[size])} />
      </div>
      {withText && (
        <div className="flex flex-col">
          <span className={cn(
            "font-display font-bold text-brand-blue tracking-tight leading-none",
            textSizes[size]
          )}>
            CatchRank
          </span>
          {size === 'lg' && (
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">
              Log. Leer. Vang meer.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
