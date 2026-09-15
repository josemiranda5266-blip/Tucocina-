import { auth } from '../config/firebase';

type AnalyticsEvent =
  | 'page_view' | 'session_start' | 'search_performed' | 'search_result_click' | 'search_no_results'
  | 'view_category' | 'view_video' | 'video_play' | 'video_open_external' | 'favorite_add' | 'favorite_remove'
  | 'share_video' | 'sign_up' | 'login' | 'logout' | 'video_load_error' | 'search_error' | 'api_error';

type EventPayload = { videoId?: string; query?: string; categoryId?: string };

const VISITOR_KEY = 'cociflash_analytics_visitor_id';
const SESSION_KEY = 'cociflash_analytics_session_id';
const SESSION_STARTED_KEY = 'cociflash_analytics_session_started';

function randomId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

function getId(key: string, prefix: string): string {
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = randomId(prefix);
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return randomId(prefix);
  }
}

export function track(event: AnalyticsEvent, payload: EventPayload = {}): void {
  if (typeof window === 'undefined') return;

  const visitorId = getId(VISITOR_KEY, 'visitor');
  const sessionId = getId(SESSION_KEY, 'session');

  // Authenticated requests allow the backend to identify and exclude admins.
  void (async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.currentUser) {
        try { headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`; } catch { /* continue anonymously */ }
      }
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers,
        body: JSON.stringify({ event, visitorId, sessionId, ...payload }),
        keepalive: true,
      });
    } catch {
      // Analytics is deliberately non-blocking and must never affect the user experience.
    }
  })();
}

export function trackSessionStart(): void {
  try {
    if (sessionStorage.getItem(SESSION_STARTED_KEY)) return;
    sessionStorage.setItem(SESSION_STARTED_KEY, '1');
    track('session_start');
  } catch {
    track('session_start');
  }
}

export function trackPageView(path = window.location.pathname): void {
  track('page_view', { query: path });
}
