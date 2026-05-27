/**
 * Integration: /api/v1/user preferences + account reset
 */

'use strict';

require('../helpers/mocks').install();

const { connectTestDb, disconnectTestDb, clearTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { makeKeypair } = require('../helpers/auth');
const {
  createWalletDoc, createGoalDoc, createTxDoc,
} = require('../helpers/factories');
const {
  Wallet, Transaction, SavingsGoal, LearnProgress, UserPreferences, QueuedPayment,
} = require('../../src/models');

let ctx, alice;

beforeAll(async () => {
  await connectTestDb();
  ctx = await startTestServer();
  alice = makeKeypair();
});
afterEach(async () => { await clearTestDb(); });
afterAll(async () => { await ctx.close(); await disconnectTestDb(); });

const base = '/api/v1/user';

describe('GET /preferences', () => {
  test('requires auth', async () => {
    const res = await ctx.request.get(`${base}/preferences`);
    expect(res.status).toBe(401);
  });

  test('auto-creates with defaults on first call', async () => {
    const res = await ctx.signed(alice.sk, 'GET', `${base}/preferences`);
    expect(res.status).toBe(200);
    expect(res.body.data.theme).toBe('system');
    expect(res.body.data.displayCurrency).toBe('NGN');
    expect(res.body.data.useAppBlossomServers).toBe(true);
  });
});

describe('PUT /preferences', () => {
  test('rejects empty patch', async () => {
    const res = await ctx.signed(alice.sk, 'PUT', `${base}/preferences`, {});
    expect(res.status).toBe(422);
  });

  test('updates theme and displayCurrency', async () => {
    const res = await ctx.signed(alice.sk, 'PUT', `${base}/preferences`, {
      theme: 'dark', displayCurrency: 'USD',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.theme).toBe('dark');
    expect(res.body.data.displayCurrency).toBe('USD');
  });

  test('rejects invalid theme', async () => {
    const res = await ctx.signed(alice.sk, 'PUT', `${base}/preferences`, { theme: 'neon' });
    expect(res.status).toBe(422);
  });
});

describe('POST /account/reset', () => {
  test('wipes every collection for the authenticated pubkey', async () => {
    // Seed every collection
    await createWalletDoc(alice.pk);
    await createGoalDoc(alice.pk);
    await createTxDoc(alice.pk);
    await LearnProgress.create({ pubkey: alice.pk.toLowerCase(), completed: ['x'], earnedBtc: 0.0001 });
    await UserPreferences.create({ pubkey: alice.pk.toLowerCase(), theme: 'dark' });
    await QueuedPayment.create({
      pubkey: alice.pk.toLowerCase(),
      recipient: 'lnbc1mock', recipientType: 'invoice',
      amount: 0.001, sourceCurrency: 'BTC', amountSats: 100000,
    });

    const res = await ctx.signed(alice.sk, 'POST', `${base}/account/reset`);
    expect(res.status).toBe(200);
    expect(res.body.data.wallets).toBe(1);
    expect(res.body.data.transactions).toBe(1);
    expect(res.body.data.savingsGoals).toBe(1);
    expect(res.body.data.learnProgress).toBe(1);
    expect(res.body.data.preferences).toBe(1);
    expect(res.body.data.queuedPayments).toBe(1);

    // Verify the DB actually emptied for this pubkey
    expect(await Wallet.countDocuments({ pubkey: alice.pk.toLowerCase() })).toBe(0);
    expect(await Transaction.countDocuments({ pubkey: alice.pk.toLowerCase() })).toBe(0);
    expect(await SavingsGoal.countDocuments({ pubkey: alice.pk.toLowerCase() })).toBe(0);
  });
});
