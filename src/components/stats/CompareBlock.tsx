import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CompareBlockProps {
  current: number;
  previous: number;
  label: string;
  suffix?: string;
  className?: string;
}

export const CompareBlock: React.FC<CompareBlockProps> = ({
  current,
  previous,
  label,
  suffix,
  className
}) => {
  const diff = current - previous;
  const percentChange = previous !== 0 ? Math.round((diff / previous) * 100) : 0;
  const isPositive = diff > 0;
  const isNegative = diff < 0;

  return (
    <div className={cn("p-4 bg-surface-soft/30 rounded-2xl border border-border-subtle flex flex-col gap-2 group hover:bg-white hover:shadow-premium transition-all", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">{label}</span>
        <div className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider",
          isPositive ? "bg-success/10 text-success" : 
          isNegative ? "bg-danger/10 text-danger" : 
          "bg-surface-soft text-text-muted"
        )}>
          {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : 
           isNegative ? <TrendingDown className="w-2.5 h-2.5" /> : 
           <Minus className="w-2.5 h-2.5" />}
          {Math.abs(percentChange)}%
        </div>
      </div>
      
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-black text-primary tracking-tight">{current}{suffix}</span>
        <span className="text-[10px] font-medium text-text-muted">vs {previous}{suffix}</span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-surface-soft rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (current / (current + previous || 1)) * 100)}%` }}
          className={cn(
            "h-full rounded-full transition-all duration-1000",
            isPositive ? "bg-success" : "bg-primary"
          )}
        />
      </div>
    </div>
  );
};
