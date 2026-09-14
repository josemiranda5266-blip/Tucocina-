import { Router, Request, Response } from 'express';
import { dbStore } from '../data/store';

const router = Router();
const MAX_PAGE_SIZE = 50;

function parseLimit(value: unknown, fallback = 12): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(MAX_PAGE_SIZE, Math.max(1, parsed)) : fallback;
}

// GET /api/videos - Public catalog
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseLimit(req.query.limit);
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId.trim() : '';
    const platform = typeof req.query.platform === 'string' ? req.query.platform.trim().toUpperCase() : '';
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.toLowerCase().trim() : '';
    const sortBy = req.query.sortBy === 'views' ? 'views' : 'recent';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';

    const result = dbStore.getVideos({
      categoryId: categoryId || undefined,
      platform: platform || undefined,
      searchQuery: searchQuery || undefined,
      sortBy,
      cursor: cursor || undefined,
      limit,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Error al consultar el catálogo de videos' } });
  }
});

// GET /api/videos/:id - Public detail only for published videos.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const video = dbStore.getVideoById(videoId);

    if (!video || video.status !== 'PUBLISHED') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    }

    dbStore.incrementViews(videoId);

    return res.json(video);
  } catch {
    return res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Error al obtener los detalles del video' } });
  }
});

export default router;

