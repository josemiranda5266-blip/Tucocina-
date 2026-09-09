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
const PORT = 3000;

// Security & Body parsing
app.use(express.json({ limit: '100kb' }));

// Restrictive CORS setup
app.use((req, res, next) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  const origin = req.headers.origin;

  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// General Rate Limiting for API routes
const apiLimiter = createRateLimiter(15 * 60 * 1000, 200);
app.use('/api', apiLimiter);

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/videos', videoRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Centralized error handler
app.use(errorHandler);

// Vite middleware for development vs static build serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CO-Cocina Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CO-Cocina Fatal Error]:', err);
});
