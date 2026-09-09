import { Router, Request, Response } from 'express';
import { getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();

// GET /api/videos - Catalog list with filters and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const categoryId = req.query.categoryId as string;
    const platform = req.query.platform as string;
    const searchQuery = (req.query.q as string || '').toLowerCase().trim();
    const sortBy = (req.query.sortBy as string) || 'recent';

    const db = getAdminFirestore();
    let query: any = db.collection('videos').where('status', '==', 'PUBLISHED');

    if (categoryId) {
      query = query.where('categoryId', '==', categoryId);
    }

    if (platform) {
      query = query.where('platform', '==', platform.toUpperCase());
    }

    const snapshot = await query.get();
    let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    // Client-side / In-memory filtering for search query string (Firestore lacks full-text substring search natively)
    if (searchQuery) {
      items = items.filter(item =>
        item.title?.toLowerCase().includes(searchQuery) ||
        item.description?.toLowerCase().includes(searchQuery) ||
        item.creatorName?.toLowerCase().includes(searchQuery) ||
        (Array.isArray(item.tags) && item.tags.some((t: string) => t.toLowerCase().includes(searchQuery)))
      );
    }

    // Sorting
    if (sortBy === 'views') {
      items.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else {
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    // Pagination
    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    res.json({
      items: paginatedItems,
      total,
      page,
      limit,
      hasMore: startIndex + limit < total,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Error al consultar el catálogo de videos' } });
  }
});

// GET /api/videos/:id - Video detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const db = getAdminFirestore();
    const docRef = db.collection('videos').doc(videoId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    }

    const videoData = { id: doc.id, ...doc.data() } as any;

    // Increment view count asynchronously
    docRef.update({ views: (videoData.views || 0) + 1 }).catch(() => {});

    res.json(videoData);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Error al obtener los detalles del video' } });
  }
});

export default router;
