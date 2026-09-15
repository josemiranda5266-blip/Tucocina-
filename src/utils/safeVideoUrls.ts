import { VideoPlatform } from '../types';

const ALLOWED_ORIGINAL_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
  'instagr.am',
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  'v.tiktok.com',
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
]);

const EMBED_HOSTS: Record<VideoPlatform, Set<string>> = {
  YOUTUBE: new Set(['www.youtube-nocookie.com']),
  INSTAGRAM: new Set(['www.instagram.com']),
  TIKTOK: new Set(['www.tiktok.com']),
  FACEBOOK: new Set(['www.facebook.com']),
  OTHER: new Set([]),
};

export function getSafeOriginalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    if (!ALLOWED_ORIGINAL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function getSafeEmbedUrl(url: string, platform: VideoPlatform): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    if (!EMBED_HOSTS[platform]?.has(parsed.hostname.toLowerCase())) return null;

    if (platform === 'YOUTUBE' && !/^\/embed\/[a-zA-Z0-9_-]{11}\/?$/.test(parsed.pathname)) return null;
    if (platform === 'INSTAGRAM' && !/^\/(?:p|reel|reels|tv)\/[a-zA-Z0-9_-]+\/embed\/?$/.test(parsed.pathname)) return null;
    if (platform === 'TIKTOK' && !/^\/embed\/v2\/\d+\/?$/.test(parsed.pathname)) return null;
    if (platform === 'FACEBOOK') {
      if (parsed.pathname !== '/plugins/video.php') return null;
      const href = parsed.searchParams.get('href');
      if (!href || getSafeOriginalUrl(href) === null) return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}
