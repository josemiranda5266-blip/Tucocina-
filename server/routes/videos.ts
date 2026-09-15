import { Router, Request, Response } from 'express';
import { dbStore, StoredComment } from '../data/store';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

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

    // Do not block playback on a live origin probe. The catalog already contains
    // the published URL; temporary API/oEmbed failures must not turn a valid
    // catalog entry into a 404 or delete it from Firestore.
    // View counting is intentionally handled separately until the store exposes
    // a persistence-safe increment operation.

    return res.json(video);
  } catch {
    return res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Error al obtener los detalles del video' } });
  }
});

// GET /api/videos/:id/comments - Get comments for a video
router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const video = dbStore.getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    }

    const comments = dbStore.getCommentsByVideoId(videoId);
    return res.json({ comments });
  } catch {
    return res.status(500).json({ error: { code: 'COMMENTS_FETCH_ERROR', message: 'Error al obtener comentarios' } });
  }
});

// POST /api/videos/:id/comments - Add a comment (requires login)
router.post('/:id/comments', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = req.params.id;
    const video = dbStore.getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    }

    const { text } = req.body || {};
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El comentario no puede estar vacío.' } });
    }

    const sanitizedText = text.trim();
    if (sanitizedText.length > 1000) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El comentario excede el límite de 1000 caracteres.' } });
    }

    const userId = req.user?.uid || 'user-unknown';
    const userName = req.user?.displayName || req.user?.email || 'Usuario de Tucocina';
    const userPhoto = req.user?.photoURL || undefined;

    const newComment: StoredComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      videoId,
      userId,
      userName,
      userPhoto,
      text: sanitizedText,
      createdAt: new Date().toISOString(),
    };

    dbStore.addComment(newComment);
    return res.status(201).json({ message: 'Comentario agregado con éxito', comment: newComment });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'COMMENT_ADD_ERROR', message: error?.message || 'Error al guardar el comentario' } });
  }
});

// DELETE /api/videos/:id/comments/:commentId - Delete a comment (author or admin)
router.delete('/:id/comments/:commentId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.uid || '';
    const isAdmin = req.user?.admin === true || req.user?.role === 'ADMIN' || req.user?.email === 'cristianbravo5266@gmail.com';

    const deleted = dbStore.deleteComment(commentId, userId, isAdmin);
    if (!deleted) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes permisos para eliminar este comentario o no fue encontrado.' } });
    }

    return res.json({ message: 'Comentario eliminado con éxito' });
  } catch {
    return res.status(500).json({ error: { code: 'COMMENT_DELETE_ERROR', message: 'Error al eliminar comentario' } });
  }
});

export default router;
