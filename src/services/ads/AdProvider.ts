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
 * AdSense provider: carga el script oficial solo cuando la configuración está habilitada.
 */
export class AdsenseProvider implements IAdProvider {
  readonly name = 'adsense';

  async init(config: AdConfig): Promise<void> {
    if (!config.publisherId) {
      console.warn('[AdProvider] AdSense initialization skipped: missing publisher ID.');
      return;
    }
    if (typeof document === 'undefined') return;
    if (!/^ca-pub-[0-9]{16}$/.test(config.publisherId)) {
      console.warn('[AdProvider] AdSense initialization skipped: publisher ID format is invalid.');
      return;
    }
    if (document.querySelector('script[data-cociflash-adsense="true"]')) return;
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.cociflashAdsense = 'true';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(config.publisherId);
    script.onerror = () => { console.error('[AdProvider] No se pudo cargar el script oficial de Google AdSense.'); script.remove(); };
    document.head.appendChild(script);
  }

  renderSlot(props: AdSlotProps, config: AdConfig): React.ReactNode {
    if (!config.enabled || !config.publisherId) {
      return null;
    }

    const slotConfig = config.placements[props.placement];
    if (!slotConfig || !slotConfig.enabled) {
      return null;
    }

    // Los anuncios automáticos se administran desde AdSense. No se inventan IDs de unidades manuales.
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
