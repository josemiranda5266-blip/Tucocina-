import React from 'react';
import { Video } from '../types';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { getSafeEmbedUrl, getSafeOriginalUrl } from '../utils/safeVideoUrls';

interface VideoPlayerProps {
  video: Video;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video }) => {
  const safeEmbedUrl = getSafeEmbedUrl(video.embedUrl, video.platform);
  const safeOriginalUrl = getSafeOriginalUrl(video.originalUrl);

  return (
    <div id="video-player-container" className="w-full bg-stone-900 rounded-2xl overflow-hidden shadow-2xl border border-stone-800">
      <div className="relative aspect-video w-full bg-black flex items-center justify-center">
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
            {safeOriginalUrl && (
              <a
                href={safeOriginalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
              >
                <span>Ver en la plataforma original</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
