import React, { useState } from 'react';
import { ExternalLink, Instagram, Music, Youtube, Share2, Check, AlertCircle } from 'lucide-react';
import type { Video } from '../types';
import { track } from '../services/analytics';
import { isSafeEmbedUrl, isSafeOriginalVideoUrl } from '../utils/safeVideoUrls';

interface VideoPlayerProps {
  video: Video;
  vertical?: boolean;
}

function OriginalLink({ video }: { video: Video }) {
  return (
    <a href={video.originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
      <ExternalLink className="w-3.5 h-3.5" />
      Ver video original
    </a>
  );
}

function getFacebookThumbnail(video: Video): string | null {
  if (video.platform !== 'FACEBOOK' || !video.thumbnailUrl) return null;
  try {
    const url = new URL(video.thumbnailUrl);
    const host = url.hostname.toLowerCase();
    const allowed = host === 'facebook.com' || host.endsWith('.facebook.com') || host.endsWith('.fbcdn.net') || host.endsWith('.fbsbx.com');
    return url.protocol === 'https:' && allowed ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function VideoPlayer({ video, vertical = false }: VideoPlayerProps) {
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href;
      if (navigator.share) {
        await navigator.share({ title: video.title, text: `Mira este video en CociFlash: ${video.title}`, url: shareUrl });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      setShareStatus('success');
      track('share_video', { videoId: video.id, platform: video.platform });
      window.setTimeout(() => setShareStatus('idle'), 2200);
    } catch {
      setShareStatus('error');
      window.setTimeout(() => setShareStatus('idle'), 2500);
    }
  };

  const renderPlatformBadge = () => {
    switch (video.platform) {
      case 'INSTAGRAM': return <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-pink-400"><Instagram className="w-3.5 h-3.5" /><span>Instagram Reel (Vertical)</span></span>;
      case 'TIKTOK': return <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-400"><Music className="w-3.5 h-3.5" /><span>TikTok Video (Vertical)</span></span>;
      case 'YOUTUBE': return <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-400"><Youtube className="w-3.5 h-3.5" /><span>YouTube Video</span></span>;
      case 'FACEBOOK': return <span className="inline-flex items-center text-xs font-semibold text-blue-400">Facebook Video</span>;
      default: return null;
    }
  };

  const originalUrlSafe = isSafeOriginalVideoUrl(video.originalUrl);
  const embedUrlSafe = isSafeEmbedUrl(video.embedUrl);
  const facebookThumbnail = getFacebookThumbnail(video);

  const shareButton = (
    <button type="button" onClick={handleShare} className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700 transition-colors" title="Compartir este video" aria-label="Compartir este video">
      {shareStatus === 'success' ? <Check className="w-4 h-4" /> : shareStatus === 'error' ? <AlertCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      <span>{shareStatus === 'success' ? '¡Compartido!' : shareStatus === 'error' ? 'No se pudo compartir' : 'Compartir'}</span>
    </button>
  );

  if (video.platform === 'FACEBOOK') {
    return (
      <div className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 ${vertical ? 'max-w-sm mx-auto' : ''}`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          {renderPlatformBadge()}
          <div className="flex items-center gap-2">
            {shareButton}
            {originalUrlSafe && <OriginalLink video={video} />}
          </div>
        </div>
        {facebookThumbnail ? (
          <div className="aspect-video bg-slate-900"><img src={facebookThumbnail} alt={video.title} className="h-full w-full object-cover" loading="lazy" /></div>
        ) : (
          <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-2xl font-black">f</div>
            <p className="text-sm font-semibold text-white">Video de Facebook</p>
            <p className="max-w-md text-xs leading-5 text-slate-400">Facebook no proporcionó una miniatura pública verificable para este video.</p>
          </div>
        )}
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold text-white line-clamp-2">{video.title}</p>
          {embedUrlSafe ? <iframe src={video.embedUrl} title={video.title} className="mt-3 aspect-video w-full rounded-xl" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen /> : null}
          {originalUrlSafe && <div className="mt-3"><OriginalLink video={video} /></div>}
        </div>
      </div>
    );
  }

  if (!embedUrlSafe) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center">
        <ExternalLink className="mx-auto mb-3 h-8 w-8 text-slate-500" />
        <p className="text-sm font-semibold text-white">Este video no permite reproducción integrada directa.</p>
        {originalUrlSafe && <div className="mt-4 flex justify-center"><OriginalLink video={video} /></div>}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 ${vertical ? 'max-w-sm mx-auto' : ''}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        {renderPlatformBadge()}
        <div className="flex items-center gap-2">
          {shareButton}
          {originalUrlSafe && <OriginalLink video={video} />}
        </div>
      </div>
      <iframe src={video.embedUrl} title={video.title} className={`w-full ${vertical ? 'aspect-[9/16]' : 'aspect-video'}`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen />
    </div>
  );
}
