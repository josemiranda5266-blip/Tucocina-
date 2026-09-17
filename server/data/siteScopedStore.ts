import { CURRENT_SITE_ID } from '../config/site';
import { dbStore, StoredVideo } from './store';
import type { SiteId } from '../../src/config/site';

type SiteVideo = StoredVideo & { siteId?: SiteId };

function siteIdOf(video: StoredVideo): SiteId {
  const value = String((video as SiteVideo).siteId || 'COCIFLASH').trim().toUpperCase();
  return value === 'OFIGOOD' ? 'OFIGOOD' : 'COCIFLASH';
}

function belongsToCurrentSite(video: StoredVideo): boolean {
  return siteIdOf(video) === CURRENT_SITE_ID;
}

export function getVideosForCurrentSite(options: Parameters<typeof dbStore.getVideos>[0]) {
  const requestedLimit = options.limit || 20;
  const all = dbStore.getVideos({ ...options, limit: Number.MAX_SAFE_INTEGER });
  const items = all.items.filter(belongsToCurrentSite);
  const cursorIndex = options.cursor ? items.findIndex((video) => video.id === options.cursor) : -1;
  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const sliced = items.slice(startIndex, startIndex + requestedLimit);
  const hasMore = startIndex + requestedLimit < items.length;
  return {
    items: sliced,
    limit: requestedLimit,
    hasMore,
    nextCursor: hasMore && sliced.length ? sliced[sliced.length - 1].id : null,
    total: items.length,
  };
}

export function getAllAdminVideosForCurrentSite(options: Parameters<typeof dbStore.getAllAdminVideos>[0]) {
  const requestedLimit = options.limit || 20;
  const all = dbStore.getAllAdminVideos({ ...options, limit: Number.MAX_SAFE_INTEGER });
  const items = all.items.filter(belongsToCurrentSite);
  const cursorIndex = options.cursor ? items.findIndex((video) => video.id === options.cursor) : -1;
  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const sliced = items.slice(startIndex, startIndex + requestedLimit);
  const hasMore = startIndex + requestedLimit < items.length;
  return {
    items: sliced,
    limit: requestedLimit,
    hasMore,
    nextCursor: hasMore && sliced.length ? sliced[sliced.length - 1].id : null,
    total: items.length,
  };
}

export function getVideoByIdForCurrentSite(id: string): StoredVideo | null {
  const video = dbStore.getVideoById(id);
  return video && belongsToCurrentSite(video) ? video : null;
}

export function findDuplicateForCurrentSite(platform: string, platformVideoId: string): StoredVideo | null {
  const all = dbStore.getVideos({ status: 'DRAFT', limit: Number.MAX_SAFE_INTEGER });
  const allStatuses = [
    ...all.items,
    ...dbStore.getAllAdminVideos({ limit: Number.MAX_SAFE_INTEGER }).items,
  ];
  return allStatuses.find((video) =>
    belongsToCurrentSite(video) &&
    video.platform === platform &&
    video.platformVideoId === platformVideoId,
  ) || null;
}

export function addVideoToCurrentSite(video: StoredVideo): StoredVideo {
  const withSite = { ...video, siteId: CURRENT_SITE_ID } as SiteVideo;
  return dbStore.addVideo(withSite);
}

export function updateVideoForCurrentSite(id: string, updates: Partial<StoredVideo>): StoredVideo | null {
  if (!getVideoByIdForCurrentSite(id)) return null;
  return dbStore.updateVideo(id, updates);
}

export function deleteVideoForCurrentSite(id: string): boolean {
  if (!getVideoByIdForCurrentSite(id)) return false;
  return dbStore.deleteVideo(id);
}
