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
    blue: 'bg-water-soft text-water',
    success: 'bg-success/10 text-success',
    aqua: 'bg-primary-soft text-primary',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <Card variant="premium" className={cn("flex items-center gap-4", className)} {...props}>
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner", variants[variant])}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="stat-label mb-1 text-text-muted">{label}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="stat-value text-text-primary">{value}</h3>
          {trend && (
            <div className={cn(
              "flex items-center text-[10px] font-bold uppercase tracking-wider",
              trend.direction === 'up' ? 'text-success' : trend.direction === 'down' ? 'text-danger' : 'text-text-muted'
            )}>
              {trend.direction === 'up' && <TrendingUp className="w-3 h-3 mr-0.5" />}
              {trend.direction === 'down' && <TrendingDown className="w-3 h-3 mr-0.5" />}
              {trend.direction === 'neutral' && <Minus className="w-3 h-3 mr-0.5" />}
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
        "flex items-center gap-4 p-5 rounded-[1.5rem] transition-all duration-300 group cursor-pointer",
        isCurrentUser 
          ? "bg-brand-soft border-2 border-brand/10 shadow-sm" 
          : "hover:bg-surface-soft hover:shadow-sm border-2 border-transparent",
        className
      )}
      {...props}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-inner transition-all group-hover:scale-110",
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
          className="w-12 h-12 rounded-2xl border-2 border-white shadow-md object-cover transition-transform group-hover:rotate-3"
        />
        {isCurrentUser && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-white shadow-sm animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-bold truncate text-lg tracking-tight", 
            isCurrentUser ? "text-brand" : "text-text-primary"
          )}>
            {name}
          </p>
          {isCurrentUser && (
            <Badge variant="success" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md">Jij</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <div className="flex items-center gap-1 text-xs font-black text-text-muted uppercase tracking-widest">
            <Zap className="w-3 h-3 text-brand fill-current" />
            <span>{xp.toLocaleString()} XP</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-border-subtle" />
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Level {Math.floor(xp / 1000) + 1}</span>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Bekijk Profiel</span>
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </div>
    </div>
  );
};
