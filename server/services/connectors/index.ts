import { createHash } from 'crypto';
import { VideoPlatform } from '../../../src/types';
import { validateExternalUrl } from '../../security/ssrf';
import { resolveExternalVideoUrl } from '../resolveExternalVideoUrl';

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
  youtube: new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']),
  instagram: new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com', 'instagr.am']),
  tiktok: new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'v.tiktok.com']),
  facebook: new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com']),
};

function cleanText(value: unknown, fallback: string, max: number): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

export class YouTubeConnector implements VideoConnector {
  platform: VideoPlatform = 'YOUTUBE';

  canHandle(url: string): boolean {
    return HOSTS.youtube.has(new URL(url).hostname.toLowerCase());
  }

  async extract(urlStr: string): Promise<ExtractedVideoMetadata> {
    const parsed = new URL(urlStr);
    let videoId = '';
    if (parsed.hostname === 'youtu.be') videoId = parsed.pathname.slice(1).split('/')[0];
    else if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v') || '';
    else if (parsed.pathname.startsWith('/shorts/')) videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || '';
    else if (parsed.pathname.startsWith('/embed/')) videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
    else if (parsed.pathname.startsWith('/live/')) videoId = parsed.pathname.split('/live/')[1]?.split('/')[0] || '';

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) throw new Error('No se pudo extraer un ID válido de YouTube');

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let title = 'Receta de cocina en YouTube';
    let creatorName = 'Creador de YouTube';
    let creatorUrl: string | undefined;

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl, { headers: { 'User-Agent': 'Tucocina-Importer/1.0' }, redirect: 'follow', signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const data = await response.json();
        title = cleanText(data.title, title, 300);
        creatorName = cleanText(data.author_name, creatorName, 150);
        if (typeof data.author_url === 'string') creatorUrl = data.author_url;
      }
    } catch {
      // Metadata enrichment is best-effort.
    }

    return { originalUrl: urlStr, embedUrl, platform: 'YOUTUBE', platformVideoId: videoId, title, description: `Video de cocina publicado por ${creatorName} en YouTube.`, thumbnailUrl, creatorName, creatorUrl };
  }
}

export class InstagramConnector implements VideoConnector {
  platform: VideoPlatform = 'INSTAGRAM';
  canHandle(url: string): boolean { return HOSTS.instagram.has(new URL(url).hostname.toLowerCase()); }

  async extract(urlStr: string): Promise<ExtractedVideoMetadata> {
    const parsed = new URL(urlStr);
    const match = parsed.pathname.match(/(?:share\/)?(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i) ||
                  parsed.pathname.match(/\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
    const kind = match?.[1]?.toLowerCase() || '';
    const postId = match?.[2] || '';
    if (!postId) throw new Error('No se pudo extraer un ID de publicación/reel válido de Instagram');
    const embedPath = kind === 'reel' || kind === 'reels' ? 'reel' : 'p';
    const defaultThumbnail = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80';
    return {
      originalUrl: urlStr,
      embedUrl: `https://www.instagram.com/${embedPath}/${postId}/embed/`,
      platform: 'INSTAGRAM',
      platformVideoId: postId,
      title: kind === 'reel' || kind === 'reels' ? 'Reel de cocina en Instagram' : 'Receta de cocina en Instagram',
      description: 'Contenido gastronómico publicado en Instagram. Podés editar el título, ingredientes y detalles antes de publicar.',
      thumbnailUrl: defaultThumbnail,
      creatorName: 'Creador de Instagram',
    };
  }
}

export class TikTokConnector implements VideoConnector {
  platform: VideoPlatform = 'TIKTOK';
  canHandle(url: string): boolean { return HOSTS.tiktok.has(new URL(url).hostname.toLowerCase()); }

  async extract(urlStr: string): Promise<ExtractedVideoMetadata> {
    let resolvedUrl = urlStr;
    const initial = new URL(urlStr);
    if (
      initial.hostname.toLowerCase() === 'vm.tiktok.com' ||
      initial.hostname.toLowerCase() === 'vt.tiktok.com' ||
      initial.hostname.toLowerCase() === 'v.tiktok.com'
    ) {
      try {
        resolvedUrl = await resolveExternalVideoUrl(urlStr);
      } catch {
        // Fallback to initial URL if resolving short link encounters timeout
      }
    }

    const parsed = new URL(resolvedUrl);
    const match = parsed.pathname.match(/(?:video|v)\/(\d+)/) || parsed.pathname.match(/\/(\d{15,25})/);
    const videoId = match?.[1] || '';
    if (!videoId) throw new Error('No se pudo extraer un ID de video válido de TikTok');

    let title = 'Receta de cocina en TikTok';
    let creatorName = 'Creador de TikTok';
    let thumbnailUrl = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80';

    try {
      const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) title = cleanText(data.title, title, 300);
        if (data.author_name) creatorName = cleanText(data.author_name, creatorName, 150);
        if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
      }
    } catch {
      // Best-effort oembed
    }

    return {
      originalUrl: resolvedUrl,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      platform: 'TIKTOK',
      platformVideoId: videoId,
      title,
      description: 'Video corto de cocina publicado en TikTok.',
      thumbnailUrl,
      creatorName,
    };
  }
}

export class FacebookConnector implements VideoConnector {
  platform: VideoPlatform = 'FACEBOOK';

  canHandle(url: string): boolean {
    return HOSTS.facebook.has(new URL(url).hostname.toLowerCase());
  }

  async extract(urlStr: string): Promise<ExtractedVideoMetadata> {
    const parsed = new URL(urlStr);
    const path = parsed.pathname.toLowerCase();
    const idMatch = parsed.pathname.match(/\/(?:videos?|reel|reels)\/(\d+)/i) ||
      parsed.pathname.match(/\/share\/[vr]\/(?:\d+|[a-zA-Z0-9_-]+)/i) ||
      parsed.pathname.match(/\/(\d{8,})\/?$/);
    const queryId = parsed.searchParams.get('v') || parsed.searchParams.get('video_id') || '';
    const platformVideoId = idMatch?.[1] || queryId || createHash('sha256').update(parsed.href).digest('hex').slice(0, 32);

    const isVideoPath = /\/(?:videos?|reel|reels)\//i.test(path) || /\/share\/[vr]\//i.test(path) || Boolean(queryId);
    if (!isVideoPath && !idMatch) {
      throw new Error('La URL de Facebook no parece ser un video o reel público válido');
    }

    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(parsed.href)}&show_text=false`;
    const thumbnailUrl = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80';

    return {
      originalUrl: parsed.href,
      embedUrl,
      platform: 'FACEBOOK',
      platformVideoId,
      title: 'Video de cocina en Facebook',
      description: 'Video público de cocina publicado en Facebook. El contenido se reproduce desde Facebook; CociFlash no descarga ni almacena el video.',
      thumbnailUrl,
      creatorName: 'Creador de Facebook',
    };
  }
}

const connectors: VideoConnector[] = [
  new YouTubeConnector(),
  new InstagramConnector(),
  new TikTokConnector(),
  new FacebookConnector(),
];

export async function processExternalVideoUrl(urlStr: string): Promise<ExtractedVideoMetadata> {
  const validation = validateExternalUrl(urlStr);
  if (!validation.valid || !validation.url) throw new Error(validation.reason || 'URL no permitida por seguridad');
  const connector = connectors.find((connector) => connector.canHandle(validation.url!.href));
  if (!connector) throw new Error('Plataforma no soportada. Actualmente soportamos YouTube, Instagram, TikTok y Facebook.');
  return connector.extract(validation.url.href);
}
