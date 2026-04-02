import React from 'react';
import { motion } from 'motion/react';
import { Filter, Calendar, Fish, MapPin, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FilterOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilterBarProps {
  options: FilterOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  options,
  activeId,
  onChange,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 px-1", className)}>
      <div className="flex items-center gap-2 pr-4 border-r border-border-subtle mr-2 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted">
          <Filter className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Filters</span>
      </div>
      
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0 whitespace-nowrap active:scale-95",
            activeId === option.id 
              ? "bg-primary text-white shadow-premium-accent/20" 
              : "bg-surface hover:bg-surface-soft text-text-muted border border-border-subtle"
          )}
        >
          {option.icon && <span className="w-3.5 h-3.5">{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  );
};
