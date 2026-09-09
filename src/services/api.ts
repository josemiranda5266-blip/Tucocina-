import { auth } from '../config/firebase';
import { Video, Category, PaginatedResult, VideoFilterOptions, ReportReason, UserProfile } from '../types';

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Ignore token fetch errors for public calls
    }
  }
  return headers;
}

export const api = {
  async getVideos(options: VideoFilterOptions = {}): Promise<PaginatedResult<Video>> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.categoryId) params.append('categoryId', options.categoryId);
    if (options.platform) params.append('platform', options.platform);
    if (options.searchQuery) params.append('q', options.searchQuery);
    if (options.sortBy) params.append('sortBy', options.sortBy);

    const headers = await getAuthHeaders();
    const res = await fetch(`/api/videos?${params.toString()}`, { headers });
    if (!res.ok) throw new Error('Error al cargar videos');
    return res.json();
  },

  async getVideoById(id: string): Promise<Video> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/videos/${id}`, { headers });
    if (!res.ok) throw new Error('Video no encontrado');
    return res.json();
  },

  async getCategories(): Promise<Category[]> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/categories', { headers });
    if (!res.ok) throw new Error('Error al cargar categorías');
    return res.json();
  },

  async getFavorites(): Promise<Video[]> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/favorites', { headers });
    if (!res.ok) throw new Error('Error al obtener favoritos');
    return res.json();
  },

  async checkIsFavorite(videoId: string): Promise<boolean> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/favorites/check/${videoId}`, { headers });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.isFavorite;
  },

  async addFavorite(videoId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/favorites/${videoId}`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) throw new Error('Error al guardar favorito');
  },

  async removeFavorite(videoId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/favorites/${videoId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('Error al quitar favorito');
  },

  async submitReport(videoId: string, reason: ReportReason, description: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers,
      body: JSON.stringify({ videoId, reason, description }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Error al enviar el reporte');
  },

  // Admin APIs
  async adminImportVideo(url: string): Promise<Video> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/videos/import', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Error al importar el video');
    return data.video;
  },

  async adminGetVideos(options: { page?: number; limit?: number; status?: string } = {}): Promise<PaginatedResult<Video>> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);

    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/videos?${params.toString()}`, { headers });
    if (!res.ok) throw new Error('Error al cargar catálogo administrativo');
    return res.json();
  },

  async adminUpdateVideo(id: string, updates: Partial<Video>): Promise<Video> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/videos/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Error al actualizar video');
    return data.video;
  },

  async adminDeleteVideo(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/videos/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('Error al eliminar video');
  },

  async adminGetReports(): Promise<any[]> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/reports', { headers });
    if (!res.ok) throw new Error('Error al obtener reportes');
    return res.json();
  },

  async adminUpdateReport(id: string, status: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Error al actualizar estado del reporte');
  },

  async adminGetMetrics(): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/metrics', { headers });
    if (!res.ok) throw new Error('Error al consultar métricas del sistema');
    return res.json();
  },
};
