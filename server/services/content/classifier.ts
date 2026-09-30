import { ContentVerticalId, getContentVertical } from './verticals';

export interface GenericClassification {
  verticalId: ContentVerticalId;
  verticalName: string;
  categoryId?: string;
  categoryName?: string;
  tags: string[];
  matchedTerms: string[];
  confidence: number;
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

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

export function classifyContent(
  input: { title?: string; description?: string; creatorName?: string },
  verticalId: ContentVerticalId,
): GenericClassification {
  const vertical = getContentVertical(verticalId);
  const text = normalize([input.title, input.description, input.creatorName].filter(Boolean).join(' '));

  const matchedTerms = vertical.positiveTerms.filter((term) => text.includes(normalize(term)));
  const excludedTerms = [
    ...vertical.exclusionTerms.filter((term) => text.includes(normalize(term))),
    ...CROSS_VERTICAL_EXCLUSIONS[verticalId].filter((term) => text.includes(normalize(term))),
  ];

  const isExcluded = excludedTerms.length > 0;
  const matchedCategory = isExcluded
    ? undefined
    : vertical.categoryRules.find((rule) => rule.terms.some((term) => text.includes(normalize(term))));
  const tags = isExcluded
    ? []
    : vertical.tagTerms.filter((tag) => text.includes(normalize(tag))).slice(0, 8);
  const confidence = isExcluded
    ? 0
    : Number(Math.min(1, matchedTerms.length / 4).toFixed(2));

  return {
    verticalId,
    verticalName: vertical.name,
    categoryId: matchedCategory?.id,
    categoryName: matchedCategory?.name,
    tags,
    matchedTerms,
    confidence,
  };
}
