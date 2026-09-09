import { Router, Response } from 'express';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { ImportVideoSchema, UpdateVideoSchema } from '../validators/video';
import { processExternalVideoUrl } from '../services/connectors';
import { getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();

// Require auth and admin role for all admin routes
router.use(authenticateUser);
router.use(requireAdmin);

// POST /api/admin/videos/import - Validate external URL and create video DRAFT
router.post('/videos/import', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = ImportVideoSchema.parse(req.body);

    // Extract metadata using platform connector and SSRF validation
    const extracted = await processExternalVideoUrl(url);

    const db = getAdminFirestore();

    // Check duplicate URL
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
      categoryId: 'cat-carnes', // default category
      tags: ['cocina', 'receta'],
      status: 'DRAFT', // DEFAULT STATUS MUST BE DRAFT
      views: 0,
      createdAt: now,
      updatedAt: now,
    };

    await videoRef.set(newVideo);

    res.status(201).json({
      message: 'Video importado con éxito como Borrador (DRAFT)',
      video: newVideo,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'URL inválida' } });
    }
    res.status(400).json({ error: { code: 'IMPORT_FAILED', message: error.message || 'Error al procesar el video' } });
  }
});

// GET /api/admin/videos - Paginated list of videos for moderation
router.get('/videos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string;

    const db = getAdminFirestore();
    let query: any = db.collection('videos');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    // Sort by createdAt desc
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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
    res.status(500).json({ error: { code: 'ADMIN_FETCH_ERROR', message: 'Error al consultar catálogo administrativo' } });
  }
});

// PATCH /api/admin/videos/:id - Update metadata or status
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

    const patchData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await videoRef.update(patchData);

    const updatedDoc = await videoRef.get();
    res.json({ message: 'Video actualizado correctamente', video: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    res.status(400).json({ error: { code: 'UPDATE_FAILED', message: error.message || 'Error al actualizar video' } });
  }
});

// DELETE /api/admin/videos/:id - Delete video
router.delete('/videos/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = req.params.id;
    const db = getAdminFirestore();
    await db.collection('videos').doc(videoId).delete();
    res.json({ message: 'Video eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'DELETE_FAILED', message: 'Error al eliminar el video' } });
  }
});

// GET /api/admin/reports - List video reports
router.get('/reports', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection('reports').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    reports.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'REPORTS_FETCH_ERROR', message: 'Error al consultar reportes' } });
  }
});

// PATCH /api/admin/reports/:id - Update report status
router.patch('/reports/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = req.params.id;
    const { status } = req.body;

    const db = getAdminFirestore();
    const ref = db.collection('reports').doc(reportId);
    await ref.update({ status });
    res.json({ message: 'Estado de reporte actualizado' });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'REPORT_UPDATE_ERROR', message: 'Error al actualizar reporte' } });
  }
});

// GET /api/admin/metrics - Dashboard summary
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getAdminFirestore();

    const [videosSnap, reportsSnap, usersSnap] = await Promise.all([
      db.collection('videos').get(),
      db.collection('reports').get(),
      db.collection('users').get(),
    ]);

    const videos = videosSnap.docs.map(d => d.data());
    const published = videos.filter(v => v.status === 'PUBLISHED').length;
    const drafts = videos.filter(v => v.status === 'DRAFT' || v.status === 'PENDING_REVIEW').length;
    const hidden = videos.filter(v => v.status === 'HIDDEN').length;

    const openReports = reportsSnap.docs.map(d => d.data()).filter(r => r.status === 'OPEN').length;
    const totalUsers = usersSnap.size;

    res.json({
      totalVideos: videos.length,
      publishedVideos: published,
      pendingVideos: drafts,
      hiddenVideos: hidden,
      openReports,
      totalUsers,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'METRICS_ERROR', message: 'Error al consultar métricas del sistema' } });
  }
});

export default router;
