import { auth } from '../config/firebase';
import { Video, Category, PaginatedResult, VideoFilterOptions, ReportReason, Report } from '../types';

async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    } catch {
      // Continue without token
    }
  }

  let res = await fetch(url, { ...init, headers });

  // If unauthorized and we have a logged-in user, force-refresh token and retry once
  if (res.status === 401 && auth.currentUser) {
    try {
      const freshToken = await auth.currentUser.getIdToken(true);
      headers.set('Authorization', `Bearer ${freshToken}`);
      res = await fetch(url, { ...init, headers });
    } catch {
      // Ignore refresh error and return original response
    }
  }

  return res;
}

async function parseApiError(res: Response, fallback: string): Promise<Error> {
  try {
    const data = await res.json();
    return new Error(data?.error?.message || fallback);
  } catch {
    return new Error(fallback);
  }
}

export const api = {
  async getVideos(options: VideoFilterOptions = {}): Promise<PaginatedResult<Video>> {
    const params = new URLSearchParams();
    if (options.cursor) params.append('cursor', options.cursor);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.categoryId) params.append('categoryId', options.categoryId);
    if (options.platform) params.append('platform', options.platform);
    if (options.searchQuery) params.append('q', options.searchQuery);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    const res = await fetchWithAuth(`/api/videos?${params.toString()}`);
    if (!res.ok) throw await parseApiError(res, 'Error al cargar videos');
    return res.json();
  },

  async getVideoById(id: string): Promise<Video> {
    const res = await fetchWithAuth(`/api/videos/${encodeURIComponent(id)}`);
    if (!res.ok) throw await parseApiError(res, 'Video no encontrado');
    return res.json();
  },

  async getCategories(): Promise<Category[]> {
    const res = await fetchWithAuth('/api/categories');
    if (!res.ok) throw await parseApiError(res, 'Error al cargar categorías');
    return res.json();
  },

  async getFavorites(options: { cursor?: string; limit?: number } = {}): Promise<PaginatedResult<Video>> {
    const params = new URLSearchParams();
    if (options.cursor) params.append('cursor', options.cursor);
    if (options.limit) params.append('limit', options.limit.toString());
    const res = await fetchWithAuth(`/api/favorites?${params.toString()}`);
    if (!res.ok) throw await parseApiError(res, 'Error al obtener favoritos');
    return res.json();
  },

  async checkIsFavorite(videoId: string): Promise<boolean> {
    const res = await fetchWithAuth(`/api/favorites/check/${encodeURIComponent(videoId)}`);
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.isFavorite;
  },

  async addFavorite(videoId: string): Promise<void> {
    const res = await fetchWithAuth(`/api/favorites/${encodeURIComponent(videoId)}`, { method: 'POST' });
    if (!res.ok) throw await parseApiError(res, 'Error al guardar favorito');
  },

  async removeFavorite(videoId: string): Promise<void> {
    const res = await fetchWithAuth(`/api/favorites/${encodeURIComponent(videoId)}`, { method: 'DELETE' });
    if (!res.ok) throw await parseApiError(res, 'Error al quitar favorito');
  },

  async submitReport(videoId: string, reason: ReportReason, description: string): Promise<void> {
    const res = await fetchWithAuth('/api/reports', { method: 'POST', body: JSON.stringify({ videoId, reason, description }) });
    if (!res.ok) throw await parseApiError(res, 'Error al enviar el reporte');
  },

  async adminImportVideo(url: string): Promise<Video> {
    const res = await fetchWithAuth('/api/admin/videos/import', { method: 'POST', body: JSON.stringify({ url }) });
    if (!res.ok) throw await parseApiError(res, 'Error al importar el video');
    const data = await res.json();
    return data.video;
  },

  async adminImportVideosBulk(urls: string[]): Promise<Array<{ url: string; status: 'IMPORTED' | 'DUPLICATE' | 'FAILED'; videoId?: string; title?: string; categoryId?: string; tags?: string[]; error?: string }>> {
    const res = await fetchWithAuth('/api/admin/videos/import-bulk', { method: 'POST', body: JSON.stringify({ urls }) });
    if (!res.ok) throw await parseApiError(res, 'Error al importar videos');
    const data = await res.json();
    return data.results;
  },

  async adminGetVideos(options: { cursor?: string; limit?: number; status?: string } = {}): Promise<PaginatedResult<Video>> {
    const params = new URLSearchParams();
    if (options.cursor) params.append('cursor', options.cursor);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);
    const res = await fetchWithAuth(`/api/admin/videos?${params.toString()}`);
    if (!res.ok) throw await parseApiError(res, 'Error al cargar catálogo administrativo');
    return res.json();
  },

  async adminUpdateVideo(id: string, updates: Partial<Video>): Promise<Video> {
    const res = await fetchWithAuth(`/api/admin/videos/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(updates) });
    if (!res.ok) throw await parseApiError(res, 'Error al actualizar video');
    const data = await res.json();
    return data.video;
  },

  async adminDeleteVideo(id: string): Promise<void> {
    const res = await fetchWithAuth(`/api/admin/videos/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw await parseApiError(res, 'Error al eliminar video');
  },

  async adminGetReports(options: { cursor?: string; limit?: number; status?: string } = {}): Promise<PaginatedResult<Report>> {
    const params = new URLSearchParams();
    if (options.cursor) params.append('cursor', options.cursor);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);
    const res = await fetchWithAuth(`/api/admin/reports?${params.toString()}`);
    if (!res.ok) throw await parseApiError(res, 'Error al obtener reportes');
    return res.json();
  },

  async adminUpdateReport(id: string, status: string): Promise<void> {
    const res = await fetchWithAuth(`/api/admin/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (!res.ok) throw await parseApiError(res, 'Error al actualizar estado del reporte');
  },

  async adminGetMetrics(): Promise<{ totalVideos: number; publishedVideos: number; pendingVideos: number; hiddenVideos: number; openReports: number; totalUsers: number }> {
    const res = await fetchWithAuth('/api/admin/metrics');
    if (!res.ok) throw await parseApiError(res, 'Error al consultar métricas del sistema');
    return res.json();
  },
};

