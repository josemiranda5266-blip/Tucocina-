/**
 * Discovery Services Entry Point
 */

import { ContentDiscoveryProvider, VideoPlatform } from './ContentDiscoveryProvider';
import { YouTubeDiscoveryProvider } from './YouTubeDiscoveryProvider';

export * from './ContentDiscoveryProvider';
export * from './YouTubeDiscoveryProvider';
export * from './spanishCandidateDetector';
export * from './cookingCandidateDetector';
export * from './cookingCandidateScorer';
export * from './discoveryQueries';

const youtubeProvider = new YouTubeDiscoveryProvider();

export function getDiscoveryProvider(platform: VideoPlatform = 'YOUTUBE'): ContentDiscoveryProvider {
  if (platform === 'YOUTUBE') {
    return youtubeProvider;
  }
  throw new Error(`Proveedor de descubrimiento '${platform}' no soportado todavía.`);
}
