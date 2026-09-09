import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { ImportVideoSchema, UpdateVideoSchema } from '../validators/video';
import { processExternalVideoUrl } from '../services/connectors';
import { getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();
const MAX_PAGE_SIZE = 50;

router.use(authenticateUser);
router.use(requireAdmin);

function parseLimit(value: unknown, fallback = 20): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(MAX_PAGE_SIZE, Math.max(1, parsed)) : fallback;
}

const ReportStatusSchema = z.object({ status: z.enum(['OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED']) });

router.post('/videos/import', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = ImportVideoSchema.parse(req.body);
    const extracted = await processExternalVideoUrl(url);
    const db = getAdminFirestore();

    const existingSnap = await db.collection('videos').where('originalUrl', '==', extracted.originalUrl).limit(1).get();
    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0];
      return res.status(409).json({
        error: { code: 'DUPLICATE_VIDEO', message: 'Este video ya se encuentra importado en el sistema.' },
        video: { id: existing.id, ...existing.data() },
      });
    }

    const videoRef = db.collection('videos').doc();
    const now = new Date().toISOString();
    const newVideo = {
      id: videoRef.id,
      title: extracted.title,
      description: extracted.description,
      originalUrl: extracted.originalUrl,
      embedUrl: extracted.embedUrl,
      platform: extracted.platform,
      thumbnailUrl: extracted.thumbnailUrl,
      creatorName: extracted.creatorName,
      creatorUrl: extracted.creatorUrl || '',
      durationSeconds: extracted.durationSeconds || 0,
      categoryId: 'cat-carnes',
      tags: ['cocina', 'receta'],
      status: 'DRAFT',
      views: 0,
      createdAt: now,
      updatedAt: now,
    };

    await videoRef.set(newVideo);
    return res.status(201).json({ message: 'Video importado con éxito como Borrador (DRAFT)', video: newVideo });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'URL inválida' } });
    }
    return res.status(400).json({ error: { code: 'IMPORT_FAILED', message: error.message || 'Error al procesar el video' } });
  }
});

router.get('/videos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseLimit(req.query.limit);
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
    const db = getAdminFirestore();

    let query = db.collection('videos').orderBy('createdAt', 'desc').orderBy('__name__', 'desc');
    if (status) query = query.where('status', '==', status);

    if (cursor) {
      const cursorDoc = await db.collection('videos').doc(cursor).get();
      if (!cursorDoc.exists) {
        return res.status(400).json({ error: { code: 'INVALID_CURSOR', message: 'Cursor de paginación inválido' } });
      }
      query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.limit(limit + 1).get();
    const hasMore = snapshot.size > limit;
    const docs = snapshot.docs.slice(0, limit);
    const items = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const nextCursor = hasMore ? docs[docs.length - 1]?.id || null : null;

    return res.json({ items, limit, hasMore, nextCursor });
  } catch {
    return res.status(500).json({ error: { code: 'ADMIN_FETCH_ERROR', message: 'Error al consultar catálogo administrativo' } });
  }
});

router.patch('/videos/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = req.params.id;
    const updates = UpdateVideoSchema.parse(req.body);
    const db = getAdminFirestore();
    const videoRef = db.collection('videos').doc(videoId);
    const doc = await videoRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    }

    await videoRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const updatedDoc = await videoRef.get();
    return res.json({ message: 'Video actualizado correctamente', video: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'UPDATE_FAILED', message: error.message || 'Error al actualizar video' } });
  }
});

router.delete('/videos/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getAdminFirestore();
    const ref = db.collection('videos').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    await ref.delete();
    return res.json({ message: 'Video eliminado correctamente' });
  } catch {
    return res.status(500).json({ error: { code: 'DELETE_FAILED', message: 'Error al eliminar el video' } });
  }
});

router.get('/reports', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseLimit(req.query.limit);
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
    const db = getAdminFirestore();
    let query = db.collection('reports').orderBy('createdAt', 'desc').orderBy('__name__', 'desc');
    if (status) query = query.where('status', '==', status);

    if (cursor) {
      const cursorDoc = await db.collection('reports').doc(cursor).get();
      if (!cursorDoc.exists) return res.status(400).json({ error: { code: 'INVALID_CURSOR', message: 'Cursor de paginación inválido' } });
      query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.limit(limit + 1).get();
    const hasMore = snapshot.size > limit;
    const docs = snapshot.docs.slice(0, limit);
    const reports = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json({ items: reports, limit, hasMore, nextCursor: hasMore ? docs[docs.length - 1]?.id || null : null });
  } catch {
    return res.status(500).json({ error: { code: 'REPORTS_FETCH_ERROR', message: 'Error al consultar reportes' } });
  }
});

router.patch('/reports/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = ReportStatusSchema.parse(req.body);
    const db = getAdminFirestore();
    const ref = db.collection('reports').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Reporte no encontrado' } });
    await ref.update({ status, updatedAt: new Date().toISOString() });
    return res.json({ message: 'Estado de reporte actualizado' });
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'REPORT_UPDATE_ERROR', message: error.message || 'Estado inválido' } });
  }
});

router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getAdminFirestore();
    const videos = db.collection('videos');
    const reports = db.collection('reports');
    const users = db.collection('users');

    const [totalVideos, publishedVideos, pendingVideos, hiddenVideos, openReports, totalUsers] = await Promise.all([
      videos.count().get(),
      videos.where('status', '==', 'PUBLISHED').count().get(),
      videos.where('status', 'in', ['DRAFT', 'PENDING_REVIEW']).count().get(),
      videos.where('status', '==', 'HIDDEN').count().get(),
      reports.where('status', '==', 'OPEN').count().get(),
      users.count().get(),
    ]);

    return res.json({
      totalVideos: totalVideos.data().count,
      publishedVideos: publishedVideos.data().count,
      pendingVideos: pendingVideos.data().count,
      hiddenVideos: hiddenVideos.data().count,
      openReports: openReports.data().count,
      totalUsers: totalUsers.data().count,
    });
  } catch {
    return res.status(500).json({ error: { code: 'METRICS_ERROR', message: 'Error al consultar métricas del sistema' } });
  }
});

export default router;
