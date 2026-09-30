import { ContentVerticalId, getContentVertical } from '../content/verticals';

/**
 * Discovery queries are part of the selected vertical, not of the YouTube provider.
 * COCINA remains the default to preserve the existing CociFlash behavior.
 */
export function getDiscoveryQueries(verticalId: ContentVerticalId = 'COCINA'): string[] {
  return getContentVertical(verticalId).discoveryQueries;
}

export const DISCOVERY_QUERIES: string[] = getDiscoveryQueries('COCINA');

export function getRotationQueries(count: number = 3, verticalId: ContentVerticalId = 'COCINA'): string[] {
  const queries = getDiscoveryQueries(verticalId);
  return [...queries].sort(() => 0.5 - Math.random()).slice(0, Math.min(count, queries.length));
}
