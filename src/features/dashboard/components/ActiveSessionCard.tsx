import React from 'react';
import { Clock, Fish } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Button } from '../../../components/ui/Base';
import { Session } from '../../../types';
import {
  getSessionName,
  getSessionCatchCount,
  formatTimeShort,
  getSessionStartDate,
} from '../utils/dashboardHelpers';

interface ActiveSessionCardProps {
  session: Partial<Session>;
  onLogCatch: () => void;
  onEndSession: () => void;
}

export const ActiveSessionCard: React.FC<ActiveSessionCardProps> = ({
  session,
  onLogCatch,
  onEndSession,
}) => {
  const startDate = getSessionStartDate(session);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-surface-card border border-brand/25 p-4 rounded-[1.75rem] relative overflow-hidden shadow-premium">
        <div className="absolute top-0 right-0 w-28 h-28 bg-brand/5 blur-3xl -mr-12 -mt-12" />

        <div className="relative z-10 space-y-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-brand">
              Live sessie actief
            </span>
          </div>

          {/* Session name */}
          <div className="space-y-1">
            <h3 className="text-lg font-black text-text-primary tracking-tight leading-tight">
              {getSessionName(session)}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-secondary font-bold uppercase tracking-widest">
              {startDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand" />
                  {formatTimeShort(startDate)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Fish className="w-3.5 h-3.5 text-brand" />
                {getSessionCatchCount(session)} vangsten
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onLogCatch}
              className="h-11 rounded-xl font-black text-[12px]"
            >
              Vangst loggen
            </Button>
            <Button
              variant="secondary"
              onClick={onEndSession}
              className="h-11 rounded-xl font-black text-[12px]"
            >
              Stop sessie
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
