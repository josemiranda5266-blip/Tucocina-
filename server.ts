import express from 'express';
import path from 'path';
import fs from 'fs';
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
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com; frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.facebook.com; font-src 'self' data: https:;"
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
    const indexPath = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.error('[Frontend] No se encontró dist/index.html; la compilación del frontend no generó el documento de entrada.');
    } else {
      const html = fs.readFileSync(indexPath, 'utf8');
      const assetUrls = Array.from(
        html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g),
        (match) => match[1],
      );
      console.log('[Frontend] index.html encontrado. Recursos locales detectados: ' + assetUrls.length + '.');
      for (const assetUrl of assetUrls) {
        if (/^https?:\/\//i.test(assetUrl)) continue;
        const relativeAssetPath = assetUrl.split('?')[0].replace(/^\/+/, '');
        const assetPath = path.join(distPath, relativeAssetPath);
        if (fs.existsSync(assetPath)) {
          console.log('[Frontend] Recurso disponible: ' + relativeAssetPath + ' (' + fs.statSync(assetPath).size + ' bytes).');
        } else {
          console.error('[Frontend] FALTA recurso compilado: ' + relativeAssetPath + '.');
        }
      }
    }
    app.use(express.static(distPath, {
      maxAge: '1d',
      index: false,
      setHeaders: (res, filePath) => {
        const extension = path.extname(filePath).toLowerCase();
        if (extension === '.js' || extension === '.mjs') {
          // Module scripts require a JavaScript MIME type. Disable caching
          // temporarily so diagnostic deployments cannot reuse stale bundles.
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
        } else if (extension === '.css') {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
        }
      },
    }));

    // Never let the SPA fallback answer a missing asset request with index.html.
    // Browsers reject HTML returned as a JavaScript/CSS module (especially with nosniff),
    // and a 200 response can otherwise hide stale or incorrect asset references.
    app.use((req, res, next) => {
      const requestPath = req.path;
      const isAssetPath = requestPath === '/assets' || requestPath.startsWith('/assets/');
      const isFileRequest = /\\.[a-z0-9]{1,10}$/i.test(requestPath);
      const isApiRequest = requestPath === '/api' || requestPath.startsWith('/api/');

      if (isAssetPath || isFileRequest || isApiRequest) {
        console.warn('[Frontend] Recurso/ruta inexistente:', req.method, requestPath, 'Accept:', req.headers.accept || '(sin Accept)');
        return res.status(404).json({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'El recurso solicitado no existe en esta versión de la aplicación.',
            path: requestPath,
          },
        });
      }

      // Only real browser document navigations receive the SPA entry point.
      // Module, fetch and API requests must never receive index.html as a fallback.
      const acceptsHtml = (req.headers.accept || '').toLowerCase().includes('text/html');
      if (req.method === 'GET' && acceptsHtml) {
        res.setHeader('Cache-Control', 'no-store');
        return res.sendFile(indexPath);
      }

      return res.status(404).json({
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: 'La ruta solicitada no existe.',
          path: requestPath,
        },
      });
    });
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
