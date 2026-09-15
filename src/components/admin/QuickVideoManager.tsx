import React, { useEffect, useMemo, useState } from 'react';
import { Category, Video } from '../../types';
import { api } from '../../services/api';
import { CheckCircle, Edit3, Search, Trash2 } from 'lucide-react';

export const QuickVideoManager: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [videoResult, categoryResult] = await Promise.all([
        api.adminGetVideos({ status: 'PUBLISHED', limit: 50 }),
        api.getCategories(),
      ]);
      setVideos(videoResult.items);
      setCategories(categoryResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filteredVideos = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-AR');
    if (!normalized) return videos;
    return videos.filter((video) =>
      [video.title, video.creatorName, video.platform, video.id]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('es-AR').includes(normalized))
    );
  }, [videos, query]);

  const changeCategory = async (video: Video, categoryId: string) => {
    if (categoryId === (video.categoryId || '')) return;
    setSavingId(video.id);
    setError(null);
    setMessage(null);
    try {
      const updated = await api.adminUpdateVideo(video.id, { categoryId });
      setVideos((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(`Categoría actualizada: ${updated.title}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la categoría.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteVideo = async (video: Video) => {
    const confirmed = window.confirm(`¿Eliminar definitivamente este video?\n\n${video.title}\n\nEsta acción no se puede deshacer.`);
    if (!confirmed) return;
    setDeletingId(video.id);
    setError(null);
    setMessage(null);
    try {
      await api.adminDeleteVideo(video.id);
      setVideos((current) => current.filter((item) => item.id !== video.id));
      setMessage('Video eliminado permanentemente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el video.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800"><Edit3 className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl font-bold font-serif text-stone-900">Edición rápida del catálogo</h2>
            <p className="text-sm text-stone-600 mt-1">Buscá un video publicado y cambiá su categoría directamente, sin abrir el editor completo.</p>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, creador o ID..."
            className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {message && <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{message}</div>}
      {error && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

      {loading ? (
        <p className="py-6 text-center text-sm text-stone-500">Cargando videos publicados...</p>
      ) : filteredVideos.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500">No se encontraron videos publicados con esa búsqueda.</p>
      ) : (
        <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
          {filteredVideos.map((video) => (
            <div key={video.id} className="border border-stone-200 rounded-xl p-3 flex flex-col lg:flex-row lg:items-center gap-3 hover:bg-stone-50">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img src={video.thumbnailUrl || ''} alt="" loading="lazy" className="w-14 h-9 rounded object-cover bg-stone-200 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-stone-900 truncate">{video.title}</p>
                  <p className="text-[11px] text-stone-500 truncate">{video.creatorName || 'Creador no disponible'} · {video.platform}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:w-[22rem]">
                <select
                  value={video.categoryId || ''}
                  onChange={(event) => void changeCategory(video, event.target.value)}
                  disabled={savingId === video.id}
                  aria-label={`Categoría de ${video.title}`}
                  className="flex-1 bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:opacity-60 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                {savingId === video.id && <span className="text-xs text-stone-500">Guardando...</span>}
                <button
                  type="button"
                  onClick={() => void deleteVideo(video)}
                  disabled={deletingId === video.id || savingId === video.id}
                  title="Eliminar permanentemente"
                  className="p-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
