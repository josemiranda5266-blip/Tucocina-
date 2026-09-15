import React from 'react';
import { Video } from '../types';
import { ExternalLink, AlertTriangle, Instagram, Music, Youtube, Facebook } from 'lucide-react';
import { getSafeEmbedUrl, getSafeOriginalUrl } from '../utils/safeVideoUrls';

interface VideoPlayerProps {
  video: Video;
  compact?: boolean;
}

function getFacebookThumbnail(video: Video): string | null {
  if (video.platform !== 'FACEBOOK' || !video.thumbnailUrl) return null;
  try {
    const parsed = new URL(video.thumbnailUrl);
    const host = parsed.hostname.toLowerCase();
    const isFacebookOwned = host === 'facebook.com' || host.endsWith('.facebook.com') || host.endsWith('.fbcdn.net') || host.endsWith('.fbsbx.com');
    if (!isFacebookOwned || parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, compact = false }) => {
  const safeEmbedUrl = getSafeEmbedUrl(video.embedUrl, video.platform);
  const safeOriginalUrl = getSafeOriginalUrl(video.originalUrl);
  const isVertical = video.platform === 'INSTAGRAM' || video.platform === 'TIKTOK';
  const isFacebook = video.platform === 'FACEBOOK';
  const facebookThumbnail = getFacebookThumbnail(video);

  const renderPlatformBadge = () => {
    switch (video.platform) {
      case 'INSTAGRAM':
        return (
          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-pink-400">
            <Instagram className="w-3.5 h-3.5" />
            <span>Instagram Reel (Vertical)</span>
          </span>
        );
      case 'TIKTOK':
        return (
          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-400">
            <Music className="w-3.5 h-3.5" />
            <span>TikTok Video (Vertical)</span>
          </span>
        );
      case 'YOUTUBE':
        return (
          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-400">
            <Youtube className="w-3.5 h-3.5" />
            <span>YouTube Video</span>
          </span>
        );
      case 'FACEBOOK':
        return <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-400"><Facebook className="w-3.5 h-3.5" /><span>Facebook Video</span></span>;
      default:
        return <span className="text-xs text-stone-400 font-semibold">Video</span>;
    }
  };

  const OriginalLink = () => safeOriginalUrl ? (
    <a
      href={safeOriginalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-blue-500 transition-colors"
    >
      <span>{isFacebook ? 'Ver video en Facebook' : 'Ver en la plataforma original'}</span>
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  ) : null;

  if (isVertical) {
    return (
      <div id="video-player-container" className="w-full flex flex-col items-center my-2">
        <div
          className={`w-full ${compact ? 'max-w-[340px]' : 'max-w-[390px]'} bg-stone-950 rounded-2xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col`}
        >
          <div className="bg-stone-900/90 px-3.5 py-2 border-b border-stone-800 flex items-center justify-between">
            {renderPlatformBadge()}
            {safeOriginalUrl && (
              <a href={safeOriginalUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-stone-400 hover:text-white flex items-center space-x-1 transition-colors" title="Abrir en plataforma original">
                <span>Original</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className={`relative w-full ${compact ? 'h-[460px] max-h-[55vh]' : 'h-[580px] sm:h-[620px] max-h-[72vh]'} bg-black flex items-center justify-center overflow-hidden`}>
            {safeEmbedUrl ? (
              <iframe
                src={safeEmbedUrl}
                title={video.title}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="text-center p-6 text-stone-400">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="text-stone-200 text-sm font-semibold mb-1">Reproducción integrada no disponible</p>
                <p className="text-xs mb-3 text-stone-400">Podés abrir este contenido directamente en la plataforma original.</p>
                <OriginalLink />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="video-player-container" className="w-full max-w-4xl mx-auto bg-stone-900 rounded-2xl overflow-hidden shadow-2xl border border-stone-800">
      {isFacebook && (
        <div className="relative aspect-video w-full overflow-hidden bg-stone-950 border-b border-stone-800">
          {facebookThumbnail ? (
            <img
              src={facebookThumbnail}
              alt={`Miniatura de ${video.title}`}
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-950 via-stone-950 to-stone-900 px-6">
              <div className="text-center max-w-md">
                <Facebook className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <p className="text-lg font-semibold text-white">Video de Facebook</p>
                <p className="mt-1 text-sm text-stone-400">Facebook no proporcionó una miniatura pública verificable para este video.</p>
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-12">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-blue-300">Facebook</p>
                <p className="text-sm font-semibold text-white">{facebookThumbnail ? 'Vista previa del video' : 'Vista previa no disponible'}</p>
              </div>
              <OriginalLink />
            </div>
          </div>
        </div>
      )}

      <div className="relative aspect-video w-full max-h-[72vh] bg-black flex items-center justify-center">
        {safeEmbedUrl ? (
          <iframe
            src={safeEmbedUrl}
            title={video.title}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="text-center p-8 text-stone-400">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-stone-200 font-semibold mb-2">Este video no permite reproducción integrada directa</p>
            <p className="text-xs mb-4">Podés verlo directamente en la plataforma original.</p>
            <OriginalLink />
          </div>
        )}
      </div>

      {isFacebook && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-stone-950 border-t border-stone-800">
          <div>
            <p className="text-sm font-semibold text-stone-200">¿No se reproduce aquí?</p>
            <p className="text-xs text-stone-400">Facebook puede impedir la reproducción integrada de algunos videos públicos.</p>
          </div>
          <OriginalLink />
        </div>
      )}
    </div>
  );
};
