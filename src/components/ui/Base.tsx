import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, icon, children, ...props }, ref) => {
    const variants = {
      primary: 'btn-primary shadow-premium-accent hover:shadow-premium-accent-lg hover:-translate-y-0.5',
      secondary: 'btn-secondary border-border-subtle hover:bg-surface-soft hover:border-accent/30',
      ghost: 'btn-ghost hover:bg-surface-soft text-text-muted hover:text-primary',
      danger: 'bg-danger text-white hover:bg-danger/90 shadow-lg shadow-danger/20 hover:-translate-y-0.5',
    };

    const sizes = {
      sm: 'px-4 py-2 text-xs rounded-xl',
      md: 'px-6 py-3 text-sm rounded-[1rem]',
      lg: 'px-8 py-4 text-base rounded-2xl',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'btn transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer inline-flex items-center justify-center gap-2 font-semibold',
          variants[variant],
          sizes[size],
          isLoading && 'opacity-70 pointer-events-none',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'xp' | 'success' | 'warning' | 'danger' | 'neutral' | 'accent' | 'primary';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', icon, className, ...props }) => {
  const variants = {
    xp: 'bg-water-soft text-water border border-water/10',
    success: 'bg-success/10 text-success border border-success/10',
    warning: 'bg-warning/10 text-warning border border-warning/10',
    danger: 'bg-danger/10 text-danger border border-danger/10',
    accent: 'bg-accent-soft text-accent border border-accent/10',
    primary: 'bg-primary-soft text-primary border border-primary/10',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <span className={cn('badge px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] inline-flex items-center', variants[variant], className)} {...props}>
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </span>
  );
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'premium';
}

export const Card: React.FC<CardProps> = ({ children, className, hoverable = false, padding = 'md', variant = 'default', ...props }) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variants = {
    default: 'bg-surface border border-border-subtle shadow-sm',
    glass: 'glass-panel',
    premium: 'premium-card border-none shadow-sm',
  };

  return (
    <div 
      className={cn(
        'rounded-[2rem] transition-all duration-500',
        variants[variant],
        hoverable && 'hover:shadow-premium hover:-translate-y-1 cursor-pointer',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  subLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, label, subLabel, className, ...props }) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {(label || subLabel) && (
        <div className="flex justify-between items-end">
          {label && <span className="text-sm font-bold text-text-primary">{label}</span>}
          {subLabel && <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{subLabel}</span>}
        </div>
      )}
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
