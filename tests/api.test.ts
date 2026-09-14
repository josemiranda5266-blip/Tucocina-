process.env.NODE_ENV = 'test';
process.env.USE_MOCK_AUTH = 'true';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

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

describe('Tucocina Express API Functional E2E Suite', () => {
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

  describe('1. Health and Public Categories', () => {
    it('GET /api/health should return ok', async () => {
      const res = await request('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
    });

    it('GET /api/categories should return list of categories', async () => {
      const res = await request('/api/categories');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length > 0);
      assert.ok(res.body[0].id);
      assert.ok(res.body[0].name);
    });
  });

  describe('2. Public Video Catalog & Pagination Errors', () => {
    it('GET /api/videos should return paginated structure', async () => {
      const res = await request('/api/videos?limit=5');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.items));
      assert.equal(typeof res.body.hasMore, 'boolean');
    });

    it('GET /api/videos with invalid cursor should return 400 Bad Request', async () => {
      const res = await request('/api/videos?cursor=not_a_valid_json_cursor');
      assert.equal(res.status, 400);
      assert.equal(res.body.error?.code, 'INVALID_CURSOR');
    });

    it('GET /api/videos/:id should return 404 for non-existent video', async () => {
      const res = await request('/api/videos/non-existent-video-id-999');
      assert.equal(res.status, 404);
      assert.equal(res.body.error?.code, 'NOT_FOUND');
    });
  });

  describe('3. Auth & Role Access Control', () => {
    it('POST /api/favorites/v1 without auth header should fail with 401', async () => {
      const res = await request('/api/favorites/v1', { method: 'POST' });
      assert.equal(res.status, 401);
      assert.equal(res.body.error?.code, 'UNAUTHORIZED');
    });

    it('POST /api/admin/videos/import with regular user token should fail with 403 Forbidden', async () => {
      const res = await request('/api/admin/videos/import', {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-token-userRegular' },
        body: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error?.code, 'FORBIDDEN');
    });
  });

  describe('4. Full Admin Lifecycle: Import -> Draft -> Publish -> Delete', () => {
    let importedVideoId = '';

    it('POST /api/admin/videos/import with invalid SSRF URL should be rejected (400)', async () => {
      const res = await request('/api/admin/videos/import', {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: { url: 'http://169.254.169.254/latest/meta-data/' },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error?.code, 'IMPORT_FAILED');
    });

    it('POST /api/admin/videos/import with valid YouTube URL imports video as DRAFT', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const res = await request('/api/admin/videos/import', {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: { url: testUrl },
      });

      assert.equal(res.status, 201);
      assert.ok(res.body.video);
      assert.ok(res.body.video.id);
      assert.equal(res.body.video.status, 'DRAFT');
      importedVideoId = res.body.video.id;
    });

    it('GET /api/videos/:id for DRAFT video should return 404 to public users', async () => {
      const res = await request(`/api/videos/${importedVideoId}`);
      assert.equal(res.status, 404);
    });

    it('PATCH /api/admin/videos/:id changes video status to PUBLISHED', async () => {
      const res = await request(`/api/admin/videos/${importedVideoId}`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: { status: 'PUBLISHED', title: 'Receta E2E Publicada', categoryId: 'cat-pastas' },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.video.status, 'PUBLISHED');
      assert.equal(res.body.video.title, 'Receta E2E Publicada');
    });

    it('GET /api/videos/:id for PUBLISHED video now returns 200 OK', async () => {
      const res = await request(`/api/videos/${importedVideoId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.id, importedVideoId);
      assert.equal(res.body.title, 'Receta E2E Publicada');
    });

    it('PATCH /api/admin/videos/:id can change status to HIDDEN', async () => {
      const res = await request(`/api/admin/videos/${importedVideoId}`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: { status: 'HIDDEN' },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.video.status, 'HIDDEN');
    });

    it('GET /api/videos/:id for HIDDEN video returns 404 to public', async () => {
      const res = await request(`/api/videos/${importedVideoId}`);
      assert.equal(res.status, 404);
    });

    it('DELETE /api/admin/videos/:id removes video', async () => {
      const res = await request(`/api/admin/videos/${importedVideoId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.message);
    });
  });

  describe('5. Favorites Flow & User Data Isolation', () => {
    let testVideoId = '';

    before(async () => {
      // Import and publish a video for favorites test
      const res = await request('/api/admin/videos/import', {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: { url: 'https://www.youtube.com/watch?v=L_LUpnjgPso' },
      });
      testVideoId = res.body.video.id;
      await request(`/api/admin/videos/${testVideoId}`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: { status: 'PUBLISHED', title: 'Video para Favoritos E2E' },
      });
    });

    after(async () => {
      if (testVideoId) {
        await request(`/api/admin/videos/${testVideoId}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        });
      }
    });

    it('User Alice checks favorite before adding -> returns false', async () => {
      const res = await request(`/api/favorites/check/${testVideoId}`, {
        headers: { Authorization: 'Bearer mock-token-aliceUser' },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.isFavorite, false);
    });

    it('User Alice adds favorite -> returns 200', async () => {
      const res = await request(`/api/favorites/${testVideoId}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-token-aliceUser' },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    it('User Alice checks favorite after adding -> returns true', async () => {
      const res = await request(`/api/favorites/check/${testVideoId}`, {
        headers: { Authorization: 'Bearer mock-token-aliceUser' },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.isFavorite, true);
    });

    it('User Bob checks favorite for same video -> returns false (User Isolation verified)', async () => {
      const res = await request(`/api/favorites/check/${testVideoId}`, {
        headers: { Authorization: 'Bearer mock-token-bobUser' },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.isFavorite, false);
    });

    it('User Alice gets favorites list -> contains the test video', async () => {
      const res = await request('/api/favorites', {
        headers: { Authorization: 'Bearer mock-token-aliceUser' },
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.items));
      const found = res.body.items.some((v: any) => v.id === testVideoId);
      assert.equal(found, true);
    });

    it('User Alice removes favorite -> check returns false', async () => {
      const delRes = await request(`/api/favorites/${testVideoId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer mock-token-aliceUser' },
      });
      assert.equal(delRes.status, 200);

      const checkRes = await request(`/api/favorites/check/${testVideoId}`, {
        headers: { Authorization: 'Bearer mock-token-aliceUser' },
      });
      assert.equal(checkRes.status, 200);
      assert.equal(checkRes.body.isFavorite, false);
    });
  });

  describe('6. Reports Flow & Admin Resolution', () => {
    let reportVideoId = '';
    let reportId = '';

    before(async () => {
      const res = await request('/api/admin/videos/import', {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: { url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
      });
      reportVideoId = res.body.video.id;
      await request(`/api/admin/videos/${reportVideoId}`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: { status: 'PUBLISHED', title: 'Video para Reportar E2E' },
      });
    });

    after(async () => {
      if (reportVideoId) {
        await request(`/api/admin/videos/${reportVideoId}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        });
      }
    });

    it('POST /api/reports without auth fails with 401', async () => {
      const res = await request('/api/reports', {
        method: 'POST',
        body: { videoId: reportVideoId, reason: 'BROKEN_LINK', description: 'El enlace no carga' },
      });
      assert.equal(res.status, 401);
    });

    it('POST /api/reports with authenticated user creates report', async () => {
      const res = await request('/api/reports', {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-token-reporterUser' },
        body: { videoId: reportVideoId, reason: 'BROKEN_LINK', description: 'El video no reproduce en el reproductor' },
      });
      assert.equal(res.status, 201);
      assert.ok(res.body.reportId);
    });

    it('GET /api/admin/reports with admin token lists reports', async () => {
      const res = await request('/api/admin/reports', {
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.items));
      const targetReport = res.body.items.find((r: any) => r.videoId === reportVideoId);
      assert.ok(targetReport);
      assert.equal(targetReport.status, 'OPEN');
      reportId = targetReport.id;
    });

    it('PATCH /api/admin/reports/:id updates report status to RESOLVED', async () => {
      assert.ok(reportId);
      const res = await request(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
        body: { status: 'RESOLVED' },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.message);
    });
  });

  describe('7. Admin System Metrics', () => {
    it('GET /api/admin/metrics returns system metrics object', async () => {
      const res = await request('/api/admin/metrics', {
        headers: { Authorization: 'Bearer mock-token-adminUser-admin' },
      });
      assert.equal(res.status, 200);
      assert.equal(typeof res.body.totalVideos, 'number');
      assert.equal(typeof res.body.publishedVideos, 'number');
      assert.equal(typeof res.body.pendingVideos, 'number');
      assert.equal(typeof res.body.hiddenVideos, 'number');
      assert.equal(typeof res.body.openReports, 'number');
      assert.equal(typeof res.body.totalUsers, 'number');
    });
  });
});
