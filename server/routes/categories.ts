import { Router, Request, Response } from 'express';
import { getAdminFirestore } from '../auth/firebaseAdmin';
import { INITIAL_CATEGORIES } from '../../src/domain/categories';

const router = Router();

// GET /api/categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection('categories').orderBy('order', 'asc').get();

    if (snapshot.empty) {
      // Seed default categories if collection is empty
      const batch = db.batch();
      INITIAL_CATEGORIES.forEach(cat => {
        const ref = db.collection('categories').doc(cat.id);
        batch.set(ref, cat);
      });
      await batch.commit();
      return res.json(INITIAL_CATEGORIES);
    }

    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(categories);
  } catch (error: any) {
    // Return initial local categories list if Firestore is uninitialized
    res.json(INITIAL_CATEGORIES);
  }
});

export default router;
