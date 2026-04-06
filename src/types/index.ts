/**
 * Global types and interfaces for CatchRank.
 * v2-first, legacy-compatible model layer.
 */

export type AnyTimestamp = any;

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
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  favoriteSpecies?: string[];
  fishingTypes?: string[];
  locationPreference?: { lat: number; lng: number; name: string };

  stats?: {
    totalCatches: number;
    totalSessions: number;
    totalSpots: number;
    speciesCount: number;
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
  createdAt: AnyTimestamp;
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
  species: string;
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
  catchTime?: AnyTimestamp;

  status: 'draft' | 'complete' | 'pending';
  incompleteFields?: string[];

  weather?: WeatherSnapshot;
  water?: WaterSnapshot;
  gear?: CatchGearSelection;

  xpEarned?: number;
  isPrivate?: boolean;
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* Session                                                                    */
/* -------------------------------------------------------------------------- */

export interface SessionStatsSummary {
  totalCatches?: number;
  totalXp?: number;
  speciesCount?: number;
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
  participantUserIds: string[];
  invitedUserIds: string[];
  acceptedUserIds: string[];
  pendingUserIds: string[];

  title?: string;
  description?: string;
  sessionType?: string;
  mode: 'live' | 'retro';
  status:
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

  createdAt: AnyTimestamp;
  updatedAt: AnyTimestamp;

  durationMinutes?: number;

  activeSpotId?: string;
  linkedSpotIds: string[];
  spotTimeline: SessionSpotTimelineEntry[];

  linkedCatchIds: string[];
  linkedSetupIds: string[];
  linkedGearIds: string[];
  linkedProductIds: string[];

  gearIds?: string[];

  weatherSnapshotStart?: WeatherSnapshot;
  weatherSnapshotEnd?: WeatherSnapshot;
  forecastSummary?: string;

  visibility: 'public' | 'friends' | 'private';

  notes?: string | SessionTimelineNote[];

  metadata?: SessionMetadata;

  statsSummary?: SessionStatsSummary;

  acceptanceStateByUser?: Record<string, 'pending' | 'accepted' | 'declined'>;

  createdFromLiveFlow?: boolean;
  savedAsDraftForParticipants?: boolean;
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

  techniques?: string[];
  targetSpecies?: string[];
  amenities?: string[];

  linkedGearIds?: string[];
  linkedSetupIds?: string[];

  photoURLs?: string[];
  mainPhotoURL?: string;

  createdAt: AnyTimestamp;
  updatedAt: AnyTimestamp;

  stats?: SpotStatsSummary;
}

/* -------------------------------------------------------------------------- */
/* Other domain models                                                        */
/* -------------------------------------------------------------------------- */

export interface Species {
  id?: string;
  name: string;
  scientificName?: string;
  description?: string;
  photoURL?: string;
  xpValue?: number;
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

export type ProductSource = 'fishinn' | 'bol';

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
  cachedAt: AnyTimestamp;
}

export interface ProductCacheMetadata {
  source: ProductSource;
  lastFetched: AnyTimestamp;
  itemCount: number;
  isValid: boolean;
}