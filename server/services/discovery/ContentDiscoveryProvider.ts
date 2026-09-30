import type { ContentVerticalId } from '../content/verticals';

/** Generic discovery contract. The first production provider remains YouTube. */
export type VideoPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'OTHER';

export interface ScoreBreakdown {
  titleScore: number; descriptionScore: number; channelScore: number; preparationScore: number;
  spanishScore: number; categoryScore: number; embeddableScore: number; popularityScore: number;
}

export interface VideoCandidate {
  externalVideoId: string; platform: VideoPlatform; originalUrl: string; embedUrl: string;
  title: string; description: string; creatorName: string; creatorUrl?: string; thumbnailUrl: string;
  durationSeconds: number; publishedAt: string; views: number; score: number;
  scoreLabel: 'MUY RECOMENDADO' | 'REVISAR' | 'BAJA RELEVANCIA';
  scoreBreakdown: ScoreBreakdown;
  verticalId?: ContentVerticalId;
  suggestedCategory: { id: string; name: string };
  suggestedTags: string[]; isEmbeddable: boolean; isSpanish: boolean;
  isCooking: boolean; youtubeCategoryId?: string;
}

export interface DiscoverySearchOptions {
  query?: string; limit?: number; minViews?: number;
  sortBy?: 'relevance' | 'views' | 'score' | 'date';
  verticalId?: ContentVerticalId;
}

export interface DiscoverySearchResult {
  platform: VideoPlatform; query: string; candidates: VideoCandidate[]; totalFound: number; quotaWarning?: string;
  verticalId?: ContentVerticalId;
}

export interface ContentDiscoveryProvider {
  platform: VideoPlatform;
  isConfigured(): boolean;
  searchCandidates(options: DiscoverySearchOptions): Promise<DiscoverySearchResult>;
  getVideoDetails(videoIds: string[]): Promise<VideoCandidate[]>;
}
