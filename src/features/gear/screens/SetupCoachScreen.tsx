/**
 * SetupCoachScreen.tsx
 *
 * Alles rondom Setup Coach:
 *   - SetupCoachHome (overzicht)
 *   - SetupBuilderModal (nieuw/bewerken)
 *   - SessionCheckSheet (checklist)
 *   - AdviceForTodaySheet (advies)
 *   - MatchingProductsDrawer (passende producten)
 *
 * Data komt uit GearContext (myGear, setupsV2).
 */

import React, { useState, useCallback } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Base';
import { useAuth } from '../../../App';
import { useGearContext } from '../context/GearContext';
import { templateService } from '../services/templateService';

import { SetupCoachHome } from '../components/SetupCoachHome';
import { SetupBuilderModal } from '../components/SetupBuilderModal';
import { SessionCheckSheet } from '../components/SessionCheckSheet';
import { AdviceForTodaySheet } from '../components/AdviceForTodaySheet';
import { MatchingProductsDrawer } from '../components/MatchingProductsDrawer';
import { GearItemModal } from '../components/GearItemModal';

import type {
  SessionSetup, SetupRequirement, SetupSection, SetupTemplate,
  TackleboxItem, ProductCatalogItem,
} from '../../../types';

export function SetupCoachScreen() {
  const { profile } = useAuth();
  const {
    myGear, setupsV2,
    appendSetupV2, replaceSetupV2, handleDeleteSetupV2,
    handleAddToGear,
  } = useGearContext();

  // ── Setup Builder ────────────────────────────────────────────────────
  const [isBuilderOpen,    setIsBuilderOpen]    = useState(false);
  const [editingSetup,     setEditingSetup]     = useState<SessionSetup | null>(null);

  // ── Sessiecheck ──────────────────────────────────────────────────────
  const [checkSetup,       setCheckSetup]       = useState<SessionSetup | null>(null);
  const [checkTemplate,    setCheckTemplate]    = useState<SetupTemplate | undefined>();
  const [checkRequirements,setCheckRequirements]= useState<SetupRequirement[]>([]);
  const [checkSections,    setCheckSections]    = useState<SetupSection[]>([]);
  const [isCheckOpen,      setIsCheckOpen]      = useState(false);

  // ── Advies voor vandaag ───────────────────────────────────────────────
  const [isAdviceOpen,     setIsAdviceOpen]     = useState(false);

  // ── Matching Products (from sessiecheck "Zoek product") ──────────────
  const [matchingReq,      setMatchingReq]      = useState<SetupRequirement | null>(null);
  const [isMatchingOpen,   setIsMatchingOpen]   = useState(false);

  // ── Add gear from slot ────────────────────────────────────────────────
  const [isSlotGearOpen,   setIsSlotGearOpen]   = useState(false);
  const [slotGearPrefill,  setSlotGearPrefill]  = useState<Partial<TackleboxItem> | null>(null);

  // ── Open sessiecheck ─────────────────────────────────────────────────
  const handleSessionCheck = useCallback(async (setup: SessionSetup) => {
    setCheckSetup(setup);
    if (setup.templateId) {
      const bundle = await templateService.getTemplateBundle(setup.templateId);
      if (bundle) {
        setCheckTemplate(bundle.template as SetupTemplate);
        setCheckRequirements(bundle.requirements);
        setCheckSections(bundle.sections);
      }
    }
    setIsCheckOpen(true);
  }, []);

  // ── Open edit setup ──────────────────────────────────────────────────
  const handleEditSetup = useCallback((setup: SessionSetup) => {
    setEditingSetup(setup);
    setIsBuilderOpen(true);
  }, []);

  // ── Open "Zoek product" from sessiecheck ─────────────────────────────
  const handleFindProducts = useCallback((req: SetupRequirement) => {
    setMatchingReq(req);
    setIsMatchingOpen(true);
  }, []);

  // ── Add to gear from sessiecheck ──────────────────────────────────────
  const handleAddFromSlot = useCallback((req: SetupRequirement) => {
    setSlotGearPrefill({
      sectionId:       req.sectionId,
      requirementKeys: [req.requirementKey],
    } as any);
    setIsSlotGearOpen(true);
  }, []);

  return (
    <div className="space-y-4 pb-32">
      {/* Header CTAs */}
      <div className="flex gap-2 px-2 md:px-0">
        <Button
          icon={<Plus className="w-4 h-4" />}
          className="flex-1 h-11 rounded-xl font-bold shadow-premium-accent"
          onClick={() => { setEditingSetup(null); setIsBuilderOpen(true); }}
        >
          Nieuwe Setup
        </Button>
        <Button
          variant="secondary"
          icon={<Sparkles className="w-4 h-4" />}
          className="h-11 px-4 rounded-xl"
          onClick={() => setIsAdviceOpen(true)}
        >
          Advies
        </Button>
      </div>

      {/* Main content */}
      <SetupCoachHome
        tackleboxItems={myGear as TackleboxItem[]}
        onNewSetup={() => { setEditingSetup(null); setIsBuilderOpen(true); }}
        onSessionCheck={handleSessionCheck}
        onEditSetup={handleEditSetup}
      />

      {/* ── Modals & sheets ────────────────────────────────────────── */}

      <SetupBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => { setIsBuilderOpen(false); setEditingSetup(null); }}
        ownedGear={myGear as any}
        editSetup={editingSetup}
        onCreated={(setup) => {
          appendSetupV2(setup);
          setIsBuilderOpen(false);
        }}
      />

      {checkSetup && (
        <SessionCheckSheet
          isOpen={isCheckOpen}
          onClose={() => setIsCheckOpen(false)}
          setup={checkSetup}
          template={checkTemplate}
          requirements={checkRequirements}
          sections={checkSections}
          tackleboxItems={myGear as TackleboxItem[]}
          onAddToGear={handleAddFromSlot}
          onFindProducts={handleFindProducts}
        />
      )}

      <AdviceForTodaySheet
        isOpen={isAdviceOpen}
        onClose={() => setIsAdviceOpen(false)}
      />

      <MatchingProductsDrawer
        isOpen={isMatchingOpen && !!matchingReq}
        onClose={() => { setIsMatchingOpen(false); setMatchingReq(null); }}
        contextLabel={matchingReq?.label ?? ''}
        requirement={matchingReq ?? undefined}
        onAddToGear={(product: ProductCatalogItem) => {
          handleAddToGear(product);
          setIsMatchingOpen(false);
        }}
      />

      {/* Gear modal triggered from sessiecheck slots */}
      <GearItemModal
        isOpen={isSlotGearOpen}
        onClose={() => { setIsSlotGearOpen(false); setSlotGearPrefill(null); }}
        prefillData={slotGearPrefill as any}
      />
    </div>
  );
}
