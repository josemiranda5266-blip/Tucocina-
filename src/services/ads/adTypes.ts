export type AdPlacement =
  | 'HOME_TOP'
  | 'HOME_MIDDLE'
  | 'SEARCH_MIDDLE'
  | 'CATEGORY_TOP'
  | 'CATEGORY_MIDDLE'
  | 'VIDEO_BEFORE'
  | 'VIDEO_AFTER'
  | 'VIDEO_MIDDLE';

export type AdProviderType = 'none' | 'adsense' | 'direct_sponsor';

export type AdFormat = 'banner' | 'responsive' | 'inline' | 'rectangle';

export interface AdPlacementConfig {
  enabled: boolean;
  format?: AdFormat;
  adSlotId?: string;
}

export interface AdConfig {
  enabled: boolean;
  provider: AdProviderType;
  publisherId?: string;
  placements: Record<AdPlacement, AdPlacementConfig>;
}

export interface AdSlotProps {
  placement: AdPlacement;
  format?: AdFormat;
  responsive?: boolean;
  className?: string;
}
