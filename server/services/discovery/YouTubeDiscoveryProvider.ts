/**
 * Official YouTube Data API v3 Discovery Provider
 * Uses search.list + videos.list with server-side YOUTUBE_API_KEY.
 */

import {
  ContentDiscoveryProvider,
  DiscoverySearchOptions,
  DiscoverySearchResult,
  VideoCandidate,
  VideoPlatform,
} from './ContentDiscoveryProvider';
import { isSpanishCandidate } from './spanishCandidateDetector';
import { isCookingCandidate } from './cookingCandidateDetector';
import { scoreCookingVideoCandidate } from './cookingCandidateScorer';
import { classifyVideo } from '../videoClassification';
import { dbStore } from '../../data/store';
import { INITIAL_CATEGORIES } from '../../../src/domain/categories';

function parseIso8601Duration(durationStr?: string): number {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export class YouTubeDiscoveryProvider implements ContentDiscoveryProvider {
  platform: VideoPlatform = 'YOUTUBE';

  isConfigured(): boolean {
    return Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim() !== '');
  }

  private getApiKey(): string {
    const key = process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.trim() : '';
    if (!key) {
      throw new Error('Clave YOUTUBE_API_KEY no configurada en las variables de entorno del servidor.');
    }
    return key;
  }

  async searchCandidates(options: DiscoverySearchOptions = {}): Promise<DiscoverySearchResult> {
    const apiKey = this.getApiKey();
    const query = (options.query || 'recetas fáciles').trim().slice(0, 100);
    const limit = Math.min(Math.max(options.limit || 15, 1), 30);
    const minViews = typeof options.minViews === 'number' && options.minViews >= 0 ? options.minViews : 5000;

    // Step 1: Execute official search.list
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('relevanceLanguage', 'es');
    searchUrl.searchParams.set('regionCode', 'AR');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('maxResults', String(Math.min(limit * 2, 50))); // fetch slightly more to allow filter margin
    searchUrl.searchParams.set('key', apiKey);

    let searchResponse: Response;
    try {
      searchResponse = await fetch(searchUrl.toString(), {
        signal: AbortSignal.timeout(8000),
      });
    } catch (fetchErr: any) {
      throw new Error(`Error de conexión al consultar YouTube API: ${fetchErr?.message || 'timeout'}`);
    }

    if (!searchResponse.ok) {
      const errText = await searchResponse.text().catch(() => '');
      if (
        searchResponse.status === 403 ||
        searchResponse.status === 429 ||
        errText.toLowerCase().includes('quota') ||
        errText.toLowerCase().includes('quotaexceeded')
      ) {
        throw new Error('Se alcanzó temporalmente el límite de búsquedas de YouTube. Intente nuevamente más tarde.');
      }
      throw new Error(`YouTube API devolvió un estado de error (${searchResponse.status}): ${errText.slice(0, 200)}`);
    }

    const searchData: any = await searchResponse.json();
    const items: any[] = searchData.items || [];

    const videoIds: string[] = items
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id && /^[a-zA-Z0-9_-]{11}$/.test(id)));

    if (videoIds.length === 0) {
      return {
        platform: 'YOUTUBE',
        query,
        candidates: [],
        totalFound: 0,
      };
    }

    // Step 2: Fetch detailed metadata with videos.list
    const candidates = await this.getVideoDetails(videoIds, minViews);

    // Filter deduplication against database
    const newCandidates = candidates.filter((c) => {
      const existing = dbStore.findDuplicate('YOUTUBE', c.externalVideoId);
      return !existing;
    });

    // Apply sorting
    const sortBy = options.sortBy || 'score';
    newCandidates.sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'views') return b.views - a.views;
      if (sortBy === 'date') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      return b.score - a.score;
    });

    const finalCandidates = newCandidates.slice(0, limit);

    return {
      platform: 'YOUTUBE',
      query,
      candidates: finalCandidates,
      totalFound: finalCandidates.length,
    };
  }

  async getVideoDetails(videoIds: string[], minViews: number = 5000): Promise<VideoCandidate[]> {
    if (videoIds.length === 0) return [];

    const apiKey = this.getApiKey();
    const uniqueIds = [...new Set(videoIds)].slice(0, 50);

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'snippet,contentDetails,statistics,status');
    videosUrl.searchParams.set('id', uniqueIds.join(','));
    videosUrl.searchParams.set('key', apiKey);

    let response: Response;
    try {
      response = await fetch(videosUrl.toString(), { signal: AbortSignal.timeout(8000) });
    } catch (err: any) {
      throw new Error(`Error de red al consultar detalles de videos en YouTube: ${err?.message || 'timeout'}`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      if (
        response.status === 403 ||
        response.status === 429 ||
        errText.toLowerCase().includes('quota') ||
        errText.toLowerCase().includes('quotaexceeded')
      ) {
        throw new Error('Se alcanzó temporalmente el límite de búsquedas de YouTube. Intente nuevamente más tarde.');
      }
      throw new Error(`YouTube API error al obtener detalles (${response.status})`);
    }

    const data: any = await response.json();
    const items: any[] = data.items || [];

    const candidates: VideoCandidate[] = [];

    for (const item of items) {
      const videoId = item.id;
      if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) continue;

      const snippet = item.snippet || {};
      const stats = item.statistics || {};
      const contentDetails = item.contentDetails || {};
      const status = item.status || {};

      const views = parseInt(stats.viewCount || '0', 10);

      // Criterio C: Mínimo 5.000 visualizaciones
      if (views < minViews) {
        continue; // Descartar videos con menos de minViews (5.000)
      }

      // Criterio D: Embedding habilitado
      const isEmbeddable = status.embeddable !== false;
      if (!isEmbeddable) {
        continue; // Descartar si el creador bloqueó la reproducción integrada
      }

      const title = snippet.title || 'Receta de cocina en YouTube';
      const description = snippet.description || '';
      const channelTitle = snippet.channelTitle || 'Creador de YouTube';
      const publishedAt = snippet.publishedAt || new Date().toISOString();
      const thumbnails = snippet.thumbnails || {};
      const thumbnailUrl =
        thumbnails.maxres?.url ||
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const durationSeconds = parseIso8601Duration(contentDetails.duration);
      const youtubeCategoryId = snippet.categoryId;

      // Evaluation & Scoring
      const isSpanish = isSpanishCandidate(title, description, channelTitle);
      const cookingDetection = isCookingCandidate(title, description, channelTitle);

      const scoreResult = scoreCookingVideoCandidate({
        title,
        description,
        channelTitle,
        views,
        isEmbeddable,
        isSpanish,
        isCooking: cookingDetection.isCooking,
        youtubeCategoryId,
      });

      // Auto-classification of category & tags
      const classification = classifyVideo({ title, description, creatorName: channelTitle });
      const matchedCat = INITIAL_CATEGORIES.find((c) => c.id === classification.categoryId);
      const suggestedCategory = matchedCat
        ? { id: matchedCat.id, name: matchedCat.name }
        : { id: 'cat-argentina', name: 'Cocina argentina' };

      const candidate: VideoCandidate = {
        externalVideoId: videoId,
        platform: 'YOUTUBE',
        originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0`,
        title,
        description,
        creatorName: channelTitle,
        creatorUrl: snippet.channelId ? `https://www.youtube.com/channel/${snippet.channelId}` : undefined,
        thumbnailUrl,
        durationSeconds,
        publishedAt,
        views,
        score: scoreResult.score,
        scoreLabel: scoreResult.label,
        scoreBreakdown: scoreResult.breakdown,
        suggestedCategory,
        suggestedTags: classification.tags.length > 0 ? classification.tags : ['receta', 'fácil', 'casero'],
        isEmbeddable,
        isSpanish,
        isCooking: cookingDetection.isCooking,
        youtubeCategoryId,
      };

      candidates.push(candidate);
    }

    return candidates;
  }
}
