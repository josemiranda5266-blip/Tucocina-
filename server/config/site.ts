import type { SiteId } from '../../src/config/site';

const rawSiteId = String(process.env.SITE_ID || 'COCIFLASH').trim().toUpperCase();

export const CURRENT_SITE_ID: SiteId = rawSiteId === 'OFIGOOD' ? 'OFIGOOD' : 'COCIFLASH';

/**
 * Legacy CociFlash documents do not have siteId yet. Treating a missing value
 * as COCIFLASH lets us introduce multi-site support without migrating or
 * rewriting existing production videos.
 */
export function videoBelongsToCurrentSite(video: { siteId?: string | null }): boolean {
  const siteId = String(video.siteId || 'COCIFLASH').trim().toUpperCase();
  return siteId === CURRENT_SITE_ID;
}
