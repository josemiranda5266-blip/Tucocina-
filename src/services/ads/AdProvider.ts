import React from 'react';
import { AdConfig, AdProviderType, AdSlotProps } from './adTypes';

export interface IAdProvider {
  readonly name: string;
  init(config: AdConfig): Promise<void>;
  renderSlot(props: AdSlotProps, config: AdConfig): React.ReactNode;
  destroy?(): void;
}

/**
 * Inert provider returned when advertising is disabled or set to 'none'.
 * Guaranteed to return null and perform zero side effects or network requests.
 */
export class NullAdProvider implements IAdProvider {
  readonly name = 'none';

  async init(_config: AdConfig): Promise<void> {
    // No-op: zero scripts, zero network calls
  }

  renderSlot(_props: AdSlotProps, _config: AdConfig): React.ReactNode {
    return null;
  }
}

/**
 * Future AdSense provider stub.
 * Unimplemented until an official AdSense account is created, approved, and configured.
 */
export class AdsenseProvider implements IAdProvider {
  readonly name = 'adsense';

  async init(config: AdConfig): Promise<void> {
    if (!config.publisherId) {
      console.warn('[AdProvider] AdSense initialization skipped: missing publisher ID.');
      return;
    }
    // Future AdSense script injection logic will be implemented here when approved.
  }

  renderSlot(props: AdSlotProps, config: AdConfig): React.ReactNode {
    if (!config.enabled || !config.publisherId) {
      return null;
    }

    const slotConfig = config.placements[props.placement];
    if (!slotConfig || !slotConfig.enabled) {
      return null;
    }

    // Future AdSense <ins className="adsbygoogle" ...> component
    return null;
  }
}

/**
 * Future Direct Sponsor provider stub.
 * Unimplemented until direct commercial sponsorship deals are signed.
 */
export class DirectSponsorProvider implements IAdProvider {
  readonly name = 'direct_sponsor';

  async init(_config: AdConfig): Promise<void> {
    // Future direct sponsorship asset preloading
  }

  renderSlot(props: AdSlotProps, config: AdConfig): React.ReactNode {
    // Future custom sponsor banner rendering
    return null;
  }
}

/**
 * Factory to retrieve the active AdProvider instance.
 */
export function getAdProvider(type: AdProviderType): IAdProvider {
  switch (type) {
    case 'adsense':
      return new AdsenseProvider();
    case 'direct_sponsor':
      return new DirectSponsorProvider();
    case 'none':
    default:
      return new NullAdProvider();
  }
}
