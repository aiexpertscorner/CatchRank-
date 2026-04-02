import React from 'react';
import { motion } from 'motion/react';
import { Card } from '../ui/Base';
import { cn } from '../../lib/utils';
import { Info } from 'lucide-react';

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  info?: string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  subtitle,
  children,
  className,
  loading,
  info
}) => {
  return (
    <Card className={cn("p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xl font-black text-primary tracking-tight">{title}</h4>
            {info && (
              <div className="group relative">
                <Info className="w-4 h-4 text-text-muted cursor-help hover:text-primary transition-colors" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-text-primary text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                  {info}
                </div>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs font-medium text-text-muted">{subtitle}</p>
          )}
        </div>
        
        {/* Slot for chart-specific controls/filters */}
        <div className="flex items-center gap-2">
          {/* Add small toggle buttons or filters here if needed */}
        </div>
      </div>

      <div className={cn(
        "relative w-full h-[250px] sm:h-[300px] flex items-center justify-center",
        loading && "animate-pulse bg-surface-soft/30 rounded-2xl"
      )}>
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Data ophalen...</span>
          </div>
        ) : (
          <div className="w-full h-full">
            {children}
          </div>
        )}
      </div>

      {/* Subtle Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#2457D6_1px,transparent_1px)] [background-size:20px_20px]" />
    </Card>
  );
};
