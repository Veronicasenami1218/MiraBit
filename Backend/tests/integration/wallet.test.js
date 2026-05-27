/**
 * Integration: /api/v1/wallet endpoints
 *
 * Covers: create, read, balance, transactions, deposit, convert,
 * save-to-btc, reward, auth enforcement, and owner-only checks.
 */

'use strict';

require('../helpers/mocks').install();

const { connectTestDb, disconnectTestDb, clearTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { makeKeypair }     = require('../helpers/auth');
const { createWalletDoc, createTxDoc } = require('../helpers/factories');

let ctx;
let alice;   // keypair
let bob;

beforeAll(async () => {
  await connectTestDb();
  ctx = await startTestServer();
  alice = makeKeypair();
  bob   = makeKeypair();
});

afterEach(async () => { await clearTestDb(); });

afterAll(async () => {
  await ctx.close();
  await disconnectTestDb();
});

const base = '/api/v1';

describe('POST /wallet (create)', () => {
  test('rejects unauthenticated requests', async () => {
    const res = await ctx.request.post(`${base}/wallet`).send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('creates a wallet for the signer', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/wallet`);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pubkey).toBe(alice.pk);
    expect(res.body.data.balances).toEqual({ BTC: 0, NGN: 0, USDT: 0 });
  });

  test('is idempotent (POST twice returns the same wallet)', async () => {
    const r1 = await ctx.signed(alice.sk, 'POST', `${base}/wallet`);
    const r2 = await ctx.signed(alice.sk, 'POST', `${base}/wallet`);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r1.body.data.id).toBe(r2.body.data.id);
  });
});

describe('GET /wallet/:pubkey', () => {
  test('returns wallet when it exists', async () => {
    await createWalletDoc(alice.pk);
    const res = await ctx.request.get(`${base}/wallet/${alice.pk}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pubkey).toBe(alice.pk);
  });

  test('returns 404 for unknown pubkey', async () => {
    const res = await ctx.request.get(`${base}/wallet/${alice.pk}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /wallet/:pubkey/balance', () => {
  test('returns FE-shaped balances', async () => {
    await createWalletDoc(alice.pk, { BTC: 0.5, NGN: 100, USDT: 25 });
    const res = await ctx.request.get(`${base}/wallet/${alice.pk}/balance`);
    expect(res.status).toBe(200);
    expect(res.body.data.balances).toEqual({ BTC: 0.5, NGN: 100, USDT: 25 });
  });
});

describe('GET /wallet/:pubkey/transactions', () => {
  test('returns paginated FE-shaped transactions', async () => {
    await createWalletDoc(alice.pk);
    await createTxDoc(alice.pk, { type: 'receive', toAmount: 100 });
    await createTxDoc(alice.pk, { type: 'pay', fromCurrency: 'BTC', fromAmount: 0.001, toCurrency: 'BTC', toAmount: 0.001 });

    const res = await ctx.request.get(`${base}/wallet/${alice.pk}/transactions?limit=10`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('type');
    expect(res.body.data[0]).toHaveProperty('createdAt');
    expect(typeof res.body.data[0].createdAt).toBe('number'); // unix ms
  });

  test('filter by type works', async () => {
    await createWalletDoc(alice.pk);
    await createTxDoc(alice.pk, { type: 'receive', toAmount: 1 });
    await createTxDoc(alice.pk, { type: 'pay', toAmount: 1 });
    const res = await ctx.request.get(`${base}/wallet/${alice.pk}/transactions?type=pay`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('pay');
  });

  test('rejects invalid pagination', async () => {
    const res = await ctx.request.get(`${base}/wallet/${alice.pk}/transactions?page=-1`);
    expect(res.status).toBe(422);
  });
});

describe('POST /wallet/:pubkey/deposit', () => {
  test('requires auth', async () => {
    const res = await ctx.request.post(`${base}/wallet/${alice.pk}/deposit`).send({ currency: 'NGN', amount: 100 });
    expect(res.status).toBe(401);
  });

  test('forbids depositing into someone else\'s wallet', async () => {
    const res = await ctx.signed(bob.sk, 'POST', `${base}/wallet/${alice.pk}/deposit`, { currency: 'NGN', amount: 100 });
    expect(res.status).toBe(403);
  });

  test('credits NGN and writes a receive transaction', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/wallet/${alice.pk}/deposit`, {
      currency: 'NGN', amount: 5000, note: 'test top-up',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.wallet.balances.NGN).toBe(5000);
    expect(res.body.data.transaction.type).toBe('receive');
    expect(res.body.data.transaction.toAmount).toBe(5000);
    expect(res.body.data.transaction.toCurrency).toBe('NGN');
  });

  test('rejects zero or negative amount', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/wallet/${alice.pk}/deposit`, { currency: 'NGN', amount: 0 });
    expect(res.status).toBe(422);
  });
});

describe('POST /wallet/:pubkey/convert', () => {
  beforeEach(async () => {
    await createWalletDoc(alice.pk, { BTC: 0, NGN: 75000, USDT: 0 });
  });

  test('converts NGN to BTC and updates balances atomically', async () => {
    // mock rates: 1 BTC = ₦75,000,000  ⇒ ₦75,000 = 0.001 BTC
    const res = await ctx.signed(alice.sk, 'POST', `${base}/wallet/${alice.pk}/convert`, {
      fromCurrency: 'NGN', toCurrency: 'BTC', amount: 75000,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.wallet.balances.NGN).toBe(0);
    expect(res.body.data.wallet.balances.BTC).toBeCloseTo(0.001, 8);
    expect(res.body.data.transaction.type).toBe('convert');
  });

  test('rejects insufficient balance', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/wallet/${alice.pk}/convert`, {
      fromCurrency: 'BTC', toCurrency: 'NGN', amount: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/[Ii]nsufficient/);
  });

  test('rejects same-currency conversion', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/wallet/${alice.pk}/convert`, {
      fromCurrency: 'NGN', toCurrency: 'NGN', amount: 1,
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /wallet/:pubkey/save-to-btc', () => {
  beforeEach(async () => {
    await createWalletDoc(alice.pk, { BTC: 0, NGN: 1_500_000, USDT: 0 });
  });

  test('moves NGN into BTC and logs a save transaction', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/wallet/${alice.pk}/save-to-btc`, {
      sourceCurrency: 'NGN', amount: 75000,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.transaction.type).toBe('save');
    expect(res.body.data.transaction.toCurrency).toBe('BTC');
    expect(res.body.data.wallet.balances.NGN).toBe(1_425_000);
    expect(res.body.data.wallet.balances.BTC).toBeCloseTo(0.001, 8);
    expect(res.body.data.btcCredited).toBeCloseTo(0.001, 8);
  });
});

describe('POST /wallet/:pubkey/reward', () => {
  test('credits BTC reward and logs a learn-reward transaction', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/wallet/${alice.pk}/reward`, {
      amountBtc: 0.0001, note: 'finished a lesson',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.wallet.balances.BTC).toBe(0.0001);
    expect(res.body.data.transaction.type).toBe('learn-reward');
  });

  test('rejects reward above 1 BTC', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/wallet/${alice.pk}/reward`, { amountBtc: 5 });
    expect(res.status).toBe(422);
  });
});
