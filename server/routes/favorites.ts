import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();

// Apply auth middleware to all favorite routes
router.use(authenticateUser);

// GET /api/favorites
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const db = getAdminFirestore();

    const favSnapshot = await db.collection('users').doc(userId).collection('favorites').get();
    const videoIds = favSnapshot.docs.map(doc => doc.data().videoId).filter(Boolean);

    if (videoIds.length === 0) {
      return res.json([]);
    }

    // Fetch videos in chunks (Firestore in Query supports up to 30)
    const videos: any[] = [];
    const chunks = [];
    for (let i = 0; i < videoIds.length; i += 10) {
      chunks.push(videoIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const snap = await db.collection('videos').where('__name__', 'in', chunk).get();
      snap.docs.forEach(doc => {
        if (doc.data().status === 'PUBLISHED') {
          videos.push({ id: doc.id, ...doc.data() });
        }
      });
    }

    res.json(videos);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'FAVORITES_ERROR', message: 'Error al obtener tus videos favoritos' } });
  }
});

// GET /api/favorites/check/:videoId
router.get('/check/:videoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const videoId = req.params.videoId;
    const db = getAdminFirestore();

    const doc = await db.collection('users').doc(userId).collection('favorites').doc(videoId).get();
    res.json({ isFavorite: doc.exists });
  } catch (error: any) {
    res.json({ isFavorite: false });
  }
});

// POST /api/favorites/:videoId
router.post('/:videoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const videoId = req.params.videoId;
    const db = getAdminFirestore();

    const favRef = db.collection('users').doc(userId).collection('favorites').doc(videoId);
    await favRef.set({
      id: videoId,
      userId,
      videoId,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, isFavorite: true });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'FAVORITE_ADD_ERROR', message: 'Error al agregar a favoritos' } });
  }
});

// DELETE /api/favorites/:videoId
router.delete('/:videoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const videoId = req.params.videoId;
    const db = getAdminFirestore();

    const favRef = db.collection('users').doc(userId).collection('favorites').doc(videoId);
    await favRef.delete();

    res.json({ success: true, isFavorite: false });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'FAVORITE_REMOVE_ERROR', message: 'Error al eliminar de favoritos' } });
  }
});

export default router;
