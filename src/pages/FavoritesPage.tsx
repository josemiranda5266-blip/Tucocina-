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

  useEffect(() => {
    let active = true;
    api.getFavorites()
      .then((data) => {
        if (active) setFavorites(data);
      })
      .catch((err) => console.error('Error al cargar favoritos:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  return (
    <AuthGuard>
      <div className="space-y-6 pb-12">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <h1 className="text-3xl font-extrabold font-serif text-stone-900">
              Mis Recetas Favoritas
            </h1>
          </div>
          <p className="text-stone-600 text-sm">
            Guardá tus videos de cocina preferidos para acceder a ellos rápidamente cuando vayas a cocinar.
          </p>
        </div>

        <VideoGrid
          videos={favorites}
          loading={loading}
          onVideoSelect={onVideoSelect}
          emptyTitle="Aún no tenés favoritos guardados"
          emptyMessage="Explorá el catálogo de videos y hacé clic en el ícono de corazón para guardar tus recetas favoritas."
        />
      </div>
    </AuthGuard>
  );
};
