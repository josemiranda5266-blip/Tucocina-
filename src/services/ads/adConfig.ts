import { AdConfig, AdPlacement, AdPlacementConfig } from './adTypes';

const defaultPlacementsConfig: Record<AdPlacement, AdPlacementConfig> = {
  HOME_TOP: { enabled: false, format: 'responsive' },
  HOME_MIDDLE: { enabled: false, format: 'responsive' },
  SEARCH_MIDDLE: { enabled: false, format: 'responsive' },
  CATEGORY_TOP: { enabled: false, format: 'responsive' },
  CATEGORY_MIDDLE: { enabled: false, format: 'responsive' },
  VIDEO_BEFORE: { enabled: false, format: 'responsive' },
  VIDEO_AFTER: { enabled: false, format: 'responsive' },
  VIDEO_MIDDLE: { enabled: false, format: 'responsive' },
};

/**
 * Reads centralized advertisement configuration from environment variables or defaults.
 *
 * SAFETY PRINCIPLE:
 * If no valid publisher ID or provider configuration is supplied, ads remain strictly DISABLED
 * regardless of the VITE_ADS_ENABLED flag.
 */
export function getAdConfig(): AdConfig {
  const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;

  const rawEnabled = metaEnv?.VITE_ADS_ENABLED ?? procEnv?.VITE_ADS_ENABLED;
  const envEnabled = rawEnabled === 'true';

  const rawProvider = (metaEnv?.VITE_ADS_PROVIDER ?? procEnv?.VITE_ADS_PROVIDER) as string | undefined;
  const envProvider = rawProvider || 'none';

  const rawPublisherId = (metaEnv?.VITE_ADSENSE_PUBLISHER_ID ?? procEnv?.VITE_ADSENSE_PUBLISHER_ID) as string | undefined;
  const envPublisherId = rawPublisherId || '';

  // Validate provider string
  const validProvider = (['none', 'adsense', 'direct_sponsor'].includes(envProvider)
    ? envProvider
    : 'none') as AdConfig['provider'];

  // Ads can ONLY be enabled if explicitly requested AND a valid provider & credentials exist
  const isFullyConfigured =
    envEnabled &&
    validProvider !== 'none' &&
    (validProvider !== 'adsense' || Boolean(envPublisherId && envPublisherId.trim() !== ''));

  return {
    enabled: isFullyConfigured,
    provider: isFullyConfigured ? validProvider : 'none',
    publisherId: envPublisherId || undefined,
    placements: defaultPlacementsConfig,
  };
}

/**
 * Quick helper to check if advertising is active globally.
 */
export function isAdsEnabled(): boolean {
  const config = getAdConfig();
  return config.enabled && config.provider !== 'none';
}

/**
 * Check if a specific ad placement is configured and enabled.
 */
export function isPlacementEnabled(placement: AdPlacement): boolean {
  const config = getAdConfig();
  if (!config.enabled || config.provider === 'none') {
    return false;
  }
  return Boolean(config.placements[placement]?.enabled);
}
