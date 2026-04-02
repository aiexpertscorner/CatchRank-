/**
 * Global types and interfaces for CatchRank.
 * This file centralizes all data models to ensure consistency.
 */

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
    earnedAt: any;
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
    lastActive: any;
  };
  lastActive?: any;
  createdAt: any;
}

export interface Catch {
  id?: string;
  userId: string;
  authorName?: string;
  authorPhoto?: string;
  species: string;
  speciesId?: string;
  weight?: number; // in grams
  length?: number; // in cm
  photoURL?: string;
  spotId?: string;
  spotName?: string;
  sessionId?: string;
  timestamp: any;
  status: 'draft' | 'complete' | 'pending';
  incompleteFields?: string[];
  bait?: string;
  baitId?: string;
  technique?: string;
  techniqueId?: string;
  location?: { lat: number; lng: number };
  weather?: {
    temp?: number;
    description?: string;
    icon?: string;
    windSpeed?: number;
    windDirection?: number;
    pressure?: number;
    humidity?: number;
    visibility?: number;
    cloudCover?: number;
    uvIndex?: number;
    precipitation?: number;
    moonPhase?: number;
  };
  water?: {
    temp?: number;
    clarity?: 'clear' | 'murky' | 'stained' | 'very_murky';
    depth?: number;
    flow?: 'none' | 'slow' | 'medium' | 'fast';
  };
  gear?: {
    rodId?: string;
    reelId?: string;
    lineId?: string;
    leaderId?: string;
    lureId?: string;
    lureColor?: string;
    hookSize?: string;
  };
  xpEarned?: number;
  isPrivate?: boolean;
  notes?: string;
}

export interface Session {
  id?: string;
  ownerUserId: string;
  participantUserIds: string[];
  invitedUserIds: string[];
  acceptedUserIds: string[];
  pendingUserIds: string[];
  title?: string;
  description?: string;
  sessionType?: string;
  mode: 'live' | 'retro';
  status: 'draft' | 'planned' | 'live' | 'paused' | 'ended' | 'completed' | 'pending_acceptance' | 'archived';
  startedAt?: any;
  endedAt?: any;
  createdAt: any;
  updatedAt: any;
  durationMinutes?: number;
  activeSpotId?: string;
  linkedSpotIds: string[];
  spotTimeline: {
    spotId: string;
    name: string;
    arrivedAt: any;
    leftAt?: any;
  }[];
  linkedCatchIds: string[];
  linkedSetupIds: string[];
  linkedGearIds: string[];
  linkedProductIds: string[];
  gearIds?: string[]; // Alias for linkedGearIds
  participantIds?: string[]; // Alias for participantUserIds
  weatherSnapshotStart?: any;
  weatherSnapshotEnd?: any;
  forecastSummary?: string;
  visibility: 'public' | 'friends' | 'private';
  notes?: string | { text: string; timestamp: any; type?: 'note' | 'event' | 'spot_change' }[];
  metadata?: {
    method?: string;
    waterType?: string;
    targetSpecies?: string[];
  };
  statsSummary?: {
    totalCatches: number;
    totalXp: number;
    speciesCount: number;
  };
  acceptanceStateByUser?: Record<string, 'pending' | 'accepted' | 'declined'>;
  createdFromLiveFlow?: boolean;
  savedAsDraftForParticipants?: boolean;
}

export interface Spot {
  id?: string;
  userId: string;
  authorName?: string;
  authorPhoto?: string;
  name: string;
  description?: string;
  coordinates: { lat: number; lng: number };
  waterType?: 'canal' | 'river' | 'lake' | 'pond' | 'sea' | 'polder';
  waterBodyName?: string;
  visibility: 'private' | 'friends' | 'public';
  isPrivate?: boolean; // Legacy
  techniques?: string[];
  targetSpecies?: string[];
  amenities?: string[];
  photoURLs?: string[];
  mainPhotoURL?: string;
  createdAt: any;
  updatedAt: any;
  stats?: {
    totalCatches: number;
    totalSessions?: number;
    topSpecies: string[];
    avgRating?: number;
    ratingCount?: number;
  };
}

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
  joinedAt: any;
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
  createdAt: any;
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
  publishedAt: any;
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
  createdAt: any;
  expiresAt?: any;
}
