import React, { useEffect, useState } from 'react';
import { Video } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { AuthGuard } from '../components/AuthGuard';
import { api } from '../services/api';
import { Heart } from 'lucide-react';

interface FavoritesPageProps {
  onVideoSelect: (video: Video) => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onVideoSelect }) => {
  const [favorites, setFavorites] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  const loadFavorites = async (nextCursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getFavorites({ cursor: nextCursor, limit: 20 });
      setFavorites((previous) => nextCursor ? [...previous, ...result.items] : result.items);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus favoritos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFavorites();
  }, []);

  return (
    <AuthGuard>
      <div className="space-y-6 pb-12">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl"><Heart className="w-6 h-6 fill-current" /></div>
            <h1 className="text-3xl font-extrabold font-serif text-stone-900">Mis Videos Favoritos</h1>
          </div>
          <p className="text-stone-600 text-sm">Guardá tus videos de cocina preferidos para acceder a ellos rápidamente.</p>
        </div>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <VideoGrid
          videos={favorites}
          loading={loading && favorites.length === 0}
          onVideoSelect={onVideoSelect}
          emptyTitle="Aún no tenés favoritos guardados"
          emptyMessage="Explorá el catálogo y hacé clic en el ícono de corazón para guardar tus videos favoritos."
        />

        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void loadFavorites(cursor)}
              disabled={loading || !cursor}
              className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-bold disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};
