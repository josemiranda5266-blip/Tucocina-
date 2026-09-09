import React from 'react';
import { Video } from '../types';
import { VideoCard } from './VideoCard';
import { Utensils } from 'lucide-react';

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  onVideoSelect: (video: Video) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  loading = false,
  onVideoSelect,
  emptyTitle = 'No se encontraron videos',
  emptyMessage = 'Intentá cambiando los filtros o buscando con otros términos de cocina.',
}) => {
  if (loading) {
    return (
      <div id="video-grid-loading" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-stone-200 rounded-2xl h-72 w-full"></div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div id="video-grid-empty" className="py-16 px-4 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300 max-w-xl mx-auto my-8">
        <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Utensils className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-stone-800 font-serif mb-2">{emptyTitle}</h3>
        <p className="text-stone-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div id="video-grid-items" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} onClick={onVideoSelect} />
      ))}
    </div>
  );
};
