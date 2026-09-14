/**
 * Cooking Candidate Detector
 * Evaluates whether video metadata indicates culinary / recipe / cooking content.
 */

export const POSITIVE_COOKING_TERMS = [
  'receta', 'recetas', 'cocina', 'cocinar', 'cocinando', 'cocinero', 'cocinera',
  'ingredientes', 'preparar', 'preparación', 'elaboración', 'paso a paso',
  'cómo hacer', 'como hacer', 'pollo', 'carne', 'pasta', 'pizza', 'empanada', 'empanadas',
  'torta', 'tortas', 'postre', 'postres', 'pan', 'panadería', 'pastelería', 'asado',
  'guiso', 'sopa', 'salsa', 'ensalada', 'sándwich', 'almuerzo', 'cena', 'desayuno',
  'merienda', 'bizcochuelo', 'galletitas', 'arroz', 'papas', 'pescado', 'mariscos',
  'comida', 'gastronomía', 'chef', 'gourmet', 'casero', 'casera', 'sabroso', 'sabrosa',
  'delicioso', 'deliciosa', 'dulce', 'salado', 'horno', 'sartén', 'air fryer', 'freidora',
];

export const EXCLUSION_TERMS = [
  'música', 'musica', 'official music video', 'official video', 'videoclip', 'song',
  'canción', 'album', 'remix', 'cover', 'trailer', 'película', 'pelicula', 'movie',
  'gameplay', 'gaming', 'fortnite', 'minecraft', 'roblox', 'noticias', 'noticia',
  'news', 'política', 'politica', 'fútbol', 'futbol', 'highlights', 'resumen del partido',
  'unboxing', 'reaction', 'reacción', 'parodia', 'skit', 'vlog diario', 'draw my life',
];

export interface CookingDetectionResult {
  isCooking: boolean;
  matchedTerms: string[];
  matchedExclusions: string[];
}

export function isCookingCandidate(
  title: string,
  description: string = '',
  channelTitle: string = ''
): CookingDetectionResult {
  const text = `${title} ${description} ${channelTitle}`.toLowerCase();

  const matchedTerms: string[] = [];
  const matchedExclusions: string[] = [];

  for (const term of POSITIVE_COOKING_TERMS) {
    if (text.includes(term)) {
      matchedTerms.push(term);
    }
  }

  for (const exclusion of EXCLUSION_TERMS) {
    if (text.includes(exclusion)) {
      matchedExclusions.push(exclusion);
    }
  }

  // Strong exclusion check: if multiple exclusion terms match and zero positive terms
  if (matchedExclusions.length >= 2 && matchedTerms.length === 0) {
    return { isCooking: false, matchedTerms, matchedExclusions };
  }

  // If title or description has culinary terms, or channel indicates gastronomy
  const isCooking = matchedTerms.length > 0 || /cocina|receta|chef|gourmet|food|cooking/i.test(channelTitle);

  return {
    isCooking,
    matchedTerms,
    matchedExclusions,
  };
}
