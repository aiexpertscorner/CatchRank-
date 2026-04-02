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
      sm: 'px-3 py-1.5 text-[10px] rounded-lg',
      md: 'px-4 py-2.5 text-xs md:px-6 md:py-3 md:text-sm rounded-xl',
      lg: 'px-6 py-3.5 text-sm md:px-8 md:py-4 md:text-base rounded-2xl',
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
    sm: 'p-3 md:p-4',
    md: 'p-4 md:p-6',
    lg: 'p-6 md:p-8',
  };

  const variants = {
    default: 'bg-surface border border-border-subtle shadow-sm',
    glass: 'glass-panel',
    premium: 'premium-card border-none shadow-sm',
  };

  return (
    <div 
      className={cn(
        'rounded-2xl md:rounded-[2rem] transition-all duration-500',
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

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="text-xs font-bold text-text-muted uppercase tracking-[0.15em] ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full bg-surface-soft border border-border-subtle rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-4 text-sm md:text-base text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all duration-300",
              icon && "pl-10 md:pl-12",
              error && "border-danger focus:border-danger focus:ring-danger/10",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs font-bold text-danger ml-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, icon, options, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="text-xs font-bold text-text-muted uppercase tracking-[0.15em] ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand transition-colors pointer-events-none">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            className={cn(
              "w-full bg-surface-soft border border-border-subtle rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-4 text-sm md:text-base text-text-primary focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all duration-300 appearance-none",
              icon && "pl-10 md:pl-12",
              error && "border-danger focus:border-danger focus:ring-danger/10",
              className
            )}
            {...props}
          >
            <option value="" disabled>Selecteer een optie</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs font-bold text-danger ml-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="text-xs font-bold text-text-muted uppercase tracking-[0.15em] ml-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full bg-surface-soft border border-border-subtle rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-4 text-sm md:text-base text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all duration-300 min-h-[100px] resize-none",
            error && "border-danger focus:border-danger focus:ring-danger/10",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-bold text-danger ml-1">{error}</p>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
