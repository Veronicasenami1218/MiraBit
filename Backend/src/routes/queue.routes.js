/**
 * src/routes/queue.routes.js – Offline Payment Queue
 *
 * Mounted at /api/v1/payments  (see routes/index.js)
 *
 * POST   /payments/queue          – enqueue a new payment (NIP-98 auth)
 * GET    /payments/queue          – list my queued / processing / failed items
 * DELETE /payments/queue/:id      – cancel one of my queued items
 * POST   /payments/queue/flush    – attempt to settle queued items NOW
 *
 * The frontend calls /flush automatically when it detects the device is
 * back online (OfflineBanner.tsx auto-trigger).
 */

'use strict';

const { Router } = require('express');
const Joi = require('joi');

const { enqueue, list, cancel, flush } = require('../controllers/queue.controller');
const { requireNostrAuth } = require('../middleware/auth.middleware');
const { strictLimiter }    = require('../middleware/rateLimiter');
const { body }             = require('../middleware/validator');

const router = Router();

const CURRENCY = Joi.string().valid('BTC', 'NGN', 'USDT');

const enqueueSchema = Joi.object({
  recipient:      Joi.string().min(4).max(2000).required(),
  amount:         Joi.number().positive().required(),
  sourceCurrency: CURRENCY.required(),
  note:           Joi.string().max(500).optional(),
});

const flushSchema = Joi.object({
  batchSize: Joi.number().integer().min(1).max(50).optional(),
});

// Order matters: /queue/flush must come BEFORE /queue/:id so Express
// does not interpret 'flush' as an id.
router.post  ('/queue/flush', requireNostrAuth, strictLimiter, body(flushSchema), flush);

router.post  ('/queue',       requireNostrAuth, body(enqueueSchema), enqueue);
router.get   ('/queue',       requireNostrAuth, list);
router.delete('/queue/:id',   requireNostrAuth, cancel);

module.exports = router;
