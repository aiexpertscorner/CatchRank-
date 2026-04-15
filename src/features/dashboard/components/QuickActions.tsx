import React from 'react';
import { MapPin, History, Fish, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface QuickActionsProps {
  onNewSpot: () => void;
  onNewSession: () => void;
  onNewCatch: () => void;
}

const actions = [
  { label: 'Stek', icon: MapPin, key: 'spot' as const },
  { label: 'Sessie', icon: History, key: 'session' as const },
  { label: 'Vangst', icon: Fish, key: 'catch' as const },
];

export const QuickActions: React.FC<QuickActionsProps> = ({
  onNewSpot,
  onNewSession,
  onNewCatch,
}) => {
  const handlers: Record<string, () => void> = {
    spot: onNewSpot,
    session: onNewSession,
    catch: onNewCatch,
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-5 h-5 rounded-lg bg-brand/10 flex items-center justify-center">
          <Plus className="w-3 h-3 text-brand" />
        </div>
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-text-muted">
          Nu toevoegen
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {actions.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={handlers[item.key]}
            className={cn(
              'rounded-2xl border border-brand bg-brand text-bg-main',
              'min-h-[80px] flex flex-col items-center justify-center gap-2',
              'text-center transition-all shadow-accent',
              'hover:brightness-105 active:scale-95'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[11px] font-black tracking-tight">{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
