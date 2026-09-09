import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { FavoriteButton } from '../components/FavoriteButton';
import { ReportModal } from '../components/ReportModal';
import { ArrowLeft, ExternalLink, Flag, Eye, Clock, User, Tag } from 'lucide-react';
import { api } from '../services/api';
import { getSafeOriginalUrl } from '../utils/safeVideoUrls';

interface VideoDetailPageProps {
  videoId: string;
  onBack: () => void;
}

export const VideoDetailPage: React.FC<VideoDetailPageProps> = ({ videoId, onBack }) => {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api.getVideoById(videoId)
      .then((data) => {
        if (active) setVideo(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'No se pudo cargar el video');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [videoId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-500">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Cargando detalles del video...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-stone-800">Video no encontrado</h2>
        <p className="text-stone-500 text-sm">{error || 'El video solicitado no existe o fue removido.'}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 bg-amber-600 text-white font-medium px-4 py-2 rounded-xl text-sm hover:bg-amber-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al catálogo</span>
        </button>
      </div>
    );
  }

  const safeOriginalUrl = getSafeOriginalUrl(video.originalUrl);

  return (
    <div id="video-detail-page" className="max-w-4xl mx-auto space-y-6 pb-12">
      <button
        id="video-back-btn"
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-stone-600 hover:text-stone-900 font-semibold text-sm transition-colors py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al catálogo</span>
      </button>

      <VideoPlayer video={video} />

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              {video.categoryId.replace('cat-', '')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif leading-tight">
              {video.title}
            </h1>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <FavoriteButton videoId={video.id} size="lg" />
            {safeOriginalUrl && (
              <a
                href={safeOriginalUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir video original"
                className="p-2.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors flex items-center justify-center"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-stone-600 pt-4 border-t border-stone-100">
          <div className="flex items-center space-x-1.5 text-stone-900 font-bold bg-stone-100 px-3 py-1.5 rounded-lg">
            <User className="w-4 h-4 text-amber-700" />
            <span>{video.creatorName || 'Creador de contenido'}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <Eye className="w-4 h-4 text-stone-400" />
            <span>{video.views} reproducciones</span>
          </div>

          {video.durationSeconds && (
            <div className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-stone-400" />
              <span>{Math.floor(video.durationSeconds / 60)} min</span>
            </div>
          )}

          <div className="flex items-center space-x-1.5 capitalize">
            <Tag className="w-4 h-4 text-stone-400" />
            <span>Plataforma: {video.platform.toLowerCase()}</span>
          </div>
        </div>

        {video.description && (
          <div className="space-y-2 pt-4 border-t border-stone-100">
            <h3 className="font-bold text-stone-900 text-sm">Descripción del video</h3>
            <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">
              {video.description}
            </p>
          </div>
        )}

        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {video.tags.map((tag) => (
              <span key={tag} className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-md">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {safeOriginalUrl ? (
            <a
              href={safeOriginalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2 bg-stone-900 hover:bg-black text-white font-medium px-5 py-2.5 rounded-xl text-sm shadow transition-all"
            >
              <span>Ver receta original en {video.platform}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <span className="text-xs text-stone-500">Enlace original no disponible.</span>
          )}

          <button
            onClick={() => setReportModalOpen(true)}
            className="inline-flex items-center justify-center space-x-1.5 text-stone-500 hover:text-rose-600 text-xs font-semibold"
          >
            <Flag className="w-4 h-4" />
            <span>Reportar problema</span>
          </button>
        </div>
      </div>

      <ReportModal
        videoId={video.id}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
};
