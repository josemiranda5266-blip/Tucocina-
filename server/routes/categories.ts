import { Router, Request, Response } from 'express';
import { getAdminFirestore } from '../auth/firebaseAdmin';
import { INITIAL_CATEGORIES } from '../../src/domain/categories';
import { CURRENT_SITE_ID } from '../config/site';
import type { Category } from '../../src/types';

const router = Router();

const OFIGOOD_CATEGORIES: Category[] = [
  { id: 'of-cat-electricidad', name: 'Electricidad', slug: 'electricidad', description: 'Instalaciones, reparaciones y técnicas de electricidad.', icon: 'Zap', order: 1 },
  { id: 'of-cat-plomeria', name: 'Plomería', slug: 'plomeria', description: 'Instalaciones, reparaciones y mantenimiento de agua y desagües.', icon: 'Wrench', order: 2 },
  { id: 'of-cat-carpinteria', name: 'Carpintería', slug: 'carpinteria', description: 'Herramientas, técnicas y proyectos de carpintería.', icon: 'Hammer', order: 3 },
  { id: 'of-cat-mecanica', name: 'Mecánica', slug: 'mecanica', description: 'Mantenimiento, reparación y diagnóstico mecánico.', icon: 'Cog', order: 4 },
  { id: 'of-cat-construccion', name: 'Construcción', slug: 'construccion', description: 'Técnicas y conocimientos prácticos de construcción.', icon: 'HardHat', order: 5 },
  { id: 'of-cat-herreria', name: 'Herrería', slug: 'herreria', description: 'Soldadura, estructuras y trabajos de herrería.', icon: 'Anvil', order: 6 },
  { id: 'of-cat-tecnologia', name: 'Tecnología', slug: 'tecnologia', description: 'Tecnología, informática y herramientas digitales.', icon: 'Monitor', order: 7 },
  { id: 'of-cat-cursos', name: 'Cursos y habilidades', slug: 'cursos-habilidades', description: 'Cursos prácticos y aprendizaje de nuevas habilidades.', icon: 'GraduationCap', order: 8 },
];

function categoriesForSite(): Category[] {
  return CURRENT_SITE_ID === 'OFIGOOD' ? OFIGOOD_CATEGORIES : INITIAL_CATEGORIES;
}

// GET /api/categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection('categories')
      .where('siteId', '==', CURRENT_SITE_ID)
      .orderBy('order', 'asc')
      .get();

    if (!snapshot.empty) {
      return res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }

    const fallback = categoriesForSite();

    // Keep legacy CociFlash categories untouched. Ofigood gets an isolated
    // in-memory catalog until its public site is activated.
    if (CURRENT_SITE_ID === 'COCIFLASH') {
      const legacySnapshot = await db.collection('categories').orderBy('order', 'asc').get();
      if (!legacySnapshot.empty) {
        return res.json(legacySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }

      const batch = db.batch();
      fallback.forEach(cat => batch.set(db.collection('categories').doc(cat.id), { ...cat, siteId: CURRENT_SITE_ID }));
      await batch.commit();
    }

    return res.json(fallback);
  } catch {
    return res.json(categoriesForSite());
  }
});

export default router;
