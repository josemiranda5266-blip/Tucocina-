import fs from 'fs';
import path from 'path';

export interface StoredVideo {
  id: string;
  title: string;
  description: string;
  originalUrl: string;
  embedUrl: string;
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'OTHER';
  platformVideoId: string;
  thumbnailUrl: string;
  creatorName: string;
  creatorUrl?: string;
  durationSeconds?: number;
  publishedAt?: string;
  categoryId?: string | null;
  tags: string[];
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED';
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredReport {
  id: string;
  videoId: string;
  userId?: string;
  userEmail?: string;
  reason: string;
  description: string;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
}

export interface StoredFavorite {
  id: string;
  userId: string;
  videoId: string;
  createdAt: string;
}

interface DatabaseSchema {
  videos: StoredVideo[];
  reports: StoredReport[];
  favorites: StoredFavorite[];
}

const DB_FILE = path.resolve(process.cwd(), 'server/data/db.json');

const SEED_VIDEOS: StoredVideo[] = [
  {
    id: 'vid-asado-argentino',
    title: 'Asado Criollo: Secretos del Fuego y Cortes Clásicos',
    description: 'Guía paso a paso para dominar el fuego a leña, salar adecuadamente y lograr cortes jugosos como tira de asado, vacío y entraña.',
    originalUrl: 'https://www.youtube.com/watch?v=WJ_wKxGz6vE',
    embedUrl: 'https://www.youtube-nocookie.com/embed/WJ_wKxGz6vE',
    platform: 'YOUTUBE',
    platformVideoId: 'WJ_wKxGz6vE',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Locos X el Asado',
    creatorUrl: 'https://youtube.com',
    durationSeconds: 1240,
    categoryId: 'cat-argentina',
    tags: ['asado', 'parrilla', 'carne', 'argentina', 'fuego'],
    status: 'PUBLISHED',
    views: 18450,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vid-empanadas-mendocinas',
    title: 'Auténticas Empanadas Mendocinas al Horno',
    description: 'Relleno jugoso de carne cortada a cuchillo, abundante cebolla, huevo duro, aceitunas y masa casera hojaldrada con grasa vacuna.',
    originalUrl: 'https://www.youtube.com/watch?v=Xq4y4R0b7Xg',
    embedUrl: 'https://www.youtube-nocookie.com/embed/Xq4y4R0b7Xg',
    platform: 'YOUTUBE',
    platformVideoId: 'Xq4y4R0b7Xg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Cocineros Argentinos',
    creatorUrl: 'https://youtube.com',
    durationSeconds: 980,
    categoryId: 'cat-argentina',
    tags: ['empanadas', 'criollo', 'masa casera', 'horno'],
    status: 'PUBLISHED',
    views: 14200,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vid-pasta-fettuccine',
    title: 'Fettuccine Caseros al Huevo con Pomodoro y Albahaca',
    description: 'Aprende a preparar pasta fresca artesanal con sémola y huevos de campo, acompañada de una salsa de tomates maduros y albahaca fresca.',
    originalUrl: 'https://www.youtube.com/watch?v=z4uK_v9bT8A',
    embedUrl: 'https://www.youtube-nocookie.com/embed/z4uK_v9bT8A',
    platform: 'YOUTUBE',
    platformVideoId: 'z4uK_v9bT8A',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Pasta Grannies',
    creatorUrl: 'https://youtube.com',
    durationSeconds: 750,
    categoryId: 'cat-pastas',
    tags: ['pasta', 'fresca', 'casera', 'italiana', 'pomodoro'],
    status: 'PUBLISHED',
    views: 9800,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vid-pollo-hierbas',
    title: 'Pollo al Horno Extra Crujiente con Limón y Romero',
    description: 'Técnica infalible para lograr piel crujiente dorada y carne tierna y jugosa con marinada cítrica de hierbas y guarnición de papas rústicas.',
    originalUrl: 'https://www.youtube.com/watch?v=V4lR9lD1b1I',
    embedUrl: 'https://www.youtube-nocookie.com/embed/V4lR9lD1b1I',
    platform: 'YOUTUBE',
    platformVideoId: 'V4lR9lD1b1I',
    thumbnailUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Chef en Casa',
    creatorUrl: 'https://youtube.com',
    durationSeconds: 840,
    categoryId: 'cat-pollo',
    tags: ['pollo', 'horno', 'crujiente', 'saludable', 'facil'],
    status: 'PUBLISHED',
    views: 11200,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vid-tiramisu-clasico',
    title: 'Tiramisú Tradicional Italiano sin Crema',
    description: 'La receta clásica con vainillas caseras, café espresso fuerte, mascarpone auténtico y cacao amargo.',
    originalUrl: 'https://www.youtube.com/watch?v=u1b6_1j-P6A',
    embedUrl: 'https://www.youtube-nocookie.com/embed/u1b6_1j-P6A',
    platform: 'YOUTUBE',
    platformVideoId: 'u1b6_1j-P6A',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Dulce Receta',
    creatorUrl: 'https://youtube.com',
    durationSeconds: 620,
    categoryId: 'cat-postres',
    tags: ['postre', 'tiramisu', 'cafe', 'mascarpone', 'dulce'],
    status: 'PUBLISHED',
    views: 15600,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vid-pan-masa-madre',
    title: 'Pan de Masa Madre para Principiantes: Hogaza Crujiente',
    description: 'Guía completa de fermentación en frío, pliegues y horneado en olla de hierro fundido para un alveolado perfecto.',
    originalUrl: 'https://www.youtube.com/watch?v=eXbNsm8fV9c',
    embedUrl: 'https://www.youtube-nocookie.com/embed/eXbNsm8fV9c',
    platform: 'YOUTUBE',
    platformVideoId: 'eXbNsm8fV9c',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    creatorName: 'El Panadero Artesano',
    creatorUrl: 'https://youtube.com',
    durationSeconds: 1100,
    categoryId: 'cat-panaderia',
    tags: ['pan', 'masa madre', 'panaderia', 'artesanal'],
    status: 'PUBLISHED',
    views: 8900,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vid-risotto-hongos',
    title: 'Risotto Cremoso de Hongos Portobello y Parmesano',
    description: 'Aprende el nácar del arroz carnaroli, caldo caliente casero y la mantecatura perfecta con manteca fría y queso rallado.',
    originalUrl: 'https://www.youtube.com/watch?v=H0G-5g3T_y8',
    embedUrl: 'https://www.youtube-nocookie.com/embed/H0G-5g3T_y8',
    platform: 'YOUTUBE',
    platformVideoId: 'H0G-5g3T_y8',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Gourmet Express',
    creatorUrl: 'https://youtube.com',
    durationSeconds: 790,
    categoryId: 'cat-arroces',
    tags: ['risotto', 'arroz', 'hongos', 'italiana', 'cremoso'],
    status: 'PUBLISHED',
    views: 7400,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class StoreManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.videos) && parsed.videos.length > 0) {
          return {
            videos: parsed.videos,
            reports: Array.isArray(parsed.reports) ? parsed.reports : [],
            favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
          };
        }
      }
    } catch (err) {
      console.warn('Advertencia al cargar db.json local:', err);
    }

    // Default seeded state
    const initial: DatabaseSchema = {
      videos: [...SEED_VIDEOS],
      reports: [],
      favorites: [],
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error al guardar en db.json:', err);
    }
  }

  // Videos
  getVideos(options: {
    status?: string;
    categoryId?: string;
    platform?: string;
    searchQuery?: string;
    sortBy?: 'recent' | 'views';
    cursor?: string;
    limit?: number;
  }) {
    let items = [...this.data.videos];

    if (options.status) {
      items = items.filter((v) => v.status === options.status);
    } else {
      items = items.filter((v) => v.status === 'PUBLISHED');
    }

    if (options.categoryId) {
      items = items.filter((v) => v.categoryId === options.categoryId);
    }

    if (options.platform) {
      items = items.filter((v) => v.platform === options.platform.toUpperCase());
    }

    if (options.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      items = items.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.creatorName.toLowerCase().includes(q) ||
          (Array.isArray(v.tags) && v.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    if (options.sortBy === 'views') {
      items.sort((a, b) => b.views - a.views);
    } else {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const limit = options.limit || 20;
    let startIndex = 0;
    if (options.cursor) {
      const found = items.findIndex((v) => v.id === options.cursor);
      if (found !== -1) {
        startIndex = found + 1;
      }
    }

    const sliced = items.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < items.length;
    const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

    return {
      items: sliced,
      limit,
      hasMore,
      nextCursor,
      total: items.length,
    };
  }

  getAllAdminVideos(options: { status?: string; cursor?: string; limit?: number }) {
    let items = [...this.data.videos];
    if (options.status) {
      items = items.filter((v) => v.status === options.status);
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limit = options.limit || 20;
    let startIndex = 0;
    if (options.cursor) {
      const found = items.findIndex((v) => v.id === options.cursor);
      if (found !== -1) startIndex = found + 1;
    }

    const sliced = items.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < items.length;
    const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

    return {
      items: sliced,
      limit,
      hasMore,
      nextCursor,
      total: items.length,
    };
  }

  getVideoById(id: string): StoredVideo | null {
    return this.data.videos.find((v) => v.id === id) || null;
  }

  findDuplicate(platform: string, platformVideoId: string): StoredVideo | null {
    return (
      this.data.videos.find(
        (v) => v.platform === platform && v.platformVideoId === platformVideoId
      ) || null
    );
  }

  addVideo(video: StoredVideo): StoredVideo {
    this.data.videos.unshift(video);
    this.saveData(this.data);
    return video;
  }

  updateVideo(id: string, updates: Partial<StoredVideo>): StoredVideo | null {
    const index = this.data.videos.findIndex((v) => v.id === id);
    if (index === -1) return null;
    const existing = this.data.videos[index];
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.videos[index] = updated;
    this.saveData(this.data);
    return updated;
  }

  deleteVideo(id: string): boolean {
    const before = this.data.videos.length;
    this.data.videos = this.data.videos.filter((v) => v.id !== id);
    if (this.data.videos.length !== before) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  incrementViews(id: string): void {
    const video = this.getVideoById(id);
    if (video) {
      video.views = (video.views || 0) + 1;
      this.saveData(this.data);
    }
  }

  // Reports
  getReports(options: { status?: string; cursor?: string; limit?: number }) {
    let items = [...this.data.reports];
    if (options.status) {
      items = items.filter((r) => r.status === options.status);
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limit = options.limit || 20;
    let startIndex = 0;
    if (options.cursor) {
      const idx = items.findIndex((r) => r.id === options.cursor);
      if (idx !== -1) startIndex = idx + 1;
    }
    const sliced = items.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < items.length;
    const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

    return {
      items: sliced,
      limit,
      hasMore,
      nextCursor,
      total: items.length,
    };
  }

  addReport(report: StoredReport): StoredReport {
    this.data.reports.unshift(report);
    this.saveData(this.data);
    return report;
  }

  updateReport(id: string, status: StoredReport['status']): boolean {
    const report = this.data.reports.find((r) => r.id === id);
    if (report) {
      report.status = status;
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // Favorites
  getFavorites(userId: string, limit = 20, cursor?: string) {
    const userFavs = this.data.favorites.filter((f) => f.userId === userId);
    userFavs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let startIndex = 0;
    if (cursor) {
      const idx = userFavs.findIndex((f) => f.id === cursor);
      if (idx !== -1) startIndex = idx + 1;
    }

    const sliced = userFavs.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < userFavs.length;
    const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

    const items = sliced
      .map((f) => this.getVideoById(f.videoId))
      .filter((v): v is StoredVideo => v !== null && v.status === 'PUBLISHED');

    return {
      items,
      limit,
      hasMore,
      nextCursor,
    };
  }

  isFavorite(userId: string, videoId: string): boolean {
    return this.data.favorites.some((f) => f.userId === userId && f.videoId === videoId);
  }

  addFavorite(userId: string, videoId: string): void {
    if (!this.isFavorite(userId, videoId)) {
      this.data.favorites.push({
        id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId,
        videoId,
        createdAt: new Date().toISOString(),
      });
      this.saveData(this.data);
    }
  }

  removeFavorite(userId: string, videoId: string): void {
    const before = this.data.favorites.length;
    this.data.favorites = this.data.favorites.filter(
      (f) => !(f.userId === userId && f.videoId === videoId)
    );
    if (this.data.favorites.length !== before) {
      this.saveData(this.data);
    }
  }

  getMetrics() {
    const totalVideos = this.data.videos.length;
    const publishedVideos = this.data.videos.filter((v) => v.status === 'PUBLISHED').length;
    const pendingVideos = this.data.videos.filter((v) => v.status === 'PENDING_REVIEW' || v.status === 'DRAFT').length;
    const hiddenVideos = this.data.videos.filter((v) => v.status === 'HIDDEN' || v.status === 'REJECTED').length;
    const openReports = this.data.reports.filter((r) => r.status === 'OPEN').length;
    const uniqueUsers = new Set(this.data.favorites.map((f) => f.userId)).size;

    return {
      totalVideos,
      publishedVideos,
      pendingVideos,
      hiddenVideos,
      openReports,
      totalUsers: Math.max(1, uniqueUsers),
    };
  }
}

export const dbStore = new StoreManager();
