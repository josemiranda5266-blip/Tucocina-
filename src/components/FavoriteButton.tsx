import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface FavoriteButtonProps {
  videoId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ videoId, className = '', size = 'md' }) => {
  const { user, signInWithGoogle } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (user && videoId) {
      api.checkIsFavorite(videoId).then((fav) => {
        if (active) setIsFavorite(fav);
      });
    } else {
      setIsFavorite(false);
    }
    return () => { active = false; };
  }, [user, videoId]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      await signInWithGoogle();
      return;
    }

    setLoading(true);
    try {
      if (isFavorite) {
        await api.removeFavorite(videoId);
        setIsFavorite(false);
      } else {
        await api.addFavorite(videoId);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Error al actualizar favorito:', err);
    } finally {
      setLoading(false);
    }
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      id={`fav-btn-${videoId}`}
      onClick={toggleFavorite}
      disabled={loading}
      title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      className={`p-2 rounded-full backdrop-blur-md transition-all active:scale-90 ${
        isFavorite
          ? 'bg-rose-600 text-white shadow-md hover:bg-rose-700'
          : 'bg-black/40 text-white/90 hover:bg-black/60 hover:text-white'
      } ${className}`}
    >
      <Heart className={`${iconSizes[size]} ${isFavorite ? 'fill-current' : ''}`} />
    </button>
  );
};
