import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import videoRoutes from './server/routes/videos';
import categoryRoutes from './server/routes/categories';
import favoriteRoutes from './server/routes/favorites';
import reportRoutes from './server/routes/reports';
import adminRoutes from './server/routes/admin';
import adminAnalyticsRoutes from './server/routes/adminAnalytics';
import analyticsRoutes from './server/routes/analytics';
import authRoutes from './server/routes/authRoutes';

import { errorHandler } from './server/middleware/errorHandler';
import { createRateLimiter } from './server/middleware/rateLimit';
import { storeReady } from './server/data/store';

dotenv.config();

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use((req, res, next) => {
  const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean);
  const origin = req.headers.origin;
  const host = req.headers.host;
  let isAllowed = true;

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      isAllowed = envOrigins.length === 0 || envOrigins.includes('*') || envOrigins.includes(origin) || originHost === host || originHost.endsWith('.run.app') || originHost.includes('localhost');
    } catch {
      isAllowed = true;
    }
    if (!isAllowed) return res.status(403).json({ error: { code: 'CORS_ORIGIN_DENIED', message: 'Origen no permitido.' } });
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const apiLimiter = createRateLimiter(15 * 60 * 1000, 1000);
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/videos', videoRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-analytics', adminAnalyticsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);

app.use(errorHandler);

async function startServer() {
  await storeReady;

  if (!isProduction) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1d', index: false }));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CociFlash Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

export { app };

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('[CociFlash Fatal Error]:', err);
    process.exitCode = 1;
  });
}
