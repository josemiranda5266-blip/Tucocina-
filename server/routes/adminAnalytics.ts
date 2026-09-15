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
    const videoSnapshot = await db.collection('videos').get();
    const videoCatalog = new Map<string, { title: string; creatorName?: string; platform?: string }>();

    videoSnapshot.docs.forEach((doc) => {
      const data = doc.data() as { title?: string; creatorName?: string; platform?: string };
      videoCatalog.set(doc.id, {
        title: data.title || 'Video sin título',
        creatorName: data.creatorName,
        platform: data.platform,
      });
    });

    const daily: Array<Record<string, any>> = [];
    let pageViews = 0;
    let videoViews = 0;
    let videoPlays = 0;
    let searches = 0;
    let searchResultClicks = 0;
    let searchNoResults = 0;
    let favorites = 0;
    let shares = 0;
    let signUps = 0;
    let logins = 0;
    let externalOpens = 0;

    const uniqueVisitors = new Map<string, { country: string; device: string }>();
    const uniqueSessions = new Set<string>();

    type VideoAggregate = {
      id: string;
      title: string;
      creatorName?: string;
      platform?: string;
      opens: number;
      plays: number;
      externalOpens: number;
      favorites: number;
      shares: number;
    };

    const videos = new Map<string, VideoAggregate>();
    const searchTerms = new Map<string, { query: string; count: number }>();

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = dateKey(offset);
      const doc = db.collection('analytics_daily').doc(date);

      const [eventRows, interactionRows, searchRows, visitorSnap, sessionSnap] = await Promise.all([
        readCounts(doc, 'events'),
        readCounts(doc, 'video_interactions'),
        readCounts(doc, 'searches'),
        doc.collection('visitors').get(),
        doc.collection('sessions').get(),
      ]);

      const eventMap = new Map<string, number>(
        eventRows.map((row: any) => [row.id, Number(row.count || 0)])
      );

      const dayPageViews = eventMap.get('page_view') || 0;
      const dayVideoViews = eventMap.get('view_video') || 0;
      const daySearches = eventMap.get('search_performed') || 0;
      const daySearchResultClicks = eventMap.get('search_result_click') || 0;
      const daySearchNoResults = eventMap.get('search_no_results') || 0;
      const dayFavorites = eventMap.get('favorite_add') || 0;
      const dayVideoPlays = eventMap.get('video_play') || 0;
      const dayExternalOpens = eventMap.get('video_open_external') || 0;

      pageViews += dayPageViews;
      videoViews += dayVideoViews;
      videoPlays += dayVideoPlays;
      searches += daySearches;
      searchResultClicks += daySearchResultClicks;
      searchNoResults += daySearchNoResults;
      favorites += dayFavorites;
      shares += eventMap.get('share_video') || 0;
      signUps += eventMap.get('sign_up') || 0;
      logins += eventMap.get('login') || 0;
      externalOpens += dayExternalOpens;

      visitorSnap.docs.forEach((visitorDoc) => {
        const data = visitorDoc.data() as { country?: string; device?: string };
        uniqueVisitors.set(visitorDoc.id, {
          country: data.country || 'UNKNOWN',
          device: data.device || 'unknown',
        });
      });

      sessionSnap.docs.forEach((sessionDoc) => {
        uniqueSessions.add(sessionDoc.id);
      });

      for (const row of interactionRows as any[]) {
        const videoId = typeof row.videoId === 'string' ? row.videoId : '';
        if (!videoId) continue;

        const catalog = videoCatalog.get(videoId);
        const previous = videos.get(videoId) || {
          id: videoId,
          title: catalog?.title || 'Video no encontrado',
          creatorName: catalog?.creatorName,
          platform: catalog?.platform,
          opens: 0,
          plays: 0,
          externalOpens: 0,
          favorites: 0,
          shares: 0,
        };

        const count = Number(row.count || 0);
        if (row.event === 'view_video') previous.opens += count;
        if (row.event === 'video_play') previous.plays += count;
        if (row.event === 'video_open_external') previous.externalOpens += count;
        if (row.event === 'favorite_add') previous.favorites += count;
        if (row.event === 'share_video') previous.shares += count;

        videos.set(videoId, previous);
      }

      for (const row of searchRows as any[]) {
        const previous = searchTerms.get(row.id);
        searchTerms.set(row.id, {
          query: row.query || row.id,
          count: (previous?.count || 0) + Number(row.count || 0),
        });
      }

      daily.push({
        date,
        visitors: visitorSnap.size,
        sessions: sessionSnap.size,
        pageViews: dayPageViews,
        videoViews: dayVideoViews,
        searches: daySearches,
        searchResultClicks: daySearchResultClicks,
        searchNoResults: daySearchNoResults,
        videoPlays: dayVideoPlays,
        favorites: dayFavorites,
        externalOpens: dayExternalOpens,
      });
    }

    const countries = new Map<string, number>();
    const devices = new Map<string, number>();

    for (const { country, device } of uniqueVisitors.values()) {
      countries.set(country, (countries.get(country) || 0) + 1);
      devices.set(device, (devices.get(device) || 0) + 1);
    }

    const sortMap = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return res.json({
      periodDays: days,
      totals: {
        visitors: uniqueVisitors.size,
        sessions: uniqueSessions.size,
        pageViews,
        videoViews,
        videoPlays,
        searches,
        searchResultClicks,
        searchNoResults,
        favorites,
        shares,
        signUps,
        logins,
        externalOpens,
      },
      funnel: {
        searchToResultClickRate: searches ? Math.min(1, searchResultClicks / searches) : 0,
        videoOpenToPlayRate: videoViews ? Math.min(1, videoPlays / videoViews) : 0,
        playToExternalRate: videoPlays ? Math.min(1, externalOpens / videoPlays) : 0,
        noResultsRate: searches ? Math.min(1, searchNoResults / searches) : 0,
      },
      daily,
      countries: sortMap(countries),
      devices: sortMap(devices),
      topVideos: [...videos.values()]
        .sort((a, b) =>
          (b.plays + b.opens + b.externalOpens) -
          (a.plays + a.opens + a.externalOpens)
        )
        .slice(0, 10),
      topSearches: [...searchTerms.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    });
  } catch (error) {
    console.error('[admin analytics] Failed to read analytics:', error);
    return res.status(500).json({
      error: {
        code: 'ANALYTICS_READ_FAILED',
        message: 'No se pudieron cargar las analíticas.',
      },
    });
  }
});

export default router;
