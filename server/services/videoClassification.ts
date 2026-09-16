export interface VideoClassification {
  categoryId?: string;
  tags: string[];
}

type Rule = {
  id: string;
  strong: string[];
  normal: string[];
};

/**
 * Deterministic classifier designed to prefer specific recipe terms over
 * ambiguous words. Title evidence is weighted more heavily by the scorer.
 */
const RULES: Rule[] = [
  {
    id: 'cat-postres',
    strong: [
      'alfajor', 'alfajores', 'pastafrola', 'chocolate', 'dulce de leche',
      'bombon', 'bombones', 'trufa', 'trufas', 'mousse', 'macaron', 'macarons',
      'brownie', 'cheesecake', 'flan', 'helado', 'helados', 'tiramisu',
      'tiramisu', 'cupcake', 'cupcakes', 'donut', 'donuts', 'rosquilla',
    ],
    normal: [
      'torta', 'tortas', 'pastel', 'pasteles', 'tarta', 'tartas', 'budin',
      'galleta', 'galletas', 'cookie', 'cookies', 'postre', 'postres',
      'merengue', 'pudin', 'pudding', 'carrot cake', 'bizcochuelo',
    ],
  },
  {
    id: 'cat-pastas',
    strong: [
      'spaghetti', 'espagueti', 'ravioles', 'ravioli', 'noquis', 'gnocchi',
      'lasagna', 'lasaña', 'macarrones', 'macaroni', 'penne', 'tallarines',
      'fideos', 'fetuchini', 'fettuccine', 'canelones', 'canelon',
    ],
    normal: ['pasta', 'pastas', 'pasta casera'],
  },
  {
    id: 'cat-carnes',
    strong: ['asado', 'bife', 'costilla', 'milanesa', 'hamburguesa', 'cerdo', 'cordero'],
    normal: ['carne', 'carnes', 'vacuno', 'ternera', 'parrilla'],
  },
  {
    id: 'cat-pollo',
    strong: ['pechuga', 'alitas', 'alita', 'pollo frito'],
    normal: ['pollo', 'pollito'],
  },
  {
    id: 'cat-panaderia',
    strong: ['pan casero', 'pan de masa madre', 'medialuna', 'medialunas', 'croissant', 'croissants'],
    normal: ['pan', 'panes', 'factura', 'facturas', 'panaderia', 'bolleria', 'brioche'],
  },
  {
    id: 'cat-ensaladas',
    strong: ['ensalada', 'ensaladas', 'ensalada cesar'],
    normal: ['ensalada rusa', 'ensalada fresca'],
  },
  {
    id: 'cat-salsas',
    strong: ['mayonesa', 'chimichurri', 'pesto', 'bechamel', 'salsa de tomate'],
    normal: ['salsa', 'salsas'],
  },
  {
    id: 'cat-desayunos',
    strong: ['desayuno', 'desayunos', 'tostadas', 'omelette'],
    normal: ['brunch', 'merienda'],
  },
  {
    id: 'cat-comida-rapida',
    strong: ['pizza', 'pizzeta', 'hot dog', 'papas fritas', 'comida rapida'],
    normal: ['hamburguesa', 'nuggets', 'sandwich', 'sandwiches'],
  },
  {
    id: 'cat-saludable',
    strong: ['vegetariano', 'vegetariana', 'vegano', 'vegana', 'sin gluten'],
    normal: ['verduras', 'vegetales', 'saludable', 'saludables', 'integral'],
  },
  {
    id: 'cat-argentina',
    strong: ['empanada', 'empanadas', 'locro', 'choripan'],
    normal: ['mate', 'chimichurri', 'criolla', 'argentino', 'argentina'],
  },
  {
    id: 'cat-internacional',
    strong: ['sushi', 'ramen', 'tacos', 'curry', 'paella'],
    normal: ['wok', 'teriyaki', 'risotto'],
  },
];

const TAG_WORDS = [
  'facil', 'fácil', 'rapido', 'rápido', 'casero', 'casera', 'economico', 'económico',
  'sin horno', 'horno', 'air fryer', 'freidora de aire', 'sin gluten', 'saludable',
  'vegetariano', 'vegetariana', 'vegano', 'vegana', 'desayuno', 'almuerzo', 'cena',
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsTerm(text: string, term: string): boolean {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;
  return ` ${text} `.includes(` ${normalizedTerm} `);
}

function scoreRule(rule: Rule, title: string, description: string): number {
  let score = 0;

  for (const term of rule.strong) {
    if (containsTerm(title, term)) score += 10;
    else if (containsTerm(description, term)) score += 4;
  }

  for (const term of rule.normal) {
    if (containsTerm(title, term)) score += 5;
    else if (containsTerm(description, term)) score += 2;
  }

  return score;
}

export function classifyVideo(input: { title?: string; description?: string; creatorName?: string }): VideoClassification {
  const title = normalize(input.title ?? '');
  const description = normalize(input.description ?? '');

  // Creator names are deliberately excluded from category classification:
  // a channel/person name is not reliable evidence of what the recipe is.
  const scored = RULES
    .map(rule => ({ id: rule.id, score: scoreRule(rule, title, description) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];

  // Do not guess when the evidence is weak or two categories are effectively tied.
  // A strong title term (10+) is sufficient on its own.
  const categoryId = best && (
    best.score >= 10 ||
    (best.score >= 5 && (!second || best.score >= second.score + 3))
  ) ? best.id : undefined;

  const combined = normalize([input.title, input.description].filter(Boolean).join(' '));
  const tags = TAG_WORDS
    .filter(tag => containsTerm(combined, tag))
    .slice(0, 8);

  return { categoryId, tags };
}
