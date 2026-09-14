import { processExternalVideoUrl } from './connectors';
import { classifyVideo } from './videoClassification';
import { getAdminFirestore } from '../auth/firebaseAdmin';

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
  const db = getAdminFirestore();
  const results: BulkImportResult[] = [];

  // Sequential processing deliberately limits platform/API pressure and keeps
  // failures isolated to individual URLs.
  for (const url of uniqueUrls) {
    try {
      const extracted = await processExternalVideoUrl(url);
      const existing = await db.collection('videos')
        .where('platform', '==', extracted.platform)
        .where('platformVideoId', '==', extracted.platformVideoId)
        .limit(1)
        .get();
      if (!existing.empty) {
        results.push({ url, status: 'DUPLICATE', videoId: existing.docs[0].id, title: String(existing.docs[0].data().title || '') });
        continue;
      }

      const classification = classifyVideo(extracted);
      const ref = db.collection('videos').doc();
      const now = new Date().toISOString();
      const video = {
        id: ref.id,
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
      await ref.set(video);
      results.push({ url, status: 'IMPORTED', videoId: ref.id, title: extracted.title, categoryId: classification.categoryId, tags: classification.tags });
    } catch (error: any) {
      results.push({ url, status: 'FAILED', error: error?.message || 'No se pudo importar el video' });
    }
  }

  return results;
}
