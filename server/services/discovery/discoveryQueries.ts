/**
 * Centralized list of culinary discovery queries.
 * Designed for targeted Spanish & Latin American cooking content discovery.
 */

export const DISCOVERY_QUERIES: string[] = [
  'recetas fáciles',
  'recetas argentinas',
  'cocina argentina',
  'cómo hacer empanadas',
  'cómo hacer pizza',
  'recetas de pollo',
  'recetas de carne',
  'recetas de pasta',
  'recetas fáciles y rápidas',
  'postres fáciles',
  'tortas fáciles',
  'pan casero',
  'cocina casera',
  'recetas tradicionales',
  'comida casera',
  'asado criollo paso a paso',
  'locro criollo tradicional',
  'comida saludable fácil',
];

/**
 * Returns a subset of queries to preserve YouTube API quota while keeping search varied.
 */
export function getRotationQueries(count: number = 3): string[] {
  const shuffled = [...DISCOVERY_QUERIES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, DISCOVERY_QUERIES.length));
}
