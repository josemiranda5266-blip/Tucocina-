export interface VideoClassification {
  categoryId?: string;
  tags: string[];
}

/** Cheap deterministic classifier. Only emits IDs that exist in the catalog. */
const RULES: Array<{ id: string; words: string[] }> = [
  { id: 'cat-carnes', words: ['carne', 'asado', 'bife', 'costilla', 'milanesa', 'hamburguesa', 'cerdo', 'cordero'] },
  { id: 'cat-pollo', words: ['pollo', 'pechuga', 'alitas', 'alita'] },
  { id: 'cat-pastas', words: ['pasta', 'fideos', 'spaghetti', 'espagueti', 'ravioles', 'ñoquis', 'gnocchi', 'lasagna', 'lasaña'] },
  { id: 'cat-panaderia', words: ['pan', 'pan casero', 'panadería', 'panaderia', 'factura', 'medialuna', 'croissant', 'masa'] },
  { id: 'cat-postres', words: ['torta', 'pastel', 'budín', 'budin', 'flan', 'helado', 'galleta', 'cookie', 'brownie', 'postre', 'cheesecake'] },
  { id: 'cat-ensaladas', words: ['ensalada', 'ensaladas'] },
  { id: 'cat-salsas', words: ['salsa', 'salsas', 'mayonesa', 'chimichurri', 'pesto'] },
  { id: 'cat-desayunos', words: ['desayuno', 'desayunos', 'tostadas', 'omelette'] },
  { id: 'cat-comida-rapida', words: ['pizza', 'pizzeta', 'hot dog', 'papas fritas', 'comida rápida', 'comida rapida'] },
  { id: 'cat-saludable', words: ['vegetariano', 'vegetariana', 'vegano', 'vegana', 'verduras', 'vegetales', 'saludable'] },
  { id: 'cat-argentina', words: ['empanada', 'empanadas', 'mate', 'locro', 'choripan', 'chimichurri', 'criolla', 'argentino', 'argentina'] },
  { id: 'cat-internacional', words: ['sushi', 'ramen', 'tacos', 'curry', 'paella', 'wok'] },
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
