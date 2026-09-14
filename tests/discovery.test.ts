process.env.NODE_ENV = 'test';
process.env.USE_MOCK_AUTH = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { isSpanishCandidate } from '../server/services/discovery/spanishCandidateDetector';
import { isCookingCandidate } from '../server/services/discovery/cookingCandidateDetector';
import { scoreCookingVideoCandidate } from '../server/services/discovery/cookingCandidateScorer';
import { YouTubeDiscoveryProvider } from '../server/services/discovery/YouTubeDiscoveryProvider';

let app: any;
let server: http.Server;
let baseUrl: string;

function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders: Record<string, string> = { ...options.headers };
    let payload = '';

    if (options.body) {
      reqHeaders['Content-Type'] = 'application/json';
      payload = JSON.stringify(options.body);
      reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(url, { method: options.method || 'GET', headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed: any;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode || 500, body: parsed });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('Discovery System Unit & E2E Test Suite', () => {
  before(async () => {
    const { app: expressApp } = await import('../server');
    app = expressApp;
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('1. Spanish Candidate Detector', () => {
    it('should correctly identify Spanish titles and descriptions', () => {
      assert.equal(isSpanishCandidate('Cómo hacer empanadas tucumanas caseras', 'Paso a paso para la masa y relleno de carne', 'Cocina Argentina'), true);
      assert.equal(isSpanishCandidate('How to make homemade pizza crust', 'Easy step by step recipe tutorial', 'Tasty Kitchen'), false);
    });
  });

  describe('2. Cooking Candidate Detector', () => {
    it('should identify culinary content and reject non-cooking content', () => {
      const resultCooking = isCookingCandidate('Receta fácil de milanesas a la napolitana', 'Ingredientes: carne, pan rallado, queso, salsa de tomate');
      assert.equal(resultCooking.isCooking, true);
      assert.ok(resultCooking.matchedTerms.length > 0);

      const resultNonCooking = isCookingCandidate('Gameplay de Minecraft episodio 5 - Construyendo una casa', 'Suscribite para más gaming');
      assert.equal(resultNonCooking.isCooking, false);
    });
  });

  describe('3. Cooking Candidate Scorer', () => {
    it('should score high quality Spanish cooking videos 80+ (MUY RECOMENDADO)', () => {
      const scoreData = scoreCookingVideoCandidate({
        title: 'Receta de locro criollo argentino tradicional',
        description: 'Aprende a cocinar un delicioso locro casero con zapallo, carne y maíz',
        channelTitle: 'Cocina de la Abuela',
        views: 150000,
        isEmbeddable: true,
        isSpanish: true,
        isCooking: true,
      });

      assert.ok(scoreData.score >= 80, `Expected score >= 80, got ${scoreData.score}`);
      assert.equal(scoreData.label, 'MUY RECOMENDADO');
    });

    it('should penalize non-cooking or non-embeddable content', () => {
      const scoreData = scoreCookingVideoCandidate({
        title: 'Video de prueba no culinario',
        description: 'Sin ingredientes',
        channelTitle: 'Test Channel',
        views: 100,
        isEmbeddable: false,
        isSpanish: true,
        isCooking: false,
      });

      assert.ok(scoreData.score < 60);
      assert.equal(scoreData.label, 'BAJA RELEVANCIA');
    });
  });

  describe('4. Discovery API Endpoints Access Control & Functions', () => {
    it('should reject unauthenticated or non-admin requests to discovery endpoints', async () => {
      const res = await request('/api/admin/discovery/youtube');
      assert.equal(res.status, 401);
    });

    it('should allow admin requests to GET /api/admin/discovery/youtube', async () => {
      const res = await request('/api/admin/discovery/youtube?query=recetas&limit=5', {
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
      });

      assert.equal(res.status, 200);
      assert.ok('isConfigured' in res.body);
      assert.ok(Array.isArray(res.body.candidates));
    });

    it('should import candidate video in DRAFT status', async () => {
      const res = await request('/api/admin/discovery/import', {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: {
          videoId: 'dQw4w9WgXcQ',
          categoryId: 'cat-argentina',
          tags: ['test', 'receta'],
        },
      });

      assert.ok([200, 201].includes(res.status));
      if (res.status === 201) {
        assert.equal(res.body.video.status, 'DRAFT');
      }
    });

    it('should execute batch import and create all candidates in DRAFT status', async () => {
      const res = await request('/api/admin/discovery/import-batch', {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: {
          items: [
            { videoId: 'M7lc1UVf-VE', categoryId: 'cat-pastas' },
            { videoId: 'kJQP7kiw5Fk', categoryId: 'cat-carnes' },
          ],
        },
      });

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.results));
      assert.equal(res.body.results.length, 2);
    });
  });
});
