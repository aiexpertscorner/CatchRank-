import React from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, ChevronRight } from 'lucide-react';
import { Card, CardProps, Badge } from './Base';
import { cn } from '../../lib/utils';

export interface StatCardProps extends Omit<CardProps, 'variant'> {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'blue' | 'success' | 'aqua' | 'warning';
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, trend, variant = 'blue', className, ...props }) => {
  const variants = {
    blue: 'bg-brand-soft text-brand',
    success: 'bg-success-soft text-success',
    aqua: 'bg-aqua-soft text-aqua',
    warning: 'bg-warning-soft text-warning',
  };

  return (
    <Card variant="premium" className={cn("flex items-center gap-3 md:gap-4 p-3 md:p-5", className)} {...props}>
      <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner", variants[variant])}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="stat-label mb-0.5">{label}</p>
        <div className="flex items-baseline gap-1.5 md:gap-2">
          <h3 className="stat-value">{value}</h3>
          {trend && (
            <div className={cn(
              "flex items-center text-[8px] md:text-[9px] font-black uppercase tracking-widest",
              trend.direction === 'up' ? 'text-success' : trend.direction === 'down' ? 'text-danger' : 'text-text-muted'
            )}>
              {trend.direction === 'up' && <TrendingUp className="w-2 h-2 md:w-2.5 md:h-2.5 mr-0.5" />}
              {trend.direction === 'down' && <TrendingDown className="w-2 h-2 md:w-2.5 md:h-2.5 mr-0.5" />}
              {trend.direction === 'neutral' && <Minus className="w-2 h-2 md:w-2.5 md:h-2.5 mr-0.5" />}
              {trend.value}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export interface RankingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  rank: number;
  name: string;
  avatar?: string;
  xp: number;
  isCurrentUser?: boolean;
}

export const RankingCard: React.FC<RankingCardProps> = ({ rank, name, avatar, xp, isCurrentUser, className, ...props }) => {
  return (
    <div 
      className={cn(
        "flex items-center gap-2.5 md:gap-3 p-3 md:p-4 rounded-xl md:rounded-[1.25rem] transition-all duration-300 group cursor-pointer",
        isCurrentUser 
          ? "bg-brand-soft border border-brand/10 shadow-sm" 
          : "hover:bg-surface-soft border border-transparent",
        className
      )}
      {...props}
    >
      <div className={cn(
        "w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-black text-[10px] md:text-xs shadow-inner transition-all group-hover:scale-110",
        rank === 1 ? "bg-brand text-white shadow-lg shadow-brand/20" :
        rank === 2 ? "bg-slate-200 text-text-secondary" :
        rank === 3 ? "bg-orange-100 text-orange-600" :
        "bg-surface-soft text-text-muted"
      )}>
        {rank}
      </div>
      <div className="relative">
        <img 
          src={avatar || `https://ui-avatars.com/api/?name=${name}`} 
          alt={name} 
          className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl border-2 border-white shadow-sm object-cover transition-transform group-hover:rotate-3"
        />
        {isCurrentUser && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-white shadow-sm" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-black truncate text-xs md:text-sm tracking-tight", 
            isCurrentUser ? "text-brand" : "text-text-primary"
          )}>
            {name}
          </p>
          {isCurrentUser && (
            <Badge variant="success" className="px-1.5 py-0 text-[6px] md:text-[7px] font-black uppercase tracking-widest rounded-md">Jij</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">
            <Zap className="w-2 h-2 md:w-2.5 md:h-2.5 text-brand fill-current" />
            <span>{xp.toLocaleString()} XP</span>
          </div>
          <div className="w-0.5 h-0.5 rounded-full bg-border-subtle" />
          <span className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">Level {Math.floor(xp / 1000) + 1}</span>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">Profiel</span>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </div>
    </div>
  );
};
