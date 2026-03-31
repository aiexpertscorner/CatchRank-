export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  xp: number;
  level: number;
  bio?: string;
  stats?: {
    totalCatches: number;
    totalSessions: number;
    totalSpots: number;
    speciesCount: number;
    personalRecords?: Record<string, { length?: number; weight?: number }>;
  };
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
  weight?: number;
  length?: number;
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
  weather?: any;
  xpEarned?: number;
  isPrivate?: boolean;
  notes?: string;
}

export interface Session {
  id?: string;
  userId: string;
  startTime: any;
  endTime?: any;
  spotIds: string[];
  catchIds: string[];
  status: 'active' | 'completed' | 'draft';
  notes?: string;
  totalXp?: number;
  isActive?: boolean; // Legacy support
  weather?: any;
  location?: { lat: number; lng: number; name?: string };
}

export interface Spot {
  id?: string;
  userId: string;
  name: string;
  coordinates?: { lat: number; lng: number };
  waterType?: string;
  isPrivate: boolean;
  description?: string;
  stats?: {
    totalCatches: number;
    topSpecies: string[];
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
