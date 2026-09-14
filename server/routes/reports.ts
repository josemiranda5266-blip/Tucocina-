import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { ReportVideoSchema } from '../validators/video';
import { dbStore, StoredReport } from '../data/store';

const router = Router();

// Rate limiter for reports (max 5 reports per 15 min window)
const reportLimiter = createRateLimiter(15 * 60 * 1000, 5);

// POST /api/reports
router.post('/', authenticateUser, reportLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = ReportVideoSchema.parse(req.body);
    const userId = req.user?.uid;
    const userEmail = req.user?.email || '';
    const reportId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const reportData: StoredReport = {
      id: reportId,
      videoId: validated.videoId,
      userId,
      userEmail,
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
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Datos de reporte inválidos' } });
    }
    return res.status(500).json({ error: { code: 'REPORT_ERROR', message: 'Error al enviar el reporte' } });
  }
});

export default router;
