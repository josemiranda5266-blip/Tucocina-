import fs from 'fs';
import path from 'path';
import { getAdminFirestore } from '../auth/firebaseAdmin';

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
  comments: StoredComment[];
}

const DB_FILE = path.resolve(process.cwd(), 'server/data/db.json');

const EMPTY_DATA: DatabaseSchema = {
  videos: [],
  reports: [],
  favorites: [],
  comments: [],
};

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

class StoreManager {
  private data: DatabaseSchema = clean(EMPTY_DATA);
  private knownUserCount = 0;
  private initialized = false;
  public readonly ready: Promise<void>;

  constructor() {
    this.ready = this.initialize();
  }

  private async initialize(): Promise<void> {
    const db = getAdminFirestore();

    try {
      const [videos, reports, favorites, comments, users] = await Promise.all([
        db.collection('videos').get(),
        db.collection('reports').get(),
        db.collection('favorites').get(),
        db.collection('comments').get(),
        db.collection('users').get(),
      ]);

      this.data = {
        videos: videos.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoredVideo, 'id'>) })),
        reports: reports.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoredReport, 'id'>) })),
        favorites: favorites.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoredFavorite, 'id'>) })),
        comments: comments.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoredComment, 'id'>) })),
      };
      this.knownUserCount = users.size;

      // One-time recovery path: if the Firestore catalog is empty but an old
      // local db.json contains data, import it into Firestore. The repository's
      // current db.json is empty, so this is only a backwards-compatible rescue.
      if (this.data.videos.length === 0 && this.data.reports.length === 0 && this.data.favorites.length === 0 && this.data.comments.length === 0) {
        const legacy = this.loadLegacyData();
        if (legacy.videos.length || legacy.reports.length || legacy.favorites.length || legacy.comments.length) {
          this.data = legacy;
          await this.persistAll();
        }
      }

      this.initialized = true;
      console.log(`[Store] Firestore listo: ${this.data.videos.length} videos, ${this.data.reports.length} reportes, ${this.data.favorites.length} favoritos, ${this.data.comments.length} comentarios.`);
    } catch (error) {
      console.error('[Store] No se pudo inicializar Firestore:', error);
      throw error;
    }
  }

  private loadLegacyData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_FILE)) return clean(EMPTY_DATA);
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      return {
        videos: Array.isArray(parsed.videos) ? parsed.videos : [],
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
        comments: Array.isArray(parsed.comments) ? parsed.comments : [],
      };
    } catch (error) {
      console.warn('[Store] No se pudo leer db.json heredado:', error);
      return clean(EMPTY_DATA);
    }
  }

  private async persistAll(): Promise<void> {
    const db = getAdminFirestore();
    const batch = db.batch();
    const collections: Array<[keyof DatabaseSchema, string]> = [
      ['videos', 'videos'],
      ['reports', 'reports'],
      ['favorites', 'favorites'],
      ['comments', 'comments'],
    ];

    for (const [key, collection] of collections) {
      for (const item of this.data[key]) {
        const { id, ...payload } = item as any;
        batch.set(db.collection(collection).doc(id), payload);
      }
    }
    if (collections.length) await batch.commit();
  }

  private persistDoc(collection: keyof DatabaseSchema, item: any): void {
    const db = getAdminFirestore();
    const { id, ...payload } = item;
    void db.collection(String(collection)).doc(id).set(payload).catch((error) => {
      console.error(`[Store] Error persistiendo ${String(collection)}/${id}:`, error);
    });
  }

  private deleteDoc(collection: keyof DatabaseSchema, id: string): void {
    void getAdminFirestore().collection(String(collection)).doc(id).delete().catch((error) => {
      console.error(`[Store] Error eliminando ${String(collection)}/${id}:`, error);
    });
  }

  private replaceCollection(collection: keyof DatabaseSchema, items: any[]): void {
    for (const item of items) this.persistDoc(collection, item);
  }

  getVideos(options: { status?: string; categoryId?: string; platform?: string; searchQuery?: string; sortBy?: 'recent' | 'views'; cursor?: string; limit?: number }) {
    let items = [...this.data.videos];
    items = options.status ? items.filter((v) => v.status === options.status) : items.filter((v) => v.status === 'PUBLISHED');
    if (options.categoryId) items = items.filter((v) => v.categoryId === options.categoryId);
    if (options.platform) items = items.filter((v) => v.platform === options.platform!.toUpperCase());
    if (options.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      items = items.filter((v) => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q) || v.creatorName.toLowerCase().includes(q) || (Array.isArray(v.tags) && v.tags.some((t) => t.toLowerCase().includes(q))));
    }
    if (options.sortBy === 'views') items.sort((a, b) => b.views - a.views);
    else items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limit = options.limit || 20;
    let startIndex = 0;
    if (options.cursor) {
      const found = items.findIndex((v) => v.id === options.cursor);
      if (found !== -1) startIndex = found + 1;
    }
    const sliced = items.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < items.length;
    return { items: sliced, limit, hasMore, nextCursor: hasMore && sliced.length ? sliced[sliced.length - 1].id : null, total: items.length };
  }

  getAllAdminVideos(options: { status?: string; cursor?: string; limit?: number }) {
    let items = [...this.data.videos];
    if (options.status) items = items.filter((v) => v.status === options.status);
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const limit = options.limit || 20;
    let startIndex = 0;
    if (options.cursor) {
      const found = items.findIndex((v) => v.id === options.cursor);
      if (found !== -1) startIndex = found + 1;
    }
    const sliced = items.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < items.length;
    return { items: sliced, limit, hasMore, nextCursor: hasMore && sliced.length ? sliced[sliced.length - 1].id : null, total: items.length };
  }

  getVideoById(id: string): StoredVideo | null { return this.data.videos.find((v) => v.id === id) || null; }

  findDuplicate(platform: string, platformVideoId: string): StoredVideo | null {
    return this.data.videos.find((v) => v.platform === platform && v.platformVideoId === platformVideoId) || null;
  }

  addVideo(video: StoredVideo): StoredVideo { this.data.videos.unshift(video); this.persistDoc('videos', video); return video; }

  updateVideo(id: string, updates: Partial<StoredVideo>): StoredVideo | null {
    const index = this.data.videos.findIndex((v) => v.id === id);
    if (index === -1) return null;
    const updated = { ...this.data.videos[index], ...updates, updatedAt: new Date().toISOString() };
    this.data.videos[index] = updated;
    this.persistDoc('videos', updated);
    return updated;
  }

  deleteVideo(id: string): boolean {
    const before = this.data.videos.length;
    this.data.videos = this.data.videos.filter((v) => v.id !== id);
    this.data.comments = this.data.comments.filter((c) => c.videoId !== id);
    this.data.favorites = this.data.favorites.filter((f) => f.videoId !== id);
    if (this.data.videos.length === before) return false;
    this.deleteDoc('videos', id);
    const db = getAdminFirestore();
    for (const c of this.data.comments.filter((c) => c.videoId === id)) this.deleteDoc('comments', c.id);
    for (const f of this.data.favorites.filter((f) => f.videoId === id)) this.deleteDoc('favorites', f.id);
    return true;
  }

  purgeDuplicates(): { markedCount: number; markedIds: string[] } {
    const seenMap = new Map<string, StoredVideo>();
    const markedIds: string[] = [];
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
          this.persistDoc('videos', video);
        }
      } else seenMap.set(key, video);
    }
    return { markedCount: markedIds.length, markedIds };
  }

  getCommentsByVideoId(videoId: string): StoredComment[] {
    return this.data.comments.filter((c) => c.videoId === videoId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addComment(comment: StoredComment): StoredComment { this.data.comments.unshift(comment); this.persistDoc('comments', comment); return comment; }

  deleteComment(commentId: string, userId: string, isAdmin: boolean): boolean {
    const idx = this.data.comments.findIndex((c) => c.id === commentId);
    if (idx === -1) return false;
    const comment = this.data.comments[idx];
    if (comment.userId !== userId && !isAdmin) return false;
    this.data.comments.splice(idx, 1);
    this.deleteDoc('comments', commentId);
    return true;
  }

  incrementViews(id: string): void {
    const video = this.getVideoById(id);
    if (!video) return;
    video.views = (video.views || 0) + 1;
    this.persistDoc('videos', video);
  }

  getReports(options: { status?: string; cursor?: string; limit?: number }) {
    let items = [...this.data.reports];
    if (options.status) items = items.filter((r) => r.status === options.status);
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const limit = options.limit || 20;
    let startIndex = 0;
    if (options.cursor) {
      const idx = items.findIndex((r) => r.id === options.cursor);
      if (idx !== -1) startIndex = idx + 1;
    }
    const sliced = items.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < items.length;
    return { items: sliced, limit, hasMore, nextCursor: hasMore && sliced.length ? sliced[sliced.length - 1].id : null, total: items.length };
  }

  addReport(report: StoredReport): StoredReport { this.data.reports.unshift(report); this.persistDoc('reports', report); return report; }

  updateReport(id: string, status: StoredReport['status']): boolean {
    const report = this.data.reports.find((r) => r.id === id);
    if (!report) return false;
    report.status = status;
    this.persistDoc('reports', report);
    return true;
  }

  getFavorites(userId: string, limit = 20, cursor?: string) {
    const userFavs = this.data.favorites.filter((f) => f.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    let startIndex = 0;
    if (cursor) {
      const idx = userFavs.findIndex((f) => f.id === cursor);
      if (idx !== -1) startIndex = idx + 1;
    }
    const sliced = userFavs.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < userFavs.length;
    const items = sliced.map((f) => this.getVideoById(f.videoId)).filter((v): v is StoredVideo => v !== null && v.status === 'PUBLISHED');
    return { items, limit, hasMore, nextCursor: hasMore && sliced.length ? sliced[sliced.length - 1].id : null };
  }

  isFavorite(userId: string, videoId: string): boolean { return this.data.favorites.some((f) => f.userId === userId && f.videoId === videoId); }

  addFavorite(userId: string, videoId: string): void {
    if (this.isFavorite(userId, videoId)) return;
    const favorite: StoredFavorite = { id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, userId, videoId, createdAt: new Date().toISOString() };
    this.data.favorites.push(favorite);
    this.persistDoc('favorites', favorite);
  }

  removeFavorite(userId: string, videoId: string): void {
    const removed = this.data.favorites.filter((f) => f.userId === userId && f.videoId === videoId);
    this.data.favorites = this.data.favorites.filter((f) => !(f.userId === userId && f.videoId === videoId));
    for (const favorite of removed) this.deleteDoc('favorites', favorite.id);
  }

  getMetrics() {
    const totalVideos = this.data.videos.length;
    return {
      totalVideos,
      publishedVideos: this.data.videos.filter((v) => v.status === 'PUBLISHED').length,
      pendingVideos: this.data.videos.filter((v) => v.status === 'PENDING_REVIEW' || v.status === 'DRAFT').length,
      hiddenVideos: this.data.videos.filter((v) => v.status === 'HIDDEN' || v.status === 'REJECTED').length,
      openReports: this.data.reports.filter((r) => r.status === 'OPEN').length,
      totalUsers: this.knownUserCount,
    };
  }
}

export const dbStore = new StoreManager();
export const storeReady = dbStore.ready;
