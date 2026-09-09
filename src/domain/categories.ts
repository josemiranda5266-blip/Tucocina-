import { Category } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-carnes', name: 'Carnes', slug: 'carnes', description: 'Recetas y técnicas para cocinar todo tipo de carnes', icon: 'Beef', order: 1 },
  { id: 'cat-pollo', name: 'Pollo', slug: 'pollo', description: 'Platos deliciosos y variados con pollo', icon: 'Drumstick', order: 2 },
  { id: 'cat-pastas', name: 'Pastas', slug: 'pastas', description: 'Pastas caseras, salsas y pastas rellenas', icon: 'Utensils', order: 3 },
  { id: 'cat-arroces', name: 'Arroces', slug: 'arroces', description: 'Paellas, risottos y guarniciones de arroz', icon: 'CookingPot', order: 4 },
  { id: 'cat-postres', name: 'Postres', slug: 'postres', description: 'Tortas, dulces, helados y repostería', icon: 'Cake', order: 5 },
  { id: 'cat-panaderia', name: 'Panadería', slug: 'panaderia', description: 'Masa madre, panes artesanales y facturas', icon: 'Croissant', order: 6 },
  { id: 'cat-desayunos', name: 'Desayunos', slug: 'desayunos', description: 'Opciones nutritivas y rápidas para empezar el día', icon: 'Coffee', order: 7 },
  { id: 'cat-ensaladas', name: 'Ensaladas', slug: 'ensaladas', description: 'Ensaladas frescas, aderezos y bowls', icon: 'Salad', order: 8 },
  { id: 'cat-salsas', name: 'Salsas', slug: 'salsas', description: 'Salsas clásicas, adobos y vinagretas', icon: 'Soup', order: 9 },
  { id: 'cat-comida-rapida', name: 'Comida rápida', slug: 'comida-rapida', description: 'Hamburguesas, pizzas, tacos y minutas', icon: 'Pizza', order: 10 },
  { id: 'cat-saludable', name: 'Cocina saludable', slug: 'cocina-saludable', description: 'Recetas balanceadas, vegetarianas y ligeras', icon: 'Apple', order: 11 },
  { id: 'cat-argentina', name: 'Cocina argentina', slug: 'cocina-argentina', description: 'Asados, empanadas, locro y clásicos criollos', icon: 'Flame', order: 12 },
  { id: 'cat-internacional', name: 'Internacional', slug: 'internacional', description: 'Sabores del mundo: sushi, tacos, curry y más', icon: 'Globe', order: 13 },
];
