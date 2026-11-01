import React from 'react';
import { AdConfig, AdProviderType, AdSlotProps } from './adTypes';
import { AdsterraSlot } from '../../components/ads/AdsterraSlot';

export interface IAdProvider {
  readonly name: string;
  init(config: AdConfig): Promise<void>;
  renderSlot(props: AdSlotProps, config: AdConfig): React.ReactNode;
  destroy?(): void;
}

export class NullAdProvider implements IAdProvider {
  readonly name = 'none';
  async init(_config: AdConfig): Promise<void> {}
  renderSlot(_props: AdSlotProps, _config: AdConfig): React.ReactNode { return null; }
}

export class AdsenseProvider implements IAdProvider {
  readonly name = 'adsense';
  async init(config: AdConfig): Promise<void> {
    if (!config.publisherId) console.warn('[AdProvider] AdSense initialization skipped: missing publisher ID.');
  }
  renderSlot(_props: AdSlotProps, _config: AdConfig): React.ReactNode { return null; }
}

export class DirectSponsorProvider implements IAdProvider {
  readonly name = 'direct_sponsor';
  async init(_config: AdConfig): Promise<void> {}
  renderSlot(_props: AdSlotProps, _config: AdConfig): React.ReactNode { return null; }
}

export class AdsterraProvider implements IAdProvider {
  readonly name = 'adsterra';
  async init(_config: AdConfig): Promise<void> {}
  renderSlot(props: AdSlotProps, config: AdConfig): React.ReactNode {
    if (!config.enabled || !config.placements[props.placement]?.enabled) return null;
    if (props.placement !== 'HOME_TOP' && props.placement !== 'HOME_MIDDLE') return null;
    return React.createElement(AdsterraSlot, props);
  }
}

export function getAdProvider(type: AdProviderType): IAdProvider {
  switch (type) {
    case 'adsense': return new AdsenseProvider();
    case 'direct_sponsor': return new DirectSponsorProvider();
    case 'adsterra': return new AdsterraProvider();
    case 'none':
    default: return new NullAdProvider();
  }
}
