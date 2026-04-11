import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus, Trophy, AlertCircle, Check, ChevronRight,
  Loader2, Fish, Layers, Trash2, Edit2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/Base';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../../../App';
import type {
  TackleboxItem, SetupTemplate, SetupRequirement,
  SessionSetup, CompletenessResult,
} from '../../../types';
import { templateService } from '../services/templateService';
import { setupService, DISCIPLINE_LABELS, DISCIPLINE_ICONS, SESSION_TYPE_LABELS } from '../services/setupService';
import { computeCompleteness, getReadinessLabel } from '../services/completenessService';

/* ==========================================================================
   Types
   ========================================================================== */

interface SetupCoachHomeProps {
  tackleboxItems:  TackleboxItem[];
  onNewSetup:      () => void;
  onSessionCheck:  (setup: SessionSetup) => void;
  onEditSetup:     (setup: SessionSetup) => void;
}

interface SetupWithCompleteness {
  setup:       SessionSetup;
  template?:   SetupTemplate;
  completeness: CompletenessResult | null;
}

/* ==========================================================================
   Completeness mini-bar (horizontal)
   ========================================================================== */

function MiniBar({ pct, isReady }: { pct: number; isReady: boolean }) {
  return (
    <div className="h-1.5 rounded-full bg-surface-soft overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          isReady ? 'bg-success' : pct >= 80 ? 'bg-amber-400' : 'bg-orange-400'
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ==========================================================================
   Setup card
   ========================================================================== */

function SetupCard({
  item,
  onSessionCheck,
  onEdit,
  onDelete,
}: {
  item:           SetupWithCompleteness;
  onSessionCheck: () => void;
  onEdit:         () => void;
  onDelete:       () => void;
}) {
  const { setup, template, completeness } = item;
  const readiness = completeness ? getReadinessLabel(completeness) : null;
  const isReady   = completeness?.isSessionReady ?? false;
  const pct       = completeness?.essentialsPct ?? (setup.completeness ?? 0);

  const missingEssentials = completeness?.missingItems.filter((m) => m.priority === 'essential') ?? [];
  const firstMissing      = missingEssentials[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border overflow-hidden transition-all',
        isReady
          ? 'border-success/20 bg-success/3'
          : missingEssentials.length > 0
            ? 'border-orange-500/20'
            : 'border-border-subtle'
      )}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        {/* Discipline emoji */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
          isReady ? 'bg-success/10' : 'bg-surface-soft'
        )}>
          {DISCIPLINE_ICONS[setup.discipline] ?? '🎣'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-text-primary truncate">
              {setup.name}
            </span>
            {setup.sessionType && (
              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface-soft text-text-muted border border-border-subtle">
                {SESSION_TYPE_LABELS[setup.sessionType] ?? setup.sessionType}
              </span>
            )}
          </div>

          {/* Completeness bar + label */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-dim">
                {completeness
                  ? `${completeness.coveredRequirements}/${completeness.totalRequirements} gedekt`
                  : `${pct}%`
                }
              </span>
              {readiness && (
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-widest',
                  isReady ? 'text-success' : 'text-orange-400'
                )}>
                  {readiness.emoji} {readiness.label}
                </span>
              )}
            </div>
            <MiniBar pct={pct} isReady={isReady} />
          </div>

          {/* First missing essential */}
          {firstMissing && (
            <div className="flex items-center gap-1.5 mt-2">
              <AlertCircle className="w-3 h-3 text-orange-400 flex-shrink-0" />
              <span className="text-[10px] text-orange-400">
                Mist: {firstMissing.label}
                {missingEssentials.length > 1 && ` +${missingEssentials.length - 1}`}
              </span>
            </div>
          )}

          {isReady && (
            <div className="flex items-center gap-1.5 mt-2">
              <Trophy className="w-3 h-3 text-success flex-shrink-0" />
              <span className="text-[10px] text-success font-bold">
                Klaar voor de sessie!
              </span>
            </div>
          )}
        </div>

        {/* Actions overflow */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg bg-surface-soft text-text-muted hover:text-brand hover:bg-brand/10 flex items-center justify-center transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg bg-surface-soft text-text-muted hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={onSessionCheck}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all',
            isReady
              ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
              : 'bg-brand/10 text-brand border-brand/20 hover:bg-brand/20'
          )}
        >
          <span>{isReady ? 'Bekijk sessiecheck' : 'Check wat nog mist'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   Empty state
   ========================================================================== */

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-3xl mb-4">
        🎣
      </div>
      <h3 className="text-base font-bold text-text-primary mb-1">
        Nog geen sessie setups
      </h3>
      <p className="text-sm text-text-secondary mb-6 leading-relaxed max-w-[260px]">
        Bouw je eerste setup op basis van een template. We controleren automatisch wat je al hebt en wat je nog mist.
      </p>
      <Button
        onClick={onNew}
        className="h-11 px-6 rounded-xl font-bold shadow-premium-accent"
        icon={<Plus className="w-4 h-4" />}
      >
        Eerste Setup Aanmaken
      </Button>
    </div>
  );
}

/* ==========================================================================
   Template quick-start strip
   ========================================================================== */

function TemplateQuickStart({
  templates,
  onSelect,
}: {
  templates: SetupTemplate[];
  onSelect:  (templateId: string) => void;
}) {
  if (templates.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest px-1">
        Snelstart — kies een template
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {templates.filter((t) => t.isDefault).map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-soft border border-border-subtle hover:border-brand/40 hover:bg-brand/5 transition-all"
          >
            <span className="text-base">
              {t.discipline === 'karper' ? '🐟' : '🦈'}
            </span>
            <div className="text-left">
              <p className="text-[10px] font-bold text-text-secondary whitespace-nowrap">
                {t.title}
              </p>
              <p className="text-[9px] text-text-dim">
                ~{t.estimatedItems} items
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Main component
   ========================================================================== */

export const SetupCoachHome: React.FC<SetupCoachHomeProps> = ({
  tackleboxItems,
  onNewSetup,
  onSessionCheck,
  onEditSetup,
}) => {
  const { profile } = useAuth();

  const [setups, setSetups]       = useState<SessionSetup[]>([]);
  const [templates, setTemplates] = useState<SetupTemplate[]>([]);
  const [reqMap, setReqMap]       = useState<Map<string, SetupRequirement[]>>(new Map());
  const [loading, setLoading]     = useState(true);

  // ── Load setups + templates on mount ─────────────────────────────────────
  useEffect(() => {
    if (!profile) return;

    const load = async () => {
      setLoading(true);
      try {
        const [fetchedSetups, fetchedTemplates] = await Promise.all([
          setupService.getAllSetups(profile.uid),
          templateService.getAllTemplates(),
        ]);
        setSetups(fetchedSetups);
        setTemplates(fetchedTemplates);

        // Load requirements for each template referenced by a setup
        const neededTemplateIds = [...new Set(
          fetchedSetups.map((s) => s.templateId).filter(Boolean) as string[]
        )];

        const reqEntries = await Promise.all(
          neededTemplateIds.map(async (id) => {
            const reqs = await templateService.getRequirementsForTemplate(id);
            return [id, reqs] as [string, SetupRequirement[]];
          })
        );
        setReqMap(new Map(reqEntries));
      } catch (err) {
        console.error('SetupCoachHome load error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profile]);

  // ── Compute completeness per setup ───────────────────────────────────────
  const setupsWithCompleteness = useMemo((): SetupWithCompleteness[] => {
    return setups.map((setup) => {
      const template   = templates.find((t) => t.id === setup.templateId);
      const reqs       = setup.templateId ? (reqMap.get(setup.templateId) ?? []) : [];
      const completeness =
        template && reqs.length > 0
          ? computeCompleteness(template, reqs, tackleboxItems)
          : null;
      return { setup, template, completeness };
    });
  }, [setups, templates, reqMap, tackleboxItems]);

  // ── Stats for the header ─────────────────────────────────────────────────
  const readyCount   = setupsWithCompleteness.filter((s) => s.completeness?.isSessionReady).length;
  const totalSetups  = setups.length;

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (setup: SessionSetup) => {
    if (!window.confirm(`Setup "${setup.name}" verwijderen?`)) return;
    try {
      await setupService.deleteSetup(setup.id);
      setSetups((prev) => prev.filter((s) => s.id !== setup.id));
      toast.success('Setup verwijderd.');
    } catch {
      toast.error('Verwijderen mislukt.');
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Setups laden…</span>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (setups.length === 0) {
    return (
      <div className="space-y-6">
        <TemplateQuickStart
          templates={templates}
          onSelect={(_id) => onNewSetup()}
        />
        <EmptyState onNew={onNewSetup} />
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-text-primary">
            Jouw Sessie Setups
          </h2>
          <p className="text-[11px] text-text-muted">
            {readyCount}/{totalSetups} sessie-klaar
          </p>
        </div>
        <Button
          onClick={onNewSetup}
          className="h-9 px-4 rounded-xl text-[10px] font-black"
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Nieuw
        </Button>
      </div>

      {/* Setup cards */}
      <AnimatePresence mode="popLayout">
        {setupsWithCompleteness.map((item) => (
          <SetupCard
            key={item.setup.id}
            item={item}
            onSessionCheck={() => onSessionCheck(item.setup)}
            onEdit={() => onEditSetup(item.setup)}
            onDelete={() => handleDelete(item.setup)}
          />
        ))}
      </AnimatePresence>

      {/* Quick-start strip for adding more */}
      {setups.length < 4 && (
        <div className="pt-2">
          <TemplateQuickStart
            templates={templates}
            onSelect={(_id) => onNewSetup()}
          />
        </div>
      )}
    </div>
  );
};
