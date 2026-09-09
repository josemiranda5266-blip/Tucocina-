import { z } from 'zod';

export const ImportVideoSchema = z.object({
  url: z.string().url('URL inválida').min(10, 'URL demasiado corta').max(1000, 'URL demasiado larga'),
});

export const UpdateVideoSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres').max(200, 'Título demasiado largo').optional(),
  description: z.string().max(2000, 'Descripción demasiado larga').optional(),
  categoryId: z.string().min(1, 'Categoría requerida').optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'REJECTED']).optional(),
  creatorName: z.string().max(100).optional(),
  creatorUrl: z.string().url().or(z.literal('')).optional(),
});

export const ReportVideoSchema = z.object({
  videoId: z.string().min(1, 'ID de video requerido'),
  reason: z.enum(['BROKEN_LINK', 'INCORRECT_CONTENT', 'OFFENSIVE_CONTENT', 'DUPLICATE', 'OTHER']),
  description: z.string().min(5, 'Por favor proveé más detalles').max(1000, 'Descripción demasiado larga'),
});
