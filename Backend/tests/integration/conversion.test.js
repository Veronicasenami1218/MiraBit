/**
 * Integration: /api/v1/conversion endpoints
 */

'use strict';

require('../helpers/mocks').install();

const { connectTestDb, disconnectTestDb, clearTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');

let ctx;

beforeAll(async () => { await connectTestDb(); ctx = await startTestServer(); });
afterEach(async () => { await clearTestDb(); });
afterAll(async () => { await ctx.close(); await disconnectTestDb(); });

const base = '/api/v1/conversion';

describe('GET /rates', () => {
  test('returns the legacy rate shape', async () => {
    const res = await ctx.request.get(`${base}/rates`);
    expect(res.status).toBe(200);
    expect(res.body.data.BTC_USD).toBe(50_000);
    expect(res.body.data.BTC_NGN).toBe(75_000_000);
  });
});

describe('GET /rates/fe', () => {
  test('returns the frontend-shaped rates', async () => {
    const res = await ctx.request.get(`${base}/rates/fe`);
    expect(res.status).toBe(200);
    expect(res.body.data.BTC_USD).toBe(50_000);
    expect(res.body.data.USD_NGN).toBe(1500);
    expect(typeof res.body.data.updatedAt).toBe('number');
    expect(res.body.data.isStale).toBe(false);
  });
});

describe('GET /rate', () => {
  test('returns a single pair', async () => {
    const res = await ctx.request.get(`${base}/rate?from=BTC&to=USD`);
    expect(res.status).toBe(200);
    expect(res.body.data.rate).toBe(50_000);
  });

  test('returns 1 for same-currency pair', async () => {
    const res = await ctx.request.get(`${base}/rate?from=BTC&to=BTC`);
    expect(res.status).toBe(200);
    expect(res.body.data.rate).toBe(1);
  });

  test('rejects unsupported currencies', async () => {
    const res = await ctx.request.get(`${base}/rate?from=XYZ&to=USD`);
    expect(res.status).toBe(400);
  });
});

describe('POST /convert', () => {
  test('converts BTC to NGN', async () => {
    const res = await ctx.request.post(`${base}/convert`).send({
      amount: 0.001, from: 'BTC', to: 'NGN',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.outputAmount).toBeCloseTo(75_000, 2);
  });

  test('rejects negative amount via validator', async () => {
    const res = await ctx.request.post(`${base}/convert`).send({ amount: -1, from: 'BTC', to: 'NGN' });
    expect(res.status).toBe(422);
  });
});

describe('GET /btc/sats and /sats/btc', () => {
  test('btc → sats', async () => {
    const res = await ctx.request.get(`${base}/btc/sats?amount=0.001`);
    expect(res.status).toBe(200);
    expect(res.body.data.sats).toBe(100_000);
  });

  test('sats → btc', async () => {
    const res = await ctx.request.get(`${base}/sats/btc?amount=100000`);
    expect(res.status).toBe(200);
    expect(res.body.data.btc).toBe(0.001);
  });

  test('rejects non-numeric input', async () => {
    const res = await ctx.request.get(`${base}/btc/sats?amount=abc`);
    expect(res.status).toBe(400);
  });
});
