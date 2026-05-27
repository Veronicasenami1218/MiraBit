/**
 * Integration: /health endpoints + Swagger docs are reachable.
 */

'use strict';

require('../helpers/mocks').install();

const { connectTestDb, disconnectTestDb, clearTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');

let ctx;

beforeAll(async () => {
  await connectTestDb();
  ctx = await startTestServer();
});

afterEach(async () => { await clearTestDb(); });

afterAll(async () => {
  await ctx.close();
  await disconnectTestDb();
});

describe('GET /', () => {
  test('returns service banner', async () => {
    const res = await ctx.request.get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('MiraBit Backend');
    expect(res.body.docs).toBe('/api/v1/docs');
  });
});

describe('GET /api/v1/health', () => {
  test('ping returns ok envelope', async () => {
    const res = await ctx.request.get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('GET /api/v1/health/detailed', () => {
  test('reports database status', async () => {
    const res = await ctx.request.get('/api/v1/health/detailed');
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBeDefined();
    expect(res.body.data.database.connected).toBe(true);
    expect(res.body.data.database.state).toBe('connected');
  });
});

describe('Swagger docs', () => {
  test('/docs redirects to /api/v1/docs', async () => {
    const res = await ctx.request.get('/docs').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/api/v1/docs');
  });

  test('/api/v1/docs.json serves the OpenAPI spec', async () => {
    const res = await ctx.request.get('/api/v1/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('MiraBit Backend API');
    // Spot-check a few endpoints are present
    expect(res.body.paths['/wallet/{pubkey}/deposit']).toBeDefined();
    expect(res.body.paths['/payments/queue/flush']).toBeDefined();
    expect(res.body.paths['/learn/complete']).toBeDefined();
  });

  test('/api/v1/docs serves the UI HTML', async () => {
    const res = await ctx.request.get('/api/v1/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/swagger/i);
  });
});

describe('404 handler', () => {
  test('unknown path returns 404 envelope', async () => {
    const res = await ctx.request.get('/api/v1/no-such-thing');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });
});
