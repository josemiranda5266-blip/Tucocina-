import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminFirestore } from '../auth/firebaseAdmin';
import { createRateLimiter } from '../middleware/rateLimit';

const router = Router();

const EVENT_NAMES = new Set([
  'page_view', 'session_start', 'search_performed', 'search_result_click', 'search_no_results',
  'view_category', 'view_video', 'video_play', 'video_open_external', 'favorite_add', 'favorite_remove',
  'share_video', 'sign_up', 'login', 'logout', 'video_load_error', 'search_error', 'api_error',
]);

const analyticsLimiter = createRateLimiter(60 * 1000, 60);

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

async function isAdminRequest(req: any): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return false;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (decoded.admin === true) return true;
    const bootstrapEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
    if (decoded.email && bootstrapEmails.includes(decoded.email.toLowerCase())) return true;
    const userSnap = await getAdminFirestore().collection('users').doc(decoded.uid).get();
    return userSnap.exists && userSnap.data()?.role === 'ADMIN';
  } catch {
    // Analytics is public/non-blocking; invalid or expired optional auth simply
    // falls back to treating the request as anonymous.
    return false;
  }
}

router.post('/event', analyticsLimiter, async (req, res) => {
  const event = clean(req.body?.event, 40);
  if (!event || !EVENT_NAMES.has(event)) {
    return res.status(400).json({ error: { code: 'INVALID_EVENT', message: 'Evento de analítica no permitido.' } });
  }

  // Never contaminate audience metrics with administrator activity.
  if (await isAdminRequest(req)) return res.status(204).send();

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
    const now = new Date().toISOString();
    const operations: Promise<unknown>[] = [
      base.set({ updatedAt: now }, { merge: true }),
      base.collection('events').doc(event).set({ count: FieldValue.increment(1) }, { merge: true }),
    ];

    // Visitor/session documents are the source of truth for unique audience
    // metrics. Store their latest country/device so the admin dashboard does
    // not confuse event volume with visitor volume.
    if (sessionId) {
      operations.push(base.collection('sessions').doc(sessionId).set({ lastSeenAt: now, country, device }, { merge: true }));
    }
    if (visitorId) {
      operations.push(base.collection('visitors').doc(visitorId).set({ lastSeenAt: now, country, device }, { merge: true }));
    }
    if (videoId && ['view_video', 'video_play', 'favorite_add', 'share_video'].includes(event)) {
      operations.push(base.collection('videos').doc(videoId).set({ count: FieldValue.increment(1), lastEvent: event }, { merge: true }));
    }
    if (query && event === 'search_performed') {
      const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
      const searchKey = Buffer.from(normalizedQuery).toString('base64url').slice(0, 120);
      operations.push(base.collection('searches').doc(searchKey).set({ query: normalizedQuery, count: FieldValue.increment(1) }, { merge: true }));
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
