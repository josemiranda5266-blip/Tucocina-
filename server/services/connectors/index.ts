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

const HOSTS = {
  youtube: new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']),
  instagram: new Set(['instagram.com', 'www.instagram.com']),
  tiktok: new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com']),
};

export class YouTubeConnector implements VideoConnector {
  platform: VideoPlatform = 'YOUTUBE';

  canHandle(url: string): boolean {
    return HOSTS.youtube.has(new URL(url).hostname.toLowerCase());
  }

  async extract(urlStr: string): Promise<ExtractedVideoMetadata> {
    const parsed = new URL(urlStr);
    let videoId = '';

    if (parsed.hostname === 'youtu.be') {
      videoId = parsed.pathname.slice(1).split('/')[0];
    } else if (parsed.pathname === '/watch') {
      videoId = parsed.searchParams.get('v') || '';
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || '';
    } else if (parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      throw new Error('No se pudo extraer un ID válido de YouTube');
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    let title = 'Receta de cocina en YouTube';
    let creatorName = 'Creador de YouTube';
    let creatorUrl: string | undefined;

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'Tucocina-Importer/1.0' },
        redirect: 'error',
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof data.title === 'string' && data.title.length <= 300) title = data.title;
        if (typeof data.author_name === 'string' && data.author_name.length <= 150) creatorName = data.author_name;
        if (typeof data.author_url === 'string') creatorUrl = data.author_url;
      }
    } catch {
      // Metadata enrichment is best-effort; importing remains functional.
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
    return HOSTS.instagram.has(new URL(url).hostname.toLowerCase());
  }

  async extract(urlStr: string): Promise<ExtractedVideoMetadata> {
    const parsed = new URL(urlStr);
    const match = parsed.pathname.match(/^\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/);
    const postId = match?.[2] || '';

    if (!postId) {
      throw new Error('No se pudo extraer un ID de publicación/reel válido de Instagram');
    }

    return {
      originalUrl: urlStr,
      embedUrl: `https://www.instagram.com/p/${postId}/embed`,
      platform: 'INSTAGRAM',
      platformVideoId: postId,
      title: 'Receta de cocina en Instagram',
      description: 'Reel/post de cocina en Instagram. Mirá los detalles e ingredientes.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
      creatorName: 'Creador de Instagram',
    };
  }
}

export class TikTokConnector implements VideoConnector {
  platform: VideoPlatform = 'TIKTOK';

  canHandle(url: string): boolean {
    return HOSTS.tiktok.has(new URL(url).hostname.toLowerCase());
  }

  async extract(urlStr: string): Promise<ExtractedVideoMetadata> {
    const parsed = new URL(urlStr);
    const match = parsed.pathname.match(/^\/video\/(\d+)/);
    const videoId = match?.[1] || '';

    if (!videoId) {
      throw new Error('La URL de TikTok debe contener un ID de video válido');
    }

    return {
      originalUrl: urlStr,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      platform: 'TIKTOK',
      platformVideoId: videoId,
      title: 'Receta de cocina en TikTok',
      description: 'Video corto de cocina publicado en TikTok.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80',
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

  const connector = connectors.find((connector) => connector.canHandle(validation.url!.href));
  if (!connector) {
    throw new Error('Plataforma no soportada. Actualmente soportamos YouTube, Instagram y TikTok.');
  }

  return connector.extract(validation.url.href);
}
