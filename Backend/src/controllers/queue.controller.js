/**
 * src/controllers/queue.controller.js – Offline Payment Queue endpoints
 *
 * All endpoints require NIP-98 auth and operate on req.nostrPubkey.
 */

'use strict';

const queueService = require('../services/queue.service');
const { ok, created, notFound, badRequest } = require('../utils/response');
const logger = require('../utils/logger');

// ── POST /payments/queue ─────────────────────────────────────────────────────
// Body: { recipient, amount, sourceCurrency, note? }
const enqueue = async (req, res, next) => {
  try {
    const { recipient, amount, sourceCurrency, note } = req.body;
    const item = await queueService.enqueue({
      pubkey: req.nostrPubkey, recipient, amount, sourceCurrency, note,
    });
    return created(res, 'Payment queued for settlement', item);
  } catch (err) {
    logger.error('queue.enqueue error:', err);
    if (/must/i.test(err.message)) return badRequest(res, err.message);
    next(err);
  }
};

// ── GET /payments/queue ──────────────────────────────────────────────────────
// Query: ?statuses=queued,failed&limit=50
const list = async (req, res, next) => {
  try {
    const { statuses, limit } = req.query;
    const statusArr = typeof statuses === 'string'
      ? statuses.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const items = await queueService.list(req.nostrPubkey, {
      statuses: statusArr,
      limit:    limit ? parseInt(limit, 10) : undefined,
    });
    return ok(res, 'Queued payments retrieved', items);
  } catch (err) { logger.error('queue.list error:', err); next(err); }
};

// ── DELETE /payments/queue/:id ───────────────────────────────────────────────
const cancel = async (req, res, next) => {
  try {
    const result = await queueService.cancel(req.nostrPubkey, req.params.id);
    if (!result) return notFound(res, 'Item not found, not yours, or no longer cancellable');
    return ok(res, 'Queued payment cancelled', result);
  } catch (err) {
    logger.error('queue.cancel error:', err);
    if (err.name === 'CastError') return badRequest(res, 'Invalid queue item id');
    next(err);
  }
};

// ── POST /payments/queue/flush ───────────────────────────────────────────────
// Body: { batchSize?: number }
const flush = async (req, res, next) => {
  try {
    const batchSize = req.body?.batchSize;
    const result = await queueService.flush(req.nostrPubkey, { batchSize });
    return ok(res, 'Queue flush complete', result);
  } catch (err) { logger.error('queue.flush error:', err); next(err); }
};

module.exports = { enqueue, list, cancel, flush };
