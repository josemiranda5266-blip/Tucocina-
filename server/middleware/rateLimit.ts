import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

const memoryStore: RateLimitStore = {};

export function createRateLimiter(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!memoryStore[ip] || memoryStore[ip].resetTime < now) {
      memoryStore[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    memoryStore[ip].count++;

    if (memoryStore[ip].count > maxRequests) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Demasiadas solicitudes. Por favor, intentá de nuevo más tarde.',
        },
      });
    }

    next();
  };
}
