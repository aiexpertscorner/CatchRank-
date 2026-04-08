/**
 * taxonomy.ts
 *
 * Canonical client-side taxonomy utilities for the Gear feature.
 * Single source of truth — replaces duplicated inference logic in:
 *   - productFeedService.ts
 *   - Gear.tsx
 *   - ProductDetailSheet.tsx
 *
 * Mirrors the seed pipeline in scripts/seed/03-classify.mjs (keyword logic).
 * All label constants are centralized here.
 */

import type { ProductCatalogItem, ProductTaxonomy } from '../../../types';

/* -------------------------------------------------------------------------- */
/* Label constants                                                             */
/* -------------------------------------------------------------------------- */

export const DISCIPLINE_LABELS: Record<string, string> = {
  karper:      'Karper',
  roofvis:     'Roofvis',
  witvis:      'Witvis',
  nachtvissen: 'Nachtvissen',
  zeevis:      'Zeevis',
  algemeen:    'Allround',
  allround:    'Allround',
};

export const PRIMARY_CATEGORY_LABELS: Record<string, string> = {
  hengels:        'Hengels',
  molens:         'Molens',
  lijnen:         'Lijnen',
  rigs_terminal:  'Rigs & Terminal',
  kunstaas:       'Kunstaas',
  aas_voer:       'Aas & Voer',
  beetregistratie:'Beetregistratie',
  rod_support:    'Hengel Ondersteuning',
  landing_care:   'Landing & Verzorging',
  luggage:        'Tassen & Opslag',
  bivvy_camping:  'Bivvy & Camping',
  sleep_sit:      'Slapen & Zitten',
  cooking:        'Koken & Eten',
  elektronica:    'Elektronica',
  kleding:        'Kleding',
  tools:          'Tools',
  boten:          'Boten',
  outdoor:        'Outdoor',
};

/** Backward-compatible subSubCategory label map (used by ProductDetailSheet and filter UI). */
export const SUBSUB_LABELS: Record<string, string> = {
  boilie:         'Boilies',
  boilies:        'Boilies',
  wafter:         'Wafters',
  wafters:        'Wafters',
  popup:          'Pop-ups',
  popups:         'Pop-ups',
  pva:            'PVA',
  pellet:         'Pellets',
  pellets:        'Pellets',
  groundbait:     'Grondvoer',
  liquid:         'Liquids & Dips',
  liquids:        'Liquids & Dips',
  particles:      'Particles',
  rig:            'Rigs',
  hooklink:       'Onderlijnen',
  lead_clip:      'Leadclip',
  leadclip:       'Leadclip',
  haak:           'Haken',
  lood:           'Lood',
  bite_alarm:     'Bite Alarms',
  receiver:       'Ontvanger',
  rod_pod:        'Rod Pods',
  bankstick:      'Banksticks',
  spod:           'Spods',
  marker:         'Marker',
  marker_float:   'Marker Float',
  karperhengel:   'Karperhengels',
  spinhengel:     'Spinhengels',
  feederhengel:   'Feederhengels',
  matchhengel:    'Matchhengels',
  baitrunner:     'Baitrunner',
  spinning_reel:  'Spinningsmolen',
  baitcaster:     'Baitcaster',
  fluorocarbon:   'Fluorocarbon',
  braid:          'Gevlochten Lijn',
  mono:           'Mono',
  jerkbait:       'Jerkbaits',
  softbait:       'Softbaits',
  crankbait:      'Crankbaits',
  spinnerbait:    'Spinnerbaits',
  jighead:        'Jigheads',
  dropshot:       'Dropshot',
  dropshot_lure:  'Dropshot Kunstaas',
  plug:           'Plugs',
  surface_lure:   'Surface Kunstaas',
  spoon:          'Lepels',
  swimbait:       'Swimbaits',
  bivvy:          'Bivvy',
  brolly:         'Brolly',
  shelter:        'Shelter',
  groundsheet:    'Groundsheet',
  bedchair:       'Bedchair',
  stretcher:      'Stretcher',
  sleeping_bag:   'Slaapzak',
  sleep_system:   'Slaapsysteem',
  head_torch:     'Hoofdlamp',
  landing_net:    'Schepnet',
  mat:            'Onthaakmat',
  weigh_sling:    'Weegnet',
};

/** Backward-compatible category label map (rod, reel, etc.) */
export const CATEGORY_LABELS: Record<string, string> = {
  rod:        'Hengel',
  reel:       'Molen',
  line:       'Lijn',
  lure:       'Kunstaas',
  hook:       'Haak',
  bait:       'Aas',
  accessory:  'Accessoire',
  other:      'Overig',
};

export const SKILL_LEVEL_LABELS: Record<string, string> = {
  beginner:  'Beginner',
  allround:  'Allround',
  gevorderd: 'Gevorderd',
};

/* -------------------------------------------------------------------------- */
/* Blob builder                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Build a rich text blob from all available product fields.
 * Used as the basis for all inference functions.
 */
export function buildProductBlob(product: ProductCatalogItem): string {
  return [
    product.name,
    product.brand,
    product.description,
    (product as any).seedCategory,
    (product as any).seedProductType,
    (product as any).titleRaw,
    (product as any).categoryRaw,
    ...((product as any).tags ?? []),
    ...(product.clusters ?? []),
    ...(product.taxonomy?.species ?? []),
    ...(product.taxonomy?.technique ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* Main section / discipline inference                                         */
/* -------------------------------------------------------------------------- */

/**
 * Infer disciplines array for a product.
 * Returns an array (e.g. ['karper', 'nachtvissen']) instead of a single value.
 * Uses V2 taxonomy with nachtvissen as a first-class discipline.
 */
export function inferDisciplines(
  blob: string,
  taxonomy?: ProductTaxonomy
): string[] {
  const species = taxonomy?.species ?? [];
  const techniques = taxonomy?.technique ?? [];
  const disciplines = new Set<string>();

  // Karper
  if (
    species.includes('karper') ||
    techniques.includes('karpervissen') ||
    blob.includes('karper') ||
    blob.includes('carp') ||
    blob.includes('boilie') ||
    blob.includes('wafter') ||
    blob.includes('popup') ||
    blob.includes('pop-up') ||
    blob.includes('bite alarm') ||
    blob.includes('rod pod') ||
    blob.includes('leadclip') ||
    blob.includes('baitrunner') ||
    blob.includes('hair rig') ||
    blob.includes('chod rig') ||
    blob.includes('zig rig') ||
    blob.includes('tiger nut') ||
    blob.includes('spod') ||
    blob.includes('marker')
  ) {
    disciplines.add('karper');
  }

  // Roofvis
  if (
    species.includes('snoek') ||
    species.includes('baars') ||
    species.includes('zander') ||
    techniques.includes('roofvissen') ||
    blob.includes('roofvis') ||
    blob.includes('predator') ||
    blob.includes('jerkbait') ||
    blob.includes('shad') ||
    blob.includes('dropshot') ||
    blob.includes('kunstaas') ||
    blob.includes('spinner') ||
    blob.includes('plug') ||
    blob.includes('wobbler') ||
    blob.includes('softbait') ||
    blob.includes('crankbait') ||
    blob.includes('swimbait') ||
    blob.includes('spinnerbait') ||
    blob.includes('chatterbait') ||
    blob.includes('streetfishing')
  ) {
    disciplines.add('roofvis');
  }

  // Witvis
  if (
    species.includes('witvis') ||
    techniques.includes('feedervissen') ||
    blob.includes('witvis') ||
    blob.includes('feeder') ||
    blob.includes('method feeder') ||
    blob.includes('grondvoer') ||
    blob.includes('groundbait') ||
    blob.includes('brasem') ||
    blob.includes('voorn')
  ) {
    disciplines.add('witvis');
  }

  // Nachtvissen (first-class V2 discipline)
  if (
    techniques.includes('nachtvissen') ||
    blob.includes('nachtvissen') ||
    blob.includes('bivvy') ||
    blob.includes('bedchair') ||
    blob.includes('sleeping bag') ||
    blob.includes('slaapzak') ||
    blob.includes('head torch') ||
    blob.includes('hoofdlamp') ||
    blob.includes('bivvy light') ||
    blob.includes('night fishing')
  ) {
    disciplines.add('nachtvissen');
    // Bivvy/bedchair/sleeping gear is also karper-adjacent
    if (!disciplines.has('karper') && (blob.includes('bivvy') || blob.includes('bedchair') || blob.includes('sleeping bag'))) {
      disciplines.add('karper');
    }
  }

  if (disciplines.size === 0) disciplines.add('algemeen');
  return [...disciplines];
}

/**
 * Infer a single mainSection string for backward compatibility.
 * Prefers the most specific non-algemeen discipline.
 */
export function inferMainSection(
  blob: string,
  taxonomy?: ProductTaxonomy
): string {
  // If product already has explicit new disciplines array, use it
  const disciplines = inferDisciplines(blob, taxonomy);
  if (disciplines.includes('karper')) return 'karper';
  if (disciplines.includes('roofvis')) return 'roofvis';
  if (disciplines.includes('witvis')) return 'witvis';
  if (disciplines.includes('nachtvissen')) return 'karper'; // backward compat: nachtvissen maps to karper section
  return 'allround';
}

/* -------------------------------------------------------------------------- */
/* SubSubCategory inference (backward compat)                                 */
/* -------------------------------------------------------------------------- */

export function inferSubSubCategory(blob: string): string {
  if (blob.includes('wafter')) return 'wafter';
  if (blob.includes('pop-up') || blob.includes('popup')) return 'popup';
  if (blob.includes('boilie')) return 'boilie';
  if (blob.includes('pellet')) return 'pellet';
  if (blob.includes('groundbait') || blob.includes('grondvoer')) return 'groundbait';
  if (blob.includes('dip') || blob.includes('soak') || blob.includes('liquid') || blob.includes('glug')) return 'liquid';
  if (blob.includes('pva')) return 'pva';
  if (blob.includes('tiger nut') || blob.includes('tigernut') || blob.includes('hemp') || blob.includes('particle')) return 'particles';
  if (blob.includes('leadclip') || blob.includes('lead clip')) return 'lead_clip';
  if (blob.includes('hooklink') || blob.includes('onderlijn')) return 'hooklink';
  if (blob.includes('hair rig') || blob.includes('chod rig') || blob.includes('zig rig') || blob.includes(' rig ') || blob.includes(' rig\b')) return 'rig';
  if (blob.includes('bite alarm') || blob.includes('beetmelder')) return 'bite_alarm';
  if (blob.includes('rod pod')) return 'rod_pod';
  if (blob.includes('spod') || blob.includes('spomb')) return 'spod';
  if (blob.includes('marker')) return 'marker';
  if (blob.includes('karperhengel') || blob.includes('carp rod')) return 'karperhengel';
  if (blob.includes('feederhengel') || blob.includes('feeder rod')) return 'feederhengel';
  if (blob.includes('spinhengel') || blob.includes('spinning rod') || blob.includes('lure rod')) return 'spinhengel';
  if (blob.includes('method feeder')) return 'method_feeder';
  if (blob.includes('fluorocarbon') || blob.includes('fluoro')) return 'fluorocarbon';
  if (blob.includes('gevlochten') || blob.includes('braid') || blob.includes('dyneema')) return 'braid';
  if (blob.includes('mono') || blob.includes('monofilament')) return 'mono';
  if (blob.includes('jerkbait')) return 'jerkbait';
  if (blob.includes('shad')) return 'softbait';
  if (blob.includes('spinnerbait') || blob.includes('chatterbait')) return 'spinnerbait';
  if (blob.includes('spinner')) return 'spinnerbait';
  if (blob.includes('plug') || blob.includes('wobbler') || blob.includes('crankbait')) return 'plug';
  if (blob.includes('dropshot')) return 'dropshot_lure';
  if (blob.includes('softbait') || blob.includes('soft bait')) return 'softbait';
  if (blob.includes('swimbait')) return 'swimbait';
  if (blob.includes('jighead') || blob.includes('jigkop')) return 'jighead';
  if (blob.includes('baitrunner') || blob.includes('freespool')) return 'baitrunner';
  if (blob.includes('baitcaster') || blob.includes('multiplier')) return 'baitcaster';
  if (blob.includes('sleeping bag') || blob.includes('slaapzak')) return 'sleeping_bag';
  if (blob.includes('bedchair') || blob.includes('bed chair')) return 'bedchair';
  if (blob.includes('stretcher') || blob.includes(' cot ')) return 'stretcher';
  if (blob.includes('bivvy')) return 'bivvy';
  if (blob.includes('brolly')) return 'brolly';
  if (blob.includes('shelter')) return 'shelter';
  if (blob.includes('groundsheet')) return 'groundsheet';
  if (blob.includes('head torch') || blob.includes('hoofdlamp') || blob.includes('headlamp')) return 'head_torch';
  if (blob.includes('landing net') || blob.includes('schepnet')) return 'landing_net';
  if (blob.includes('unhooking mat') || blob.includes('onthaakmat') || blob.includes('carp mat')) return 'mat';
  if (blob.includes('weigh sling') || blob.includes('weigh bag')) return 'weigh_sling';
  return 'all';
}

/* -------------------------------------------------------------------------- */
/* Skill level inference                                                       */
/* -------------------------------------------------------------------------- */

export function inferSkillLevel(blob: string): 'beginner' | 'allround' | 'gevorderd' {
  if (
    blob.includes('starter') ||
    blob.includes('beginners') ||
    blob.includes('beginner') ||
    blob.includes('entry level') ||
    blob.includes('eerste stap') ||
    blob.includes('pakket voor beginners') ||
    blob.includes('combi set') ||
    blob.includes('starterset')
  ) return 'beginner';

  if (
    blob.includes('tournament') ||
    blob.includes('competition') ||
    blob.includes('pro') ||
    blob.includes('expert') ||
    blob.includes('specialist') ||
    blob.includes('carbon fibre') ||
    blob.includes('carbon fiber') ||
    blob.includes('premium') ||
    blob.includes('avid') ||
    blob.includes('nash') ||
    blob.includes('korda') ||
    blob.includes('fox international')
  ) return 'gevorderd';

  return 'allround';
}

/* -------------------------------------------------------------------------- */
/* Decision support: reasons a product is recommended                         */
/* -------------------------------------------------------------------------- */

/**
 * Returns 1-3 Dutch reason strings explaining why this product is worth considering.
 * Used in product cards and ProductDetailSheet.
 */
export function getReasonsRecommended(
  product: ProductCatalogItem,
  userDiscipline?: string
): string[] {
  const reasons: string[] = [];

  const composite = product.scores?.composite ?? 0;
  const rating = product.rating;
  const disciplines: string[] = (product as any).disciplines ?? [];

  // Popularity
  if (composite >= 80) {
    reasons.push('Populair in de categorie');
  } else if (composite >= 65) {
    reasons.push('Hoog in onze ranglijst');
  }

  // Rating
  if (rating && rating.average >= 8.5 && rating.count >= 10) {
    reasons.push(`Top beoordeeld (${rating.average.toFixed(1)}/10)`);
  } else if (rating && rating.average >= 7.5 && rating.count >= 5) {
    reasons.push(`Goed beoordeeld (${rating.average.toFixed(1)}/10)`);
  }

  // Discipline match
  if (userDiscipline && disciplines.includes(userDiscipline)) {
    const label = DISCIPLINE_LABELS[userDiscipline] ?? userDiscipline;
    if (!reasons.some(r => r.includes('Populair'))) {
      reasons.push(`Populair bij ${label.toLowerCase()}vissers`);
    }
  }

  // Price
  const price = product.price;
  if (price != null && price < 20) {
    reasons.push('Voordelige prijs');
  }

  return reasons.slice(0, 2); // max 2 reasons per product
}

/* -------------------------------------------------------------------------- */
/* Enrich product (used by productFeedService as enrichment step)             */
/* -------------------------------------------------------------------------- */

/**
 * Fill in missing mainSection and subSubCategory on a product using canonical inference.
 * Backward-compatible — does not overwrite explicit values already stored in Firestore.
 */
export function enrichProductClient(product: ProductCatalogItem): ProductCatalogItem {
  const blob = buildProductBlob(product);
  const enriched = { ...product } as any;

  if (!enriched.mainSection) {
    enriched.mainSection = inferMainSection(blob, product.taxonomy);
  }

  if (!enriched.subSubCategory || enriched.subSubCategory === 'all') {
    enriched.subSubCategory = inferSubSubCategory(blob);
  }

  if (!enriched.disciplines || enriched.disciplines.length === 0) {
    enriched.disciplines = inferDisciplines(blob, product.taxonomy);
  }

  return enriched as ProductCatalogItem;
}
