/**
 * BottomSheet.tsx
 *
 * Universele bottom sheet wrapper voor ALLE modals, bottom sheets
 * en pop-up flows in de app.
 *
 * Oplossingen die hier ingebakken zitten:
 *
 *  1. Correct max-height: nooit achter of over de bottom nav
 *  2. Sticky modal footer: knoppen blijven altijd zichtbaar
 *  3. Safe area insets: iPhone home indicator + Android gesture bar
 *  4. Scrollable body: content scrollt, header en footer niet
 *  5. Desktop centered: op tablet/desktop wordt het een centered dialog
 *
 * Gebruik:
 *   <BottomSheet isOpen={open} onClose={close} title="Titel" subtitle="Stap 1 van 3">
 *     <BottomSheet.Body>
 *       {... scrollbare content ...}
 *     </BottomSheet.Body>
 *     <BottomSheet.Footer>
 *       <Button>Opslaan</Button>
 *     </BottomSheet.Footer>
 *   </BottomSheet>
 *
 * Of zonder subcomponenten (eigen layout):
 *   <BottomSheet isOpen={open} onClose={close} title="Titel">
 *     <div>eigen content met eigen scroll/footer</div>
 *   </BottomSheet>
 */

import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

/* ==========================================================================
   Types
   ========================================================================== */

interface BottomSheetProps {
  isOpen:       boolean;
  onClose:      () => void;
  title?:       string;
  subtitle?:    string;
  /** Extra icon/content naast de titel */
  titleIcon?:   ReactNode;
  /** Sluit sheet bij tik op backdrop */
  closeOnBackdrop?: boolean;
  /** Forceer full-height (bijv. voor flows met veel stappen) */
  fullHeight?:  boolean;
  children:     ReactNode;
  className?:   string;
}

interface BodyProps {
  children:   ReactNode;
  className?: string;
}

interface FooterProps {
  children:   ReactNode;
  className?: string;
}

/* ==========================================================================
   Sub-components
   ========================================================================== */

function Body({ children, className }: BodyProps) {
  return (
    <div
      className={cn(
        // flex-1 zodat het de ruimte tussen header en footer opvult
        'flex-1 overflow-y-auto',
        // -webkit-overflow-scrolling voor soepel scrollen op iOS
        'overscroll-contain',
        'px-5 py-4',
        className
      )}
      style={{ WebkitOverflowScrolling: 'touch' } as any}
    >
      {children}
    </div>
  );
}

function Footer({ children, className }: FooterProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0',
        'px-5 pt-3 pb-3',
        'border-t border-border-subtle',
        'bg-surface-card', // Zorg dat footer nooit transparant is
        className
      )}
      // safe-area-inset-bottom via inline style zodat het altijd werkt
      // ook zonder de globals.css utility
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
      }}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   Drag handle
   ========================================================================== */

function DragHandle() {
  return (
    <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
      <div className="w-10 h-1 rounded-full bg-border-subtle" />
    </div>
  );
}

/* ==========================================================================
   Main BottomSheet
   ========================================================================== */

function BottomSheetRoot({
  isOpen,
  onClose,
  title,
  subtitle,
  titleIcon,
  closeOnBackdrop = true,
  fullHeight = false,
  children,
  className,
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — z-[41] sits just above nav (z-40) so it dims the nav when a sheet opens */}
          <motion.div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-41"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Sheet container
           *
           * KRITISCH: bottom is niet 0 maar var(--nav-total-height).
           * Hierdoor stijgt de sheet op tot boven de bottom nav.
           *
           * max-height is var(--modal-max-height) zodat de sheet nooit
           * buiten het scherm uitsteekt (ook niet bovenaan).
           */}
          <motion.div
            className={cn(
              'fixed inset-x-0 z-50',
              // Op mobiel: opstijgend van boven de nav
              // Op desktop: gecentreerd
              'md:inset-0 md:flex md:items-end md:justify-center',
            )}
            style={{
              // Mobile: sheet begint boven de bottom nav
              bottom: 'var(--nav-total-height, 60px)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div
              className={cn(
                'bg-surface-card border border-border-subtle',
                'rounded-t-3xl',
                // Desktop: afgerond aan alle kanten + marge
                'md:rounded-3xl md:mb-4 md:w-full md:max-w-lg',
                // KRITISCH: flex column zodat header/footer sticky zijn
                'flex flex-col',
                // KRITISCH: max-height zodat sheet niet buiten scherm uitsteekt
                fullHeight ? 'h-[var(--modal-max-height)]' : '',
                className
              )}
              style={{
                maxHeight: 'var(--modal-max-height, calc(100dvh - 76px))',
              }}
            >
              {/* Drag handle */}
              <DragHandle />

              {/* Header (sticky, scrollt niet mee) */}
              {(title || titleIcon) && (
                <div className="flex items-center justify-between px-5 pb-4 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {titleIcon}
                    <div>
                      {subtitle && (
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-0.5">
                          {subtitle}
                        </p>
                      )}
                      {title && (
                        <h2 className="text-base font-bold text-text-primary">
                          {title}
                        </h2>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Content — Body en Footer sub-components, of eigen children */}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ==========================================================================
   Compound export
   ========================================================================== */

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Body:   Body,
  Footer: Footer,
});

/* ==========================================================================
   Typed sub-component exports (voor directe import)
   ========================================================================== */

export { Body as BottomSheetBody, Footer as BottomSheetFooter };
