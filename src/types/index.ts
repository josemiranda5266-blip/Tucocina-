export type VideoPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'OTHER';

export type VideoStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED' | 'DUPLICATE';

export interface Video {
  id: string;
  title: string;
  description: string;
  originalUrl: string;
  embedUrl: string;
  platform: VideoPlatform;
  thumbnailUrl: string;
  creatorName: string;
  creatorUrl?: string;
  durationSeconds?: number;
  publishedAt?: string;
  categoryId?: string | null;
  tags: string[];
  status: VideoStatus;
  views: number;
  favoritesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order: number;
}

export type UserRole = 'USER' | 'ADMIN';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  legalVersion?: string;
  legalAcceptedAt?: string;
  termsAcceptedAt?: string;
  privacyNoticeVersion?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  videoId: string;
  createdAt: string;
}

export type ReportReason =
  | 'BROKEN_LINK'
  | 'INCORRECT_CONTENT'
  | 'OFFENSIVE_CONTENT'
  | 'DUPLICATE'
  | 'OTHER';

export type ReportStatus = 'OPEN' | 'REVIEWED' | 'RESOLVED' | 'REJECTED';

export interface Report {
  id: string;
  videoId: string;
  userId?: string;
  userEmail?: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  createdAt: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
}

export interface VideoFilterOptions {
  categoryId?: string;
  platform?: VideoPlatform;
  searchQuery?: string;
  status?: VideoStatus;
  sortBy?: 'recent' | 'views' | 'title';
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total?: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}
