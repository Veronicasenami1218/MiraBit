/**
 * Integration: /api/v1/payments – offline payment queue
 *
 * Critical behaviours under test:
 *   - enqueue while "offline", recipient classifier, idempotent shape
 *   - list / cancel
 *   - flush settles invoice queue items via lightning service
 *     (Breez mock returns success)
 *   - flush atomically debits the wallet balance and writes a Transaction
 *   - on insufficient balance the item is marked permanently failed
 *   - lease/lock prevents concurrent flushers from double-paying the same
 *     queued item (run two flushes back-to-back with shared state)
 */

'use strict';

require('../helpers/mocks').install();

const breezService = require('../../src/services/breez.service');

const { connectTestDb, disconnectTestDb, clearTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { makeKeypair } = require('../helpers/auth');
const { createWalletDoc, createQueuedPayment } = require('../helpers/factories');
const { QueuedPayment, Transaction, Wallet } = require('../../src/models');

let ctx, alice;

beforeAll(async () => {
  await connectTestDb();
  ctx = await startTestServer();
  alice = makeKeypair();
});
beforeEach(async () => { jest.clearAllMocks(); });
afterEach(async () => { await clearTestDb(); });
afterAll(async () => { await ctx.close(); await disconnectTestDb(); });

const base = '/api/v1/payments';

describe('POST /queue (enqueue)', () => {
  test('requires auth', async () => {
    const res = await ctx.request.post(`${base}/queue`).send({});
    expect(res.status).toBe(401);
  });

  test('enqueues an invoice payment with classifier hit', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/queue`, {
      recipient: 'lnbc100n1mockinvoice',
      amount: 0.0001,
      sourceCurrency: 'BTC',
      note: 'offline',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('queued');
    expect(res.body.data.recipientType).toBe('invoice');
    expect(res.body.data.amountSats).toBe(10000);
  });

  test('enqueues even when classifier returns unknown', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/queue`, {
      recipient: '@friend', amount: 50, sourceCurrency: 'NGN',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.recipientType).toBe('handle');
  });

  test('rejects bad input', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/queue`, {
      recipient: 'x', amount: -1, sourceCurrency: 'BTC',
    });
    expect(res.status).toBe(422);
  });
});

describe('GET /queue (list)', () => {
  test('returns only my items, in FIFO order', async () => {
    const bob = makeKeypair();
    await createQueuedPayment(bob.pk);
    const a = await createQueuedPayment(alice.pk, { recipient: 'lnbc1older', amount: 0.0001 });
    // ensure ordering by ts
    await new Promise(r => setTimeout(r, 5));
    const b = await createQueuedPayment(alice.pk, { recipient: 'lnbc1newer', amount: 0.0002 });

    const res = await ctx.signed(alice.sk, 'GET', `${base}/queue`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].id).toBe(a._id.toString());
    expect(res.body.data[1].id).toBe(b._id.toString());
  });
});

describe('DELETE /queue/:id (cancel)', () => {
  test('cancels my queued item', async () => {
    const q = await createQueuedPayment(alice.pk);
    const res = await ctx.signed(alice.sk, 'DELETE', `${base}/queue/${q._id.toString()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  test('cannot cancel someone else\'s item', async () => {
    const bob = makeKeypair();
    const q = await createQueuedPayment(bob.pk);
    const res = await ctx.signed(alice.sk, 'DELETE', `${base}/queue/${q._id.toString()}`);
    expect(res.status).toBe(404);
  });

  test('cannot cancel an already-completed item', async () => {
    const q = await createQueuedPayment(alice.pk, { status: 'completed' });
    const res = await ctx.signed(alice.sk, 'DELETE', `${base}/queue/${q._id.toString()}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /queue/flush — end-to-end', () => {
  test('settles a queued invoice payment, debits balance, writes Transaction', async () => {
    // Seed a wallet with 0.01 BTC and a 0.001 BTC queued payment
    await createWalletDoc(alice.pk, { BTC: 0.01, NGN: 0, USDT: 0 });
    await createQueuedPayment(alice.pk, {
      recipient: 'lnbc1mockpayme',
      recipientType: 'invoice',
      amount: 0.001,
      sourceCurrency: 'BTC',
      amountSats: 100000,
    });

    const res = await ctx.signed(alice.sk, 'POST', `${base}/queue/flush`, {});
    expect(res.status).toBe(200);
    expect(res.body.data.processed).toBe(1);
    expect(res.body.data.completed).toBe(1);
    expect(res.body.data.failed).toBe(0);

    // Wallet debited
    const w = await Wallet.findOne({ pubkey: alice.pk.toLowerCase() });
    expect(w.balances.BTC).toBeCloseTo(0.009, 8);

    // Transaction recorded
    const txs = await Transaction.find({ pubkey: alice.pk.toLowerCase(), type: 'pay' });
    expect(txs).toHaveLength(1);
    expect(txs[0].status).toBe('completed');

    // Queue item is now completed
    const q = await QueuedPayment.findOne({ pubkey: alice.pk.toLowerCase() });
    expect(q.status).toBe('completed');
    expect(q.paymentHash).toBeTruthy();
  });

  test('marks insufficient-balance item as permanently failed', async () => {
    await createWalletDoc(alice.pk, { BTC: 0.0001, NGN: 0, USDT: 0 });
    const q = await createQueuedPayment(alice.pk, {
      recipient: 'lnbc1bigpay',
      recipientType: 'invoice',
      amount: 0.01,                // more than wallet has
      sourceCurrency: 'BTC',
      amountSats: 1_000_000,
    });

    const res = await ctx.signed(alice.sk, 'POST', `${base}/queue/flush`, {});
    expect(res.status).toBe(200);
    expect(res.body.data.failed + res.body.data.retried).toBeGreaterThan(0);

    // After enough attempts the item should be permanently failed
    const updated = await QueuedPayment.findById(q._id);
    // It may take maxAttempts (5) for retryable failures, but insufficient
    // balance is marked `permanent` immediately
    expect(updated.status).toBe('failed');
    expect(updated.lastError).toMatch(/Insufficient/i);

    // No payment Transaction should be written
    expect(await Transaction.countDocuments({ pubkey: alice.pk.toLowerCase(), type: 'pay' })).toBe(0);
  });

  test('non-invoice/lnurl recipient is permanently failed (no resolver yet)', async () => {
    await createWalletDoc(alice.pk, { BTC: 0.1, NGN: 0, USDT: 0 });
    await createQueuedPayment(alice.pk, {
      recipient: '@some-handle',
      recipientType: 'handle',
      amount: 0.001, sourceCurrency: 'BTC', amountSats: 100000,
    });
    const res = await ctx.signed(alice.sk, 'POST', `${base}/queue/flush`, {});
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.items[0].status).toBe('failed');
    expect(res.body.data.items[0].lastError).toMatch(/not supported/);
  });

  test('skips empty queue', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/queue/flush`, {});
    expect(res.status).toBe(200);
    expect(res.body.data.processed).toBe(0);
  });

  test('lock prevents double-pay across concurrent flushes', async () => {
    // Single item, two flushes in parallel.
    await createWalletDoc(alice.pk, { BTC: 0.01, NGN: 0, USDT: 0 });
    await createQueuedPayment(alice.pk, {
      recipient: 'lnbc1mockpayme',
      recipientType: 'invoice',
      amount: 0.001, sourceCurrency: 'BTC', amountSats: 100000,
    });

    // Spy on Breez sendPayment so we can count actual calls
    breezService.sendPayment.mockClear();

    const [r1, r2] = await Promise.all([
      ctx.signed(alice.sk, 'POST', `${base}/queue/flush`, {}),
      ctx.signed(alice.sk, 'POST', `${base}/queue/flush`, {}),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    // Exactly ONE flusher should have actually paid the invoice.
    expect(breezService.sendPayment).toHaveBeenCalledTimes(1);

    // Wallet was debited exactly once
    const w = await Wallet.findOne({ pubkey: alice.pk.toLowerCase() });
    expect(w.balances.BTC).toBeCloseTo(0.009, 8);

    // And only one completed Transaction exists
    const completed = await Transaction.countDocuments({
      pubkey: alice.pk.toLowerCase(),
      type: 'pay',
      status: 'completed',
    });
    expect(completed).toBe(1);
  });
});
