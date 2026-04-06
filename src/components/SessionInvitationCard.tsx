import React, { useState } from 'react';
import {
  Users,
  Check,
  Calendar,
} from 'lucide-react';
import { Card, Button, Badge } from './ui/Base';
import { Session } from '../types';
import { loggingService } from '../features/logging/services/loggingService';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';

interface SessionInvitationCardProps {
  session: Session;
  userId: string;
  onActionComplete?: () => void;
}

const getSessionName = (session: Partial<Session>) =>
  (session as any).name || (session as any).title || 'Sessie aan het water';

const getSessionStart = (session: Partial<Session>) =>
  (session as any).startTime || (session as any).startedAt || null;

const getParticipantIds = (session: Partial<Session>): string[] =>
  (session as any).participantIds ||
  (session as any).participantUserIds ||
  [];

export const SessionInvitationCard: React.FC<SessionInvitationCardProps> = ({
  session,
  userId,
  onActionComplete,
}) => {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);

  const handleAccept = async () => {
    setLoading('accept');
    try {
      await loggingService.acceptInvitation(session.id!, userId);
      toast.success('Uitnodiging geaccepteerd!');
      onActionComplete?.();
    } catch (error) {
      console.error('Accept error:', error);
      toast.error('Fout bij accepteren.');
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async () => {
    setLoading('decline');
    try {
      await loggingService.declineInvitation(session.id!, userId);
      toast.success('Uitnodiging afgewezen.');
      onActionComplete?.();
    } catch (error) {
      console.error('Decline error:', error);
      toast.error('Fout bij afwijzen.');
    } finally {
      setLoading(null);
    }
  };

  const startRaw = getSessionStart(session);
  const startDate =
    (startRaw as any)?.toDate?.() ?? (startRaw ? new Date(startRaw as any) : null);

  const participantCount = getParticipantIds(session).length || 1;

  return (
    <Card className="p-6 border-2 border-water/30 bg-water/5 rounded-[2rem] overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Users className="w-32 h-32 text-water" />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <Badge className="bg-water text-white border-none font-black uppercase tracking-widest text-[10px] px-3 py-1">
            Nieuwe Uitnodiging
          </Badge>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
            {session.createdAt?.toDate
              ? format(session.createdAt.toDate(), 'd MMM HH:mm', { locale: nl })
              : ''}
          </span>
        </div>

        <div className="space-y-2">
          <h4 className="text-2xl font-black text-primary tracking-tight leading-tight">
            {getSessionName(session)}
          </h4>
          <p className="text-sm text-text-secondary font-medium">
            Je bent uitgenodigd om deel te nemen aan deze vissessie.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-y border-water/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-water/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-water" />
            </div>
            <div>
              <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                Datum
              </p>
              <p className="text-xs font-bold text-primary">
                {startDate
                  ? format(startDate, 'd MMM yyyy', { locale: nl })
                  : 'Vandaag'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-water/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-water" />
            </div>
            <div>
              <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                Deelnemers
              </p>
              <p className="text-xs font-bold text-primary">
                {participantCount} Vissers
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            className="flex-1 h-14 rounded-2xl border border-border-subtle text-text-muted hover:text-danger hover:bg-danger/5 font-black uppercase tracking-widest text-xs"
            onClick={handleDecline}
            loading={loading === 'decline'}
            disabled={!!loading}
          >
            Afwijzen
          </Button>

          <Button
            className="flex-[2] h-14 rounded-2xl bg-water text-white shadow-lg shadow-water/20 font-black uppercase tracking-widest text-xs"
            onClick={handleAccept}
            loading={loading === 'accept'}
            disabled={!!loading}
            icon={<Check className="w-5 h-5" />}
          >
            Accepteren
          </Button>
        </div>
      </div>
    </Card>
  );
};