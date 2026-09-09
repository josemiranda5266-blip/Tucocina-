import React, { useEffect, useState } from 'react';
import { Video, Category } from '../../types';
import { api } from '../../services/api';
import { Pagination } from '../../components/Pagination';
import { Edit, Trash2, Eye, EyeOff, CheckCircle, ExternalLink, X } from 'lucide-react';

export const AdminVideos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Edit Modal State
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStatus, setEditStatus] = useState<any>('DRAFT');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  const loadVideos = () => {
    setLoading(true);
    api.adminGetVideos({ page: currentPage, limit: 10, status: statusFilter || undefined })
      .then((res) => {
        setVideos(res.items);
        setHasMore(res.hasMore);
      })
      .catch((err) => console.error('Error al cargar catálogo admin:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVideos();
  }, [currentPage, statusFilter]);

  const handleToggleStatus = async (video: Video, newStatus: any) => {
    try {
      await api.adminUpdateVideo(video.id, { status: newStatus });
      loadVideos();
    } catch (err) {
      alert('Error al actualizar estado del video');
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('¿Estás seguro de que querés eliminar permanentemente este video?')) return;
    try {
      await api.adminDeleteVideo(videoId);
      loadVideos();
    } catch (err) {
      alert('Error al eliminar el video');
    }
  };

  const openEditModal = (video: Video) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDesc(video.description || '');
    setEditCategory(video.categoryId || 'cat-carnes');
    setEditStatus(video.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    setSaveLoading(true);
    try {
      await api.adminUpdateVideo(editingVideo.id, {
        title: editTitle,
        description: editDesc,
        categoryId: editCategory,
        status: editStatus,
      });
      setEditingVideo(null);
      loadVideos();
    } catch (err) {
      alert('Error al guardar cambios');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200">
        <h2 className="text-xl font-bold font-serif text-stone-900">Gestión de Catálogo de Videos</h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-stone-600">Filtrar por estado:</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-stone-800 font-medium"
          >
            <option value="">Todos los estados</option>
            <option value="PUBLISHED">Publicados</option>
            <option value="DRAFT">Borradores</option>
            <option value="PENDING_REVIEW">En revisión</option>
            <option value="HIDDEN">Ocultos</option>
          </select>
        </div>
      </div>

      {/* Videos Table */}
      {loading ? (
        <div className="py-12 text-center text-stone-500">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Cargando catálogo...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="py-12 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500">
          No hay videos cargados en este estado.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
              <tr>
                <th className="p-3">Video</th>
                <th className="p-3">Plataforma</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {videos.map((v) => (
                <tr key={v.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center space-x-3">
                      <img src={v.thumbnailUrl} alt={v.title} className="w-12 h-8 rounded object-cover shrink-0 bg-stone-200" />
                      <div>
                        <p className="font-bold text-stone-900 line-clamp-1 max-w-xs">{v.title}</p>
                        <p className="text-[10px] text-stone-500">{v.creatorName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-stone-700 uppercase">{v.platform}</td>
                  <td className="p-3 capitalize">{v.categoryId.replace('cat-', '')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      v.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' :
                      v.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' :
                      v.status === 'HIDDEN' ? 'bg-stone-200 text-stone-700' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {v.status !== 'PUBLISHED' ? (
                        <button
                          onClick={() => handleToggleStatus(v, 'PUBLISHED')}
                          title="Publicar video"
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(v, 'HIDDEN')}
                          title="Ocultar video"
                          className="p-1.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(v)}
                        title="Editar metadata"
                        className="p-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        title="Eliminar"
                        className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        hasMore={hasMore}
        onPageChange={setCurrentPage}
      />

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-stone-200 space-y-4">
            <button
              onClick={() => setEditingVideo(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold font-serif text-stone-900">Editar Metadata del Video</h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Título</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Descripción</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Categoría</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Estado de Publicación</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"
                  >
                    <option value="DRAFT">Borrador (DRAFT)</option>
                    <option value="PENDING_REVIEW">En revisión</option>
                    <option value="PUBLISHED">Publicado (PUBLISHED)</option>
                    <option value="HIDDEN">Oculto (HIDDEN)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-5 py-2 rounded-xl text-sm"
                >
                  {saveLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
