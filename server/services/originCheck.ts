import { dbStore, StoredVideo } from '../data/store';

export interface OriginCheckResult {
  videoId: string;
  isAvailable: boolean;
  reason?: string;
}

export async function checkVideoOriginStatus(video: StoredVideo): Promise<OriginCheckResult> {
  const { id: videoId, platform, platformVideoId, originalUrl } = video;

  if (platform === 'YOUTUBE' && platformVideoId) {
    // 1. Check with YouTube API if YOUTUBE_API_KEY is available
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=id,status,snippet&id=${encodeURIComponent(platformVideoId)}&key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (!data.items || data.items.length === 0) {
            return { videoId, isAvailable: false, reason: 'Video no encontrado en YouTube API (eliminado por creador)' };
          }

          const item = data.items[0];
          const uploadStatus = item?.status?.uploadStatus;
          const privacyStatus = item?.status?.privacyStatus;

          if (uploadStatus === 'deleted' || uploadStatus === 'rejected') {
            return { videoId, isAvailable: false, reason: `Estado de upload en YouTube: ${uploadStatus}` };
          }
          if (privacyStatus === 'private') {
            return { videoId, isAvailable: false, reason: 'El video fue configurado como Privado por el creador' };
          }

          return { videoId, isAvailable: true };
        }
      } catch (err) {
        // Fall back to oEmbed check below on timeout or network error
      }
    }

    // 2. oEmbed check for YouTube
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(platformVideoId)}&format=json`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(oembedUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 404 || res.status === 410) {
        return { videoId, isAvailable: false, reason: 'YouTube oEmbed retornó 404/410 (video eliminado o inexistente)' };
      }

      if (!res.ok) {
        const text = await res.text();
        if (text.includes('Not Found') || text.includes('Video unavailable') || text.includes('Private video')) {
          return { videoId, isAvailable: false, reason: 'Video no disponible en origen (privado o removido)' };
        }
      }

      return { videoId, isAvailable: true };
    } catch (err: any) {
      // In case of network failure or timeout, assume available to prevent accidental mass deletion
      return { videoId, isAvailable: true };
    }
  }

  // 3. TikTok / Instagram / Other platforms check via HEAD/oEmbed
  try {
    const targetUrl = originalUrl || '';
    if (!targetUrl.startsWith('https://')) {
      return { videoId, isAvailable: true };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(targetUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Tucocina-Bot/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 404 || res.status === 410) {
      return { videoId, isAvailable: false, reason: `Servidor de origen retornó HTTP ${res.status}` };
    }

    return { videoId, isAvailable: true };
  } catch (err) {
    return { videoId, isAvailable: true };
  }
}

export async function purgeOriginDeletedVideos(): Promise<{
  checkedCount: number;
  deletedCount: number;
  deletedVideos: Array<{ id: string; title: string; platform: string; reason?: string }>;
}> {
  const allVideos = dbStore.getAllAdminVideos({ limit: 500 }).items;
  const deletedVideos: Array<{ id: string; title: string; platform: string; reason?: string }> = [];

  for (const video of allVideos) {
    const check = await checkVideoOriginStatus(video);
    if (!check.isAvailable) {
      dbStore.deleteVideo(video.id);
      deletedVideos.push({
        id: video.id,
        title: video.title,
        platform: video.platform,
        reason: check.reason,
      });
    }
  }

  return {
    checkedCount: allVideos.length,
    deletedCount: deletedVideos.length,
    deletedVideos,
  };
}
