import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { ReportVideoSchema } from '../validators/video';
import { dbStore, StoredReport } from '../data/store';

const router = Router();
const reportLimiter = createRateLimiter(15 * 60 * 1000, 5);

// POST /api/reports
router.post('/', authenticateUser, reportLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = ReportVideoSchema.parse(req.body);
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });
    }

    const video = dbStore.getVideoById(validated.videoId);
    if (!video || video.status !== 'PUBLISHED') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    }

    const reportData: StoredReport = {
      id: `rep-${randomUUID()}`,
      videoId: validated.videoId,
      userId,
      userEmail: req.user?.email || '',
      reason: validated.reason,
      description: validated.description,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    dbStore.addReport(reportData);
    return res.status(201).json({
      message: 'Reporte recibido. Un administrador lo revisará a la brevedad.',
      reportId: reportData.id,
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Datos de reporte inválidos' } });
    }
    console.error('[Reports] Error creando reporte:', error);
    return res.status(500).json({ error: { code: 'REPORT_ERROR', message: 'Error al enviar el reporte' } });
  }
});

export default router;
