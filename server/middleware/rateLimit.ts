import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitEntry>();
let cleanupTimer: ReturnType<typeof setInterval> | undefined;

function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (entry.resetTime <= now) memoryStore.delete(key);
    }
  }, 5 * 60 * 1000);
  cleanupTimer.unref?.();
}

export function createRateLimiter(windowMs = 15 * 60 * 1000, maxRequests = 100) {
  ensureCleanupTimer();

  return (req: Request, res: Response, next: NextFunction) => {
    // req.ip respects Express's trusted-proxy configuration and avoids trusting a spoofed header directly.
    const key = req.ip || 'unknown';
    const now = Date.now();
    const current = memoryStore.get(key);

    if (!current || current.resetTime <= now) {
      memoryStore.set(key, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - 1));
      return next();
    }

    current.count += 1;
    const remaining = Math.max(0, maxRequests - current.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (current.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((current.resetTime - now) / 1000));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Demasiadas solicitudes. Por favor, intentá de nuevo más tarde.',
        },
      });
    }

    return next();
  };
}
