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
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED' | 'DUPLICATE';
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

export interface StoredComment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
}

interface DatabaseSchema {
  videos: StoredVideo[];
  reports: StoredReport[];
  favorites: StoredFavorite[];
  comments?: StoredComment[];
}

const DB_FILE = path.resolve(process.cwd(), 'server/data/db.json');

const SEED_VIDEOS: StoredVideo[] = [];

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
            comments: Array.isArray(parsed.comments) ? parsed.comments : [],
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
      comments: [],
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
    if (this.data.comments) {
      this.data.comments = this.data.comments.filter((c) => c.videoId !== id);
    }
    if (this.data.videos.length !== before) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  purgeDuplicates(): { markedCount: number; markedIds: string[] } {
    const seenMap = new Map<string, StoredVideo>();
    const markedIds: string[] = [];

    // Prioritize PUBLISHED videos over DRAFTs, and oldest createdAt
    const sortedVideos = [...this.data.videos].sort((a, b) => {
      if (a.status === 'PUBLISHED' && b.status !== 'PUBLISHED') return -1;
      if (a.status !== 'PUBLISHED' && b.status === 'PUBLISHED') return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    for (const video of sortedVideos) {
      const key = `${video.platform.toUpperCase()}:${video.platformVideoId}`;
      if (seenMap.has(key)) {
        if (video.status !== 'DUPLICATE') {
          video.status = 'DUPLICATE';
          video.updatedAt = new Date().toISOString();
          markedIds.push(video.id);
        }
      } else {
        seenMap.set(key, video);
      }
    }

    if (markedIds.length > 0) {
      this.saveData(this.data);
    }

    return {
      markedCount: markedIds.length,
      markedIds,
    };
  }

  // Comments
  getCommentsByVideoId(videoId: string): StoredComment[] {
    if (!this.data.comments) return [];
    return this.data.comments
      .filter((c) => c.videoId === videoId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addComment(comment: StoredComment): StoredComment {
    if (!this.data.comments) this.data.comments = [];
    this.data.comments.unshift(comment);
    this.saveData(this.data);
    return comment;
  }

  deleteComment(commentId: string, userId: string, isAdmin: boolean): boolean {
    if (!this.data.comments) return false;
    const idx = this.data.comments.findIndex((c) => c.id === commentId);
    if (idx === -1) return false;

    const comment = this.data.comments[idx];
    if (comment.userId !== userId && !isAdmin) {
      return false;
    }

    this.data.comments.splice(idx, 1);
    this.saveData(this.data);
    return true;
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
