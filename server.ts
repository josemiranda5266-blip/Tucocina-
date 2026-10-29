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
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.facebook.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com; font-src 'self' data: https:;"
    );
  }
  next();
});

app.use((req, res, next) => {
  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const configuredOrigins = new Set(envOrigins);
  const origin = req.headers.origin;
  const host = req.headers.host?.split(':')[0]?.toLowerCase();

  if (origin) {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      return res.status(403).json({ error: { code: 'CORS_ORIGIN_DENIED', message: 'Origen no permitido.' } });
    }

    const originHost = parsedOrigin.hostname.toLowerCase();
    const isConfigured = configuredOrigins.has(origin);
    const isSameHost = !isProduction && originHost === host;
    const isDevelopmentOrigin = !isProduction && (originHost === 'localhost' || originHost === '127.0.0.1');
    const isAllowed = isConfigured || isSameHost || isDevelopmentOrigin;

    if (!isAllowed) {
      return res.status(403).json({ error: { code: 'CORS_ORIGIN_DENIED', message: 'Origen no permitido.' } });
    }

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

// Public crawler endpoints. ads.txt is emitted only when a real publisher ID is configured.
app.get('/ads.txt', (_req, res) => {
  const configuredId = (process.env.ADSENSE_PUBLISHER_ID || process.env.VITE_ADSENSE_PUBLISHER_ID || '').trim();
  const publisherId = configuredId.startsWith('ca-') ? configuredId.slice(3) : configuredId;
  if (!/^pub-[0-9]{16}$/.test(publisherId)) {
    return res.status(404).type('text/plain').send('AdSense publisher ID is not configured.\\n');
  }
  return res.type('text/plain').send('google.com, ' + publisherId + ', DIRECT, f08c47fec0942fa0\\n');
});

app.get('/robots.txt', (_req, res) => {
  return res.type('text/plain').send(
    'User-agent: *\\nAllow: /\\nDisallow: /admin\\nDisallow: /favoritos\\nSitemap: https://www.cociflash.com/sitemap.xml\\n'
  );
});

app.get('/sitemap.xml', (_req, res) => {
  const urls = [
    'https://www.cociflash.com/',
    'https://www.cociflash.com/buscar',
    'https://www.cociflash.com/categorias',
    'https://www.cociflash.com/contacto',
    'https://www.cociflash.com/legal/privacidad',
    'https://www.cociflash.com/legal/terminos',
    'https://www.cociflash.com/legal/cookies',
    'https://www.cociflash.com/legal/contenido',
  ];
  const entries = urls.map((url) => '<url><loc>' + url + '</loc></url>').join('');
  return res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + entries + '</urlset>');
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
