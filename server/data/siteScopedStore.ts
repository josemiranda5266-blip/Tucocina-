import { CURRENT_SITE_ID } from '../config/site';
import { dbStore, StoredVideo } from './store';
import type { SiteId } from '../../src/config/site';

type SiteVideo = StoredVideo & { siteId?: SiteId };
type VideoListOptions = Parameters<typeof dbStore.getVideos>[0];
type AdminVideoListOptions = Parameters<typeof dbStore.getAllAdminVideos>[0];

function siteIdOf(video: StoredVideo): SiteId {
  const value = String((video as SiteVideo).siteId || 'COCIFLASH').trim().toUpperCase();
  return value === 'OFIGOOD' ? 'OFIGOOD' : 'COCIFLASH';
}

function belongsToCurrentSite(video: StoredVideo): boolean {
  return siteIdOf(video) === CURRENT_SITE_ID;
}

function paginateSiteVideos(items: StoredVideo[], options: { cursor?: string; limit?: number }) {
  const limit = options.limit || 20;
  let startIndex = 0;
  if (options.cursor) {
    const found = items.findIndex((video) => video.id === options.cursor);
    if (found !== -1) startIndex = found + 1;
  }
  const sliced = items.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < items.length;
  return {
    items: sliced,
    limit,
    hasMore,
    nextCursor: hasMore && sliced.length ? sliced[sliced.length - 1].id : null,
    total: items.length,
  };
}

const originalGetVideos = dbStore.getVideos.bind(dbStore);
const originalGetAllAdminVideos = dbStore.getAllAdminVideos.bind(dbStore);
const originalGetVideoById = dbStore.getVideoById.bind(dbStore);
const originalFindDuplicate = dbStore.findDuplicate.bind(dbStore);
const originalAddVideo = dbStore.addVideo.bind(dbStore);
const originalUpdateVideo = dbStore.updateVideo.bind(dbStore);
const originalDeleteVideo = dbStore.deleteVideo.bind(dbStore);

// Make the active site boundary a data-layer concern. Filtering is completed
// before cursor pagination is exposed to callers, so catalogs cannot mix sites.
dbStore.getVideos = ((options: VideoListOptions) => {
  const all = originalGetVideos({ ...options, limit: Number.MAX_SAFE_INTEGER });
  return paginateSiteVideos(all.items.filter(belongsToCurrentSite), options);
}) as typeof dbStore.getVideos;

dbStore.getAllAdminVideos = ((options: AdminVideoListOptions) => {
  const all = originalGetAllAdminVideos({ ...options, limit: Number.MAX_SAFE_INTEGER });
  return paginateSiteVideos(all.items.filter(belongsToCurrentSite), options);
}) as typeof dbStore.getAllAdminVideos;

dbStore.getVideoById = ((id: string) => {
  const video = originalGetVideoById(id);
  return video && belongsToCurrentSite(video) ? video : null;
}) as typeof dbStore.getVideoById;

dbStore.findDuplicate = ((platform: string, platformVideoId: string) => {
  const all = originalGetAllAdminVideos({ limit: Number.MAX_SAFE_INTEGER });
  return all.items.find((video) =>
    belongsToCurrentSite(video) &&
    video.platform === platform &&
    video.platformVideoId === platformVideoId,
  ) || null;
}) as typeof dbStore.findDuplicate;

dbStore.addVideo = ((video: StoredVideo) => {
  const withSite = { ...video, siteId: CURRENT_SITE_ID } as SiteVideo;
  return originalAddVideo(withSite);
}) as typeof dbStore.addVideo;

dbStore.updateVideo = ((id: string, updates: Partial<StoredVideo>) => {
  const video = originalGetVideoById(id);
  if (!video || !belongsToCurrentSite(video)) return null;
  return originalUpdateVideo(id, updates);
}) as typeof dbStore.updateVideo;

dbStore.deleteVideo = ((id: string) => {
  const video = originalGetVideoById(id);
  if (!video || !belongsToCurrentSite(video)) return false;
  return originalDeleteVideo(id);
}) as typeof dbStore.deleteVideo;

void originalFindDuplicate;
