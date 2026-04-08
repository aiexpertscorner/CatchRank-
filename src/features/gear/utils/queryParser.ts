/**
 * queryParser.ts
 *
 * Parses free-text search input into structured intent for smarter
 * Discover tab filtering and UX feedback (intent chips).
 *
 * Example:
 *   parseQuery("karper boilies beginners")
 *   → { disciplines: ['karper'], subCategory: 'boilies', skillLevel: 'beginner', cleanQuery: '' }
 */

export interface ParsedQuery {
  rawQuery: string;
  disciplines: string[];
  subCategory?: string;
  species: string[];
  skillLevel?: 'beginner' | 'gevorderd';
  budgetHint?: 'budget' | 'premium';
  brandHint?: string;
  cleanQuery: string; // query with recognized intent tokens removed
}

/* -------------------------------------------------------------------------- */
/* Keyword maps                                                                */
/* -------------------------------------------------------------------------- */

const DISCIPLINE_TOKENS: Record<string, string> = {
  karper:      'karper',
  karpervissen:'karper',
  carp:        'karper',
  roofvis:     'roofvis',
  roofvissen:  'roofvis',
  predator:    'roofvis',
  snoek:       'roofvis',
  witvis:      'witvis',
  feedervissen:'witvis',
  feeder:      'witvis',
  nachtvissen: 'nachtvissen',
  nightfishing:'nachtvissen',
};

const SPECIES_TOKENS: Record<string, string> = {
  snoek:      'snoek',
  pike:       'snoek',
  baars:      'baars',
  perch:      'baars',
  zander:     'zander',
  snoekbaars: 'snoekbaars',
  pikeperch:  'snoekbaars',
  forel:      'forel',
  trout:      'forel',
  brasem:     'brasem',
  bream:      'brasem',
};

const SUBCATEGORY_TOKENS: Record<string, string> = {
  boilies:       'boilies',
  boilie:        'boilies',
  wafters:       'wafters',
  wafter:        'wafters',
  popups:        'popups',
  popup:         'popups',
  'pop-up':      'popups',
  pellets:       'pellets',
  pellet:        'pellets',
  grondvoer:     'groundbait',
  groundbait:    'groundbait',
  rig:           'rig',
  rigs:          'rig',
  hooklink:      'hooklink',
  onderlijn:     'hooklink',
  lood:          'lood',
  'bite alarm':  'bite_alarm',
  beetmelder:    'bite_alarm',
  'rod pod':     'rod_pod',
  rodpod:        'rod_pod',
  jerkbait:      'jerkbait',
  jerkbaits:     'jerkbait',
  shad:          'softbait',
  softbait:      'softbait',
  dropshot:      'dropshot_lure',
  spinner:       'spinnerbait',
  spinnerbait:   'spinnerbait',
  crankbait:     'crankbait',
  plug:          'plug',
  jighead:       'jighead',
  bivvy:         'bivvy',
  bedchair:      'bedchair',
  slaapzak:      'sleeping_bag',
  'sleeping bag':'sleeping_bag',
  fluorocarbon:  'fluorocarbon',
  fluoro:        'fluorocarbon',
  braid:         'braid',
  gevlochten:    'braid',
  mono:          'mono',
};

const BUDGET_TOKENS: Record<string, 'budget' | 'premium'> = {
  goedkoop:  'budget',
  budget:    'budget',
  goedkope:  'budget',
  voordelig: 'budget',
  cheap:     'budget',
  starter:   'budget',
  duur:      'premium',
  premium:   'premium',
  top:       'premium',
  beste:     'premium',
  best:      'premium',
  luxe:      'premium',
};

const SKILL_TOKENS: Record<string, 'beginner' | 'gevorderd'> = {
  beginners:  'beginner',
  beginner:   'beginner',
  starter:    'beginner',
  starters:   'beginner',
  eerste:     'beginner',
  gevorderd:  'gevorderd',
  expert:     'gevorderd',
  tournament: 'gevorderd',
  pro:        'gevorderd',
  specialist: 'gevorderd',
};

// Known brand names (canonical keys from brand-aliases.v1.json)
const KNOWN_BRANDS = new Set([
  'fox', 'nash', 'korda', 'mainline', 'shimano', 'daiwa',
  'savage', 'westin', 'spro', 'berkley', 'rapala', 'guru',
  'preston', 'prologic', 'dynamite', 'ridgemonkey', 'trakker',
  'avid', 'solar', 'esp', 'drennan', 'middy',
]);

/* -------------------------------------------------------------------------- */
/* Parser                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Parse a free-text query string into structured intent.
 */
export function parseQuery(input: string): ParsedQuery {
  const rawQuery = input;
  const lower = input.toLowerCase().trim();

  const disciplines = new Set<string>();
  const species: string[] = [];
  const consumedTokens = new Set<string>();

  let subCategory: string | undefined;
  let skillLevel: 'beginner' | 'gevorderd' | undefined;
  let budgetHint: 'budget' | 'premium' | undefined;
  let brandHint: string | undefined;

  // Tokenize — try multi-word phrases first (2-word), then single words
  const words = lower.split(/\s+/).filter(Boolean);

  // Try 2-word combinations first
  const twoWordPhrases: Array<{ phrase: string; i: number }> = [];
  for (let i = 0; i < words.length - 1; i++) {
    twoWordPhrases.push({ phrase: `${words[i]} ${words[i + 1]}`, i });
  }

  for (const { phrase, i } of twoWordPhrases) {
    if (SUBCATEGORY_TOKENS[phrase] && !subCategory) {
      subCategory = SUBCATEGORY_TOKENS[phrase];
      consumedTokens.add(words[i]);
      consumedTokens.add(words[i + 1]);
    }
  }

  // Single word matching
  for (const word of words) {
    if (consumedTokens.has(word)) continue;

    // Discipline
    if (DISCIPLINE_TOKENS[word]) {
      disciplines.add(DISCIPLINE_TOKENS[word]);
      consumedTokens.add(word);
      continue;
    }

    // Species (also implies discipline)
    if (SPECIES_TOKENS[word]) {
      species.push(SPECIES_TOKENS[word]);
      consumedTokens.add(word);
      // Infer discipline from species
      if (['snoek', 'baars', 'zander', 'snoekbaars'].includes(SPECIES_TOKENS[word])) {
        disciplines.add('roofvis');
      }
      if (['forel'].includes(SPECIES_TOKENS[word])) {
        disciplines.add('roofvis');
      }
      if (['brasem'].includes(SPECIES_TOKENS[word])) {
        disciplines.add('witvis');
      }
      continue;
    }

    // SubCategory (single word)
    if (SUBCATEGORY_TOKENS[word] && !subCategory) {
      subCategory = SUBCATEGORY_TOKENS[word];
      consumedTokens.add(word);
      continue;
    }

    // Budget/premium
    if (BUDGET_TOKENS[word] && !budgetHint) {
      budgetHint = BUDGET_TOKENS[word];
      consumedTokens.add(word);
      continue;
    }

    // Skill level
    if (SKILL_TOKENS[word] && !skillLevel) {
      skillLevel = SKILL_TOKENS[word];
      consumedTokens.add(word);
      // Also set budgetHint from starter → budget
      if (word === 'starter' || word === 'starters') budgetHint = budgetHint ?? 'budget';
      continue;
    }

    // Brand
    if (KNOWN_BRANDS.has(word) && !brandHint) {
      brandHint = word;
      consumedTokens.add(word);
      continue;
    }
  }

  // Infer discipline from subCategory if not already set
  if (disciplines.size === 0 && subCategory) {
    const carpSubCats = ['boilies', 'wafters', 'popups', 'pellets', 'rig', 'hooklink', 'bite_alarm', 'rod_pod', 'lood'];
    const roofvisSubCats = ['jerkbait', 'softbait', 'dropshot_lure', 'spinnerbait', 'crankbait', 'plug', 'jighead'];
    const nachtSubCats = ['bivvy', 'bedchair', 'sleeping_bag'];

    if (carpSubCats.includes(subCategory)) disciplines.add('karper');
    if (roofvisSubCats.includes(subCategory)) disciplines.add('roofvis');
    if (nachtSubCats.includes(subCategory)) { disciplines.add('nachtvissen'); disciplines.add('karper'); }
  }

  // Rebuild cleanQuery from tokens not consumed
  const cleanQuery = words.filter(w => !consumedTokens.has(w)).join(' ');

  return {
    rawQuery,
    disciplines: [...disciplines],
    subCategory,
    species: [...new Set(species)],
    skillLevel,
    budgetHint,
    brandHint,
    cleanQuery,
  };
}

/* -------------------------------------------------------------------------- */
/* Chip label helpers                                                          */
/* -------------------------------------------------------------------------- */

const DISCIPLINE_LABELS: Record<string, string> = {
  karper: 'Karper', roofvis: 'Roofvis', witvis: 'Witvis', nachtvissen: 'Nachtvissen',
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  boilies: 'Boilies', wafters: 'Wafters', popups: 'Pop-ups', rig: 'Rigs',
  hooklink: 'Onderlijnen', bite_alarm: 'Bite Alarms', rod_pod: 'Rod Pod',
  jerkbait: 'Jerkbaits', softbait: 'Softbaits', dropshot_lure: 'Dropshot',
  spinnerbait: 'Spinners', crankbait: 'Crankbaits', jighead: 'Jigheads',
  bivvy: 'Bivvy', bedchair: 'Bedchair', sleeping_bag: 'Slaapzak',
  fluorocarbon: 'Fluoro', braid: 'Gevlochten Lijn', mono: 'Mono',
  pellets: 'Pellets', groundbait: 'Grondvoer',
};

/** Convert a ParsedQuery into displayable chip labels for the UI. */
export function getIntentChips(parsed: ParsedQuery): Array<{ key: string; label: string }> {
  const chips: Array<{ key: string; label: string }> = [];

  for (const d of parsed.disciplines) {
    chips.push({ key: `discipline:${d}`, label: DISCIPLINE_LABELS[d] ?? d });
  }

  if (parsed.subCategory) {
    chips.push({
      key: `subCategory:${parsed.subCategory}`,
      label: SUBCATEGORY_LABELS[parsed.subCategory] ?? parsed.subCategory,
    });
  }

  if (parsed.skillLevel) {
    chips.push({
      key: `skillLevel:${parsed.skillLevel}`,
      label: parsed.skillLevel === 'beginner' ? 'Beginners' : 'Gevorderd',
    });
  }

  if (parsed.budgetHint) {
    chips.push({
      key: `budget:${parsed.budgetHint}`,
      label: parsed.budgetHint === 'budget' ? 'Voordelig' : 'Premium',
    });
  }

  if (parsed.brandHint) {
    const label = parsed.brandHint.charAt(0).toUpperCase() + parsed.brandHint.slice(1);
    chips.push({ key: `brand:${parsed.brandHint}`, label });
  }

  return chips;
}
