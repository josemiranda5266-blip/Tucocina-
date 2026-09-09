import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import videoRoutes from './server/routes/videos';
import categoryRoutes from './server/routes/categories';
import favoriteRoutes from './server/routes/favorites';
import reportRoutes from './server/routes/reports';
import adminRoutes from './server/routes/admin';

import { errorHandler } from './server/middleware/errorHandler';
import { createRateLimiter } from './server/middleware/rateLimit';

dotenv.config();

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Only trust forwarded client IP headers when the deployment explicitly says it is behind a trusted proxy.
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

// Security & body parsing
app.use(express.json({ limit: '100kb' }));

// Security headers without an extra runtime dependency.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Restrictive CORS. In production an explicit allowlist is mandatory.
app.use((req, res, next) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const origin = req.headers.origin;

  if (isProduction && allowedOrigins.length === 0) {
    return res.status(500).json({
      error: { code: 'CORS_NOT_CONFIGURED', message: 'ALLOWED_ORIGINS debe configurarse en producción.' },
    });
  }

  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: { code: 'CORS_ORIGIN_DENIED', message: 'Origen no permitido.' } });
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// General API rate limiting. Endpoint-specific limiters add stricter protection where needed.
const apiLimiter = createRateLimiter(15 * 60 * 1000, 200);
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/videos', videoRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1d', index: false }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Tucocina Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Tucocina Fatal Error]:', err);
  process.exitCode = 1;
});
