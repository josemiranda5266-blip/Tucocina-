import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { dbStore } from '../data/store';

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
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : undefined;

    const result = dbStore.getFavorites(userId, limit, cursor);
    return res.json(result);
  } catch {
    return res.status(500).json({ error: { code: 'FAVORITES_ERROR', message: 'Error al obtener tus videos favoritos' } });
  }
});

router.get('/check/:videoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const videoId = req.params.videoId;
    const isFav = dbStore.isFavorite(userId, videoId);
    return res.json({ isFavorite: isFav });
  } catch {
    return res.json({ isFavorite: false });
  }
});

router.post('/:videoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const videoId = req.params.videoId;
    const video = dbStore.getVideoById(videoId);

    if (!video || video.status !== 'PUBLISHED') {
      return res.status(404).json({ error: { code: 'VIDEO_NOT_FOUND', message: 'El video no está disponible para favoritos' } });
    }

    dbStore.addFavorite(userId, videoId);
    return res.json({ success: true, isFavorite: true });
  } catch {
    return res.status(500).json({ error: { code: 'FAVORITE_ADD_ERROR', message: 'Error al agregar a favoritos' } });
  }
});

router.delete('/:videoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const videoId = req.params.videoId;
    dbStore.removeFavorite(userId, videoId);
    return res.json({ success: true, isFavorite: false });
  } catch {
    return res.status(500).json({ error: { code: 'FAVORITE_REMOVE_ERROR', message: 'Error al eliminar de favoritos' } });
  }
});

export default router;
