import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Base';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number; // percentage change
  suffix?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  suffix,
  icon,
  loading,
  className
}) => {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <Card className={cn("p-5 flex flex-col gap-3 relative overflow-hidden group", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              {icon}
            </div>
          )}
          <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{label}</span>
        </div>
        
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
            isPositive ? "bg-success/10 text-success" : 
            isNegative ? "bg-danger/10 text-danger" : 
            "bg-surface-soft text-text-muted"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : 
             isNegative ? <TrendingDown className="w-3 h-3" /> : 
             <Minus className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <h3 className="text-3xl font-black text-primary tracking-tight">
          {loading ? "..." : value}
        </h3>
        {suffix && !loading && (
          <span className="text-sm font-bold text-text-muted">{suffix}</span>
        )}
      </div>

      {/* Background Decoration */}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
    </Card>
  );
};
