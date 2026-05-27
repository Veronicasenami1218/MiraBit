/**
 * src/services/queue.service.js – Offline Payment Queue
 *
 * Persists payments the user submitted while offline so they can be
 * settled when connectivity returns – even if the client device is
 * wiped between enqueue and settle.
 *
 * Concurrency model
 * ─────────────────
 * Each queued payment is leased to a worker via {lockToken, lockedUntil}.
 * Only items with status='queued' (or expired processing leases) are
 * eligible to be picked up. The lease lasts FLUSH_LEASE_MS so a crashed
 * worker's items become re-runnable automatically.
 *
 * The flush algorithm:
 *   1. Atomically claim up to N queued items for this pubkey by setting
 *      status='processing' + lockToken + lockedUntil (single Mongo update
 *      per item with optimistic CAS).
 *   2. For each claimed item:
 *      a. Refresh rates + recompute amountSats from sourceCurrency/amount
 *      b. Verify wallet balance covers it (else mark failed)
 *      c. Call lightning.service.payInvoice (or send to address)
 *      d. On success: atomically debit balances, write Transaction,
 *         mark queue item completed with paymentHash + transactionId
 *      e. On failure: increment attempts, write lastError, either re-queue
 *         (attempts < maxAttempts) or mark permanently failed.
 *   3. Return per-item results so the controller can shape the response.
 */

'use strict';

const crypto = require('crypto');

const { QueuedPayment, Wallet, Transaction } = require('../models');
const conversionService  = require('./conversion.service');
const lightningService   = require('./lightning.service');
const logger             = require('../utils/logger');

const FLUSH_LEASE_MS = 60_000; // 60s: a single payment attempt should be well under this
const DEFAULT_BATCH  = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Crude BOLT-11 detector. We don't fully parse the invoice; the
 * Lightning service / Breez SDK will reject malformed ones.
 */
const classifyRecipient = (input) => {
  const s = String(input || '').trim().toLowerCase();
  if (/^(lnbc|lntb|lnbcrt)\d/.test(s))                     return 'invoice';
  if (s.startsWith('lnurl') || s.startsWith('lightning:lnurl')) return 'lnurl';
  if (/^(bc1|tb1|[13]|[mn])[a-z0-9]{10,}$/.test(s))        return 'onchain';
  if (s.startsWith('@'))                                   return 'handle';
  return 'unknown';
};

/**
 * Convert a {amount, sourceCurrency} pair to satoshis using the most
 * recent FX rates. BTC→sats is exact; others go via the conversion svc.
 */
const toSats = async ({ amount, sourceCurrency }) => {
  let btcAmount;
  if (sourceCurrency === 'BTC') {
    btcAmount = amount;
  } else {
    const r = await conversionService.convert({
      amount, from: sourceCurrency, to: 'BTC',
    });
    btcAmount = r.outputAmount;
  }
  return Math.max(1, Math.round(btcAmount * 1e8));
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a new payment for later settlement.
 *
 * @param {object} args
 * @param {string} args.pubkey
 * @param {string} args.recipient
 * @param {number} args.amount
 * @param {('BTC'|'NGN'|'USDT')} args.sourceCurrency
 * @param {string} [args.note]
 */
const enqueue = async ({ pubkey, recipient, amount, sourceCurrency, note }) => {
  const normalized = pubkey.toLowerCase();
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  // Snapshot rates at queue time so the user's BTC-equivalent intent is preserved
  let rateSnapshot = { BTC_USD: null, USD_NGN: null, fetchedAt: null };
  try {
    const r = await conversionService.getRatesForFrontend();
    rateSnapshot = {
      BTC_USD:   r.BTC_USD,
      USD_NGN:   r.USD_NGN,
      fetchedAt: new Date(r.updatedAt),
    };
  } catch (_) { /* offline at enqueue time is fine */ }

  let amountSats = null;
  try { amountSats = await toSats({ amount, sourceCurrency }); }
  catch (_) { /* will be computed at flush time */ }

  const doc = await QueuedPayment.create({
    pubkey:         normalized,
    status:         'queued',
    recipient,
    recipientType:  classifyRecipient(recipient),
    amount,
    sourceCurrency,
    amountSats,
    note:           note || null,
    rateSnapshot,
  });

  logger.info(`queue.enqueue: ${normalized} → ${amount} ${sourceCurrency} (${doc.recipientType})`);
  return doc.toJSON();
};

/**
 * List queued + recently-settled payments for a pubkey.
 *
 * @param {string} pubkey
 * @param {object} [opts]
 * @param {string[]} [opts.statuses] – filter; default ['queued','processing','failed']
 * @param {number}   [opts.limit]    – default 50
 */
const list = async (pubkey, { statuses, limit = 50 } = {}) => {
  const filter = { pubkey: pubkey.toLowerCase() };
  if (statuses && statuses.length) filter.status = { $in: statuses };

  const docs = await QueuedPayment.find(filter)
    .sort({ createdAt: 1 }) // FIFO order
    .limit(Math.min(limit, 200));
  return docs.map((d) => d.toJSON());
};

/**
 * User-initiated cancel. Only items still queued (or with an expired
 * lease) can be cancelled.
 */
const cancel = async (pubkey, queueId) => {
  const now = new Date();
  const result = await QueuedPayment.findOneAndUpdate(
    {
      _id:    queueId,
      pubkey: pubkey.toLowerCase(),
      $or: [
        { status: 'queued' },
        { status: 'processing', lockedUntil: { $lt: now } }, // stale lease
      ],
    },
    { $set: { status: 'cancelled', lockToken: null, lockedUntil: null } },
    { new: true }
  );
  return result ? result.toJSON() : null;
};

/**
 * Try to atomically claim a single queued item for this worker.
 * Returns the leased document or null when none is available.
 */
const claimNext = async (pubkey, lockToken) => {
  const now         = new Date();
  const leaseExpiry = new Date(now.getTime() + FLUSH_LEASE_MS);

  return QueuedPayment.findOneAndUpdate(
    {
      pubkey: pubkey.toLowerCase(),
      $or: [
        { status: 'queued' },
        { status: 'processing', lockedUntil: { $lt: now } }, // re-pick stale leases
      ],
    },
    {
      $set: {
        status:          'processing',
        lockToken,
        lockedUntil:     leaseExpiry,
        lastAttemptedAt: now,
      },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { createdAt: 1 } }
  );
};

/**
 * Settle a single claimed item: pay the invoice, debit balances, log tx.
 * Releases the lease (either by completing or failing the item).
 *
 * @returns {Promise<object>} the updated queue document (POJO)
 */
const settleClaimed = async (item) => {
  const pubkey = item.pubkey;
  let amountSats = item.amountSats;

  try {
    // (Re)compute amountSats if it wasn't set at enqueue (rates were offline then)
    if (!amountSats) {
      amountSats = await toSats({
        amount:         item.amount,
        sourceCurrency: item.sourceCurrency,
      });
      item.amountSats = amountSats;
      await item.save();
    }

    // Need an invoice/lnurl to pay through Lightning. On-chain / handle
    // resolution is out of scope here and marked as a permanent failure.
    if (item.recipientType !== 'invoice' && item.recipientType !== 'lnurl') {
      throw Object.assign(
        new Error(`Recipient type '${item.recipientType}' not supported by flusher (need invoice or lnurl)`),
        { permanent: true }
      );
    }

    // Balance check against sourceCurrency. Atomic with the debit below.
    const wallet = await Wallet.findOne({ pubkey });
    if (!wallet || (wallet.balances[item.sourceCurrency] || 0) < item.amount) {
      throw Object.assign(
        new Error(`Insufficient ${item.sourceCurrency} balance`),
        { permanent: true }
      );
    }

    // Actually pay via Lightning service. We pass skipLog:true because we
    // write a richer Transaction ourselves below (with the queue context).
    const payment =
      item.recipientType === 'invoice'
        ? await lightningService.payInvoice({
            invoice:     item.recipient,
            amountSats,
            payerPubkey: pubkey,
            skipLog:     true,
          })
        : await lightningService.lnurlPay({
            lnurl:       item.recipient,
            amountSats,
            payerPubkey: pubkey,
            skipLog:     true,
          });

    // Debit source currency atomically with a conditional update
    const debited = await Wallet.findOneAndUpdate(
      {
        pubkey,
        [`balances.${item.sourceCurrency}`]: { $gte: item.amount },
      },
      { $inc: { [`balances.${item.sourceCurrency}`]: -item.amount } },
      { new: true }
    );

    if (!debited) {
      // Should not happen because we just checked, but be safe.
      throw Object.assign(
        new Error('Balance debit failed after payment – manual reconciliation required'),
        { permanent: true, criticalReconcile: true, paymentHash: payment.paymentHash }
      );
    }

    // Log a user-facing Transaction (type: 'pay')
    const tx = await Transaction.create({
      pubkey,
      type:         'pay',
      status:       'completed',
      fromCurrency: item.sourceCurrency,
      fromAmount:   item.amount,
      toCurrency:   item.sourceCurrency, // settled in source currency
      toAmount:     item.amount,
      note:         item.note || 'Offline-queued payment',
      counterparty: item.recipient,
      paymentHash:  payment.paymentHash || null,
      invoice:      item.recipient,
      rateSnapshot: item.rateSnapshot,
      metadata:     { queueId: item._id, attempts: item.attempts },
      settledAt:    new Date(),
    });

    // Mark queue item completed
    const completed = await QueuedPayment.findByIdAndUpdate(
      item._id,
      {
        $set: {
          status:        'completed',
          paymentHash:   payment.paymentHash || null,
          transactionId: tx._id,
          settledAt:     new Date(),
          lockToken:     null,
          lockedUntil:   null,
          lastError:     null,
        },
      },
      { new: true }
    );

    logger.info(`queue.settle: ✅ ${item._id} (${item.amount} ${item.sourceCurrency} → ${amountSats} sats)`);
    return completed.toJSON();
  } catch (err) {
    const permanent = err.permanent === true || item.attempts >= item.maxAttempts;
    const update = {
      $set: {
        lastError:   err.message.slice(0, 500),
        lockToken:   null,
        lockedUntil: null,
        status:      permanent ? 'failed' : 'queued',
      },
    };

    const updated = await QueuedPayment.findByIdAndUpdate(item._id, update, { new: true });
    logger.warn(
      `queue.settle: ${permanent ? '❌ PERMANENT' : '↻ retryable'} ${item._id} – ${err.message}`
    );
    return updated.toJSON();
  }
};

/**
 * Settle all currently-eligible queued payments for a pubkey.
 * Caller (controller) typically invokes this when the device comes back
 * online. Caller can pass `batchSize` to bound the number processed in
 * a single request.
 *
 * @param {string} pubkey
 * @param {{ batchSize?: number }} [opts]
 * @returns {Promise<{ processed: number, completed: number, failed: number, retried: number, items: object[] }>}
 */
const flush = async (pubkey, { batchSize = DEFAULT_BATCH } = {}) => {
  const normalized = pubkey.toLowerCase();
  const lockToken  = crypto.randomBytes(16).toString('hex');

  const items   = [];
  let completed = 0;
  let failed    = 0;
  let retried   = 0;

  for (let i = 0; i < batchSize; i++) {
    const claimed = await claimNext(normalized, lockToken);
    if (!claimed) break;

    const result = await settleClaimed(claimed);
    items.push(result);

    if      (result.status === 'completed') completed++;
    else if (result.status === 'failed')    failed++;
    else                                    retried++; // requeued
  }

  logger.info(
    `queue.flush[${normalized}]: processed=${items.length} completed=${completed} failed=${failed} retried=${retried}`
  );

  return { processed: items.length, completed, failed, retried, items };
};

module.exports = { enqueue, list, cancel, flush, classifyRecipient };
