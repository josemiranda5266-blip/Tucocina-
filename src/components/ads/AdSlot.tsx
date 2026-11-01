import React from 'react';
import { AdSlotProps } from '../../services/ads/adTypes';
import { getAdConfig, isAdsEnabled, isPlacementEnabled } from '../../services/ads/adConfig';
import { getAdProvider } from '../../services/ads/AdProvider';
import { useAdConsent } from '../../context/AdConsentContext';

/**
 * Reusable AdSlot Component for future monetization.
 *
 * SAFETY & PERFORMANCE GUARANTEE:
 * When ads.enabled === false (default), this component returns null immediately.
 * It renders zero HTML tags, adds zero CSS classes or margins, loads zero external scripts,
 * and causes zero layout shifts.
 */
export const AdSlot: React.FC<AdSlotProps> = (props) => {
  const { choice } = useAdConsent();

  // Adsterra scripts are strictly blocked until an explicit, current acceptance.
  if (getAdConfig().provider === 'adsterra' && choice !== 'accepted') return null;

  // Fast exit: if global ads are disabled, render nothing
  if (!isAdsEnabled()) {
    return null;
  }

  // Fast exit: if this specific placement is disabled, render nothing
  if (!isPlacementEnabled(props.placement)) {
    return null;
  }

  const config = getAdConfig();
  const provider = getAdProvider(config.provider);

  return <>{provider.renderSlot(props, config)}</>;
};
