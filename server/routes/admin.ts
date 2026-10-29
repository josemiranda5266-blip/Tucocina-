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
import { getContentVertical, getInvalidTagsForVertical, isCategoryInVertical } from '../services/content/verticals';

const router = Router();
const MAX_PAGE_SIZE = 50;
const youtubeDiscoveryProvider = new YouTubeDiscoveryProvider();
const discoveryLimiter = createDiscoveryRateLimiter(60000, 15);
const aiAssistLimiter = createDiscoveryRateLimiter(60000, 5);

router.use(authenticateUser);
router.use(requireAdmin);

function parseLimit(value: unknown, fallback = 20): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(MAX_PAGE_SIZE, Math.max(1, parsed)) : fallback;
}

const ReportStatusSchema = z.object({ status: z.enum(['OPEN', 'REVIEWED', 'RESOLVED', 'REJECTED']) });
const BulkImportSchema = z.object({ urls: z.array(z.string().url()).min(1).max(25), verticalId: z.enum(['COCINA']).default('COCINA') });
const AiAssistSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10),
  verticalId: z.enum(['COCINA']).default('COCINA'),
});

function isVideoAiAssistEnabled(): boolean {
  return process.env.VIDEO_AI_IMPORT_ENABLED === 'true' && Boolean(process.env.GEMINI_API_KEY?.trim());
}

router.get('/videos/ai-assist/status', (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ enabled: isVideoAiAssistEnabled() });
});

router.post('/videos/ai-assist/suggest', aiAssistLimiter, async (req: AuthenticatedRequest, res: Response) => {
  if (!isVideoAiAssistEnabled()) {
    return res.status(503).json({ error: { code: 'AI_ASSIST_DISABLED', message: 'El asistente de IA está desactivado. Habilitalo temporalmente con VIDEO_AI_IMPORT_ENABLED=true y configurá GEMINI_API_KEY en el servidor.' } });
  }

  try {
    const { urls, verticalId } = AiAssistSchema.parse(req.body);
    const metadata = await Promise.all(urls.map(async (url) => {
      try {
        const extracted = await processExternalVideoUrl(url);
        return { ok: true as const, url, extracted };
      } catch (error: any) {
        return { ok: false as const, url, error: error?.message || 'No se pudieron extraer los datos del enlace.' };
      }
    }));

    const valid = metadata.filter((item): item is Extract<typeof metadata[number], { ok: true }> => item.ok);
    if (!valid.length) {
      return res.status(200).json({ suggestions: metadata.map(item => ({ url: item.url, error: item.ok ? undefined : item.error })) });
    }

    const input = valid.map((item, index) => ({
      index,
      url: item.url,
      title: item.extracted.title,
      description: item.extracted.description,
      creatorName: item.extracted.creatorName,
      platform: item.extracted.platform,
    }));
    const prompt = [
      'Sos un asistente editorial privado para el administrador de CociFlash. No publiques ni importes nada.',
      'A partir de los metadatos proporcionados, propone una ficha en español rioplatense. No inventes hechos específicos que no estén respaldados por el título o descripción.',
      'Devuelve SOLO JSON válido con la forma {"items":[{"index":0,"title":"...","description":"...","tags":["..."],"categoryHint":"..."}]}.',
      'El título debe ser claro y fiel al contenido; descripción breve; 3 a 6 etiquetas relevantes; categoryHint una categoría corta.',
      'Vertical elegida: ' + (verticalId === 'COCINA' ? 'Cocina y pastelería' : 'Cocina y pastelería') + '.',
      'Si el metadato es genérico o no permite saber el contenido, conserva un título prudente y acláralo brevemente en la descripción.',
      JSON.stringify(input),
    ].join('\n\n');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(process.env.GEMINI_API_KEY!.trim()), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('Video AI assist provider error:', response.status, detail.slice(0, 500));
      return res.status(502).json({ error: { code: 'AI_PROVIDER_ERROR', message: 'No se pudo obtener sugerencias de la IA. Probá nuevamente más tarde.' } });
    }

    const providerData: any = await response.json();
    const raw = providerData.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') || '';
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      return res.status(502).json({ error: { code: 'AI_INVALID_RESPONSE', message: 'La IA devolvió una respuesta que no se pudo interpretar. Probá nuevamente.' } });
    }
    const byIndex = new Map((Array.isArray(parsed.items) ? parsed.items : []).map((item: any) => [Number(item.index), item]));
    const suggestions = metadata.map((item, index) => {
      if (!item.ok) return { url: item.url, error: item.error };
      const suggestion: any = byIndex.get(valid.findIndex(v => v.url === item.url));
      const title = typeof suggestion?.title === 'string' ? suggestion.title.trim().slice(0, 180) : item.extracted.title;
      const description = typeof suggestion?.description === 'string' ? suggestion.description.trim().slice(0, 1500) : item.extracted.description;
      const rawTags = Array.isArray(suggestion?.tags) ? suggestion.tags.filter((tag: unknown): tag is string => typeof tag === 'string').map((tag: string) => tag.trim()).filter(Boolean).slice(0, 8) : [];
      const invalidSuggestedTags = new Set(getInvalidTagsForVertical(rawTags, verticalId));
      const tags = rawTags.filter((tag: string) => !invalidSuggestedTags.has(tag));
      const classification = classifyVideo({ title, description, creatorName: item.extracted.creatorName }, verticalId);
      return {
        url: item.url,
        title,
        description,
        creatorName: item.extracted.creatorName,
        thumbnailUrl: item.extracted.thumbnailUrl,
        platform: item.extracted.platform,
        verticalId,
        categoryId: classification.categoryId || getContentVertical(verticalId).categoryRules[0]?.id || null,
        categoryHint: typeof suggestion?.categoryHint === 'string' ? suggestion.categoryHint.slice(0, 100) : '',
        tags: tags.length ? tags : classification.tags,
      };
    });
    return res.json({ suggestions });
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Ingresá entre 1 y 10 URLs válidas.' } });
    console.error('Video AI assist failed:', error?.message || error);
    return res.status(500).json({ error: { code: 'AI_ASSIST_FAILED', message: 'Ocurrió un error preparando las sugerencias.' } });
  }
});


router.post('/videos/import', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      url,
      verticalId,
      title: customTitle,
      description: customDescription,
      thumbnailUrl: customThumbnail,
      creatorName: customCreator,
      categoryId: customCategoryId,
      tags: customTags,
    } = ImportVideoSchema.parse(req.body);
    const invalidTags = getInvalidTagsForVertical(customTags, verticalId);
    if (invalidTags.length) {
      return res.status(400).json({ error: { code: 'INVALID_TAGS_FOR_VERTICAL', message: `Las etiquetas no pertenecen a la vertical seleccionada: ${invalidTags.join(', ')}` } });
    }
    if (!isCategoryInVertical(customCategoryId, verticalId)) {
      return res.status(400).json({ error: { code: 'INVALID_CATEGORY_FOR_VERTICAL', message: 'La categoría no pertenece a la vertical seleccionada.' } });
    }
    const extracted = await processExternalVideoUrl(url);
    const classification = classifyVideo({
      title: customTitle || extracted.title,
      description: customDescription || extracted.description,
      creatorName: customCreator || extracted.creatorName,
    }, verticalId);

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
      verticalId,
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

    if (existing) {
      return res.status(200).json({
        message: 'El video ya existe en el catálogo y no se creó un segundo registro.',
        video: existing,
        isDuplicate: true,
      });
    }
    dbStore.addVideo(newVideo);
    return res.status(201).json({ message: 'Video importado con éxito como Borrador (DRAFT)', video: newVideo });
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'URL inválida' } });
    return res.status(400).json({ error: { code: 'IMPORT_FAILED', message: error.message || 'Error al procesar el video' } });
  }
});

router.post('/videos/import-bulk', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { urls, verticalId } = BulkImportSchema.parse(req.body);
    const results = await importVideosInBulk(urls, verticalId);
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

    const videoVertical = doc.verticalId || 'COCINA';
    const invalidTags = getInvalidTagsForVertical(updates.tags, videoVertical);
    if (invalidTags.length) {
      return res.status(400).json({ error: { code: 'INVALID_TAGS_FOR_VERTICAL', message: `Las etiquetas no pertenecen a la vertical del video: ${invalidTags.join(', ')}` } });
    }

    if (!isCategoryInVertical(updates.categoryId, videoVertical)) {
      return res.status(400).json({ error: { code: 'INVALID_CATEGORY_FOR_VERTICAL', message: 'La categoría no pertenece a la vertical del video.' } });
    }

    if (updates.status === 'PUBLISHED') {
      const merged = { ...doc, ...updates };
      const mergedVertical = merged.verticalId || 'COCINA';
      const mergedInvalidTags = getInvalidTagsForVertical(merged.tags, mergedVertical);
      if (mergedInvalidTags.length) {
        return res.status(400).json({ error: { code: 'INVALID_TAGS_FOR_VERTICAL', message: `No se puede publicar: hay etiquetas de otra vertical: ${mergedInvalidTags.join(', ')}` } });
      }
      if (!isCategoryInVertical(merged.categoryId, mergedVertical)) {
        return res.status(400).json({ error: { code: 'INVALID_CATEGORY_FOR_VERTICAL', message: 'No se puede publicar: la categoría no pertenece a la vertical del video.' } });
      }
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
 * Search YouTube for candidates in the selected content vertical.
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
    const { videoId, verticalId, categoryId: customCategoryId, tags: customTags } = discoverySingleImportSchema.parse(req.body);

    const invalidTags = getInvalidTagsForVertical(customTags, verticalId);
    if (invalidTags.length) {
      return res.status(400).json({ error: { code: 'INVALID_TAGS_FOR_VERTICAL', message: `Las etiquetas no pertenecen a la vertical seleccionada: ${invalidTags.join(', ')}` } });
    }
    if (!isCategoryInVertical(customCategoryId, verticalId)) {
      return res.status(400).json({ error: { code: 'INVALID_CATEGORY_FOR_VERTICAL', message: 'La categoría no pertenece a la vertical seleccionada.' } });
    }
    const safeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const extracted = await processExternalVideoUrl(safeUrl);

    const existing = dbStore.findDuplicate(extracted.platform, extracted.platformVideoId);
    const classification = classifyVideo({
      title: extracted.title,
      description: extracted.description,
      creatorName: extracted.creatorName,
    }, verticalId);

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
      verticalId,
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
        const invalidTags = getInvalidTagsForVertical(item.tags, item.verticalId);
        if (invalidTags.length) {
          throw new Error(`Las etiquetas no pertenecen a la vertical seleccionada: ${invalidTags.join(', ')}`);
        }
        if (!isCategoryInVertical(item.categoryId, item.verticalId)) {
          throw new Error('La categoría no pertenece a la vertical seleccionada.');
        }
        const safeUrl = `https://www.youtube.com/watch?v=${item.videoId}`;
        const extracted = await processExternalVideoUrl(safeUrl);

        const existing = dbStore.findDuplicate(extracted.platform, extracted.platformVideoId);
        const classification = classifyVideo({
          title: extracted.title,
          description: extracted.description,
          creatorName: extracted.creatorName,
        }, item.verticalId);

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
          verticalId: item.verticalId,
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

        if (existing) {
          results.push({
            videoId: item.videoId,
            status: 'DUPLICATE',
            importedVideoId: existing.id,
            title: existing.title,
          });
          continue;
        }
        dbStore.addVideo(newVideo);

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

