/**
 * Global types and interfaces for CatchRank.
 * v2-first, legacy-compatible model layer.
 */

export type AnyTimestamp = any;

/* -------------------------------------------------------------------------- */
/* User                                                                       */
/* -------------------------------------------------------------------------- */

export interface UserSettings {
  units: {
    weight: 'kg' | 'lb';
    length: 'cm' | 'inch';
  };
  theme: 'dark' | 'light' | 'system';
  notifications: {
    push: boolean;
    email: boolean;
    clubActivity: boolean;
    newAchievements: boolean;
  };
}

export interface UserPrivacy {
  profileVisibility: 'public' | 'friends' | 'private';
  logVisibility: 'public' | 'friends' | 'private';
  showLocation: boolean;
  showStats: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  xp: number;
  level: number;
  bio?: string;

  onboardingStatus?: 'welcome' | 'profile' | 'preferences' | 'location' | 'complete';
  onboardingCompletedAt?: AnyTimestamp;
  starterRewardPending?: boolean;

  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  favoriteSpecies?: string[];
  fishingTypes?: string[];

  locationPreference?: {
    lat: number;
    lng: number;
    name: string;
  };

  stats?: {
    totalCatches: number;
    totalSessions: number;
    totalSpots: number;
    speciesCount: number;
    totalPrs?: number;
    personalRecords?: Record<string, { length?: number; weight?: number }>;
  };

  settings?: UserSettings;
  privacy?: UserPrivacy;
  rank?: number;

  badges?: {
    id: string;
    name: string;
    icon: string;
    earnedAt: AnyTimestamp;
  }[];

  milestones?: {
    id: string;
    name: string;
    progress: number;
    target: number;
    isCompleted: boolean;
  }[];

  streak?: {
    current: number;
    lastActive: AnyTimestamp;
  };

  lastActive?: AnyTimestamp;
  createdAt?: AnyTimestamp;
}

/* -------------------------------------------------------------------------- */
/* Shared subtypes                                                            */
/* -------------------------------------------------------------------------- */

export interface WeatherSnapshot {
  temp?: number;
  feelsLike?: number;
  description?: string;
  icon?: string;

  windSpeed?: number;
  windDirection?: number;
  windDir?: string;

  pressure?: number;
  humidity?: number;
  visibility?: number;
  cloudCover?: number;
  uvIndex?: number;
  uv?: number;
  precipitation?: number;
  moonPhase?: number;

  tempC?: number;
  feelslikeC?: number;
  humidityPct?: number;
  pressureMb?: number;
  windKph?: number;
  visKm?: number;
  precipMm?: number;
  sunrise?: string;
  sunset?: string;
}

export interface WaterSnapshot {
  temp?: number;
  clarity?: 'clear' | 'murky' | 'stained' | 'very_murky';
  depth?: number;
  flow?: 'none' | 'slow' | 'medium' | 'fast';
}

export interface CatchGearSelection {
  setupId?: string;
  rodId?: string;
  reelId?: string;
  lineId?: string;
  leaderId?: string;
  lureId?: string;
  lureColor?: string;
  hookSize?: string;
}

export interface SessionTimelineNote {
  text: string;
  timestamp: AnyTimestamp;
  type?: 'note' | 'event' | 'spot_change';
}

export interface SessionSpotTimelineEntry {
  spotId: string;
  name?: string;
  arrivedAt: AnyTimestamp;
  leftAt?: AnyTimestamp;
}

/* -------------------------------------------------------------------------- */
/* Catch                                                                      */
/* -------------------------------------------------------------------------- */

export interface Catch {
  id?: string;

  userId: string;
  authorName?: string;
  authorPhoto?: string;

  /**
   * v2-first naming
   */
  speciesGeneral?: string;
  speciesSpecific?: string;
  baitGeneral?: string;
  baitSpecific?: string;
  mainImage?: string;
  extraImages?: string[];
  latitude?: number;
  longitude?: number;
  weatherSnapshot?: WeatherSnapshot;
  gearIds?: string[];
  gearSetupId?: string;

  /**
   * legacy-compatible fields
   */
  species?: string;
  speciesId?: string;
  bait?: string;
  baitId?: string;
  technique?: string;
  techniqueId?: string;
  photoURL?: string;
  location?: { lat: number; lng: number };

  weight?: number; // grams
  length?: number; // cm

  spotId?: string;
  spotName?: string;
  sessionId?: string;

  timestamp: AnyTimestamp;
  catchTime?: string | AnyTimestamp; // HH:MM string or Timestamp

  status: 'draft' | 'complete' | 'pending';
  incompleteFields?: string[];

  weather?: WeatherSnapshot;
  water?: WaterSnapshot;
  gear?: CatchGearSelection;

  xpEarned?: number;
  isPrivate?: boolean;
  notes?: string;
  city?: string;
  moonPhase?: number | string;
  video?: string;

  /** Schema / migration tracking */
  schemaVersion?: number;
  sessionAutoCreated?: boolean;
  sessionStatsApplied?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Session                                                                    */
/* -------------------------------------------------------------------------- */

export interface SessionStatsSummary {
  totalCatches?: number;
  totalXp?: number;
  speciesCount?: number;
  totalFish?: number;
}

export interface SessionMetadata {
  method?: string;
  waterType?: string;
  targetSpecies?: string[];
}

export interface Session {
  id?: string;

  /**
   * v2-first fields
   */
  userId?: string;
  createdBy?: string;
  participantIds?: string[];

  name?: string;
  type?: 'live' | 'retro' | string;

  startTime?: AnyTimestamp;
  endTime?: AnyTimestamp;
  startAt?: AnyTimestamp;
  endAt?: AnyTimestamp;

  isActive?: boolean;
  lastActivityAt?: AnyTimestamp;

  spotId?: string;
  spotName?: string;

  weatherStart?: WeatherSnapshot;
  weatherEnd?: WeatherSnapshot;

  stats?: SessionStatsSummary;

  /**
   * legacy-compatible fields
   */
  ownerUserId?: string;
  participantUserIds?: string[];
  invitedUserIds?: string[];
  acceptedUserIds?: string[];
  pendingUserIds?: string[];

  title?: string;
  description?: string;
  sessionType?: string;
  mode?: 'live' | 'retro';
  status?:
    | 'draft'
    | 'planned'
    | 'live'
    | 'paused'
    | 'ended'
    | 'completed'
    | 'pending_acceptance'
    | 'archived';

  startedAt?: AnyTimestamp;
  endedAt?: AnyTimestamp;

  createdAt?: AnyTimestamp;
  updatedAt?: AnyTimestamp;

  durationMinutes?: number;

  activeSpotId?: string;
  linkedSpotIds?: string[];
  spotTimeline?: SessionSpotTimelineEntry[];

  linkedCatchIds?: string[];
  linkedSetupIds?: string[];
  linkedGearIds?: string[];
  linkedProductIds?: string[];

  gearIds?: string[];

  weatherSnapshotStart?: WeatherSnapshot;
  weatherSnapshotEnd?: WeatherSnapshot;
  forecastSummary?: string;

  visibility?: 'public' | 'friends' | 'private';

  notes?: string | SessionTimelineNote[];

  metadata?: SessionMetadata;

  statsSummary?: SessionStatsSummary;

  acceptanceStateByUser?: Record<string, 'pending' | 'accepted' | 'declined'>;

  createdFromLiveFlow?: boolean;
  savedAsDraftForParticipants?: boolean;

  /**
   * Optional backend/session integrity fields seen in v2 indexes
   */
  canonical?: boolean;
  canonicalKey?: string;
  canonicalSetAt?: AnyTimestamp;
  dedupeKey?: string;
  dedupedAt?: AnyTimestamp;
  duplicateOf?: string;
  isDuplicate?: boolean;
  catchCount?: number;
  totalXp?: number;
  mainImage?: string;
  extraImages?: string[];
  video?: string;
}

/* -------------------------------------------------------------------------- */
/* Spot                                                                       */
/* -------------------------------------------------------------------------- */

export interface SpotStatsSummary {
  totalCatches: number;
  totalSessions?: number;
  topSpecies: string[];
  avgRating?: number;
  ratingCount?: number;
}

export interface Spot {
  id?: string;

  /**
   * v2-first fields
   */
  title?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;

  privacy?: 'private' | 'friends' | 'public';

  mainImage?: string;
  extraImages?: string[];

  bottomType?: string;
  bottom_type?: string;

  waterType?: 'canal' | 'river' | 'lake' | 'pond' | 'sea' | 'polder' | string;
  water_type?: string;

  spotSize?: string;
  spot_size?: string;

  waterSize?: string;
  water_size?: string;

  nightFishingAllowed?: boolean;
  night_fishing_allowed?: boolean;

  radius?: number;
  city?: string;
  province?: string;

  createdBy?: string;
  created_at?: AnyTimestamp;
  updated_at?: AnyTimestamp;
  migratedAt?: AnyTimestamp;
  schemaVersion?: number;

  statsSummary?: SpotStatsSummary;

  /**
   * legacy-compatible fields
   */
  userId: string;
  authorName?: string;
  authorPhoto?: string;

  name: string;
  description?: string;
  coordinates: { lat: number; lng: number };

  waterBodyName?: string;
  visibility: 'private' | 'friends' | 'public';
  isPrivate?: boolean;
  isFavorite?: boolean;

  species?: string[]; // raw Firestore field — used as targetSpecies in legacy docs
  techniques?: string[];
  targetSpecies?: string[];
  amenities?: string[];

  linkedGearIds?: string[];
  linkedSetupIds?: string[];

  photoURLs?: string[];
  mainPhotoURL?: string;

  /**
   * Map display category — controls marker color/icon on the SpotMap.
   * Separate from visibility (which controls data access).
   * Falls back to visibility if not set.
   */
  spotCategory?: 'public' | 'private' | 'friends' | 'club' | 'betaalwater';

  createdAt?: AnyTimestamp;
  updatedAt?: AnyTimestamp;

  stats?: SpotStatsSummary;
}

/* -------------------------------------------------------------------------- */
/* Other domain models                                                        */
/* -------------------------------------------------------------------------- */

export interface Species {
  id?: string;

  /**
   * App-friendly normalized fields
   */
  name: string;
  scientificName?: string;
  description?: string;
  photoURL?: string;
  xpValue?: number;

  /**
   * Raw Firestore species fields
   */
  species_id?: string;
  name_nl?: string;
  name_latin?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | string;
  xp_base?: number;
  habitat?: string;
  set_group?: string;
  search_keywords?: string[];
}

export interface Club {
  id?: string;
  name: string;
  description: string;
  ownerId: string;
  memberCount: number;
  photoURL?: string;
  isPrivate?: boolean;
  stats?: {
    totalCatches: number;
    totalXp: number;
  };
}

export interface ClubMember {
  id?: string;
  userId: string;
  clubId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: AnyTimestamp;
  userDisplayName?: string;
  userPhotoURL?: string;
}

export interface ClubFeedItem {
  id?: string;
  clubId: string;
  type: 'catch' | 'session' | 'announcement';
  authorId: string;
  authorName: string;
  authorPhoto: string;
  contentId?: string;
  text?: string;
  createdAt: AnyTimestamp;
}

export interface FishingTool {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'weather' | 'analysis' | 'planning' | 'utility';
  path: string;
  isPremium?: boolean;
  isNew?: boolean;
  status: 'active' | 'beta' | 'coming_soon';
}

export interface KnowledgeContent {
  id: string;
  title: string;
  slug: string;
  category: 'species' | 'how-to' | 'guides' | 'academy';
  summary: string;
  content: string;
  photoURL?: string;
  authorId?: string;
  authorName?: string;
  publishedAt: AnyTimestamp;
  tags: string[];
  relatedSpeciesIds?: string[];
  relatedToolIds?: string[];
}

export interface ToolResult {
  id: string;
  userId: string;
  toolId: string;
  input: any;
  output: any;
  createdAt: AnyTimestamp;
  expiresAt?: AnyTimestamp;
}

/* -------------------------------------------------------------------------- */
/* Mijn Visgear                                                               */
/* -------------------------------------------------------------------------- */

export type GearCategory =
  | 'rod'
  | 'reel'
  | 'line'
  | 'lure'
  | 'hook'
  | 'bait'
  | 'accessory'
  | 'other';

export const GEAR_CATEGORY_LABELS: Record<GearCategory, string> = {
  rod: 'Hengel',
  reel: 'Molen',
  line: 'Lijn',
  lure: 'Kunstaas',
  hook: 'Haak',
  bait: 'Levend Aas',
  accessory: 'Accessoire',
  other: 'Overig',
};

export interface GearItem {
  id?: string;
  userId: string;
  name: string;
  brand: string;
  category: GearCategory;
  model?: string;
  description?: string;
  photoURL?: string;
  purchaseDate?: AnyTimestamp;
  purchasePrice?: number;
  isFavorite: boolean;
  linkedCatchIds?: string[];
  linkedSessionIds?: string[];
  linkedSetupIds?: string[];
  usageCount?: number;
  notes?: string;
  affiliateProductId?: string;
  createdAt: AnyTimestamp;
  updatedAt: AnyTimestamp;
}

export interface GearSetup {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  rodId?: string;
  reelId?: string;
  lineId?: string;
  leaderId?: string;
  lureId?: string;
  gearIds: string[];
  catchCount?: number;
  sessionCount?: number;
  notes?: string;
  createdAt: AnyTimestamp;
  updatedAt: AnyTimestamp;
}

/* -------------------------------------------------------------------------- */
/* Product Catalog / Discover                                                 */
/* -------------------------------------------------------------------------- */

export type ProductSource = 'fishinn' | 'bol';

export type ProductMainSection =
  | 'karper'
  | 'roofvis'
  | 'witvis'
  | 'allround'
  | string;

export type ProductClusterType =
  | 'species'
  | 'technique'
  | 'category'
  | 'section'
  | 'detail'
  | 'seed'
  | 'misc';

export interface ProductTaxonomy {
  species: string[];       // ['karper', 'snoek', 'baars']
  technique: string[];     // ['karpervissen', 'roofvissen']
  skillLevel: string;      // 'beginner' | 'allround' | 'gevorderd'
}

export interface ProductScores {
  relevance: number;   // 0-100
  commercial: number;  // 0-100
  rating: number;      // 0-100
  composite: number;   // weighted composite 0-100
}

export interface ProductRating {
  average: number;  // bol.com 0-10 scale
  count: number;
}

export interface ProductCatalogItem {
  id?: string;
  externalId: string;
  source: ProductSource;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  imageURL?: string;
  price?: number;
  currency?: string;
  affiliateURL: string;
  ean?: string;
  inStock?: boolean;
  cachedAt?: AnyTimestamp;

  /**
   * Enriched product structure
   */
  mainSection?: ProductMainSection;
  subSubCategory?: string;

  /**
   * Seed metadata
   */
  seedClusterKey?: string | null;
  seedCategory?: string | null;
  seedProductType?: string | null;
  seedIntent?: string[];

  /**
   * Taxonomy + scoring (written by seed script)
   */
  taxonomy?: ProductTaxonomy;
  scores?: ProductScores;
  clusters?: string[];
  rating?: ProductRating;
}

export interface ProductCluster {
  id?: string;
  key: string;               // 'species:karper'
  label: string;             // 'Karper'
  type?: ProductClusterType;
  total: number;
  topProductIds: string[];   // Firestore doc IDs (top 24)
  updatedAt?: AnyTimestamp;
}

export interface ProductCacheMetadata {
  source: ProductSource | string;
  lastFetched: AnyTimestamp;
  itemCount: number;
  isValid: boolean;
  clusterCount?: number;
  queryCount?: number;
  maxProducts?: number;
}

/* -------------------------------------------------------------------------- */
/* Gear V2 — Interactions (likes / saves / shares)                            */
/* -------------------------------------------------------------------------- */

/** Minimal product snapshot stored inside save/like docs to avoid extra reads */
export interface GearProductSnapshot {
  name: string;
  brand?: string;
  category?: string;
  imageURL?: string;
  price?: number;
  affiliateURL: string;
  source: string;
  mainSection?: string;
}

/** Stored in gear_user_likes/{userId}_{productId} */
export interface GearUserLike {
  id?: string;
  userId: string;
  productId: string;
  createdAt: AnyTimestamp;
}

/** Stored in gear_user_saves/{userId}_{productId} */
export interface GearUserSave {
  id?: string;
  userId: string;
  productId: string;
  saveType: 'wishlist' | 'saved_for_later';
  sourceContext?: string;
  /** Denormalized for display without extra Firestore reads */
  productSnapshot: GearProductSnapshot;
  createdAt: AnyTimestamp;
  updatedAt?: AnyTimestamp;
}

/** Stored in gear_user_shares/{auto-id} */
export interface GearUserShare {
  id?: string;
  userId?: string;
  productId: string;
  channel: 'copy' | 'whatsapp' | 'native' | string;
  sourceScreen?: string;
  createdAt: AnyTimestamp;
}

/* -------------------------------------------------------------------------- */
/* Gear V2 — Slot-based setups                                                */
/* -------------------------------------------------------------------------- */

export interface GearSetupSlot {
  slotKey: string;
  label: string;
  required?: boolean;
  gearItemId?: string;
  productId?: string;
  productSnapshot?: GearProductSnapshot;
  notes?: string;
}

export interface GearSetupV2 {
  id?: string;
  userId: string;
  name: string;
  discipline: 'karper' | 'roofvis' | 'witvis' | 'nachtvissen' | 'allround' | string;
  slots: GearSetupSlot[];
  linkedCatchIds?: string[];
  linkedSessionIds?: string[];
  notes?: string;
  completeness?: number;
  createdAt: AnyTimestamp;
  updatedAt: AnyTimestamp;
}

/**
 * gear-setup-types.ts
 *
 * New type definitions for the Setup Coach feature.
 * ADD THESE to your existing types.ts file.
 *
 * Depends on existing: GearItem, GearSetupV2
 */

import { Timestamp, FieldValue } from 'firebase/firestore';

/* ==========================================================================
   TACKLEBOX ITEM
   Extension of GearItem with Setup Coach fields.
   Stored in user_gear (same collection, backward-compatible).
   ========================================================================== */

export type OwnershipStatus = 'own' | 'want' | 'reserve' | 'replace';
export type ItemCondition   = 'goed' | 'redelijk' | 'vervangen';

export interface TackleboxItem {
  // ── Existing GearItem fields (keep as is) ────────────────────────────────
  id: string;
  userId: string;
  name: string;
  brand: string;
  category: string;           // rod | reel | line | lure | hook | bait | accessory
  model?: string;
  description?: string;
  photoURL?: string;
  purchasePrice?: number;
  isFavorite: boolean;
  notes?: string;
  linkedCatchIds: string[];
  linkedSessionIds: string[];
  linkedSetupIds: string[];
  usageCount: number;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;

  // ── New Setup Coach fields ────────────────────────────────────────────────

  /** What is the user's relationship with this item? */
  ownershipStatus: OwnershipStatus;

  /** Physical condition — only relevant when ownershipStatus = 'own' */
  condition?: ItemCondition;

  /**
   * Which disciplines is this item used for?
   * ['karper'], ['roofvis'], ['karper', 'nachtvissen'], etc.
   */
  disciplineTags: string[];

  /**
   * Which setup block (sectionId) does this item belong to?
   * Maps to setup_sections.id — used by completeness engine.
   * e.g. 'hookbaits', 'rods_reels', 'leaders_terminal'
   */
  sectionId?: string;

  /**
   * Specific role(s) within the section.
   * Maps to setup_requirements.requirementKey.
   * e.g. ['rod'] for a karperhengel, ['bite_alarm'] for a beetmelder.
   * Multiple keys allowed: a multifunctional item can cover several requirements.
   */
  requirementKeys?: string[];
}

/* ==========================================================================
   SETUP TEMPLATES
   Read-only. Seeded via seed-setup-templates.mjs.
   Collection: setup_templates
   ========================================================================== */

export type Discipline    = 'karper' | 'roofvis' | 'witvis' | 'nachtvissen';
export type SessionType   =
  | 'korte_nacht'
  | 'weekender'
  | 'struinen'
  | 'polder_ondiep'
  | 'vrij';

export interface SetupTemplate {
  id: string;
  discipline: Discipline;
  sessionType: SessionType;
  title: string;
  description: string;
  skillLevel: string;
  isDefault: boolean;
  setupSectionIds: string[];
  tags: string[];
  estimatedItems: number;
  updatedAt?: Timestamp | FieldValue;
}

/* ==========================================================================
   SETUP SECTIONS
   Canonical setup blocks. Collection: setup_sections
   ========================================================================== */

export interface SetupSection {
  id: string;                  // 'rods_reels', 'hookbaits', etc.
  label: string;               // Dutch display label
  discipline: string[];        // which disciplines use this section
  description?: string;
  icon?: string;
  sortOrder: number;
}

/* ==========================================================================
   SETUP REQUIREMENTS
   What's needed per template per section. Collection: setup_requirements
   ========================================================================== */

export type RequirementPriority = 'essential' | 'recommended' | 'optional';

export interface SetupRequirement {
  id: string;
  templateId: string;
  sectionId: string;
  requirementKey: string;      // e.g. 'rod', 'bite_alarm', 'unhooking_mat'
  label: string;               // Dutch display label
  priority: RequirementPriority;
  minQty: number;
  recommendedQty: number;
  rationale: string;
  alternativesAllowed?: boolean;
  updatedAt?: Timestamp | FieldValue;
}

/* ==========================================================================
   COMPLETENESS RESULT
   Output of completenessService.computeCompleteness()
   ========================================================================== */

export interface MissingItem {
  requirementKey: string;
  label: string;
  sectionId: string;
  priority: RequirementPriority;
  rationale: string;
}

export interface CompletenessResult {
  essentialsPct: number;       // 0–100
  recommendedPct: number;      // 0–100
  overallPct: number;          // weighted average

  missingItems: MissingItem[]; // missing essential + recommended items
  presentKeys: string[];       // requirementKeys that are covered

  isSessionReady: boolean;     // true when essentialsPct === 100
  totalRequirements: number;
  coveredRequirements: number;
}

/* ==========================================================================
   SESSION SETUP (V2 upgrade)
   Extends GearSetupV2 with template and completeness data.
   Collection: user_gear_setups
   ========================================================================== */

export interface SessionSetup {
  // ── Existing GearSetupV2 fields ─────────────────────────────────────────
  id: string;
  userId: string;
  name: string;
  discipline: string;
  notes?: string;
  slots: any[];                // GearSetupSlot[] — keep existing
  completeness: number;        // legacy 0–100 number (keep for backward compat)
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;

  // ── New Setup Coach fields ────────────────────────────────────────────────

  /** Which template this setup is based on (optional for free setups) */
  templateId?: string;

  /** Session type from the template */
  sessionType?: SessionType;

  /** Computed completeness per priority tier */
  completenessDetail?: {
    essentialsPct: number;
    recommendedPct: number;
    overallPct: number;
  };

  /** requirementKeys that are missing (updated when user saves setup) */
  missingKeys?: string[];

  /** Last time the user ran the sessiecheck */
  lastCheckedAt?: Timestamp | FieldValue;
}

/* ==========================================================================
   ADVICE TYPES
   Used by adviceEngine.ts and AdviceForTodaySheet.tsx
   ========================================================================== */

export type WaterType        = 'meer' | 'polder' | 'rivier' | 'kanaal' | 'vijver';
export type DepthBand        = 'ondiep' | 'middel' | 'diep';
export type WaterClarity     = 'helder' | 'troebel' | 'groen';
export type TemperatureBand  = 'koud' | 'gematigd' | 'warm';
export type PressureTrend    = 'stabiel' | 'stijgend' | 'dalend';
export type VegetationLevel  = 'geen' | 'licht' | 'zwaar';

export interface AdviceContext {
  discipline: 'karper' | 'roofvis';
  waterType?: WaterType;
  depthBand?: DepthBand;
  clarity?: WaterClarity;
  temperatureBand?: TemperatureBand;
  pressureTrend?: PressureTrend;
  vegetation?: VegetationLevel;
}

export interface AdviceRecommendation {
  baitFamily?: string;
  colorProfile?: string;
  sizeBand?: string;
  technique?: string;
  explanation: string;          // Dutch, 1–3 sentences
  alternativeNote?: string;     // What to try if primary doesn't work
}

export interface AdviceOutput {
  context: AdviceContext;
  primaryRecommendation: AdviceRecommendation;
  productRuleKeys: string[];    // Keys into product_rule_mappings
  tips?: string[];              // 1–3 practical tips
}