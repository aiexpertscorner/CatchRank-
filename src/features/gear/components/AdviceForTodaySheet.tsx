import React, { useState, useMemo } from 'react';
import {
  X, ChevronRight, Loader2, RefreshCw, Fish, ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Base';
import type { AdviceContext, AdviceOutput } from '../../../types';
import {
  getAdvice,
  WATER_TYPE_LABELS, DEPTH_LABELS, CLARITY_LABELS,
  TEMP_LABELS, PRESSURE_LABELS, VEGETATION_LABELS,
} from '../services/adviceEngine';
import { MatchingProductsDrawer } from './MatchingProductsDrawer';

/* ==========================================================================
   Types
   ========================================================================== */

export interface AdviceForTodaySheetProps {
  isOpen:    boolean;
  onClose:   () => void;
}

type Step = 'context' | 'result';

/* ==========================================================================
   Option button helper
   ========================================================================== */

function OptionButton<T extends string>({
  value,
  label,
  selected,
  onSelect,
  emoji,
}: {
  value:    T;
  label:    string;
  selected: T | undefined;
  onSelect: (v: T) => void;
  emoji?:   string;
}) {
  const active = selected === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-left transition-all',
        active
          ? 'bg-brand text-bg-main border-brand shadow-md shadow-brand/20'
          : 'bg-surface-soft text-text-muted border-border-subtle hover:border-brand/30 hover:text-text-secondary'
      )}
    >
      {emoji && <span className="text-sm">{emoji}</span>}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

/* ==========================================================================
   Advice card
   ========================================================================== */

const BAIT_FAMILY_LABELS: Record<string, string> = {
  popup:     'Pop-up',
  wafter:    'Wafter',
  boilie:    'Boilie',
  shad:      'Shad',
  jerkbait:  'Jerkbait',
  spinner:   'Spinner',
  plug:      'Plug / Crankbait',
  softbait:  'Softbait',
};

const COLOR_PROFILE_LABELS: Record<string, string> = {
  high_contrast: '🟡 Hoog contrast (fluorkleur)',
  natural:       '🟤 Naturelkleur',
};

const DISCIPLINE_ICONS: Record<string, string> = {
  karper:  '🐟',
  roofvis: '🦈',
};

function AdviceCard({
  output,
  onFindProducts,
}: {
  output:          AdviceOutput;
  onFindProducts:  () => void;
}) {
  const rec = output.primaryRecommendation;

  return (
    <div className="space-y-4">
      {/* Main recommendation card */}
      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{DISCIPLINE_ICONS[output.context.discipline] ?? '🎣'}</span>
          <div>
            <p className="text-[9px] font-black text-brand uppercase tracking-widest">
              Advies voor vandaag
            </p>
            <p className="text-sm font-bold text-text-primary leading-tight">
              {rec.baitFamily ? BAIT_FAMILY_LABELS[rec.baitFamily] ?? rec.baitFamily : 'Allround aanpak'}
              {rec.sizeBand && <span className="text-text-muted font-normal"> · {rec.sizeBand}</span>}
            </p>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-[13px] text-text-secondary leading-relaxed">
          {rec.explanation}
        </p>

        {/* Context chips */}
        <div className="flex flex-wrap gap-1.5">
          {rec.colorProfile && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-surface-soft text-text-muted border border-border-subtle">
              {COLOR_PROFILE_LABELS[rec.colorProfile] ?? rec.colorProfile}
            </span>
          )}
          {rec.technique && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-surface-soft text-text-muted border border-border-subtle">
              🎯 {rec.technique.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Alternative note */}
        {rec.alternativeNote && (
          <div className="border-t border-brand/10 pt-3">
            <p className="text-[11px] text-text-muted italic">
              💡 {rec.alternativeNote}
            </p>
          </div>
        )}
      </div>

      {/* Tips */}
      {output.tips && output.tips.length > 0 && (
        <div className="rounded-2xl border border-border-subtle bg-surface-soft p-4 space-y-2">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
            Praktische tips
          </p>
          <ul className="space-y-2">
            {output.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-brand text-xs mt-0.5">→</span>
                <span className="text-[12px] text-text-secondary leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA: Find matching products */}
      <button
        onClick={onFindProducts}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-brand/10 border border-brand/20 hover:bg-brand/15 transition-all"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-brand" />
          <div className="text-left">
            <p className="text-[10px] font-black text-brand uppercase tracking-widest">
              Passende producten
            </p>
            <p className="text-[10px] text-text-muted">
              Aanbevolen {rec.baitFamily ? BAIT_FAMILY_LABELS[rec.baitFamily] ?? rec.baitFamily : 'gear'} uit de Fishinn catalogus
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-brand flex-shrink-0" />
      </button>
    </div>
  );
}

/* ==========================================================================
   Context input form
   ========================================================================== */

function ContextForm({
  context,
  onChange,
}: {
  context:  Partial<AdviceContext>;
  onChange: (update: Partial<AdviceContext>) => void;
}) {
  return (
    <div className="space-y-5">

      {/* Discipline (required) */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
          Discipline *
        </label>
        <div className="flex gap-2">
          <OptionButton
            value="karper" label="Karper" emoji="🐟"
            selected={context.discipline} onSelect={(v) => onChange({ discipline: v })}
          />
          <OptionButton
            value="roofvis" label="Roofvis / Snoek" emoji="🦈"
            selected={context.discipline} onSelect={(v) => onChange({ discipline: v })}
          />
        </div>
      </div>

      {/* Water clarity */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
          Waterhelderheid
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CLARITY_LABELS).map(([value, label]) => (
            <OptionButton
              key={value} value={value as any} label={label}
              selected={context.clarity} onSelect={(v) => onChange({ clarity: v })}
            />
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
          Watertemperatuur
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMP_LABELS).map(([value, label]) => (
            <OptionButton
              key={value} value={value as any} label={label}
              selected={context.temperatureBand} onSelect={(v) => onChange({ temperatureBand: v })}
            />
          ))}
        </div>
      </div>

      {/* Water type */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
          Type water
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(WATER_TYPE_LABELS).map(([value, label]) => (
            <OptionButton
              key={value} value={value as any} label={label}
              selected={context.waterType} onSelect={(v) => onChange({ waterType: v })}
            />
          ))}
        </div>
      </div>

      {/* Depth */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
          Diepte
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(DEPTH_LABELS).map(([value, label]) => (
            <OptionButton
              key={value} value={value as any} label={label}
              selected={context.depthBand} onSelect={(v) => onChange({ depthBand: v })}
            />
          ))}
        </div>
      </div>

      {/* Pressure */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
          Luchtdruk trend
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESSURE_LABELS).map(([value, label]) => (
            <OptionButton
              key={value} value={value as any} label={label}
              selected={context.pressureTrend} onSelect={(v) => onChange({ pressureTrend: v })}
            />
          ))}
        </div>
      </div>

      {/* Vegetation */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">
          Begroeiing / bodem
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(VEGETATION_LABELS).map(([value, label]) => (
            <OptionButton
              key={value} value={value as any} label={label}
              selected={context.vegetation} onSelect={(v) => onChange({ vegetation: v })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Main component
   ========================================================================== */

export const AdviceForTodaySheet: React.FC<AdviceForTodaySheetProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep]       = useState<Step>('context');
  const [context, setContext] = useState<Partial<AdviceContext>>({});
  const [output, setOutput]   = useState<AdviceOutput | null>(null);
  const [showProducts, setShowProducts] = useState(false);

  const canGetAdvice = !!context.discipline;

  const handleGetAdvice = () => {
    if (!context.discipline) return;
    const result = getAdvice(context as AdviceContext);
    setOutput(result);
    setStep('result');
  };

  const handleReset = () => {
    setStep('context');
    setOutput(null);
    setShowProducts(false);
  };

  // Partial context change
  const handleContextChange = (update: Partial<AdviceContext>) => {
    setContext((prev) => ({ ...prev, ...update }));
  };

  // Context summary chips for result header
  const contextChips = useMemo(() => {
    const chips: string[] = [];
    if (context.clarity)         chips.push(CLARITY_LABELS[context.clarity]);
    if (context.temperatureBand) chips.push(TEMP_LABELS[context.temperatureBand]);
    if (context.waterType)       chips.push(WATER_TYPE_LABELS[context.waterType]);
    if (context.depthBand)       chips.push(DEPTH_LABELS[context.depthBand]);
    return chips;
  }, [context]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
              className="fixed inset-0 md:inset-4 md:max-w-xl md:mx-auto md:my-auto z-50 flex flex-col"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="bg-surface-card border border-border-subtle rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col h-full md:max-h-[92vh]">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-subtle flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-xl">
                      {context.discipline === 'roofvis' ? '🦈' : '🐟'}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-text-primary">
                        Advies voor vandaag
                      </h2>
                      <p className="text-[10px] text-text-muted">
                        {step === 'context'
                          ? 'Vul de omstandigheden in'
                          : contextChips.join(' · ') || 'Op basis van jouw omstandigheden'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {step === 'result' && (
                      <button
                        onClick={handleReset}
                        className="w-8 h-8 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-brand transition-colors"
                        title="Pas omstandigheden aan"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="w-8 h-8 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Content ────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <AnimatePresence mode="wait">
                    {step === 'context' ? (
                      <motion.div
                        key="context"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                      >
                        <ContextForm context={context} onChange={handleContextChange} />
                      </motion.div>
                    ) : output ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                      >
                        <AdviceCard
                          output={output}
                          onFindProducts={() => setShowProducts(true)}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* ── Footer ─────────────────────────────────────────── */}
                {step === 'context' && (
                  <div className="px-5 py-4 border-t border-border-subtle flex-shrink-0 space-y-2">
                    {!canGetAdvice && (
                      <p className="text-[10px] text-text-dim text-center">
                        Kies minimaal een discipline om advies te krijgen.
                      </p>
                    )}
                    <Button
                      onClick={handleGetAdvice}
                      disabled={!canGetAdvice}
                      className="w-full h-12 rounded-xl font-bold shadow-premium-accent"
                      icon={<Fish className="w-4 h-4" />}
                    >
                      Geef mij advies
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Passende producten drawer (stacked on top) */}
      {output && (
        <MatchingProductsDrawer
          isOpen={showProducts}
          onClose={() => setShowProducts(false)}
          contextLabel={
            output.primaryRecommendation.baitFamily
              ? `${BAIT_FAMILY_LABELS[output.primaryRecommendation.baitFamily] ?? output.primaryRecommendation.baitFamily} — aanbevolen`
              : 'Aanbevolen gear voor vandaag'
          }
          ruleKeys={output.productRuleKeys}
        />
      )}
    </>
  );
};
