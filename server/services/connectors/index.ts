import { VideoPlatform } from '../../../src/types';
import { validateExternalUrl } from '../../security/ssrf';

export interface ExtractedVideoMetadata {
  originalUrl: string;
  embedUrl: string;
  platform: VideoPlatform;
  platformVideoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  creatorName: string;
  creatorUrl?: string;
  durationSeconds?: number;
}

export interface VideoConnector {
  platform: VideoPlatform;
  canHandle(url: string): boolean;
  extract(url: string): Promise<ExtractedVideoMetadata>;
}

export class YouTubeConnector implements VideoConnector {
  platform: VideoPlatform = 'YOUTUBE';

  canHandle(url: string): boolean {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('youtube.com') || hostname.includes('youtu.be');
  }

  async extract(urlStr: string): Promise<ExtractedVideoMetadata> {
    const parsed = new URL(urlStr);
    let videoId = '';

    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.slice(1).split('/')[0].split('?')[0];
    } else if (parsed.pathname.includes('/watch')) {
      videoId = parsed.searchParams.get('v') || '';
    } else if (parsed.pathname.includes('/shorts/')) {
      const parts = parsed.pathname.split('/shorts/');
      if (parts[1]) videoId = parts[1].split('/')[0].split('?')[0];
    } else if (parsed.pathname.includes('/embed/')) {
      const parts = parsed.pathname.split('/embed/');
      if (parts[1]) videoId = parts[1].split('/')[0].split('?')[0];
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      throw new Error('No se pudo extraer un ID válido de YouTube');
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    // Attempt oEmbed metadata fetch safely
    let title = 'Receta de cocina en YouTube';
    let creatorName = 'Creador de YouTube';
    let creatorUrl = undefined;

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const res = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'CO-Cocina-Bot/1.0' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) creatorName = data.author_name;
        if (data.author_url) creatorUrl = data.author_url;
      }
    } catch {
      // Fallback gracefully if oEmbed fails or times out
    }

    return {
      originalUrl: urlStr,
      embedUrl,
      platform: 'YOUTUBE',
      platformVideoId: videoId,
      title,
      description: `Video de cocina publicado por ${creatorName} en YouTube.`,
      thumbnailUrl,
      creatorName,
      creatorUrl,
    };
  }
}

export class InstagramConnector implements VideoConnector {
  platform: VideoPlatform = 'INSTAGRAM';

  canHandle(url: string): boolean {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('instagram.com');
  }

  async extract(urlStr: string): Promise<ExtractedVideoMetadata> {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;

    let postId = '';
    const match = pathname.match(/\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/);
    if (match && match[2]) {
      postId = match[2];
    }

    if (!postId) {
      throw new Error('No se pudo extraer un ID de publicación/reel válido de Instagram');
    }

    const embedUrl = `https://www.instagram.com/p/${postId}/embed`;
    const thumbnailUrl = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80'; // Clean food placeholder if direct thumb blocked

    return {
      originalUrl: urlStr,
      embedUrl,
      platform: 'INSTAGRAM',
      platformVideoId: postId,
      title: 'Receta de cocina en Instagram',
      description: 'Reel/post de cocina en Instagram. Mirá los detalles e ingredientes.',
      thumbnailUrl,
      creatorName: 'Creador de Instagram',
    };
  }
}

export class TikTokConnector implements VideoConnector {
  platform: VideoPlatform = 'TIKTOK';

  canHandle(url: string): boolean {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('tiktok.com');
  }

  async extract(urlStr: string): Promise<ExtractedVideoMetadata> {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;

    let videoId = '';
    const match = pathname.match(/\/video\/(\d+)/);
    if (match && match[1]) {
      videoId = match[1];
    }

    let embedUrl = '';
    if (videoId) {
      embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;
    } else {
      // General TikTok video fallback format
      embedUrl = `https://www.tiktok.com/embed/v2/`;
    }

    const thumbnailUrl = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80';

    return {
      originalUrl: urlStr,
      embedUrl: embedUrl || urlStr,
      platform: 'TIKTOK',
      platformVideoId: videoId || 'tiktok-item',
      title: 'Receta de cocina en TikTok',
      description: 'Video corto de cocina publicado en TikTok.',
      thumbnailUrl,
      creatorName: 'Creador de TikTok',
    };
  }
}

const connectors: VideoConnector[] = [
  new YouTubeConnector(),
  new InstagramConnector(),
  new TikTokConnector(),
];

export async function processExternalVideoUrl(urlStr: string): Promise<ExtractedVideoMetadata> {
  const validation = validateExternalUrl(urlStr);
  if (!validation.valid || !validation.url) {
    throw new Error(validation.reason || 'URL no permitida por seguridad');
  }

  const connector = connectors.find((c) => c.canHandle(validation.url!.href));
  if (!connector) {
    throw new Error('Plataforma no soportada. Actualmente soportamos YouTube, Instagram y TikTok.');
  }

  return await connector.extract(validation.url!.href);
}
