import React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Base';
import { motion } from 'motion/react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, actions, className }) => {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12 px-2 md:px-0", className)}>
      <div className="space-y-1.5 md:space-y-2">
        {badge && (
          <Badge 
            variant="accent" 
            className="mb-2 md:mb-3 px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
          >
            {badge}
          </Badge>
        )}
        <h1 className="text-2xl md:text-5xl text-pretty leading-[1.1] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-text-secondary text-base md:text-xl font-medium max-w-2xl">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
};

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, className }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn("w-full max-w-7xl mx-auto pb-nav-pad md:pb-10", className)}
    >
      {children}
    </motion.div>
  );
};
