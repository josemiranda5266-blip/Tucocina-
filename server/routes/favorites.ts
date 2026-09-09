import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();
const MAX_PAGE_SIZE = 50;

router.use(authenticateUser);

function parseLimit(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(MAX_PAGE_SIZE, Math.max(1, parsed)) : 20;
}

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const limit = parseLimit(req.query.limit);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
    const db = getAdminFirestore();
    const favoritesRef = db.collection('users').doc(userId).collection('favorites');

    let query = favoritesRef.orderBy('createdAt', 'desc').orderBy('__name__', 'desc');
    if (cursor) {
      const cursorDoc = await favoritesRef.doc(cursor).get();
      if (!cursorDoc.exists) {
        return res.status(400).json({ error: { code: 'INVALID_CURSOR', message: 'Cursor de paginación inválido' } });
      }
      query = query.startAfter(cursorDoc) as typeof query;
    }

    const favoriteSnapshot = await query.limit(limit + 1).get();
    const hasMore = favoriteSnapshot.size > limit;
    const favoriteDocs = favoriteSnapshot.docs.slice(0, limit);
    const videoIds = favoriteDocs.map(doc => doc.data().videoId).filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (videoIds.length === 0) {
      return res.json({ items: [], limit, hasMore: false, nextCursor: null });
    }

    const videos = new Map<string, Record<string, unknown>>();
    for (let i = 0; i < videoIds.length; i += 30) {
      const chunk = videoIds.slice(i, i + 30);
      const snap = await db.collection('videos').where('__name__', 'in', chunk).where('status', '==', 'PUBLISHED').get();
      snap.docs.forEach(doc => videos.set(doc.id, { id: doc.id, ...doc.data() }));
    }

    const items = favoriteDocs.map(favorite => videos.get(favorite.data().videoId)).filter(Boolean);
    const nextCursor = hasMore ? favoriteDocs[favoriteDocs.length - 1]?.id || null : null;
    return res.json({ items, limit, hasMore, nextCursor });
  } catch {
    return res.status(500).json({ error: { code: 'FAVORITES_ERROR', message: 'Error al obtener tus videos favoritos' } });
  }
});

router.get('/check/:videoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const videoId = req.params.videoId;
    const db = getAdminFirestore();
    const doc = await db.collection('users').doc(userId).collection('favorites').doc(videoId).get();
    return res.json({ isFavorite: doc.exists });
  } catch {
    return res.json({ isFavorite: false });
  }
});

router.post('/:videoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const videoId = req.params.videoId;
    const db = getAdminFirestore();
    const video = await db.collection('videos').doc(videoId).get();

    if (!video.exists || video.data()?.status !== 'PUBLISHED') {
      return res.status(404).json({ error: { code: 'VIDEO_NOT_FOUND', message: 'El video no está disponible para favoritos' } });
    }

    const favRef = db.collection('users').doc(userId).collection('favorites').doc(videoId);
    await favRef.set({ id: videoId, userId, videoId, createdAt: new Date().toISOString() }, { merge: false });
    return res.json({ success: true, isFavorite: true });
  } catch {
    return res.status(500).json({ error: { code: 'FAVORITE_ADD_ERROR', message: 'Error al agregar a favoritos' } });
  }
});

router.delete('/:videoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const videoId = req.params.videoId;
    const db = getAdminFirestore();
    await db.collection('users').doc(userId).collection('favorites').doc(videoId).delete();
    return res.json({ success: true, isFavorite: false });
  } catch {
    return res.status(500).json({ error: { code: 'FAVORITE_REMOVE_ERROR', message: 'Error al eliminar de favoritos' } });
  }
});

export default router;
