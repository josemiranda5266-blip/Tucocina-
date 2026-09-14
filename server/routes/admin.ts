import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { ImportVideoSchema, UpdateVideoSchema } from '../validators/video';
import {
  discoveryQuerySchema,
  discoverySingleImportSchema,
  discoveryBatchImportSchema,
} from '../validators/discovery';
import { createDiscoveryRateLimiter } from '../middleware/discoveryRateLimit';
import { processExternalVideoUrl } from '../services/connectors';
import { classifyVideo } from '../services/videoClassification';
import { importVideosInBulk } from '../services/bulkVideoImport';
import { YouTubeDiscoveryProvider } from '../services/discovery';
import { purgeOriginDeletedVideos } from '../services/originCheck';
import { dbStore, StoredVideo } from '../data/store';

const router = Router();
const MAX_PAGE_SIZE = 50;
const youtubeDiscoveryProvider = new YouTubeDiscoveryProvider();
const discoveryLimiter = createDiscoveryRateLimiter(60000, 15);

router.use(authenticateUser);
router.use(requireAdmin);

function parseLimit(value: unknown, fallback = 20): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(MAX_PAGE_SIZE, Math.max(1, parsed)) : fallback;
}

const ReportStatusSchema = z.object({ status: z.enum(['OPEN', 'REVIEWED', 'RESOLVED', 'REJECTED']) });
const BulkImportSchema = z.object({ urls: z.array(z.string().url()).min(1).max(25) });

router.post('/videos/import', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      url,
      title: customTitle,
      description: customDescription,
      thumbnailUrl: customThumbnail,
      creatorName: customCreator,
      categoryId: customCategoryId,
      tags: customTags,
    } = ImportVideoSchema.parse(req.body);
    const extracted = await processExternalVideoUrl(url);
    const classification = classifyVideo({
      title: customTitle || extracted.title,
      description: customDescription || extracted.description,
      creatorName: customCreator || extracted.creatorName,
    });

    const existing = dbStore.findDuplicate(extracted.platform, extracted.platformVideoId);
    const videoId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const newVideo: StoredVideo = {
      id: videoId,
      title: (customTitle && customTitle.trim()) ? customTitle.trim() : extracted.title,
      description: (customDescription && customDescription.trim()) ? customDescription.trim() : extracted.description,
      originalUrl: extracted.originalUrl,
      embedUrl: extracted.embedUrl,
      platform: extracted.platform,
      platformVideoId: extracted.platformVideoId,
      thumbnailUrl: (customThumbnail && customThumbnail.trim()) ? customThumbnail.trim() : extracted.thumbnailUrl,
      creatorName: (customCreator && customCreator.trim()) ? customCreator.trim() : extracted.creatorName,
      creatorUrl: extracted.creatorUrl || '',
      durationSeconds: extracted.durationSeconds || 0,
      categoryId: customCategoryId || classification.categoryId || null,
      tags: (customTags && customTags.length > 0) ? customTags : classification.tags,
      status: existing ? 'DUPLICATE' : 'DRAFT',
      views: 0,
      createdAt: now,
      updatedAt: now,
    };

    dbStore.addVideo(newVideo);
    if (existing) {
      return res.status(201).json({ message: 'El video fue detectado como duplicado y guardado en la sección de Duplicados para revisión del administrador.', video: newVideo, isDuplicate: true });
    }
    return res.status(201).json({ message: 'Video importado con éxito como Borrador (DRAFT)', video: newVideo });
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'URL inválida' } });
    return res.status(400).json({ error: { code: 'IMPORT_FAILED', message: error.message || 'Error al procesar el video' } });
  }
});

router.post('/videos/import-bulk', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { urls } = BulkImportSchema.parse(req.body);
    const results = await importVideosInBulk(urls);
    return res.status(200).json({ results });
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Lista de URLs inválida' } });
    return res.status(400).json({ error: { code: 'BULK_IMPORT_FAILED', message: error.message || 'Error al importar videos' } });
  }
});

router.get('/videos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseLimit(req.query.limit);
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';

    const result = dbStore.getAllAdminVideos({
      status: status || undefined,
      cursor: cursor || undefined,
      limit,
    });

    return res.json(result);
  } catch {
    return res.status(500).json({ error: { code: 'ADMIN_FETCH_ERROR', message: 'Error al consultar catálogo administrativo' } });
  }
});

router.patch('/videos/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = req.params.id;
    const updates = UpdateVideoSchema.parse(req.body);
    const doc = dbStore.getVideoById(videoId);
    if (!doc) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });

    if (updates.status === 'PUBLISHED') {
      const merged = { ...doc, ...updates };
      const missing = ['title', 'originalUrl', 'embedUrl', 'platform'].filter((field) => !String((merged as any)[field] || '').trim());
      if (missing.length) return res.status(400).json({ error: { code: 'PUBLISH_REQUIRES_METADATA', message: `No se puede publicar: falta ${missing.join(', ')}` } });
    }

    const updated = dbStore.updateVideo(videoId, updates);
    return res.json({ message: 'Video actualizado correctamente', video: updated });
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'UPDATE_FAILED', message: error.message || 'Error al actualizar video' } });
  }
});

router.delete('/videos/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = dbStore.deleteVideo(req.params.id);
    if (!success) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Video no encontrado' } });
    return res.json({ message: 'Video eliminado correctamente' });
  } catch {
    return res.status(500).json({ error: { code: 'DELETE_FAILED', message: 'Error al eliminar el video' } });
  }
});

router.post('/videos/purge-duplicates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = dbStore.purgeDuplicates();
    return res.json({
      message: `Verificación completada: se identificaron y enviaron ${result.markedCount} videos a la sección de Duplicados para tu revisión.`,
      markedCount: result.markedCount,
      markedIds: result.markedIds,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'PURGE_DUPLICATES_FAILED', message: error?.message || 'Error al identificar duplicados' } });
  }
});

router.post('/videos/purge-origin-deleted', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await purgeOriginDeletedVideos();
    return res.json({
      message: `Verificación completada: se verificaron ${result.checkedCount} videos y se eliminaron ${result.deletedCount} removidos por el creador original.`,
      checkedCount: result.checkedCount,
      deletedCount: result.deletedCount,
      deletedVideos: result.deletedVideos,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'PURGE_ORIGIN_FAILED', message: error?.message || 'Error al verificar videos en plataforma de origen' } });
  }
});

router.get('/reports', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseLimit(req.query.limit);
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';

    const result = dbStore.getReports({
      status: status || undefined,
      cursor: cursor || undefined,
      limit,
    });

    return res.json(result);
  } catch {
    return res.status(500).json({ error: { code: 'REPORTS_FETCH_ERROR', message: 'Error al consultar reportes' } });
  }
});

router.patch('/reports/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = ReportStatusSchema.parse(req.body);
    const success = dbStore.updateReport(req.params.id, status);
    if (!success) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Reporte no encontrado' } });
    return res.json({ message: 'Estado de reporte actualizado' });
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'REPORT_UPDATE_ERROR', message: error.message || 'Estado inválido' } });
  }
});

router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = dbStore.getMetrics();
    return res.json(metrics);
  } catch {
    return res.status(500).json({ error: { code: 'METRICS_ERROR', message: 'Error al consultar métricas del sistema' } });
  }
});

/**
 * GET /api/admin/discovery/youtube
 * Search YouTube for cooking video candidates matching strict quality & view metrics.
 */
router.get('/discovery/youtube', discoveryLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!youtubeDiscoveryProvider.isConfigured()) {
      return res.status(200).json({
        isConfigured: false,
        message: 'Clave YOUTUBE_API_KEY no configurada en las variables de entorno del servidor.',
        candidates: [],
        totalFound: 0,
      });
    }

    const options = discoveryQuerySchema.parse(req.query);
    const result = await youtubeDiscoveryProvider.searchCandidates(options);

    return res.json({
      isConfigured: true,
      platform: result.platform,
      query: result.query,
      totalFound: result.totalFound,
      candidates: result.candidates,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Parámetros de búsqueda no válidos' },
      });
    }
    return res.status(500).json({
      error: { code: 'DISCOVERY_SEARCH_FAILED', message: error.message || 'Error al ejecutar búsqueda en YouTube API' },
    });
  }
});

/**
 * POST /api/admin/discovery/import
 * Import a discovered video candidate as DRAFT.
 */
router.post('/discovery/import', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId, categoryId: customCategoryId, tags: customTags } = discoverySingleImportSchema.parse(req.body);

    const safeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const extracted = await processExternalVideoUrl(safeUrl);

    const existing = dbStore.findDuplicate(extracted.platform, extracted.platformVideoId);
    const classification = classifyVideo({
      title: extracted.title,
      description: extracted.description,
      creatorName: extracted.creatorName,
    });

    const newVideoId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const newVideo: StoredVideo = {
      id: newVideoId,
      title: extracted.title,
      description: extracted.description,
      originalUrl: extracted.originalUrl,
      embedUrl: extracted.embedUrl,
      platform: extracted.platform,
      platformVideoId: extracted.platformVideoId,
      thumbnailUrl: extracted.thumbnailUrl,
      creatorName: extracted.creatorName,
      creatorUrl: extracted.creatorUrl || '',
      durationSeconds: extracted.durationSeconds || 0,
      categoryId: customCategoryId || classification.categoryId || null,
      tags: customTags && customTags.length > 0 ? customTags : classification.tags,
      status: existing ? 'DUPLICATE' : 'DRAFT',
      views: 0,
      createdAt: now,
      updatedAt: now,
    };

    dbStore.addVideo(newVideo);

    if (existing) {
      return res.status(201).json({
        message: 'Video detectado como duplicado y enviado a la sección de Duplicados para revisión del administrador.',
        video: newVideo,
        isDuplicate: true,
      });
    }

    return res.status(201).json({
      message: 'Candidato importado correctamente en estado Borrador (DRAFT)',
      video: newVideo,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'ID de video inválido' },
      });
    }
    return res.status(400).json({
      error: { code: 'DISCOVERY_IMPORT_FAILED', message: error.message || 'Error al importar video candidato' },
    });
  }
});

/**
 * POST /api/admin/discovery/import-batch
 * Batch import selected candidate videos as DRAFT.
 */
router.post('/discovery/import-batch', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = discoveryBatchImportSchema.parse(req.body);

    const results: Array<{
      videoId: string;
      status: 'IMPORTED' | 'DUPLICATE' | 'FAILED';
      importedVideoId?: string;
      title?: string;
      error?: string;
    }> = [];

    for (const item of items) {
      try {
        const safeUrl = `https://www.youtube.com/watch?v=${item.videoId}`;
        const extracted = await processExternalVideoUrl(safeUrl);

        const existing = dbStore.findDuplicate(extracted.platform, extracted.platformVideoId);
        const classification = classifyVideo({
          title: extracted.title,
          description: extracted.description,
          creatorName: extracted.creatorName,
        });

        const newVideoId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();

        const newVideo: StoredVideo = {
          id: newVideoId,
          title: extracted.title,
          description: extracted.description,
          originalUrl: extracted.originalUrl,
          embedUrl: extracted.embedUrl,
          platform: extracted.platform,
          platformVideoId: extracted.platformVideoId,
          thumbnailUrl: extracted.thumbnailUrl,
          creatorName: extracted.creatorName,
          creatorUrl: extracted.creatorUrl || '',
          durationSeconds: extracted.durationSeconds || 0,
          categoryId: item.categoryId || classification.categoryId || null,
          tags: item.tags && item.tags.length > 0 ? item.tags : classification.tags,
          status: existing ? 'DUPLICATE' : 'DRAFT',
          views: 0,
          createdAt: now,
          updatedAt: now,
        };

        dbStore.addVideo(newVideo);

        if (existing) {
          results.push({
            videoId: item.videoId,
            status: 'DUPLICATE',
            importedVideoId: newVideo.id,
            title: newVideo.title,
          });
          continue;
        }

        results.push({
          videoId: item.videoId,
          status: 'IMPORTED',
          importedVideoId: newVideo.id,
          title: newVideo.title,
        });
      } catch (itemErr: any) {
        results.push({
          videoId: item.videoId,
          status: 'FAILED',
          error: itemErr?.message || 'Error al procesar el candidato',
        });
      }
    }

    const importedCount = results.filter((r) => r.status === 'IMPORTED').length;
    const duplicateCount = results.filter((r) => r.status === 'DUPLICATE').length;
    const failedCount = results.filter((r) => r.status === 'FAILED').length;

    return res.json({
      message: `Proceso completado: ${importedCount} importados, ${duplicateCount} duplicados, ${failedCount} fallidos.`,
      importedCount,
      duplicateCount,
      failedCount,
      results,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Lote de importación inválido' },
      });
    }
    return res.status(400).json({
      error: { code: 'DISCOVERY_BATCH_FAILED', message: error.message || 'Error al ejecutar importación en lote' },
    });
  }
});

export default router;

