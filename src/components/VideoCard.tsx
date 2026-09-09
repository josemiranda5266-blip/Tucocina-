import React from 'react';
import { Video } from '../types';
import { FavoriteButton } from './FavoriteButton';
import { Play, Clock, Youtube, Instagram, Music } from 'lucide-react';

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderPlatformBadge = () => {
    switch (video.platform) {
      case 'YOUTUBE':
        return (
          <span className="flex items-center space-x-1 bg-red-600/90 text-white px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
            <Youtube className="w-3 h-3" />
            <span>YouTube</span>
          </span>
        );
      case 'INSTAGRAM':
        return (
          <span className="flex items-center space-x-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
            <Instagram className="w-3 h-3" />
            <span>Instagram</span>
          </span>
        );
      case 'TIKTOK':
        return (
          <span className="flex items-center space-x-1 bg-stone-900 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
            <Music className="w-3 h-3 text-teal-400" />
            <span>TikTok</span>
          </span>
        );
      default:
        return (
          <span className="bg-stone-800 text-stone-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            Video
          </span>
        );
    }
  };

  return (
    <div
      id={`video-card-${video.id}`}
      onClick={() => onClick(video)}
      className="group bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full bg-stone-100 overflow-hidden">
        <img
          src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80'}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Play Overlay Icon */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-amber-600/90 text-white flex items-center justify-center pl-1 shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-current" />
          </div>
        </div>

        {/* Top Badges: Platform & Favorite */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div>{renderPlatformBadge()}</div>
          <FavoriteButton videoId={video.id} size="sm" />
        </div>

        {/* Bottom Duration Badge */}
        {video.durationSeconds && video.durationSeconds > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/75 text-white px-2 py-0.5 rounded-md text-xs font-mono font-medium flex items-center space-x-1 backdrop-blur-sm">
            <Clock className="w-3 h-3 text-stone-300" />
            <span>{formatDuration(video.durationSeconds)}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 justify-between bg-white">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-amber-700 mb-1">
            <span className="capitalize">{video.categoryId.replace('cat-', '')}</span>
          </div>
          <h3 className="font-bold text-stone-900 text-base leading-snug line-clamp-2 group-hover:text-amber-800 transition-colors">
            {video.title}
          </h3>
        </div>

        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span className="font-medium text-stone-700 truncate max-w-[160px]">
            {video.creatorName || 'Creador gastronómico'}
          </span>
          {video.views > 0 && (
            <span>{video.views} vistas</span>
          )}
        </div>
      </div>
    </div>
  );
};
