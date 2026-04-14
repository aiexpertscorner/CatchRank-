/**
 * completenessService.ts
 *
 * The Setup Coach completeness engine.
 *
 * Core question: "Given a user's Tacklebox and a Setup Template,
 * what percentage of the setup is covered, and what is still missing?"
 *
 * Matching logic:
 *   1. Only TackleboxItems with ownershipStatus 'own' or 'reserve' count.
 *   2. An item covers a requirement if:
 *      a) item.requirementKeys includes the requirement's requirementKey (exact, best)
 *      b) OR item.sectionId matches the requirement's sectionId (section-level fallback)
 *   3. Quantity: the requirement is met when count of covering items >= req.minQty.
 *   4. Completeness is calculated separately for essential, recommended, overall.
 */

import type {
  TackleboxItem,
  SetupTemplate,
  SetupRequirement,
  SetupSection,
  CompletenessResult,
  MissingItem,
  RequirementPriority,
} from '../../../types';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Items that are actively owned (own or reserve — not want/replace). */
function getActiveItems(items: TackleboxItem[]): TackleboxItem[] {
  return items.filter(
    (i) => i.ownershipStatus === 'own' || i.ownershipStatus === 'reserve'
  );
}

/**
 * Does this TackleboxItem cover the given requirement?
 *
 * Priority order:
 *   1. Exact requirementKey match in item.requirementKeys[]
 *   2. Section-level match: item.sectionId === req.sectionId
 *   3. Category-level fallback (less precise but prevents false negatives
 *      for items added before requirementKeys was introduced)
 */
function itemCoversRequirement(
  item: TackleboxItem,
  req: SetupRequirement
): boolean {
  // 1. Exact requirementKey match
  if (item.requirementKeys && item.requirementKeys.includes(req.requirementKey)) {
    return true;
  }

  // 2. Section-level match
  if (item.sectionId && item.sectionId === req.sectionId) {
    return true;
  }

  // 3. Category-level fallback (coarse but catches legacy items)
  const categoryToSection: Record<string, string[]> = {
    rod:       ['rods_reels'],
    reel:      ['rods_reels'],
    line:      ['line_storage', 'leaders_terminal', 'terminal_tackle'],
    lure:      ['lure_families'],
    hook:      ['terminal_tackle', 'unhook_safety'],
    bait:      ['hookbaits', 'bait_liquids'],
    accessory: [
      'bite_detection', 'landing_care', 'shelter_sleep', 'cooking_comfort',
      'transport_power', 'clothing_safety', 'bags_mobility', 'measure_document',
      'unhook_safety', 'comfort_vision', 'leaders_terminal',
    ],
  };

  const sectionsForCategory = categoryToSection[item.category] ?? [];
  return sectionsForCategory.includes(req.sectionId);
}

/**
 * Count how many active items cover a requirement.
 */
function countCovering(
  items: TackleboxItem[],
  req: SetupRequirement
): number {
  return items.filter((item) => itemCoversRequirement(item, req)).length;
}

/* -------------------------------------------------------------------------- */
/* Core completeness calculator                                                */
/* -------------------------------------------------------------------------- */

/**
 * Compute completeness for a single setup template against a user's tacklebox.
 *
 * @param template     - the SetupTemplate to check against
 * @param requirements - all SetupRequirements for this template
 * @param tackleboxItems - all of the user's TackleboxItems
 * @returns CompletenessResult
 */
export function computeCompleteness(
  template: SetupTemplate,
  requirements: SetupRequirement[],
  tackleboxItems: TackleboxItem[]
): CompletenessResult {
  const activeItems = getActiveItems(tackleboxItems);
  const templateReqs = requirements.filter((r) => r.templateId === template.id);

  if (templateReqs.length === 0) {
    return {
      essentialsPct:       100,
      recommendedPct:      100,
      overallPct:          100,
      missingItems:        [],
      presentKeys:         [],
      isSessionReady:      true,
      totalRequirements:   0,
      coveredRequirements: 0,
    };
  }

  const presentKeys: string[]  = [];
  const missingItems: MissingItem[] = [];

  for (const req of templateReqs) {
    const count = countCovering(activeItems, req);
    if (count >= req.minQty) {
      presentKeys.push(req.requirementKey);
    } else {
      if (req.priority !== 'optional') {
        missingItems.push({
          requirementKey: req.requirementKey,
          label:          req.label,
          sectionId:      req.sectionId,
          priority:       req.priority,
          rationale:      req.rationale,
        });
      }
    }
  }

  // Separate by priority
  const essentialReqs    = templateReqs.filter((r) => r.priority === 'essential');
  const recommendedReqs  = templateReqs.filter((r) => r.priority === 'recommended');

  const essentialCovered  = essentialReqs.filter((r) => presentKeys.includes(r.requirementKey)).length;
  const recommendedCovered= recommendedReqs.filter((r) => presentKeys.includes(r.requirementKey)).length;

  const essentialsPct    = calcPct(essentialCovered,   essentialReqs.length);
  const recommendedPct   = calcPct(recommendedCovered, recommendedReqs.length);

  // Overall: essentials weighted 70%, recommended 30%
  const overallPct = essentialReqs.length > 0
    ? Math.round(essentialsPct * 0.7 + recommendedPct * 0.3)
    : recommendedPct;

  const coveredRequirements = presentKeys.length;

  return {
    essentialsPct,
    recommendedPct,
    overallPct,
    missingItems: missingItems.sort((a, b) => {
      const order: Record<RequirementPriority, number> = { essential: 0, recommended: 1, optional: 2 };
      return order[a.priority] - order[b.priority];
    }),
    presentKeys,
    isSessionReady: essentialsPct === 100,
    totalRequirements: templateReqs.filter((r) => r.priority !== 'optional').length,
    coveredRequirements,
  };
}

function calcPct(covered: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((covered / total) * 100);
}

/* -------------------------------------------------------------------------- */
/* Multi-setup batch calculator                                                */
/* -------------------------------------------------------------------------- */

/**
 * Compute completeness for multiple setups at once.
 * More efficient than calling computeCompleteness in a loop because
 * active items are filtered once.
 *
 * @param setups  - array of { template, requirements }
 * @param items   - the user's full TackleboxItem list
 * @returns Map from templateId to CompletenessResult
 */
export function computeCompletenessForAll(
  setups: Array<{ template: SetupTemplate; requirements: SetupRequirement[] }>,
  items: TackleboxItem[]
): Map<string, CompletenessResult> {
  const result = new Map<string, CompletenessResult>();
  for (const { template, requirements } of setups) {
    result.set(template.id, computeCompleteness(template, requirements, items));
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Missing items grouped by section                                           */
/* -------------------------------------------------------------------------- */

/**
 * Group missing items by sectionId for the Sessiecheck UI.
 * Returns an ordered array matching the template's section order.
 */
export function groupMissingBySectionId(
  missingItems: MissingItem[],
  sections: SetupSection[]
): Array<{
  section:  SetupSection;
  missing:  MissingItem[];
}> {
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  const grouped = new Map<string, MissingItem[]>();
  for (const item of missingItems) {
    if (!grouped.has(item.sectionId)) grouped.set(item.sectionId, []);
    grouped.get(item.sectionId)!.push(item);
  }

  // Follow template section order
  return sections
    .map((section) => ({
      section,
      missing: grouped.get(section.id) ?? [],
    }))
    .filter((g) => g.missing.length > 0);
}

/* -------------------------------------------------------------------------- */
/* Session readiness label                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Returns a Dutch label for the current completeness state.
 * Used in setup cards and the Sessiecheck header.
 */
export function getReadinessLabel(result: CompletenessResult): {
  label:  string;
  color:  'success' | 'warning' | 'danger' | 'neutral';
  emoji:  string;
} {
  if (result.isSessionReady) {
    return { label: 'Sessie-klaar', color: 'success', emoji: '✓' };
  }
  if (result.essentialsPct >= 80) {
    return { label: 'Bijna klaar', color: 'warning', emoji: '!' };
  }
  if (result.essentialsPct >= 50) {
    return { label: 'Gedeeltelijk', color: 'warning', emoji: '…' };
  }
  return { label: 'Onvolledig', color: 'danger', emoji: '✗' };
}

/* -------------------------------------------------------------------------- */
/* Quick check: is a single requirement covered?                              */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight check used by Sessiecheck to toggle individual items.
 */
export function isRequirementCovered(
  req:   SetupRequirement,
  items: TackleboxItem[]
): boolean {
  const active = getActiveItems(items);
  return countCovering(active, req) >= req.minQty;
}

/* -------------------------------------------------------------------------- */
/* Suggest sectionId for a new TackleboxItem                                 */
/* -------------------------------------------------------------------------- */

/**
 * Auto-suggest the sectionId for a new item based on category + discipline.
 * Used by GearItemModal to pre-fill the sectionId selector.
 */
export function suggestSectionId(
  category: string,
  disciplineTags: string[]
): string {
  const isKarper  = disciplineTags.includes('karper') || disciplineTags.includes('nachtvissen');
  const isRoofvis = disciplineTags.includes('roofvis');

  switch (category) {
    case 'rod':
    case 'reel':
      return 'rods_reels';
    case 'line':
      if (isRoofvis) return 'leaders_terminal';
      return 'line_storage';
    case 'lure':
      return 'lure_families';
    case 'hook':
      if (isRoofvis) return 'leaders_terminal';
      return 'terminal_tackle';
    case 'bait':
      // Distinguish hookbait vs bulk feed by name is impossible here,
      // default to hookbaits — user can override
      return 'hookbaits';
    case 'accessory':
      if (isKarper) return 'terminal_tackle';
      if (isRoofvis) return 'unhook_safety';
      return 'landing_care';
    default:
      return 'general';
  }
}

/* -------------------------------------------------------------------------- */
/* Suggest requirementKeys for a new item                                     */
/* -------------------------------------------------------------------------- */

/**
 * Returns a list of likely requirementKeys for a given sectionId + category.
 * Shown as a multi-select in GearItemModal.
 */
export function getSuggestedRequirementKeys(
  sectionId: string,
  category: string
): Array<{ key: string; label: string }> {
  const MAP: Record<string, Array<{ key: string; label: string }>> = {
    rods_reels: [
      { key: 'rod',    label: 'Hengel' },
      { key: 'reel',   label: 'Molen / Baitrunner' },
    ],
    terminal_tackle: [
      { key: 'hooklink',   label: 'Onderlijn / Rig' },
      { key: 'leadclip',   label: 'Leadclip' },
      { key: 'hook',       label: 'Haak' },
      { key: 'pva',        label: 'PVA' },
      { key: 'mainline',   label: 'Hoofdlijn' },
      { key: 'swivel',     label: 'Swivel' },
    ],
    hookbaits: [
      { key: 'hookbait',   label: 'Haakaas (algemeen)' },
      { key: 'wafter',     label: 'Wafter' },
      { key: 'boilie',     label: 'Boilie / Bottom Bait' },
      { key: 'popup',      label: 'Pop-up' },
    ],
    bait_liquids: [
      { key: 'loose_feed', label: 'Los voer (boilies/pellets)' },
      { key: 'pellets',    label: 'Pellets' },
      { key: 'groundbait', label: 'Grondvoer' },
      { key: 'liquid_dip', label: 'Dip / Liquid' },
      { key: 'particle',   label: 'Particle' },
    ],
    bite_detection: [
      { key: 'bite_alarm', label: 'Bite Alarm' },
      { key: 'receiver',   label: 'Ontvanger' },
      { key: 'rod_pod',    label: 'Rod Pod / Bankstick' },
    ],
    landing_care: [
      { key: 'landing_net',    label: 'Schepnet' },
      { key: 'unhooking_mat',  label: 'Onthaakmat' },
      { key: 'antiseptic',     label: 'Wondmiddel' },
      { key: 'weigh_sling',    label: 'Weegnet' },
    ],
    shelter_sleep: [
      { key: 'bivvy',        label: 'Bivvy / Shelter' },
      { key: 'bedchair',     label: 'Bedchair' },
      { key: 'sleeping_bag', label: 'Slaapzak' },
      { key: 'headlamp',     label: 'Hoofdlamp' },
      { key: 'chair',        label: 'Stoel' },
    ],
    cooking_comfort: [
      { key: 'stove',   label: 'Brander / Kooktoestel' },
      { key: 'gas',     label: 'Gas' },
      { key: 'kettle',  label: 'Waterkoker' },
      { key: 'water',   label: 'Drinkwater' },
    ],
    transport_power: [
      { key: 'powerbank', label: 'Powerbank' },
      { key: 'barrow',    label: 'Transportkar' },
    ],
    clothing_safety: [
      { key: 'rain_gear',    label: 'Regenset' },
      { key: 'spare_socks',  label: 'Reserve sokken' },
    ],
    leaders_terminal: [
      { key: 'wire_leader',   label: 'Stalen Onderlijn' },
      { key: 'fluoro_leader', label: 'Fluoro Leader' },
      { key: 'snaps',         label: 'Snaps / Kliksluitingen' },
      { key: 'treble_hook',   label: 'Driedubbele Haken' },
    ],
    lure_families: [
      { key: 'plug',      label: 'Plug / Crankbait' },
      { key: 'shad',      label: 'Shad / Softbait' },
      { key: 'spinner',   label: 'Spinner / Spinnerbait' },
      { key: 'jerkbait',  label: 'Jerkbait' },
      { key: 'dropshot',  label: 'Dropshot aas' },
    ],
    unhook_safety: [
      { key: 'unhooking_pliers', label: 'Onthaaktang' },
      { key: 'wire_cutter',      label: 'Kniptang' },
      { key: 'unhooking_mat',    label: 'Onthaakmat' },
      { key: 'jaw_glove',        label: 'Kieuwhandschoen' },
    ],
    measure_document: [
      { key: 'measure_tape', label: 'Meetlint' },
      { key: 'scales',       label: 'Weegschaal' },
    ],
    bags_mobility: [
      { key: 'bag',      label: 'Tas / Rugzak' },
      { key: 'lure_box', label: 'Kunstaas doos / wallet' },
    ],
    comfort_vision: [
      { key: 'polarized',  label: 'Polariserende zonnebril' },
      { key: 'food_drink', label: 'Eten & Drinken' },
    ],
    line_storage: [
      { key: 'braid',        label: 'Gevlochten Lijn' },
      { key: 'fluorocarbon', label: 'Fluorocarbon' },
      { key: 'mono',         label: 'Mono' },
      { key: 'mainline',     label: 'Hoofdlijn (karper)' },
    ],
  };

  return MAP[sectionId] ?? [];
}
