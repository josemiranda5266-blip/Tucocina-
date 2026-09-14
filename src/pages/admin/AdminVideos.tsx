import React, { useEffect, useState } from 'react';
import { Video, Category } from '../../types';
import { api } from '../../services/api';
import { Pagination } from '../../components/Pagination';
import { DiscoverySection } from '../../components/admin/DiscoverySection';
import { Edit, Trash2, EyeOff, CheckCircle, X, Upload, Link2, AlertCircle, CheckSquare, Square, Trash, Sparkles, Copy } from 'lucide-react';

type BulkResult = Awaited<ReturnType<typeof api.adminImportVideosBulk>>[number];

function categoryName(categories: Category[], categoryId?: string | null): string {
  if (!categoryId) return 'Sin categoría';
  return categories.find((category) => category.id === categoryId)?.name || categoryId.replace('cat-', '').replace(/-/g, ' ');
}

function parseTags(value: string): string[] {
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
}

export const AdminVideos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<Record<number, string>>({});
  const [hasMore, setHasMore] = useState(false);

  // Selection & Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Single delete modal state
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Import bulk state
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [purgingDuplicates, setPurgingDuplicates] = useState(false);
  const [purgingOrigin, setPurgingOrigin] = useState(false);

  // Edit modal state
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editStatus, setEditStatus] = useState<Video['status']>('DRAFT');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const loadVideos = () => {
    setLoading(true);
    setError(null);
    setSelectedIds([]);
    api.adminGetVideos({ cursor: pageCursors[currentPage], limit: 10, status: statusFilter || undefined })
      .then((res) => {
        setVideos(res.items);
        setHasMore(res.hasMore);
        if (res.nextCursor) {
          setPageCursors((previous) => ({ ...previous, [currentPage + 1]: res.nextCursor! }));
        }
      })
      .catch((err) => {
        setVideos([]);
        setHasMore(false);
        setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const resetPagination = () => {
    setCurrentPage(1);
    setPageCursors({});
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === videos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(videos.map((v) => v.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk actions
  const handleBulkPublish = async () => {
    if (!selectedIds.length) return;
    setBulkActionLoading(true);
    setError(null);
    try {
      await Promise.all(
        selectedIds.map((id) => api.adminUpdateVideo(id, { status: 'PUBLISHED' }))
      );
      showNotification(`¡${selectedIds.length} recetas publicadas en el catálogo!`);
      loadVideos();
    } catch {
      setError('Error al publicar algunos de los videos seleccionados.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!selectedIds.length) return;
    setBulkActionLoading(true);
    setError(null);
    try {
      await Promise.all(selectedIds.map((id) => api.adminDeleteVideo(id)));
      showNotification(`Se eliminaron permanentemente ${selectedIds.length} videos.`);
      setShowBulkDeleteModal(false);
      loadVideos();
    } catch {
      setError('Error al eliminar algunos de los videos seleccionados.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkImport = async () => {
    const urls: string[] = Array.from(
      new Set(bulkUrls.split(/\r?\n/).map((url) => url.trim()).filter((url): url is string => Boolean(url)))
    );
    if (!urls.length) {
      setError('Pegá al menos una URL, una por línea.');
      return;
    }
    if (urls.length > 25) {
      setError('La importación masiva admite un máximo de 25 URLs por tanda.');
      return;
    }
    setBulkLoading(true);
    setError(null);
    try {
      const results = await api.adminImportVideosBulk(urls);
      setBulkResults(results);
      setBulkUrls('');
      showNotification('¡Importación procesada correctamente!');
      resetPagination();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar la importación masiva.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleToggleStatus = async (video: Video, newStatus: Video['status']) => {
    try {
      await api.adminUpdateVideo(video.id, { status: newStatus });
      showNotification(newStatus === 'PUBLISHED' ? 'Video publicado en el catálogo' : 'Video ocultado');
      loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado del video.');
    }
  };

  const handleSingleDeleteConfirm = async () => {
    if (!videoToDelete) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await api.adminDeleteVideo(videoToDelete.id);
      showNotification('Video eliminado permanentemente.');
      setVideoToDelete(null);
      loadVideos();
    } catch {
      setError('Error al eliminar el video.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditModal = (video: Video) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDesc(video.description || '');
    setEditCategory(video.categoryId || '');
    setEditTags((video.tags || []).join(', '));
    setEditThumbnail(video.thumbnailUrl || '');
    setEditStatus(video.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    setSaveLoading(true);
    try {
      await api.adminUpdateVideo(editingVideo.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        categoryId: editCategory,
        tags: parseTags(editTags),
        thumbnailUrl: editThumbnail.trim(),
        status: editStatus,
      });
      setEditingVideo(null);
      showNotification('Cambios guardados correctamente.');
      loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePurgeDuplicates = async () => {
    setPurgingDuplicates(true);
    setError(null);
    try {
      const res = await api.adminPurgeDuplicates();
      showNotification(res.message);
      loadVideos();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar duplicados');
    } finally {
      setPurgingDuplicates(false);
    }
  };

  const handlePurgeOriginDeleted = async () => {
    setPurgingOrigin(true);
    setError(null);
    try {
      const res = await api.adminPurgeOriginDeleted();
      showNotification(res.message);
      loadVideos();
    } catch (err: any) {
      setError(err?.message || 'Error al verificar videos eliminados en la plataforma de origen');
    } finally {
      setPurgingOrigin(false);
    }
  };

  const imported = bulkResults.filter((r) => r.status === 'IMPORTED').length;
  const duplicates = bulkResults.filter((r) => r.status === 'DUPLICATE').length;
  const failed = bulkResults.filter((r) => r.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Automatic Discovery System for Admin */}
      <DiscoverySection onImportSuccess={loadVideos} />

      {/* Bulk Import Box */}
      <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800"><Upload className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl font-bold font-serif text-stone-900">Importar videos en lote</h2>
            <p className="text-sm text-stone-600 mt-1">Pegá hasta 25 enlaces públicos, uno por línea. Quedarán guardados como <strong>BORRADOR (DRAFT)</strong> para tu revisión.</p>
          </div>
        </div>
        <textarea
          value={bulkUrls}
          onChange={(e) => setBulkUrls(e.target.value)}
          rows={4}
          placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.instagram.com/reel/...\nhttps://www.tiktok.com/@usuario/video/...'}
          className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
          <span className="text-xs text-stone-500">Máximo 25 URLs por tanda · la detección de duplicados es automática</span>
          <button
            onClick={handleBulkImport}
            disabled={bulkLoading}
            className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Link2 className="w-4 h-4" />
            {bulkLoading ? 'Importando enlaces...' : 'Importar enlaces'}
          </button>
        </div>

        {bulkResults.length > 0 && (
          <div className="mt-5 border-t border-stone-200 pt-4">
            <div className="flex flex-wrap gap-2 text-xs font-semibold mb-3">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">Importados: {imported}</span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">Duplicados: {duplicates}</span>
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">Fallidos: {failed}</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bulkResults.map((result) => (
                <div key={`${result.url}-${result.videoId || result.status}`} className="text-xs rounded-xl bg-stone-50 border border-stone-200 p-3">
                  <div className="font-medium text-stone-800 break-all">{result.url}</div>
                  <div className="mt-1 font-semibold">
                    {result.status === 'IMPORTED' ? '✓ Importado como borrador' : result.status === 'DUPLICATE' ? '↺ Ya estaba importado' : `✕ ${result.error || 'Error desconocido'}`}
                  </div>
                  {result.status === 'IMPORTED' && (
                    <div className="text-stone-500 mt-1">{result.title || 'Sin título'} · {categoryName(categories, result.categoryId)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Catalog Header & Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200">
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900">Gestión del catálogo</h2>
          <p className="text-xs text-stone-500 mt-0.5">Gestión de publicaciones, depuración automática de duplicados y sincronización de origen.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePurgeDuplicates}
            disabled={purgingDuplicates}
            title="Identificar videos repetidos y enviarlos a la sección Duplicados para revisión"
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
          >
            {purgingDuplicates ? (
              <div className="w-3.5 h-3.5 border-2 border-purple-800 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-purple-700" />
            )}
            <span>Detectar duplicados</span>
          </button>

          <button
            onClick={handlePurgeOriginDeleted}
            disabled={purgingOrigin}
            title="Verificar y eliminar automáticamente videos removidos por su creador de origen"
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
          >
            {purgingOrigin ? (
              <div className="w-3.5 h-3.5 border-2 border-rose-800 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>Limpiar removidos en origen</span>
          </button>

          <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
            <span className="text-xs font-semibold text-stone-600">Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                resetPagination();
              }}
              className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-stone-800 font-medium focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Todos los estados</option>
              <option value="DRAFT">Borradores</option>
              <option value="PUBLISHED">Publicados</option>
              <option value="DUPLICATE">Duplicados ⚠️</option>
              <option value="PENDING_REVIEW">En revisión</option>
              <option value="HIDDEN">Ocultos</option>
              <option value="REJECTED">Rechazados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Special Banner for Duplicates Section */}
      {statusFilter === 'DUPLICATE' && (
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 text-purple-800 rounded-xl shrink-0">
              <Copy className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-950">Sección de Videos Duplicados</h3>
              <p className="text-xs text-purple-800 mt-0.5">
                Los videos con contenido o enlace duplicado se guardan en esta sección sin eliminarse automáticamente. Podés examinarlos y borrarlos personalmente.
              </p>
            </div>
          </div>
          {videos.length > 0 && (
            <button
              onClick={() => {
                setSelectedIds(videos.map((v) => v.id));
                setShowBulkDeleteModal(true);
              }}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm shrink-0 inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar duplicados mostrados ({videos.length})
            </button>
          )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <CheckSquare className="w-4 h-4 text-amber-700" />
            <span>{selectedIds.length} video(s) seleccionado(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkPublish}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Publicar seleccionados
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar seleccionados
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-xs font-medium"
            >
              Desmarcar todos
            </button>
          </div>
        </div>
      )}

      {/* Table & List */}
      {loading ? (
        <div className="py-12 text-center text-stone-500">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
                <th className="p-3 w-10 text-center">
                  <button onClick={toggleSelectAll} title="Seleccionar todos" className="p-1 hover:text-amber-600">
                    {selectedIds.length === videos.length && videos.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </button>
                </th>
                <th className="p-3">Video</th>
                <th className="p-3">Plataforma</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Tags</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {videos.map((v) => {
                const isSelected = selectedIds.includes(v.id);
                return (
                  <tr key={v.id} className={`hover:bg-stone-50/80 transition-colors ${isSelected ? 'bg-amber-50/50' : ''}`}>
                    <td className="p-3 text-center">
                      <button onClick={() => toggleSelectOne(v.id)} className="p-1">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-300 hover:text-stone-500" />
                        )}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={v.thumbnailUrl || ''}
                          alt={v.title}
                          loading="lazy"
                          className="w-12 h-8 rounded object-cover shrink-0 bg-stone-200 border border-stone-200"
                        />
                        <div>
                          <p className="font-bold text-stone-900 line-clamp-1 max-w-xs">{v.title}</p>
                          <p className="text-[10px] text-stone-500">{v.creatorName || 'Autor desconocido'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-stone-700 uppercase">{v.platform}</td>
                    <td className="p-3">{categoryName(categories, v.categoryId)}</td>
                    <td className="p-3 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {(v.tags || []).slice(0, 4).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                            {tag}
                          </span>
                        ))}
                        {(v.tags || []).length > 4 && <span className="text-stone-400">+{v.tags.length - 4}</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : v.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : v.status === 'DUPLICATE'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200 font-extrabold'
                            : v.status === 'HIDDEN'
                            ? 'bg-stone-200 text-stone-700'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {v.status === 'DRAFT'
                          ? 'Borrador'
                          : v.status === 'PUBLISHED'
                          ? 'Publicado'
                          : v.status === 'DUPLICATE'
                          ? 'Duplicado'
                          : v.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {v.status !== 'PUBLISHED' ? (
                          <button
                            onClick={() => handleToggleStatus(v, 'PUBLISHED')}
                            title="Publicar video en catálogo"
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium text-xs flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">Publicar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(v, 'HIDDEN')}
                            title="Ocultar video"
                            className="p-1.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(v)}
                          title="Editar metadata"
                          className="p-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setVideoToDelete(v)}
                          title="Eliminar permanentemente"
                          className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={currentPage} hasMore={hasMore} onPageChange={setCurrentPage} />

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <button
              onClick={() => setEditingVideo(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold font-serif text-stone-900">Editar metadata de la receta</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Título</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  maxLength={200}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Descripción</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Categoría</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="fácil, rápido, casero"
                  maxLength={650}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"
                />
                <p className="text-[10px] text-stone-500 mt-1">Separados por coma · máximo 20.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">URL de Portada (Miniatura)</label>
                <input
                  type="url"
                  value={editThumbnail}
                  onChange={(e) => setEditThumbnail(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Video['status'])}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="DUPLICATE">Duplicado</option>
                  <option value="PENDING_REVIEW">En revisión</option>
                  <option value="PUBLISHED">Publicado</option>
                  <option value="HIDDEN">Oculto</option>
                  <option value="REJECTED">Rechazado</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors shadow-sm"
                >
                  {saveLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {videoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-serif text-stone-900">¿Eliminar video?</h3>
            </div>
            <p className="text-sm text-stone-600">
              ¿Estás seguro de que querés eliminar permanentemente el video{' '}
              <strong className="text-stone-900">"{videoToDelete.title}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVideoToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSingleDeleteConfirm}
                disabled={deleteLoading}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors shadow-sm inline-flex items-center gap-2"
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-serif text-stone-900">¿Eliminar {selectedIds.length} videos?</h3>
            </div>
            <p className="text-sm text-stone-600">
              Vas a eliminar permanentemente <strong className="text-stone-900">{selectedIds.length} recetas</strong> del catálogo. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkActionLoading}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={bulkActionLoading}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors shadow-sm inline-flex items-center gap-2"
              >
                {bulkActionLoading ? 'Eliminando...' : `Eliminar ${selectedIds.length} videos`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

