/**
 * Integration: /api/v1/savings goals CRUD
 */

'use strict';

require('../helpers/mocks').install();

const { connectTestDb, disconnectTestDb, clearTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { makeKeypair } = require('../helpers/auth');
const { createGoalDoc } = require('../helpers/factories');

let ctx, alice, bob;

beforeAll(async () => {
  await connectTestDb();
  ctx = await startTestServer();
  alice = makeKeypair();
  bob   = makeKeypair();
});
afterEach(async () => { await clearTestDb(); });
afterAll(async () => { await ctx.close(); await disconnectTestDb(); });

const base = '/api/v1/savings';

describe('GET /goals', () => {
  test('requires auth', async () => {
    const res = await ctx.request.get(`${base}/goals`);
    expect(res.status).toBe(401);
  });

  test('returns my goals only', async () => {
    await createGoalDoc(alice.pk, { name: 'mine'  });
    await createGoalDoc(bob.pk,   { name: 'bobs' });

    const res = await ctx.signed(alice.sk, 'GET', `${base}/goals`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('mine');
  });
});

describe('POST /goals', () => {
  test('creates a goal', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/goals`, {
      name: 'New laptop', emoji: '💻', target: 500_000, targetCurrency: 'NGN',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('New laptop');
    expect(res.body.data.savedBtc).toBe(0);
  });

  test('rejects missing fields', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/goals`, { name: 'x' });
    expect(res.status).toBe(422);
  });
});

describe('PATCH /goals/:id', () => {
  test('updates my own goal', async () => {
    const g = await createGoalDoc(alice.pk, { name: 'orig', target: 100 });
    const res = await ctx.signed(alice.sk, 'PATCH', `${base}/goals/${g._id.toString()}`, { name: 'new' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('new');
  });

  test('returns 404 when patching someone else\'s goal', async () => {
    const g = await createGoalDoc(bob.pk);
    const res = await ctx.signed(alice.sk, 'PATCH', `${base}/goals/${g._id.toString()}`, { name: 'hax' });
    expect(res.status).toBe(404);
  });

  test('rejects invalid id', async () => {
    const res = await ctx.signed(alice.sk, 'PATCH', `${base}/goals/not-an-id`, { name: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /goals/:id', () => {
  test('deletes my own goal', async () => {
    const g = await createGoalDoc(alice.pk);
    const res = await ctx.signed(alice.sk, 'DELETE', `${base}/goals/${g._id.toString()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(g._id.toString());
  });

  test('returns 404 for others\' goals', async () => {
    const g = await createGoalDoc(bob.pk);
    const res = await ctx.signed(alice.sk, 'DELETE', `${base}/goals/${g._id.toString()}`);
    expect(res.status).toBe(404);
  });
});
