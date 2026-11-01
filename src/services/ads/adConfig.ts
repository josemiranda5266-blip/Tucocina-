import { AdConfig, AdPlacement, AdPlacementConfig } from './adTypes';

const defaultPlacementsConfig: Record<AdPlacement, AdPlacementConfig> = {
  HOME_TOP: { enabled: false, format: 'rectangle' },
  HOME_MIDDLE: { enabled: false, format: 'native' },
  SEARCH_MIDDLE: { enabled: false, format: 'responsive' },
  CATEGORY_TOP: { enabled: false, format: 'responsive' },
  CATEGORY_MIDDLE: { enabled: false, format: 'responsive' },
  VIDEO_BEFORE: { enabled: false, format: 'responsive' },
  VIDEO_AFTER: { enabled: false, format: 'responsive' },
  VIDEO_MIDDLE: { enabled: false, format: 'responsive' },
};

/**
 * Advertising is opt-in. Adsterra formats have independent placement switches
 * so neither external script runs unless the publisher explicitly enables it.
 */
export function getAdConfig(): AdConfig {
  const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;

  const read = (key: string): string | undefined =>
    (metaEnv?.[key] ?? procEnv?.[key]) as string | undefined;

  const envEnabled = read('VITE_ADS_ENABLED') === 'true';
  const rawProvider = read('VITE_ADS_PROVIDER') || 'none';
  const validProvider = (['none', 'adsense', 'direct_sponsor', 'adsterra'].includes(rawProvider)
    ? rawProvider
    : 'none') as AdConfig['provider'];

  const nativeEnabled = read('VITE_ADSTERRA_NATIVE_ENABLED') === 'true';
  const rectangleEnabled = read('VITE_ADSTERRA_300X250_ENABLED') === 'true';

  const placements: Record<AdPlacement, AdPlacementConfig> = {
    ...defaultPlacementsConfig,
    HOME_TOP: { enabled: rectangleEnabled, format: 'rectangle' },
    HOME_MIDDLE: { enabled: nativeEnabled, format: 'native' },
  };

  const isFullyConfigured =
    envEnabled &&
    validProvider === 'adsterra' &&
    (nativeEnabled || rectangleEnabled);

  return {
    enabled: isFullyConfigured,
    provider: isFullyConfigured ? validProvider : 'none',
    placements: isFullyConfigured ? placements : defaultPlacementsConfig,
  };
}

export function isAdsEnabled(): boolean {
  const config = getAdConfig();
  return config.enabled && config.provider !== 'none';
}

export function isPlacementEnabled(placement: AdPlacement): boolean {
  const config = getAdConfig();
  return Boolean(config.enabled && config.provider !== 'none' && config.placements[placement]?.enabled);
}
