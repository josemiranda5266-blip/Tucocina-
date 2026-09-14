import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const discoveryStore = new Map<string, RateLimitEntry>();

export function createDiscoveryRateLimiter(windowMs = 60 * 1000, maxRequests = 15) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    const userId = (req as any).user?.uid || req.ip || 'unknown-admin';
    const key = `discovery-${userId}`;
    const now = Date.now();
    const current = discoveryStore.get(key);

    if (!current || current.resetTime <= now) {
      discoveryStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > maxRequests) {
      return res.status(429).json({
        error: {
          code: 'DISCOVERY_RATE_LIMIT_EXCEEDED',
          message: 'Demasiadas búsquedas seguidas en YouTube. Por favor, esperá un minuto antes de consultar de nuevo.',
        },
      });
    }

    return next();
  };
}
