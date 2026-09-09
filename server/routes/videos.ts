import { Router, Request, Response } from 'express';
import { FieldValue, Query } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();
const MAX_PAGE_SIZE = 50;

function parseLimit(value: unknown, fallback = 12): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(MAX_PAGE_SIZE, Math.max(1, parsed)) : fallback;
}

// GET /api/videos - Public catalog with Firestore-native filtering and cursor pagination.
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseLimit(req.query.limit);
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId.trim() : '';
    const platform = typeof req.query.platform === 'string' ? req.query.platform.trim().toUpperCase() : '';
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.toLowerCase().trim() : '';
    const sortBy = req.query.sortBy === 'views' ? 'views' : 'recent';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';

    const db = getAdminFirestore();
    let query: Query = db.collection('videos').where('status', '==', 'PUBLISHED');

    if (categoryId) query = query.where('categoryId', '==', categoryId);
    if (platform) query = query.where('platform', '==', platform);

    const orderField = sortBy === 'views' ? 'views' : 'createdAt';
    query = query.orderBy(orderField, 'desc').orderBy('__name__', 'desc');

    if (cursor) {
      const cursorDoc = await db.collection('videos').doc(cursor).get();
      if (!cursorDoc.exists || cursorDoc.data()?.status !== 'PUBLISHED') {
        return res.status(400).json({ error: { code: 'INVALID_CURSOR', message: 'Cursor de paginación inválido' } });
      }
      query = query.startAfter(cursorDoc);
    }

    // Search remains a controlled compatibility fallback until a dedicated search index is introduced.
    // It is bounded to avoid unbounded response sizes and should not be used for deep pagination.
    if (searchQuery) {
      const searchSnapshot = await query.limit(Math.min(limit * 20, 500)).get();
      const filtered = searchSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .filter(item =>
          item.title?.toLowerCase().includes(searchQuery) ||
          item.description?.toLowerCase().includes(searchQuery) ||
          item.creatorName?.toLowerCase().includes(searchQuery) ||
          (Array.isArray(item.tags) && item.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery)))
        );
      const items = filtered.slice(0, limit);
      const last = items[items.length - 1];
      return res.json({
        items,
        limit,
        hasMore: filtered.length > limit || searchSnapshot.size === Math.min(limit * 20, 500),
        nextCursor: last?.id || null,
      });
    }

    const snapshot = await query.limit(limit + 1).get();
    const hasMore = snapshot.size > limit;
    const docs = snapshot.docs.slice(0, limit);
    const items = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const nextCursor = hasMore ? docs[docs.length - 1]?.id || null : null;

    // Count is an aggregation over indexes rather than downloading the collection.
    const countSnapshot = await query.count().get();

    res.json({
      items,
      total: countSnapshot.data().count,
      limit,
      hasMore,
      nextCursor,
    });
  } catch {
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Error al consultar el catálogo de videos' } });
  }
});

// GET /api/videos/:id - Public detail only for published videos.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const db = getAdminFirestore();
    const docRef = db.collection('videos').doc(videoId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.status !== 'PUBLISHED') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    }

    const videoData = { id: doc.id, ...doc.data() } as any;

    // Atomic increment avoids lost updates under concurrent views.
    void docRef.update({ views: FieldValue.increment(1) }).catch(() => {});

    return res.json(videoData);
  } catch {
    return res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Error al obtener los detalles del video' } });
  }
});

export default router;
