/**
 * adviceEngine.ts
 *
 * Pure client-side advice engine for Setup Coach "Advies voor vandaag".
 * No API calls — rules are statically defined in this file.
 *
 * Each rule defines:
 *   conditions     — required context fields to match
 *   recommendation — Dutch text advice + product guidance
 *   productRuleKeys— keys into Firestore product_rule_mappings
 *
 * The engine finds the best-matching rule for a given AdviceContext by
 * counting how many conditions match (more = better match).
 * Ties are broken by rule order (more specific rules first).
 */

import type {
  AdviceContext, AdviceOutput, AdviceRecommendation,
  WaterClarity, TemperatureBand, WaterType,
  DepthBand, PressureTrend, VegetationLevel,
} from '../../../types';

/* ==========================================================================
   Rule definition
   ========================================================================== */

interface AdviceRule {
  id:               string;
  discipline:       'karper' | 'roofvis';
  conditions:       Partial<AdviceContext>;
  recommendation:   AdviceRecommendation;
  productRuleKeys:  string[];
  tips?:            string[];
  minConditions?:   number; // min conditions that must match (default: 1)
}

/* ==========================================================================
   KARPER RULES
   ========================================================================== */

const KARPER_RULES: AdviceRule[] = [

  // ── Troebel + Koud → Opvallend aas, rustig vissen ─────────────────────
  {
    id: 'carp_troebel_koud',
    discipline: 'karper',
    conditions: { clarity: 'troebel', temperatureBand: 'koud' },
    recommendation: {
      baitFamily:   'popup',
      colorProfile: 'high_contrast',
      sizeBand:     '15mm',
      technique:    'bottom_statisch',
      explanation:
        'Troebel en koud water: de karper zit laag en beweegt weinig. Kies een opvallende popup in ' +
        'fluorkleur (geel, oranje, chartreuse) om zichtbaar te blijven. Vis zo stil mogelijk — ' +
        'één stek grondig uitvissen werkt beter dan veel wisselen.',
      alternativeNote: 'Geen beet na 2 uur? Probeer een zoutiger boilie of voeg een dip toe.',
    },
    productRuleKeys: ['hookbaits::troebel', 'hookbaits::koud', 'bait_liquids::troebel'],
    tips: [
      'Minimaal los voer — te veel voer in koud troebel water verzuurt de plek.',
      'Lange hooklink (25–30cm) houdt het aas vrij van slibbodem.',
      'Vis dichter op de oever — karper zoekt warmte bij ondiepere plekken.',
    ],
  },

  // ── Helder + Koud → Subtiel, weinig voer ─────────────────────────────
  {
    id: 'carp_helder_koud',
    discipline: 'karper',
    conditions: { clarity: 'helder', temperatureBand: 'koud' },
    recommendation: {
      baitFamily:   'wafter',
      colorProfile: 'natural',
      sizeBand:     '12mm',
      technique:    'bottom_statisch',
      explanation:
        'Helder en koud water: karper kan alles goed zien én is kritisch. Gebruik een kleine, ' +
        'naturelkleurige wafter (bruin, amber) en strak aanharen. Zo min mogelijk los voer — ' +
        'een paar boilies met de hand is genoeg.',
      alternativeNote: 'Fluorocarbon hooklink (0.25–0.30mm) is minder zichtbaar in helder water.',
    },
    productRuleKeys: ['hookbaits::helder', 'hookbaits::koud', 'terminal_tackle::fluorocarbon'],
    tips: [
      'Kleine stille aanpak: geen spodder, geen grote plonzen.',
      'Vis op de wind — karper mept mee met de golfbeweging.',
      'Controleer je lijn op beschadigingen vaker bij helder water.',
    ],
  },

  // ── Troebel + Warm → Grotere bait, regelmatig voeren ─────────────────
  {
    id: 'carp_troebel_warm',
    discipline: 'karper',
    conditions: { clarity: 'troebel', temperatureBand: 'warm' },
    recommendation: {
      baitFamily:   'boilie',
      colorProfile: 'high_contrast',
      sizeBand:     '18-20mm',
      technique:    'aktief_voeren',
      explanation:
        'Troebel en warm water: karper is actief maar kan minder ver zien. Vergroot je haakaas ' +
        '(18–20mm) en gebruik sterke, zoete attractors (fruity, tutti). Regelmatig bijvoeren met ' +
        'een spod of cobra houdt ze op je plek.',
      alternativeNote: 'Een bright pop-up als verandering als de boilies het niet doen.',
    },
    productRuleKeys: ['hookbaits::troebel', 'hookbaits::warm', 'bait_liquids::warm'],
    tips: [
      'Voer elke 2–3 uur bij — warme karper eet meer.',
      'Zoek oksels van wier of rietranden — karper zoekt voedsel hier.',
      'Vis \'s avonds en \'s ochtends vroeg — meest actief rondom schemering.',
    ],
  },

  // ── Helder + Warm → Zig rig / oppervlak ─────────────────────────────
  {
    id: 'carp_helder_warm',
    discipline: 'karper',
    conditions: { clarity: 'helder', temperatureBand: 'warm' },
    recommendation: {
      baitFamily:   'popup',
      colorProfile: 'natural',
      sizeBand:     '14-15mm',
      technique:    'zig_rig',
      explanation:
        'Helder en warm water: karper zit hoog in het water op zoek naar eten. Probeer een zig rig ' +
        'op halve diepte of zelfs 30cm van het oppervlak. Naturelkleurige of zwarte popup — ' +
        'karper herkent een te felle kleur in helder water als verdacht.',
      alternativeNote: 'Drijvend brood of een surface controller is een klassiek alternatief.',
    },
    productRuleKeys: ['hookbaits::helder', 'hookbaits::warm'],
    tips: [
      'Kijk of je karper aan het oppervlak ziet — dat is een teken voor zig of surface.',
      'Gebruik licht eindtuig — geen lood maar een lichte in-line setup of controller.',
      'Vis breed — warm water karper rondjes draait.',
    ],
  },

  // ── Wier / kruid → Popup verplicht ───────────────────────────────────
  {
    id: 'carp_wier',
    discipline: 'karper',
    conditions: { vegetation: 'zwaar' },
    recommendation: {
      baitFamily:   'popup',
      colorProfile: 'high_contrast',
      sizeBand:     '15-18mm',
      technique:    'popup_weed',
      explanation:
        'Zwaar begroeid water: een bottom bait verdwijnt direct in het wier. Gebruik een popup ' +
        '(minimaal 10cm van de bodem) zodat het aas boven het kruid zweeft. Coated hooklink voorkomt ' +
        'dat de lijn vastloopt in wier.',
      alternativeNote: 'Snowman (bottom bait + kleine popup) als het wier dunner is.',
    },
    productRuleKeys: ['hookbaits::wier', 'terminal_tackle::wier'],
    tips: [
      'Gebruik een anti-tangle tube om de rig door het wier te voeren.',
      'Maak de hooklink korter (10–15cm) bij dichte begroeiing.',
      'Een PVA bag houdt het rig beschermd tijdens het landen.',
    ],
  },

  // ── Modder / slib → Popup verplicht ──────────────────────────────────
  {
    id: 'carp_modder',
    discipline: 'karper',
    conditions: { vegetation: 'geen' },
    minConditions: 0, // altijd tonen als bodem hint modder is via watertype
    recommendation: {
      baitFamily:   'popup',
      colorProfile: 'high_contrast',
      sizeBand:     '15mm',
      technique:    'popup_slib',
      explanation:
        'Slibbodem: een bottom bait zinkt weg en is onvindbaar voor de karper. Gebruik altijd een ' +
        'popup zodat het aas zichtbaar boven het slib zweeft. Lange hooklink (20–25cm) zodat de lijn ' +
        'over het slib heen ligt.',
    },
    productRuleKeys: ['hookbaits::modder'],
    tips: [
      'Test de bodem met een marker float voor je cast.',
      'Een PVA foam plug in de haak voorkomt inzakken bij de landing.',
    ],
  },

  // ── Dalende luchtdruk → Passief vissen ───────────────────────────────
  {
    id: 'carp_druk_daalt',
    discipline: 'karper',
    conditions: { pressureTrend: 'dalend' },
    recommendation: {
      baitFamily:   'wafter',
      colorProfile: 'natural',
      technique:    'bottom_geduldig',
      explanation:
        'Dalende luchtdruk: karper stopt vaak met actief eten. Blijf op één stek, vis ' +
        'statisch met weinig voer. Een wafter of enkel haakaas werkt beter dan breed voeren — ' +
        'karper "proefd" eerder dan dat hij eet.',
      alternativeNote: 'Neem een break — dalende druk gaat voorbij en daarna is er vaak een piekvangst.',
    },
    productRuleKeys: ['hookbaits::koud'],
    tips: [
      'Minimaal voer bij dalende druk.',
      'Let op weersverandering — als het gaat regenen kan de beet direct komen.',
    ],
  },

  // ── Stijgende luchtdruk → Actief voeren ──────────────────────────────
  {
    id: 'carp_druk_stijgt',
    discipline: 'karper',
    conditions: { pressureTrend: 'stijgend' },
    recommendation: {
      baitFamily:   'boilie',
      colorProfile: 'natural',
      sizeBand:     '18mm',
      technique:    'aktief_voeren',
      explanation:
        'Stijgende luchtdruk: een actieve feedperiode voor karper. Dit is het moment om goed te ' +
        'voeren met een spod of cobra. Gebruik je beste boilies — karper is minder kritisch en ' +
        'eet echt.',
    },
    productRuleKeys: ['hookbaits::warm', 'bait_liquids::warm'],
    tips: [
      'Goede stijgende druk duurt 6–12 uur — maak er gebruik van.',
      'Vis breed over meerdere kanten.',
    ],
  },

  // ── Polder / ondiep ───────────────────────────────────────────────────
  {
    id: 'carp_polder',
    discipline: 'karper',
    conditions: { waterType: 'polder', depthBand: 'ondiep' },
    recommendation: {
      baitFamily:   'wafter',
      colorProfile: 'natural',
      sizeBand:     '12-14mm',
      technique:    'licht_eindtuig',
      explanation:
        'Polder of kanaal, ondiep water: gebruik licht eindtuig (geen zware lead) en kleine ' +
        'haakaas. Karper schrikt snel in ondiep water — dunne lijn en rustige aanpak zijn key. ' +
        'Gooi zo ver mogelijk van je stek af.',
    },
    productRuleKeys: ['hookbaits::helder', 'terminal_tackle'],
    tips: [
      'Kleding: camouflage of donkere kleuren, vlak neerzitten.',
      'Cast voorzichtig — gooi niet recht op de bodem maar laat het aas zakken.',
    ],
  },

  // ── Fallback karper ───────────────────────────────────────────────────
  {
    id: 'carp_default',
    discipline: 'karper',
    conditions: {},
    minConditions: 0,
    recommendation: {
      baitFamily:   'wafter',
      colorProfile: 'natural',
      sizeBand:     '15mm',
      technique:    'allround',
      explanation:
        'Standaard allround aanpak: een naturelkleurige wafter of boilie op een strak geankerden ' +
        'rig. Begin met kleine hoeveelheden los voer en verhoog als je reactie ziet. Pas aan op ' +
        'basis van het water dat je aantreft.',
    },
    productRuleKeys: ['hookbaits', 'terminal_tackle', 'bait_liquids'],
    tips: [
      'Observeer het water eerst — karper verraadt zichzelf.',
      'Controleer tuid en hooklink voor elke cast.',
    ],
  },
];

/* ==========================================================================
   SNOEK / ROOFVIS RULES
   ========================================================================== */

const ROOFVIS_RULES: AdviceRule[] = [

  // ── Troebel + Koud → Shad hoog contrast, slow ────────────────────────
  {
    id: 'pike_troebel_koud',
    discipline: 'roofvis',
    conditions: { clarity: 'troebel', temperatureBand: 'koud' },
    recommendation: {
      baitFamily:   'shad',
      colorProfile: 'high_contrast',
      sizeBand:     '14-17cm',
      technique:    'slow_jigging',
      explanation:
        'Troebel en koud water: snoek is traag en ziet slecht. Kies een grote shad (14–17cm) ' +
        'in hoog contrast (chartreuse, UV-oranje, pimpelpaars) zodat hij opvalt. Vis langzaam ' +
        'met pauzes nabij de bodem — snoek bijt in de stilstaande fase.',
      alternativeNote: 'Spinnerbait met grote Colorado blade geeft veel trilling bij weinig zicht.',
    },
    productRuleKeys: ['lure_families::troebel', 'lure_families::koud'],
    tips: [
      'Verlaag je retrieve speed met 50% t.o.v. warm water.',
      'Vis zo dicht mogelijk bij de bodem — koude snoek hangt laag.',
      'Stalen onderlijn altijd — zeker als de snoek traag bijt en je haak dieper ingetrokken wordt.',
    ],
  },

  // ── Helder + Koud → Jerkbait naturel ─────────────────────────────────
  {
    id: 'pike_helder_koud',
    discipline: 'roofvis',
    conditions: { clarity: 'helder', temperatureBand: 'koud' },
    recommendation: {
      baitFamily:   'jerkbait',
      colorProfile: 'natural',
      sizeBand:     '12-15cm',
      technique:    'slow_jerk',
      explanation:
        'Helder en koud water: snoek kan ver zien maar is kritisch. Gebruik een jerkbait of ' +
        'grote softbait in naturelkleuren (wit, zilver, naturel blauw). Vis met lange pauzes ' +
        'tussen jerks — koude snoek volgt lang maar bijt pas als het aas stilstaat.',
      alternativeNote: 'Kleine glider of suspending plug als jerkbait niet werkt.',
    },
    productRuleKeys: ['lure_families::helder', 'lure_families::koud'],
    tips: [
      'Tel tot 5 na elke jerk — snoek bijt in de pauze.',
      'Fluorocarbon leader is minder zichtbaar in helder water dan staal.',
      'Vis in de zon — snoek zoekt warmte bij helder koud weer.',
    ],
  },

  // ── Troebel + Warm → Spinnerbait / grote plug ────────────────────────
  {
    id: 'pike_troebel_warm',
    discipline: 'roofvis',
    conditions: { clarity: 'troebel', temperatureBand: 'warm' },
    recommendation: {
      baitFamily:   'spinner',
      colorProfile: 'high_contrast',
      sizeBand:     '15-20cm',
      technique:    'mid_water_snel',
      explanation:
        'Troebel en warm water: snoek is actief maar de zichtafstand is beperkt. Maximale ' +
        'trilling en geluid — een spinnerbait met grote Colorado blade of een rattling crankbait. ' +
        'Vis op mid-water met een snelle retrieve.',
      alternativeNote: 'Buzzbait of topwater plug als snoek aan het oppervlak jaagt.',
    },
    productRuleKeys: ['lure_families::troebel', 'lure_families::warm'],
    tips: [
      'Snoek is agressief in warm troebel water — snelle aantrekkingen werken.',
      'Vis langs oeverstructuren — riet, brugpijlers, overhangende bomen.',
    ],
  },

  // ── Helder + Warm → Surface / topwater ───────────────────────────────
  {
    id: 'pike_helder_warm',
    discipline: 'roofvis',
    conditions: { clarity: 'helder', temperatureBand: 'warm' },
    recommendation: {
      baitFamily:   'plug',
      colorProfile: 'natural',
      sizeBand:     '10-14cm',
      technique:    'surface_topwater',
      explanation:
        'Helder en warm water: de meest spektaculaire snoekvisserij. Probeer een surface plug ' +
        'of walker vroeg \'s ochtends en laat \'s avonds. Snoek jaagt actief op het oppervlak ' +
        'bij warm helder water. Vis rustig en laat het aas liggen na iedere trek.',
      alternativeNote: 'Als surface niet werkt: ondiepe crankbait of zwemmende shad.',
    },
    productRuleKeys: ['lure_families::helder', 'lure_families::warm', 'lure_families::ondiep'],
    tips: [
      'Sloeg de snoek en mis? Wacht 30 seconden — hij komt vaak terug.',
      'Gooi naar de schaduwkant van waterplanten.',
      'Vroege ochtend en avond zijn de beste momenten voor surface.',
    ],
  },

  // ── Polder / ondiep ───────────────────────────────────────────────────
  {
    id: 'pike_polder',
    discipline: 'roofvis',
    conditions: { waterType: 'polder', depthBand: 'ondiep' },
    recommendation: {
      baitFamily:   'plug',
      colorProfile: 'high_contrast',
      sizeBand:     '8-12cm',
      technique:    'ondieplopers',
      explanation:
        'Polder en ondiep water: ondieplopers en shallow crankbaits zijn perfect hier. ' +
        'Gebruik kleine weedless rigs of ondieplopers zodat je niet op de bodem blijft haken. ' +
        'Vis de kanaalranden, rietkragen en bruggen af — snoek staat hier op post.',
      alternativeNote: 'Kleine spinnerbait (14–18g) werkt goed door de ondiepe polderkanalen.',
    },
    productRuleKeys: ['lure_families::ondiep', 'lure_families::polder'],
    tips: [
      'Polder snoek is mobiel — loop 100m door als je niets ziet.',
      'Vis elke brug, elke splitsing en elke rietkraag.',
      'Wisselen van kleur elke 30 min geeft veel informatie over voorkeur.',
    ],
  },

  // ── Diep water (meer / put) ───────────────────────────────────────────
  {
    id: 'pike_diep',
    discipline: 'roofvis',
    conditions: { depthBand: 'diep' },
    recommendation: {
      baitFamily:   'shad',
      colorProfile: 'high_contrast',
      sizeBand:     '15-20cm',
      technique:    'vertical_jigging',
      explanation:
        'Diep water: gebruik een zware jighead (21–28g) met een grote shad. Verticaal jigging ' +
        'is de meest effectieve techniek in diep water — laat zakken tot de bodem en retrieve ' +
        'met korte, scherpe trekken. Snoek staat in de laag vlak boven de thermoklino.',
    },
    productRuleKeys: ['lure_families::diep', 'leaders_terminal'],
    tips: [
      'Gebruik een sonar om de diepteligger van de snoek te bepalen.',
      'Zware jighead (21–28g) is nodig voor de diepte.',
    ],
  },

  // ── Stijgende druk → Feedperiode ─────────────────────────────────────
  {
    id: 'pike_druk_stijgt',
    discipline: 'roofvis',
    conditions: { pressureTrend: 'stijgend' },
    recommendation: {
      baitFamily:   'spinner',
      colorProfile: 'natural',
      technique:    'snelle_presentaties',
      explanation:
        'Stijgende luchtdruk: snoek is actief en jaagt. Dit is het moment voor snelle, ' +
        'grote presentaties. Werk een plek snel af en loop door — snoek staat klaar om aan te ' +
        'vallen.',
    },
    productRuleKeys: ['lure_families', 'lure_families::warm'],
    tips: ['Stijgende druk + bewolking = ideale snoekdag.'],
  },

  // ── Dalende druk → Passief / diep ────────────────────────────────────
  {
    id: 'pike_druk_daalt',
    discipline: 'roofvis',
    conditions: { pressureTrend: 'dalend' },
    recommendation: {
      baitFamily:   'shad',
      colorProfile: 'natural',
      technique:    'slow_deep',
      explanation:
        'Dalende luchtdruk: snoek trekt dieper en is minder agressief. Vis langzamer, dieper ' +
        'en met langere pauzes. Een grote naturelkleurige shad vlak boven de bodem is de beste ' +
        'kans.',
      alternativeNote: 'Bij sterk dalende druk kun je beter na de weerswisseling vissen.',
    },
    productRuleKeys: ['lure_families::koud', 'lure_families::diep'],
    tips: ['Dalende druk is de moeilijkste conditie voor snoek.'],
  },

  // ── Wier / zwaar begroeid ────────────────────────────────────────────
  {
    id: 'pike_wier',
    discipline: 'roofvis',
    conditions: { vegetation: 'zwaar' },
    recommendation: {
      baitFamily:   'softbait',
      colorProfile: 'high_contrast',
      technique:    'weedless',
      explanation:
        'Zwaar begroeid water: gebruik een weedless softbait of Texas rig om door het kruid te ' +
        'kunnen vissen zonder constant vast te haken. Snoek staat in en rondom het wier op post — ' +
        'vis de randen en openingen af.',
    },
    productRuleKeys: ['lure_families::wier'],
    tips: [
      'Texas rig of weedless jighead voorkomt ophalen van wier.',
      'Stalen onderlijn van 20–25cm is genoeg, langer haak vast.',
    ],
  },

  // ── Fallback roofvis ──────────────────────────────────────────────────
  {
    id: 'pike_default',
    discipline: 'roofvis',
    conditions: {},
    minConditions: 0,
    recommendation: {
      baitFamily:   'shad',
      colorProfile: 'high_contrast',
      sizeBand:     '12-15cm',
      technique:    'allround',
      explanation:
        'Standaard allround aanpak: begin met een shad van 12–15cm in een opvallende kleur ' +
        '(chartreuse, oranje). Vis op mid-water langs structuren — bruggen, riet, overhangende ' +
        'bomen. Wissel kleur na 15 minuten als je geen reactie krijgt.',
    },
    productRuleKeys: ['lure_families', 'leaders_terminal'],
    tips: [
      'Altijd een stalen onderlijn bij snoek.',
      'Wissel elke 15 min van kleur tot je een patroon vindt.',
    ],
  },
];

const ALL_RULES = [...KARPER_RULES, ...ROOFVIS_RULES];

/* ==========================================================================
   Matching engine
   ========================================================================== */

/**
 * Score how well a rule's conditions match the given context.
 * Returns 0 if a required condition conflicts, or the count of matching conditions.
 */
function scoreRule(rule: AdviceRule, context: AdviceContext): number {
  const conditionKeys = Object.keys(rule.conditions) as (keyof AdviceContext)[];

  if (conditionKeys.length === 0) {
    // Default / fallback rule — always matches but with lowest priority
    return (rule.minConditions ?? 0) === 0 ? 0.1 : 0;
  }

  let matches = 0;
  for (const key of conditionKeys) {
    const ruleVal    = rule.conditions[key];
    const contextVal = context[key];

    if (!contextVal) continue; // context field not set → skip (don't penalise)
    if (contextVal === ruleVal) {
      matches++;
    } else {
      // Conflicting condition — this rule is not a good match
      return -1;
    }
  }

  const minRequired = rule.minConditions ?? 1;
  return matches >= minRequired ? matches : -1;
}

/**
 * Find the best matching rule for the given context.
 */
function findBestRule(
  rules:    AdviceRule[],
  context:  AdviceContext
): AdviceRule | null {
  const disciplineRules = rules.filter((r) => r.discipline === context.discipline);

  let best: AdviceRule | null = null;
  let bestScore = -1;

  for (const rule of disciplineRules) {
    const score = scoreRule(rule, context);
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  return best;
}

/* ==========================================================================
   Public API
   ========================================================================== */

/**
 * Get advice for a given context.
 * Always returns an AdviceOutput (falls back to the default rule if no specific match).
 */
export function getAdvice(context: AdviceContext): AdviceOutput {
  const rule = findBestRule(ALL_RULES, context) ??
    ALL_RULES.find((r) => r.discipline === context.discipline && r.id.endsWith('_default')) ??
    ALL_RULES[0];

  return {
    context,
    primaryRecommendation: rule.recommendation,
    productRuleKeys:       rule.productRuleKeys,
    tips:                  rule.tips,
  };
}

/**
 * Get the top-3 matching rules for a context (for showing alternatives).
 */
export function getTopRules(context: AdviceContext, count = 3): AdviceRule[] {
  const disciplineRules = ALL_RULES.filter((r) => r.discipline === context.discipline);

  return disciplineRules
    .map((r) => ({ rule: r, score: scoreRule(r, context) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.rule);
}

/* ==========================================================================
   Label helpers (used by AdviceForTodaySheet)
   ========================================================================== */

export const WATER_TYPE_LABELS: Record<string, string> = {
  meer:    'Meer / Put',
  polder:  'Polder / Kanaal',
  rivier:  'Rivier',
  kanaal:  'Kanaal / Sloot',
  vijver:  'Vijver',
};

export const DEPTH_LABELS: Record<string, string> = {
  ondiep:  'Ondiep (<1.5m)',
  middel:  'Middel (1.5–4m)',
  diep:    'Diep (>4m)',
};

export const CLARITY_LABELS: Record<string, string> = {
  helder:  'Helder',
  troebel: 'Troebel',
  groen:   'Groen / Algen',
};

export const TEMP_LABELS: Record<string, string> = {
  koud:      'Koud (<8°C)',
  gematigd:  'Gematigd (8–16°C)',
  warm:      'Warm (>16°C)',
};

export const PRESSURE_LABELS: Record<string, string> = {
  stabiel:  'Stabiel',
  stijgend: 'Stijgend',
  dalend:   'Dalend',
};

export const VEGETATION_LABELS: Record<string, string> = {
  geen:   'Geen / Open',
  licht:  'Licht begroeid',
  zwaar:  'Zwaar / Wier',
};
