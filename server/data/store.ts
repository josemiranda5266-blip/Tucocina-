import fs from 'fs';
import path from 'path';
import { getAdminFirestore } from '../auth/firebaseAdmin';

export interface StoredVideo {
  id: string;
  title: string;
  description: string;
  originalUrl: string;
  embedUrl: string;
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'OTHER';
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

/** Normalizes accents, case and repeated whitespace so searches are forgiving. */
function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function matchesSearch(video: StoredVideo, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const terms = normalizedQuery.split(' ').filter(Boolean);
  const searchableText = normalizeSearchText([
    video.title,
    video.description,
    video.creatorName,
    ...(Array.isArray(video.tags) ? video.tags : []),
  ].join(' '));
  return terms.every((term) => searchableText.includes(term));
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
    const operations: Array<{ collection: keyof DatabaseSchema; item: any }> = [];
    const collections: Array<[keyof DatabaseSchema, string]> = [
      ['videos', 'videos'], ['reports', 'reports'], ['favorites', 'favorites'], ['comments', 'comments'],
    ];
    for (const [key] of collections) for (const item of this.data[key]) operations.push({ collection: key, item });
    const BATCH_SIZE = 450;
    for (let offset = 0; offset < operations.length; offset += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = operations.slice(offset, offset + BATCH_SIZE);
      for (const { collection, item } of chunk) {
        const { id, ...payload } = item;
        batch.set(db.collection(String(collection)).doc(id), payload);
      }
      await batch.commit();
    }
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

  getVideos(options: { status?: string; categoryId?: string; platform?: string; searchQuery?: string; sortBy?: 'recent' | 'views'; cursor?: string; limit?: number }) {
    let items = [...this.data.videos];
    items = options.status ? items.filter((v) => v.status === options.status) : items.filter((v) => v.status === 'PUBLISHED');
    if (options.categoryId) items = items.filter((v) => v.categoryId === options.categoryId);
    if (options.platform) items = items.filter((v) => v.platform === options.platform!.toUpperCase());
    if (options.searchQuery) items = items.filter((v) => matchesSearch(v, options.searchQuery!));
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
  findDuplicate(platform: string, platformVideoId: string): StoredVideo | null { return this.data.videos.find((v) => v.platform === platform && v.platformVideoId === platformVideoId) || null; }
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
    const videoExists = this.data.videos.some((v) => v.id === id);
    if (!videoExists) return false;
    const relatedComments = this.data.comments.filter((c) => c.videoId === id);
    const relatedFavorites = this.data.favorites.filter((f) => f.videoId === id);
    this.data.videos = this.data.videos.filter((v) => v.id !== id);
    this.data.comments = this.data.comments.filter((c) => c.videoId !== id);
    this.data.favorites = this.data.favorites.filter((f) => f.videoId !== id);
    this.deleteDoc('videos', id);
    for (const comment of relatedComments) this.deleteDoc('comments', comment.id);
    for (const favorite of relatedFavorites) this.deleteDoc('favorites', favorite.id);
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
  addReport(report: StoredReport): StoredReport { this.data.reports.unshift(report); this.persistDoc('reports', report); return report; }
  getReports(options: { status?: string; cursor?: string; limit?: number }) {
    let items = [...this.data.reports];
    if (options.status) items = items.filter((r) => r.status === options.status);
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const limit = options.limit || 20;
    const startIndex = options.cursor ? Math.max(0, items.findIndex((r) => r.id === options.cursor) + 1) : 0;
    const sliced = items.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < items.length;
    return { items: sliced, limit, hasMore, nextCursor: hasMore && sliced.length ? sliced[sliced.length - 1].id : null, total: items.length };
  }
  updateReport(id: string, updates: Partial<StoredReport>): StoredReport | null { const index = this.data.reports.findIndex((r) => r.id === id); if (index === -1) return null; const updated = { ...this.data.reports[index], ...updates }; this.data.reports[index] = updated; this.persistDoc('reports', updated); return updated; }
  addFavorite(favorite: StoredFavorite): StoredFavorite { this.data.favorites.unshift(favorite); this.persistDoc('favorites', favorite); return favorite; }
  removeFavorite(userId: string, videoId: string): boolean { const before = this.data.favorites.length; const found = this.data.favorites.find((f) => f.userId === userId && f.videoId === videoId); this.data.favorites = this.data.favorites.filter((f) => !(f.userId === userId && f.videoId === videoId)); if (found) this.deleteDoc('favorites', found.id); return this.data.favorites.length < before; }
  isFavorite(userId: string, videoId: string): boolean { return this.data.favorites.some((f) => f.userId === userId && f.videoId === videoId); }
  getFavorites(userId: string): StoredFavorite[] { return this.data.favorites.filter((f) => f.userId === userId); }
  addComment(comment: StoredComment): StoredComment { this.data.comments.push(comment); this.persistDoc('comments', comment); return comment; }
  getComments(videoId: string): StoredComment[] { return this.data.comments.filter((c) => c.videoId === videoId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); }

  /**
   * Deletes a comment only when the authenticated actor owns it or is an admin.
   * Authorization lives here so every caller gets the same security boundary.
   */
  deleteComment(id: string, actorUserId: string, isAdmin: boolean): boolean {
    const comment = this.data.comments.find((c) => c.id === id);
    if (!comment) return false;
    if (!isAdmin && comment.userId !== actorUserId) return false;

    this.data.comments = this.data.comments.filter((c) => c.id !== id);
    this.deleteDoc('comments', id);
    return true;
  }

  getMetrics() {
    return {
      videos: this.data.videos.length,
      publishedVideos: this.data.videos.filter((v) => v.status === 'PUBLISHED').length,
      pendingVideos: this.data.videos.filter((v) => v.status === 'PENDING_REVIEW').length,
      draftVideos: this.data.videos.filter((v) => v.status === 'DRAFT').length,
      users: this.knownUserCount,
      reports: this.data.reports.filter((r) => r.status === 'OPEN').length,
      favorites: this.data.favorites.length,
      comments: this.data.comments.length,
    };
  }
}

export const dbStore = new StoreManager();
export const storeReady = dbStore.ready;
