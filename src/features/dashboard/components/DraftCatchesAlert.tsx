import React from 'react';
import { AlertCircle, ChevronRight, Fish } from 'lucide-react';
import { Card } from '../../../components/ui/Base';
import { Catch } from '../../../types';
import { getCatchImage, formatDateTimeShort, getCatchTimestampDate } from '../utils/dashboardHelpers';

interface DraftCatchesAlertProps {
  drafts: Catch[];
  onEditDraft: (c: Catch) => void;
}

export const DraftCatchesAlert: React.FC<DraftCatchesAlertProps> = ({
  drafts,
  onEditDraft,
}) => {
  if (drafts.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <AlertCircle className="w-4 h-4 text-warning" />
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-warning">
          Concepten — maak af
        </h2>
      </div>

      <div className="space-y-2">
        {drafts.map((c) => {
          const date = getCatchTimestampDate(c);
          const imgSrc = getCatchImage(c);

          return (
            <Card
              key={c.id}
              padding="none"
              hoverable
              variant="premium"
              className="border border-warning/20 bg-surface-card rounded-2xl overflow-hidden"
              onClick={() => onEditDraft(c)}
            >
              <div className="flex items-center gap-3 p-3.5">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-border-subtle bg-surface-soft shrink-0">
                  {imgSrc ? (
                    <img src={imgSrc} alt="Draft" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Fish className="w-5 h-5 text-warning/40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-warning mb-1">
                    Concept vangst
                  </p>
                  <p className="text-sm font-bold text-text-primary truncate">
                    {date ? formatDateTimeShort(date) : 'Zojuist'}
                  </p>
                  {c.incompleteFields && c.incompleteFields.length > 0 && (
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {c.incompleteFields.length} velden missen
                    </p>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
};
