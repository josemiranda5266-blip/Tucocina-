import React, { useEffect, useMemo, useRef } from 'react';
import { Video } from '../types';
import { ExternalLink, AlertTriangle, Instagram, Music, Youtube } from 'lucide-react';
import { getSafeEmbedUrl, getSafeOriginalUrl } from '../utils/safeVideoUrls';
import { track } from '../services/analytics';

interface VideoPlayerProps {
  video: Video;
  compact?: boolean;
}

function youtubeEmbedWithApi(url: string): string {
  try {
    const parsed = new URL(url);
    if (!/^(www\.)?youtube(?:-nocookie)?\.com$/i.test(parsed.hostname)) return url;
    parsed.searchParams.set('enablejsapi', '1');
    parsed.searchParams.set('origin', window.location.origin);
    return parsed.toString();
  } catch {
    return url;
  }
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, compact = false }) => {
  const safeEmbedUrl = getSafeEmbedUrl(video.embedUrl, video.platform);
  const safeOriginalUrl = getSafeOriginalUrl(video.originalUrl);
  const isVertical = video.platform === 'INSTAGRAM' || video.platform === 'TIKTOK';
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playbackTrackedRef = useRef(false);
  const youtubeSrc = useMemo(
    () => safeEmbedUrl && video.platform === 'YOUTUBE' ? youtubeEmbedWithApi(safeEmbedUrl) : safeEmbedUrl,
    [safeEmbedUrl, video.platform]
  );

  useEffect(() => {
    playbackTrackedRef.current = false;
    if (!youtubeSrc || video.platform !== 'YOUTUBE') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!/^(https?:\/\/)?(www\.)?youtube(?:-nocookie)?\.com$/i.test(event.origin)) return;

      let data: any = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return; }
      }

      // YouTube IFrame Player API: state 1 = PLAYING.
      if (data?.event === 'onStateChange' && data?.info === 1 && !playbackTrackedRef.current) {
        playbackTrackedRef.current = true;
        track('video_play', { videoId: video.id });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [youtubeSrc, video.id, video.platform]);

  const handleYoutubeLoad = () => {
    if (video.platform !== 'YOUTUBE' || !iframeRef.current?.contentWindow) return;
    // Establish the postMessage subscription used by the YouTube embedded player API.
    iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: video.id }), 'https://www.youtube.com');
  };

  const handleOriginalOpen = () => track('video_open_external', { videoId: video.id });

  const renderPlatformBadge = () => {
    switch (video.platform) {
      case 'INSTAGRAM': return <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-pink-400"><Instagram className="w-3.5 h-3.5" /><span>Instagram Reel (Vertical)</span></span>;
      case 'TIKTOK': return <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-400"><Music className="w-3.5 h-3.5" /><span>TikTok Video (Vertical)</span></span>;
      case 'YOUTUBE': return <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-400"><Youtube className="w-3.5 h-3.5" /><span>YouTube Video</span></span>;
      case 'FACEBOOK': return <span className="inline-flex items-center text-xs font-semibold text-blue-400">Facebook Video</span>;
      default: return <span className="text-xs text-stone-400 font-semibold">Video</span>;
    }
  };

  const renderIframe = (src: string, title: string) => (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      onLoad={handleYoutubeLoad}
      className="w-full h-full border-0"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );

  if (isVertical) {
    return (
      <div id="video-player-container" className="w-full flex flex-col items-center my-2">
        <div className={`w-full ${compact ? 'max-w-[340px]' : 'max-w-[390px]'} bg-stone-950 rounded-2xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col`}>
          <div className="bg-stone-900/90 px-3.5 py-2 border-b border-stone-800 flex items-center justify-between">{renderPlatformBadge()}{safeOriginalUrl && <a href={safeOriginalUrl} target="_blank" rel="noopener noreferrer" onClick={handleOriginalOpen} className="text-[11px] font-medium text-stone-400 hover:text-white flex items-center space-x-1 transition-colors" title="Abrir en plataforma original"><span>Original</span><ExternalLink className="w-3 h-3" /></a>}</div>
          <div className={`relative w-full ${compact ? 'h-[460px] max-h-[55vh]' : 'h-[580px] sm:h-[620px] max-h-[72vh]'} bg-black flex items-center justify-center overflow-hidden`}>
            {safeEmbedUrl ? renderIframe(youtubeSrc || safeEmbedUrl, video.title) : <div className="text-center p-6 text-stone-400"><AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" /><p className="text-stone-200 text-sm font-semibold mb-1">Reproducción integrada no disponible</p><p className="text-xs mb-3 text-stone-400">Podés abrir este contenido directamente en la plataforma original.</p>{safeOriginalUrl && <a href={safeOriginalUrl} target="_blank" rel="noopener noreferrer" onClick={handleOriginalOpen} className="inline-flex items-center space-x-1.5 bg-amber-600 text-white font-medium px-4 py-2 rounded-xl text-xs shadow hover:bg-amber-500 transition-colors"><span>Ver en la plataforma original</span><ExternalLink className="w-3.5 h-3.5" /></a>}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="video-player-container" className="w-full max-w-4xl mx-auto bg-stone-900 rounded-2xl overflow-hidden shadow-2xl border border-stone-800">
      <div className="relative aspect-video w-full max-h-[72vh] bg-black flex items-center justify-center">
        {safeEmbedUrl ? renderIframe(youtubeSrc || safeEmbedUrl, video.title) : <div className="text-center p-8 text-stone-400"><AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" /><p className="text-stone-200 font-semibold mb-2">Este video no permite reproducción integrada directa</p><p className="text-xs mb-4">Podés verlo directamente en la plataforma original.</p>{safeOriginalUrl && <a href={safeOriginalUrl} target="_blank" rel="noopener noreferrer" onClick={handleOriginalOpen} className="inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"><span>Ver en la plataforma original</span><ExternalLink className="w-4 h-4" /></a>}</div>}
      </div>
      {video.platform === 'FACEBOOK' && safeOriginalUrl && <div className="flex items-center justify-between gap-3 px-4 py-3 bg-stone-950 border-t border-stone-800"><p className="text-xs text-stone-400">Si Facebook no permite mostrar este video aquí, podés abrirlo en Facebook.</p><a href={safeOriginalUrl} target="_blank" rel="noopener noreferrer" onClick={handleOriginalOpen} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"><span>Ver en Facebook</span><ExternalLink className="w-3.5 h-3.5" /></a></div>}
    </div>
  );
};