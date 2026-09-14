import { processExternalVideoUrl } from './connectors';
import { classifyVideo } from './videoClassification';
import { dbStore, StoredVideo } from '../data/store';

export interface BulkImportResult {
  url: string;
  status: 'IMPORTED' | 'DUPLICATE' | 'FAILED';
  videoId?: string;
  title?: string;
  categoryId?: string;
  tags?: string[];
  error?: string;
}

const MAX_BULK_ITEMS = 25;

export async function importVideosInBulk(urls: string[]): Promise<BulkImportResult[]> {
  const uniqueUrls = [...new Set(urls.map(url => url.trim()).filter(Boolean))].slice(0, MAX_BULK_ITEMS);
  const results: BulkImportResult[] = [];

  // Sequential processing deliberately limits platform/API pressure and keeps
  // failures isolated to individual URLs.
  for (const url of uniqueUrls) {
    try {
      const extracted = await processExternalVideoUrl(url);
      const existing = dbStore.findDuplicate(extracted.platform, extracted.platformVideoId);
      if (existing) {
        results.push({ url, status: 'DUPLICATE', videoId: existing.id, title: existing.title });
        continue;
      }

      const classification = classifyVideo(extracted);
      const now = new Date().toISOString();
      const videoId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const video: StoredVideo = {
        id: videoId,
        title: extracted.title,
        description: extracted.description,
        originalUrl: extracted.originalUrl,
        embedUrl: extracted.embedUrl,
        platform: extracted.platform,
        platformVideoId: extracted.platformVideoId,
        thumbnailUrl: extracted.thumbnailUrl,
        creatorName: extracted.creatorName,
        creatorUrl: extracted.creatorUrl || '',
        durationSeconds: extracted.durationSeconds || 0,
        categoryId: classification.categoryId || null,
        tags: classification.tags,
        status: 'DRAFT',
        views: 0,
        createdAt: now,
        updatedAt: now,
      };
      dbStore.addVideo(video);
      results.push({ url, status: 'IMPORTED', videoId: video.id, title: extracted.title, categoryId: classification.categoryId, tags: classification.tags });
    } catch (error: any) {
      results.push({ url, status: 'FAILED', error: error?.message || 'No se pudo importar el video' });
    }
  }

  return results;
}

