import React, { useEffect, useState } from 'react';
import { SearchBar } from '../components/SearchBar';
import { VideoGrid } from '../components/VideoGrid';
import { CategoryCard } from '../components/CategoryCard';
import { AdSlot } from '../components/ads/AdSlot';
import { Video, Category } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ChefHat, Flame, Clock, ArrowRight, Utensils, Shield } from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: string, param?: string) => void;
  onVideoSelect: (video: Video) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onVideoSelect }) => {
  const { user, isAdmin } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [popularVideos, setPopularVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [cats, recentRes, popularRes] = await Promise.all([
          api.getCategories(),
          api.getVideos({ limit: 8, sortBy: 'recent' }),
          api.getVideos({ limit: 8, sortBy: 'views' }),
        ]);

        if (active) {
          setCategories(cats);
          setRecentVideos(recentRes.items);
          setPopularVideos(popularRes.items);
        }
      } catch (err) {
        console.error('Error al cargar datos en inicio:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, []);

  const handleSearchSubmit = (query: string) => {
    onNavigate('search', query);
  };

  return (
    <div className="space-y-12 pb-12">
      {isAdmin && (
        <div id="admin-banner-notice" className="bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-amber-600/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white">Sesión de Administrador activa</span>
                <span className="bg-amber-500 text-amber-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Conectado como <strong className="text-white">{user?.email}</strong>. Tenés permisos para importar videos y gestionar el catálogo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow active:scale-95 shrink-0"
          >
            <span>Ir al Panel Admin</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top AdSlot Placement (Inert when ads.enabled === false) */}
      <AdSlot placement="HOME_TOP" />

      {/* Hero Section */}
      <section id="home-hero" className="relative bg-gradient-to-br from-amber-900 via-amber-950 to-stone-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden border border-amber-800/40">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-300 px-3.5 py-1 rounded-full text-xs font-semibold border border-amber-400/30">
            <ChefHat className="w-4 h-4" />
            <span>Catálogo Gastronómico de Videos</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-serif leading-tight tracking-tight text-white">
            Descubrí tu próximo plato favorito
          </h1>

          <p className="text-amber-100/90 text-base sm:text-lg leading-relaxed font-sans">
            Buscá y guardá las mejores recetas en video publicadas por creadores expertos en YouTube, Instagram y TikTok.
          </p>

          <SearchBar onSearch={handleSearchSubmit} className="max-w-2xl pt-2" />
        </div>
      </section>

      {/* Categories Bar */}
      <section id="home-categories" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Utensils className="w-5 h-5 text-amber-700" />
            <h2 className="text-2xl font-bold font-serif text-stone-900">Categorías Gastronómicas</h2>
          </div>
          <button
            onClick={() => onNavigate('categories')}
            className="flex items-center space-x-1 text-amber-700 hover:text-amber-900 text-sm font-bold"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.slice(0, 6).map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onClick={(category) => onNavigate('search', `cat:${category.id}`)}
            />
          ))}
        </div>
      </section>

      {/* Middle AdSlot Placement (Inert when ads.enabled === false) */}
      <AdSlot placement="HOME_MIDDLE" />

      {/* Popular Videos Section */}
      <section id="home-popular" className="space-y-4">
        <div className="flex items-center space-x-2">
          <Flame className="w-5 h-5 text-amber-600" />
          <h2 className="text-2xl font-bold font-serif text-stone-900">Recetas Populares</h2>
        </div>

        <VideoGrid
          videos={popularVideos}
          loading={loading}
          onVideoSelect={onVideoSelect}
          emptyTitle="Aún no hay recetas destacadas"
          emptyMessage="Los administradores agregarán nuevos videos pronto."
        />
      </section>

      {/* Recent Videos Section */}
      <section id="home-recent" className="space-y-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-stone-700" />
          <h2 className="text-2xl font-bold font-serif text-stone-900">Nuevas Recetas Agregadas</h2>
        </div>

        <VideoGrid
          videos={recentVideos}
          loading={loading}
          onVideoSelect={onVideoSelect}
          emptyTitle="Sin recetas recientes"
          emptyMessage="Pronto se publicarán nuevos videos de cocina."
        />
      </section>

    </div>
  );
};
