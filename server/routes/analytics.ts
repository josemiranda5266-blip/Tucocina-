import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();

const EVENT_NAMES = new Set([
  'page_view', 'session_start', 'search_performed', 'search_result_click', 'search_no_results',
  'view_category', 'view_video', 'video_play', 'video_open_external', 'favorite_add', 'favorite_remove',
  'share_video', 'sign_up', 'login', 'logout', 'video_load_error', 'search_error', 'api_error',
]);

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function clean(value: unknown, max = 120): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function deviceFromUserAgent(userAgent: string): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  if (/ipad|tablet|android(?!.*mobile)/i.test(userAgent)) return 'tablet';
  if (/mobi|iphone|ipod|android/i.test(userAgent)) return 'mobile';
  if (/windows|macintosh|linux|cros/i.test(userAgent)) return 'desktop';
  return 'unknown';
}

function countryFromHeaders(headers: Record<string, unknown>): string {
  const value = headers['cf-ipcountry'] || headers['x-vercel-ip-country'] || headers['cloudfront-viewer-country'];
  return clean(value, 2)?.toUpperCase() || 'UNKNOWN';
}

router.post('/event', async (req, res) => {
  const event = clean(req.body?.event, 40);
  if (!event || !EVENT_NAMES.has(event)) {
    return res.status(400).json({ error: { code: 'INVALID_EVENT', message: 'Evento de analítica no permitido.' } });
  }

  const date = dayKey();
  const visitorId = clean(req.body?.visitorId, 80);
  const sessionId = clean(req.body?.sessionId, 80);
  const videoId = clean(req.body?.videoId, 160);
  const query = clean(req.body?.query, 120);
  const categoryId = clean(req.body?.categoryId, 120);
  const userAgent = clean(req.headers['user-agent'], 500) || '';
  const device = deviceFromUserAgent(userAgent);
  const country = countryFromHeaders(req.headers as Record<string, unknown>);
  const db = getAdminFirestore();
  const base = db.collection('analytics_daily').doc(date);

  try {
    const operations: Promise<unknown>[] = [
      base.set({ updatedAt: new Date().toISOString() }, { merge: true }),
      base.collection('events').doc(event).set({ count: FieldValue.increment(1) }, { merge: true }),
      base.collection('devices').doc(device).set({ count: FieldValue.increment(1) }, { merge: true }),
      base.collection('countries').doc(country).set({ count: FieldValue.increment(1) }, { merge: true }),
    ];

    if (sessionId) {
      operations.push(base.collection('sessions').doc(sessionId).set({ lastSeenAt: new Date().toISOString() }, { merge: true }));
    }
    if (visitorId) {
      operations.push(base.collection('visitors').doc(visitorId).set({ lastSeenAt: new Date().toISOString() }, { merge: true }));
    }
    if (videoId && ['view_video', 'video_play', 'favorite_add', 'share_video'].includes(event)) {
      operations.push(base.collection('videos').doc(videoId).set({ count: FieldValue.increment(1), lastEvent: event }, { merge: true }));
    }
    if (query && event.startsWith('search')) {
      const searchKey = Buffer.from(query.toLowerCase()).toString('base64url').slice(0, 120);
      operations.push(base.collection('searches').doc(searchKey).set({ query, count: FieldValue.increment(1) }, { merge: true }));
    }
    if (categoryId && event === 'view_category') {
      operations.push(base.collection('categories').doc(categoryId).set({ count: FieldValue.increment(1) }, { merge: true }));
    }

    await Promise.all(operations);
    return res.status(204).send();
  } catch (error) {
    console.warn('[analytics] Failed to persist event:', error);
    // Analytics must never break the public application.
    return res.status(204).send();
  }
});

export default router;
