import React, { useEffect, useState } from 'react';
import { Video, Category } from '../../types';
import { api } from '../../services/api';
import { Pagination } from '../../components/Pagination';
import { Edit, Trash2, EyeOff, CheckCircle, X, Upload, Link2, AlertCircle } from 'lucide-react';

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
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<Record<number, string>>({});
  const [hasMore, setHasMore] = useState(false);

  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);

  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editStatus, setEditStatus] = useState<Video['status']>('DRAFT');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const loadVideos = () => {
    setLoading(true);
    setError(null);
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
  }, [currentPage, statusFilter, pageCursors]);

  const resetPagination = () => {
    setCurrentPage(1);
    setPageCursors({});
  };

  const handleBulkImport = async () => {
    const urls = [...new Set(bulkUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean))];
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
      loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado del video.');
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('¿Estás seguro de que querés eliminar permanentemente este video?')) return;
    try {
      await api.adminDeleteVideo(videoId);
      loadVideos();
    } catch {
      setError('Error al eliminar el video.');
    }
  };

  const openEditModal = (video: Video) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDesc(video.description || '');
    setEditCategory(video.categoryId || '');
    setEditTags((video.tags || []).join(', '));
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
        status: editStatus,
      });
      setEditingVideo(null);
      loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setSaveLoading(false);
    }
  };

  const imported = bulkResults.filter((r) => r.status === 'IMPORTED').length;
  const duplicates = bulkResults.filter((r) => r.status === 'DUPLICATE').length;
  const failed = bulkResults.filter((r) => r.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800"><Upload className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl font-bold font-serif text-stone-900">Importar videos</h2>
            <p className="text-sm text-stone-600 mt-1">Pegá hasta 25 enlaces públicos, uno por línea. Se detecta la plataforma y el video queda como <strong>DRAFT</strong> para revisión.</p>
          </div>
        </div>
        <textarea value={bulkUrls} onChange={(e) => setBulkUrls(e.target.value)} rows={5} placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.instagram.com/reel/...\nhttps://www.tiktok.com/@usuario/video/...'} className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
          <span className="text-xs text-stone-500">Máximo 25 URLs por tanda · duplicados detectados automáticamente</span>
          <button onClick={handleBulkImport} disabled={bulkLoading} className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm">
            <Link2 className="w-4 h-4" />{bulkLoading ? 'Importando...' : 'Importar enlaces'}
          </button>
        </div>

        {bulkResults.length > 0 && <div className="mt-5 border-t border-stone-200 pt-4">
          <div className="flex flex-wrap gap-2 text-xs font-semibold mb-3">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">Importados: {imported}</span>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">Duplicados: {duplicates}</span>
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">Fallidos: {failed}</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bulkResults.map((result) => <div key={`${result.url}-${result.videoId || result.status}`} className="text-xs rounded-xl bg-stone-50 border border-stone-200 p-3">
              <div className="font-medium text-stone-800 break-all">{result.url}</div>
              <div className="mt-1 font-semibold">{result.status === 'IMPORTED' ? '✓ Importado como borrador' : result.status === 'DUPLICATE' ? '↺ Ya estaba importado' : `✕ ${result.error || 'Error desconocido'}`}</div>
              {result.status === 'IMPORTED' && <div className="text-stone-500 mt-1">{result.title || 'Sin título'} · {categoryName(categories, result.categoryId)} · {(result.tags || []).join(', ') || 'sin tags'}</div>}
            </div>)}
          </div>
        </div>}
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200">
        <h2 className="text-xl font-bold font-serif text-stone-900">Gestión del catálogo</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-600">Estado:</span>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPagination(); }} className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-stone-800 font-medium">
            <option value="">Todos</option><option value="PUBLISHED">Publicados</option><option value="DRAFT">Borradores</option><option value="PENDING_REVIEW">En revisión</option><option value="HIDDEN">Ocultos</option><option value="REJECTED">Rechazados</option>
          </select>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

      {loading ? <div className="py-12 text-center text-stone-500">Cargando catálogo...</div> : videos.length === 0 ? <div className="py-12 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500">No hay videos cargados en este estado.</div> : <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200"><tr><th className="p-3">Video</th><th className="p-3">Plataforma</th><th className="p-3">Categoría</th><th className="p-3">Tags</th><th className="p-3">Estado</th><th className="p-3 text-right">Acciones</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {videos.map((v) => <tr key={v.id} className="hover:bg-stone-50/80">
              <td className="p-3"><div className="flex items-center gap-3"><img src={v.thumbnailUrl || ''} alt={v.title} loading="lazy" className="w-12 h-8 rounded object-cover shrink-0 bg-stone-200" /><div><p className="font-bold text-stone-900 line-clamp-1 max-w-xs">{v.title}</p><p className="text-[10px] text-stone-500">{v.creatorName || 'Autor desconocido'}</p></div></div></td>
              <td className="p-3 font-semibold text-stone-700 uppercase">{v.platform}</td>
              <td className="p-3">{categoryName(categories, v.categoryId)}</td>
              <td className="p-3 max-w-xs"><div className="flex flex-wrap gap-1">{(v.tags || []).slice(0, 4).map((tag) => <span key={tag} className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">{tag}</span>)}{(v.tags || []).length > 4 && <span className="text-stone-400">+{v.tags.length - 4}</span>}</div></td>
              <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : v.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' : v.status === 'HIDDEN' ? 'bg-stone-200 text-stone-700' : 'bg-rose-100 text-rose-800'}`}>{v.status}</span></td>
              <td className="p-3 text-right"><div className="flex items-center justify-end gap-1">
                {v.status !== 'PUBLISHED' ? <button onClick={() => handleToggleStatus(v, 'PUBLISHED')} title="Publicar video" className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg"><CheckCircle className="w-4 h-4" /></button> : <button onClick={() => handleToggleStatus(v, 'HIDDEN')} title="Ocultar video" className="p-1.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg"><EyeOff className="w-4 h-4" /></button>}
                <button onClick={() => openEditModal(v)} title="Editar metadata" className="p-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(v.id)} title="Eliminar" className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>}

      <Pagination currentPage={currentPage} hasMore={hasMore} onPageChange={setCurrentPage} />

      {editingVideo && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
          <button onClick={() => setEditingVideo(null)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1" aria-label="Cerrar"><X className="w-5 h-5" /></button>
          <h3 className="text-lg font-bold font-serif text-stone-900">Editar metadata</h3>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div><label className="block text-xs font-bold text-stone-700 mb-1">Título</label><input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required maxLength={200} className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm" /></div>
            <div><label className="block text-xs font-bold text-stone-700 mb-1">Descripción</label><textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} maxLength={2000} className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm" /></div>
            <div><label className="block text-xs font-bold text-stone-700 mb-1">Categoría</label><select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"><option value="">Sin categoría</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-stone-700 mb-1">Tags</label><input type="text" value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="fácil, rápido, casero" maxLength={650} className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm" /><p className="text-[10px] text-stone-500 mt-1">Separados por coma · máximo 20.</p></div>
            <div><label className="block text-xs font-bold text-stone-700 mb-1">Estado</label><select value={editStatus} onChange={(e) => setEditStatus(e.target.value as Video['status'])} className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm"><option value="DRAFT">Borrador</option><option value="PENDING_REVIEW">En revisión</option><option value="PUBLISHED">Publicado</option><option value="HIDDEN">Oculto</option><option value="REJECTED">Rechazado</option></select></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEditingVideo(null)} className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm">Cancelar</button><button type="submit" disabled={saveLoading} className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-xl text-sm">{saveLoading ? 'Guardando...' : 'Guardar cambios'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
};
