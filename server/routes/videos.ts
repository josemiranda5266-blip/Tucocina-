import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { dbStore, StoredComment } from '../data/store';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const MAX_PAGE_SIZE = 50;

function parseLimit(value: unknown, fallback = 12): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(MAX_PAGE_SIZE, Math.max(1, parsed)) : fallback;
}

function requirePublishedVideo(videoId: string) {
  const video = dbStore.getVideoById(videoId);
  return video && video.status === 'PUBLISHED' ? video : null;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseLimit(req.query.limit);
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId.trim() : '';
    const platform = typeof req.query.platform === 'string' ? req.query.platform.trim().toUpperCase() : '';
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.toLowerCase().trim() : '';
    const sortBy = req.query.sortBy === 'views' ? 'views' : 'recent';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';

    if (cursor && !dbStore.getVideoById(cursor)) {
      return res.status(400).json({ error: { code: 'INVALID_CURSOR', message: 'El cursor de paginación no es válido.' } });
    }

    const result = dbStore.getVideos({ categoryId: categoryId || undefined, platform: platform || undefined, searchQuery: searchQuery || undefined, sortBy, cursor: cursor || undefined, limit });
    return res.json(result);
  } catch {
    return res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Error al consultar el catálogo de videos' } });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const video = requirePublishedVideo(req.params.id);
    if (!video) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    return res.json(video);
  } catch {
    return res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Error al obtener los detalles del video' } });
  }
});

router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    if (!requirePublishedVideo(req.params.id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    }
    return res.json({ comments: dbStore.getComments(req.params.id) });
  } catch {
    return res.status(500).json({ error: { code: 'COMMENTS_FETCH_ERROR', message: 'Error al obtener comentarios' } });
  }
});

router.post('/:id/comments', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = req.params.id;
    if (!requirePublishedVideo(videoId)) {
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

    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });

    const newComment: StoredComment = {
      id: `comment-${randomUUID()}`,
      videoId,
      userId,
      userName: req.user?.displayName || req.user?.email || 'Usuario de CociFlash',
      userPhoto: req.user?.photoURL || undefined,
      text: sanitizedText,
      createdAt: new Date().toISOString(),
    };

    dbStore.addComment(newComment);
    return res.status(201).json({ message: 'Comentario agregado con éxito', comment: newComment });
  } catch (error) {
    console.error('[Comments] Error creando comentario:', error);
    return res.status(500).json({ error: { code: 'COMMENT_ADD_ERROR', message: 'Error al guardar el comentario' } });
  }
});

router.delete('/:id/comments/:commentId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!requirePublishedVideo(req.params.id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    }

    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });

    const isAdmin = req.user?.role === 'ADMIN' || req.user?.admin === true;
    if (!dbStore.deleteComment(req.params.commentId, userId, isAdmin)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes permisos para eliminar este comentario o no fue encontrado.' } });
    }

    return res.json({ message: 'Comentario eliminado con éxito' });
  } catch {
    return res.status(500).json({ error: { code: 'COMMENT_DELETE_ERROR', message: 'Error al eliminar comentario' } });
  }
});

export default router;
