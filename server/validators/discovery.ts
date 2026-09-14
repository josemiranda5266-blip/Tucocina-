import { z } from 'zod';

export const discoveryQuerySchema = z.object({
  query: z.string().trim().max(100, 'Término de búsqueda demasiado largo (máx. 100 caracteres)').optional(),
  limit: z.coerce.number().int().min(1).max(30).default(15),
  minViews: z.coerce.number().int().min(0).max(100000000).default(5000),
  sortBy: z.enum(['relevance', 'views', 'score', 'date']).default('score'),
});

export const discoverySingleImportSchema = z.object({
  videoId: z.string().trim().regex(/^[a-zA-Z0-9_-]{11}$/, 'ID de video de YouTube inválido'),
  platform: z.literal('YOUTUBE').default('YOUTUBE'),
  categoryId: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim()).max(10).optional(),
});

export const discoveryBatchImportSchema = z.object({
  items: z.array(
    z.object({
      videoId: z.string().trim().regex(/^[a-zA-Z0-9_-]{11}$/, 'ID de video de YouTube inválido'),
      categoryId: z.string().trim().optional().nullable(),
      tags: z.array(z.string().trim()).max(10).optional(),
    })
  ).min(1, 'Debe proporcionar al menos un video para importar').max(25, 'Máximo 25 videos por lote'),
});

export type DiscoveryQueryInput = z.infer<typeof discoveryQuerySchema>;
export type DiscoverySingleImportInput = z.infer<typeof discoverySingleImportSchema>;
export type DiscoveryBatchImportInput = z.infer<typeof discoveryBatchImportSchema>;
