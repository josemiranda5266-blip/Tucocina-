import { ContentVerticalId, getContentVertical } from './verticals';

export interface ContentDetectionResult {
  verticalId: ContentVerticalId;
  isRelevant: boolean;
  matchedTerms: string[];
  matchedExclusions: string[];
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Terms that strongly identify the other vertical. They prevent generic
 * words such as "cómo hacer" or "paso a paso" from causing cross-vertical
 * matches.
 */
const CROSS_VERTICAL_EXCLUSIONS: Record<ContentVerticalId, string[]> = {
  COCINA: [
    'tomacorriente', 'enchufe', 'disyuntor', 'cableado', 'tablero electrico',
    'canilla', 'plomeria', 'plomero', 'cañeria', 'soldadura', 'soldar',
    'electrodo', 'albañil', 'ladrillo', 'cemento', 'revoque', 'carpinteria',
    'carpintero', 'mecanico', 'motor', 'freno', 'embrague', 'compresor',
    'aire acondicionado',
  ],
  OFICIOS: [
    'receta', 'ingredientes', 'torta', 'pastel', 'postre', 'pizza', 'empanada',
    'ensalada', 'salsa', 'desayuno', 'almuerzo', 'cena', 'panaderia',
    'pasteleria', 'asado', 'guiso', 'sopa', 'chef', 'gastronomia',
  ],
};

export function detectContentVertical(
  input: { title: string; description?: string; creatorName?: string },
  verticalId: ContentVerticalId,
): ContentDetectionResult {
  const vertical = getContentVertical(verticalId);
  const text = normalize(`${input.title} ${input.description || ''} ${input.creatorName || ''}`);

  const matchedTerms = vertical.positiveTerms.filter((term) => text.includes(normalize(term)));
  const matchedExclusions = [
    ...vertical.exclusionTerms.filter((term) => text.includes(normalize(term))),
    ...CROSS_VERTICAL_EXCLUSIONS[verticalId].filter((term) => text.includes(normalize(term))),
  ];

  // An explicit exclusion always wins. This is important because both
  // verticals intentionally share generic instructional terms.
  const isRelevant = matchedTerms.length > 0 && matchedExclusions.length === 0;

  return { verticalId, isRelevant, matchedTerms, matchedExclusions };
}
