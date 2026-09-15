import { Router, Response } from 'express';
import { DocumentReference } from 'firebase-admin/firestore';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();
router.use(authenticateUser);
router.use(requireAdmin);

function dateKey(offset: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

async function readCounts(parent: DocumentReference, collection: string) {
  const snap = await parent.collection(collection).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

router.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  const requestedDays = Number.parseInt(String(req.query.days ?? '7'), 10);
  const days = Math.min(90, Math.max(1, Number.isFinite(requestedDays) ? requestedDays : 7));
  try {
    const db = getAdminFirestore();
    const [videoSnapshot] = await Promise.all([db.collection('videos').get()]);
    const videoCatalog = new Map<string, { title: string; creatorName?: string; platform?: string }>();
    videoSnapshot.docs.forEach((doc) => {
      const data = doc.data() as { title?: string; creatorName?: string; platform?: string };
      videoCatalog.set(doc.id, { title: data.title || 'Video sin título', creatorName: data.creatorName, platform: data.platform });
    });

    const daily: Array<Record<string, any>> = [];
    let pageViews = 0, videoViews = 0, videoPlays = 0, searches = 0, favorites = 0, shares = 0, signUps = 0, logins = 0;
    const uniqueVisitors = new Map<string, { country: string; device: string }>();
    const uniqueSessions = new Set<string>();
    const videos = new Map<string, { id: string; title: string; creatorName?: string; platform?: string; count: number }>();
    const searchTerms = new Map<string, { query: string; count: number }>();

    // Iterate oldest -> newest so a returning visitor is counted once for the
    // selected period while their latest country/device attribution wins.
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = dateKey(offset);
      const doc = db.collection('analytics_daily').doc(date);
      const [eventRows, videoRows, searchRows, visitorSnap, sessionSnap] = await Promise.all([
        readCounts(doc, 'events'), readCounts(doc, 'videos'), readCounts(doc, 'searches'), doc.collection('visitors').get(), doc.collection('sessions').get(),
      ]);
      const eventMap = new Map(eventRows.map((row: any) => [row.id, Number(row.count || 0)]));
      const dayPageViews = eventMap.get('page_view') || 0;
      const dayVideoViews = eventMap.get('view_video') || 0;
      const daySearches = eventMap.get('search_performed') || 0;
      const dayFavorites = eventMap.get('favorite_add') || 0;
      pageViews += dayPageViews;
      videoViews += dayVideoViews;
      videoPlays += eventMap.get('video_play') || 0;
      searches += daySearches;
      favorites += dayFavorites;
      shares += eventMap.get('share_video') || 0;
      signUps += eventMap.get('sign_up') || 0;
      logins += eventMap.get('login') || 0;

      visitorSnap.docs.forEach((visitorDoc) => {
        const data = visitorDoc.data() as { country?: string; device?: string };
        uniqueVisitors.set(visitorDoc.id, { country: data.country || 'UNKNOWN', device: data.device || 'unknown' });
      });
      sessionSnap.docs.forEach((sessionDoc) => uniqueSessions.add(sessionDoc.id));

      for (const row of videoRows as any[]) {
        const catalog = videoCatalog.get(row.id);
        const previous = videos.get(row.id);
        videos.set(row.id, {
          id: row.id,
          title: catalog?.title || 'Video no encontrado',
          creatorName: catalog?.creatorName,
          platform: catalog?.platform,
          count: (previous?.count || 0) + Number(row.count || 0),
        });
      }
      for (const row of searchRows as any[]) {
        const previous = searchTerms.get(row.id);
        searchTerms.set(row.id, { query: row.query || row.id, count: (previous?.count || 0) + Number(row.count || 0) });
      }
      daily.push({ date, visitors: visitorSnap.size, sessions: sessionSnap.size, pageViews: dayPageViews, videoViews: dayVideoViews, searches: daySearches, favorites: dayFavorites });
    }

    const countries = new Map<string, number>();
    const devices = new Map<string, number>();
    for (const { country, device } of uniqueVisitors.values()) {
      countries.set(country, (countries.get(country) || 0) + 1);
      devices.set(device, (devices.get(device) || 0) + 1);
    }
    const sortMap = (map: Map<string, number>) => [...map.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count).slice(0, 10));

    return res.json({
      periodDays: days,
      totals: { visitors: uniqueVisitors.size, sessions: uniqueSessions.size, pageViews, videoViews, videoPlays, searches, favorites, shares, signUps, logins },
      daily,
      countries: sortMap(countries),
      devices: sortMap(devices),
      topVideos: [...videos.values()].sort((a, b) => b.count - a.count).slice(0, 10),
      topSearches: [...searchTerms.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    });
  } catch (error) {
    console.error('[admin analytics] Failed to read analytics:', error);
    return res.status(500).json({ error: { code: 'ANALYTICS_READ_FAILED', message: 'No se pudieron cargar las analíticas.' } });
  }
});

export default router;
