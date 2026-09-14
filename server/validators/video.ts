import { z } from 'zod';

const sanitizeUrlInput = z.preprocess((val) => {
  if (typeof val !== 'string') return val;
  let cleaned = val.trim().replace(/^["']|["']$/g, '');
  if (cleaned && !/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}, z.string().url('URL inválida').min(8, 'URL demasiado corta').max(1000, 'URL demasiado larga'));

const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().max(2500).optional(),
);

const optionalCategoryId = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1, 'Categoría inválida').optional(),
);

export const ImportVideoSchema = z.object({
  url: sanitizeUrlInput,
  title: optionalString,
  description: optionalString,
  thumbnailUrl: optionalString,
  creatorName: optionalString,
  categoryId: optionalCategoryId,
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const UpdateVideoSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres').max(200, 'Título demasiado largo').optional(),
  description: z.string().max(2000, 'Descripción demasiado larga').optional(),
  categoryId: optionalCategoryId,
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'REJECTED', 'DUPLICATE']).optional(),
  creatorName: z.string().max(100).optional(),
  creatorUrl: z.string().url().or(z.literal('')).optional(),
  thumbnailUrl: z.string().url().or(z.literal('')).optional(),
});

export const ReportVideoSchema = z.object({
  videoId: z.string().min(1, 'ID de video requerido'),
  reason: z.enum(['BROKEN_LINK', 'INCORRECT_CONTENT', 'OFFENSIVE_CONTENT', 'DUPLICATE', 'OTHER']),
  description: z.string().min(5, 'Por favor proveé más detalles').max(1000, 'Descripción demasiado larga'),
});
