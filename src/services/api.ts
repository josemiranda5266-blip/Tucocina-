import { auth } from '../config/firebase';
import { Video, Category, PaginatedResult, VideoFilterOptions, ReportReason, Report, Comment } from '../types';

async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (auth.currentUser) {
    try { headers.set('Authorization', `Bearer ${await auth.currentUser.getIdToken()}`); } catch { /* continue without token */ }
  }
  let res = await fetch(url, { ...init, headers });
  if ((res.status === 401 || res.status === 403) && auth.currentUser) {
    try { headers.set('Authorization', `Bearer ${await auth.currentUser.getIdToken(true)}`); res = await fetch(url, { ...init, headers }); } catch { /* return original response */ }
  }
  return res;
}

async function parseApiError(res: Response, fallback: string): Promise<Error> {
  try { const data = await res.json(); return new Error(data?.error?.message || data?.message || fallback); } catch { return new Error(fallback); }
}

export const api = {
  async getVideos(options: VideoFilterOptions = {}): Promise<PaginatedResult<Video>> { const params = new URLSearchParams(); if (options.cursor) params.append('cursor', options.cursor); if (options.limit) params.append('limit', options.limit.toString()); if (options.categoryId) params.append('categoryId', options.categoryId); if (options.platform) params.append('platform', options.platform); if (options.searchQuery) params.append('q', options.searchQuery); if (options.sortBy) params.append('sortBy', options.sortBy); const res = await fetchWithAuth(`/api/videos?${params.toString()}`); if (!res.ok) throw await parseApiError(res, 'Error al cargar videos'); return res.json(); },
  async getVideoById(id: string): Promise<Video> { const res = await fetchWithAuth(`/api/videos/${encodeURIComponent(id)}`); if (!res.ok) throw await parseApiError(res, 'Video no encontrado'); return res.json(); },
  async getCategories(): Promise<Category[]> { const res = await fetchWithAuth('/api/categories'); if (!res.ok) throw await parseApiError(res, 'Error al cargar categorías'); return res.json(); },
  async getFavorites(options: { cursor?: string; limit?: number } = {}): Promise<PaginatedResult<Video>> { const params = new URLSearchParams(); if (options.cursor) params.append('cursor', options.cursor); if (options.limit) params.append('limit', options.limit.toString()); const res = await fetchWithAuth(`/api/favorites?${params.toString()}`); if (!res.ok) throw await parseApiError(res, 'Error al obtener favoritos'); return res.json(); },
  async checkIsFavorite(videoId: string): Promise<boolean> { const res = await fetchWithAuth(`/api/favorites/check/${encodeURIComponent(videoId)}`); if (!res.ok) return false; return !!(await res.json()).isFavorite; },
  async addFavorite(videoId: string): Promise<void> { const res = await fetchWithAuth(`/api/favorites/${encodeURIComponent(videoId)}`, { method: 'POST' }); if (!res.ok) throw await parseApiError(res, 'Error al guardar favorito'); },
  async removeFavorite(videoId: string): Promise<void> { const res = await fetchWithAuth(`/api/favorites/${encodeURIComponent(videoId)}`, { method: 'DELETE' }); if (!res.ok) throw await parseApiError(res, 'Error al quitar favorito'); },
  async submitReport(videoId: string, reason: ReportReason, description: string): Promise<void> { const res = await fetchWithAuth('/api/reports', { method: 'POST', body: JSON.stringify({ videoId, reason, description }) }); if (!res.ok) throw await parseApiError(res, 'Error al enviar el reporte'); },
  async adminImportVideo(url: string): Promise<Video> { const res = await fetchWithAuth('/api/admin/videos/import', { method: 'POST', body: JSON.stringify({ url }) }); if (!res.ok) throw await parseApiError(res, 'Error al importar el video'); return (await res.json()).video; },
  async adminImportVideosBulk(urls: string[]): Promise<any> { const res = await fetchWithAuth('/api/admin/videos/import-bulk', { method: 'POST', body: JSON.stringify({ urls }) }); if (!res.ok) throw await parseApiError(res, 'Error al importar videos'); return (await res.json()).results; },
  async adminGetVideos(options: { cursor?: string; limit?: number; status?: string } = {}): Promise<PaginatedResult<Video>> { const params = new URLSearchParams(); if (options.cursor) params.append('cursor', options.cursor); if (options.limit) params.append('limit', options.limit.toString()); if (options.status) params.append('status', options.status); const res = await fetchWithAuth(`/api/admin/videos?${params.toString()}`); if (!res.ok) throw await parseApiError(res, 'Error al cargar catálogo administrativo'); return res.json(); },
  async adminUpdateVideo(id: string, updates: Partial<Video>): Promise<Video> { const res = await fetchWithAuth(`/api/admin/videos/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(updates) }); if (!res.ok) throw await parseApiError(res, 'Error al actualizar video'); return (await res.json()).video; },
  async adminDeleteVideo(id: string): Promise<void> { const res = await fetchWithAuth(`/api/admin/videos/${encodeURIComponent(id)}`, { method: 'DELETE' }); if (!res.ok) throw await parseApiError(res, 'Error al eliminar video'); },
  async adminGetReports(options: { cursor?: string; limit?: number; status?: string } = {}): Promise<PaginatedResult<Report>> { const params = new URLSearchParams(); if (options.cursor) params.append('cursor', options.cursor); if (options.limit) params.append('limit', options.limit.toString()); if (options.status) params.append('status', options.status); const res = await fetchWithAuth(`/api/admin/reports?${params.toString()}`); if (!res.ok) throw await parseApiError(res, 'Error al obtener reportes'); return res.json(); },
  async adminUpdateReport(id: string, status: string): Promise<void> { const res = await fetchWithAuth(`/api/admin/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); if (!res.ok) throw await parseApiError(res, 'Error al actualizar estado del reporte'); },
  async adminGetMetrics(): Promise<any> { const res = await fetchWithAuth('/api/admin/metrics'); if (!res.ok) throw await parseApiError(res, 'Error al consultar métricas del sistema'); return res.json(); },
  async adminGetAnalytics(days = 7): Promise<any> { const res = await fetchWithAuth(`/api/admin-analytics/summary?days=${days}`); if (!res.ok) throw await parseApiError(res, 'Error al cargar analíticas'); return res.json(); },
  async adminDiscoverYoutubeCandidates(options: { query?: string; limit?: number; minViews?: number; sortBy?: string } = {}): Promise<any> { const params = new URLSearchParams(); if (options.query) params.append('query', options.query); if (options.limit) params.append('limit', options.limit.toString()); if (options.minViews !== undefined) params.append('minViews', options.minViews.toString()); if (options.sortBy) params.append('sortBy', options.sortBy); const res = await fetchWithAuth(`/api/admin/discovery/youtube?${params.toString()}`); if (!res.ok) throw await parseApiError(res, 'Error al buscar candidatos en YouTube'); return res.json(); },
  async adminImportDiscoveryCandidate(videoId: string, categoryId?: string, tags?: string[]): Promise<Video> { const res = await fetchWithAuth('/api/admin/discovery/import', { method: 'POST', body: JSON.stringify({ videoId, categoryId, tags }) }); if (!res.ok) throw await parseApiError(res, 'Error al importar candidato'); return (await res.json()).video; },
  async adminImportDiscoveryBatch(items: Array<{ videoId: string; categoryId?: string; tags?: string[] }>): Promise<any> { const res = await fetchWithAuth('/api/admin/discovery/import-batch', { method: 'POST', body: JSON.stringify({ items }) }); if (!res.ok) throw await parseApiError(res, 'Error al importar lote de candidatos'); return res.json(); },
  async getComments(videoId: string): Promise<Comment[]> { const res = await fetchWithAuth(`/api/videos/${encodeURIComponent(videoId)}/comments`); if (!res.ok) throw await parseApiError(res, 'Error al obtener comentarios'); const data = await res.json(); return data.comments || []; },
  async addComment(videoId: string, text: string): Promise<Comment> { const res = await fetchWithAuth(`/api/videos/${encodeURIComponent(videoId)}/comments`, { method: 'POST', body: JSON.stringify({ text }) }); if (!res.ok) throw await parseApiError(res, 'Error al publicar comentario'); return (await res.json()).comment; },
  async deleteComment(videoId: string, commentId: string): Promise<void> { const res = await fetchWithAuth(`/api/videos/${encodeURIComponent(videoId)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' }); if (!res.ok) throw await parseApiError(res, 'Error al eliminar comentario'); },
  async adminPurgeDuplicates(): Promise<any> { const res = await fetchWithAuth('/api/admin/videos/purge-duplicates', { method: 'POST' }); if (!res.ok) throw await parseApiError(res, 'Error al depurar videos duplicados'); return res.json(); },
  async adminPurgeOriginDeleted(): Promise<any> { const res = await fetchWithAuth('/api/admin/videos/purge-origin-deleted', { method: 'POST' }); if (!res.ok) throw await parseApiError(res, 'Error al verificar videos en plataforma de origen'); return res.json(); },
};
