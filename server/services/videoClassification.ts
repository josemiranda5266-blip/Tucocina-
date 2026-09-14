export interface VideoClassification {
  categoryId?: string;
  tags: string[];
}

/**
 * Cheap deterministic first-pass classifier. It never publishes content and
 * is intentionally conservative: uncertain videos remain uncategorized.
 */
const RULES: Array<{ id: string; words: string[] }> = [
  { id: 'cat-carnes', words: ['carne', 'asado', 'bife', 'costilla', 'milanesa', 'hamburguesa', 'cerdo', 'cordero'] },
  { id: 'cat-pollo', words: ['pollo', 'pechuga', 'alitas', 'alita'] },
  { id: 'cat-pastas', words: ['pasta', 'fideos', 'spaghetti', 'espagueti', 'ravioles', 'ñoquis', 'gnocchi', 'lasagna', 'lasaña'] },
  { id: 'cat-pizza', words: ['pizza', 'pizzeta'] },
  { id: 'cat-panificados', words: ['pan', 'pan casero', 'factura', 'medialuna', 'croissant', 'masa'] },
  { id: 'cat-postres', words: ['torta', 'pastel', 'budín', 'budin', 'flan', 'helado', 'galleta', 'cookie', 'brownie', 'postre', 'cheesecake'] },
  { id: 'cat-vegetariano', words: ['vegetariano', 'vegetariana', 'vegano', 'vegana', 'verduras', 'vegetales'] },
  { id: 'cat-ensaladas', words: ['ensalada', 'ensaladas'] },
  { id: 'cat-sopas', words: ['sopa', 'sopas', 'crema de verduras', 'caldo'] },
];

const TAG_WORDS = [
  'facil', 'fácil', 'rápido', 'rapido', 'casero', 'casera', 'económico', 'economico',
  'sin horno', 'horno', 'air fryer', 'freidora de aire', 'sin gluten', 'saludable',
  'vegetariano', 'vegetariana', 'vegano', 'vegana', 'desayuno', 'almuerzo', 'cena',
];

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function classifyVideo(input: { title?: string; description?: string; creatorName?: string }): VideoClassification {
  const text = normalize([input.title, input.description, input.creatorName].filter(Boolean).join(' '));
  const matched = RULES.find(rule => rule.words.some(word => text.includes(normalize(word))));
  const tags = TAG_WORDS.filter(tag => text.includes(normalize(tag))).slice(0, 8);
  return { categoryId: matched?.id, tags };
}
