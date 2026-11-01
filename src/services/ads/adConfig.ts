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

  // Keep Vite environment references static so Vite can replace them at build time.
  const envEnabled = (metaEnv?.VITE_ADS_ENABLED ?? procEnv?.VITE_ADS_ENABLED) === 'true';
  const rawProvider = (metaEnv?.VITE_ADS_PROVIDER ?? procEnv?.VITE_ADS_PROVIDER ?? 'none') as string;
  const validProvider = (['none', 'adsense', 'direct_sponsor', 'adsterra'].includes(rawProvider)
    ? rawProvider
    : 'none') as AdConfig['provider'];

  const nativeEnabled = (metaEnv?.VITE_ADSTERRA_NATIVE_ENABLED ?? procEnv?.VITE_ADSTERRA_NATIVE_ENABLED) === 'true';
  const rectangleEnabled = (metaEnv?.VITE_ADSTERRA_300X250_ENABLED ?? procEnv?.VITE_ADSTERRA_300X250_ENABLED) === 'true';

  const placements: Record<AdPlacement, AdPlacementConfig> = {
    ...defaultPlacementsConfig,
    HOME_TOP: { enabled: rectangleEnabled, format: 'rectangle' },
    HOME_MIDDLE: { enabled: nativeEnabled, format: 'native' },
  };

  const publisherId = (metaEnv?.VITE_ADSENSE_PUBLISHER_ID ?? procEnv?.VITE_ADSENSE_PUBLISHER_ID ?? '') as string;
  const providerConfigured =
    validProvider === 'adsense'
      ? Boolean(publisherId.trim())
      : validProvider === 'direct_sponsor'
        ? true
        : validProvider === 'adsterra'
          ? nativeEnabled || rectangleEnabled
          : false;

  const isFullyConfigured = envEnabled && validProvider !== 'none' && providerConfigured;

  return {
    enabled: isFullyConfigured,
    provider: isFullyConfigured ? validProvider : 'none',
    publisherId: publisherId || undefined,
    placements: isFullyConfigured && validProvider === 'adsterra' ? placements : defaultPlacementsConfig,
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
