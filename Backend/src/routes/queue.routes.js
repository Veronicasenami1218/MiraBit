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

/**
 * @swagger
 * /payments/queue:
 *   get:
 *     tags: [Payments]
 *     summary: List my queued payments (FIFO order)
 *     security: [{ Nip98Auth: [] }]
 *     parameters:
 *       - in: query
 *         name: statuses
 *         description: Comma-separated list (e.g. `queued,failed`)
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200, default: 50 }
 *     responses:
 *       200:
 *         description: Queue items
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data: { type: array, items: { $ref: '#/components/schemas/QueuedPayment' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     tags: [Payments]
 *     summary: Enqueue a payment for later settlement (used while offline)
 *     security: [{ Nip98Auth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipient, amount, sourceCurrency]
 *             properties:
 *               recipient:      { type: string, minLength: 4, maxLength: 2000 }
 *               amount:         { type: number, minimum: 0.00000001 }
 *               sourceCurrency: { $ref: '#/components/schemas/Currency' }
 *               note:           { type: string, maxLength: 500 }
 *     responses:
 *       201:
 *         description: Queued
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/QueuedPayment' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
// Order matters: /queue/flush must come BEFORE /queue/:id so Express
// does not interpret 'flush' as an id.

/**
 * @swagger
 * /payments/queue/flush:
 *   post:
 *     tags: [Payments]
 *     summary: Settle queued payments NOW (lease-based, FIFO)
 *     description: |
 *       Attempts up to `batchSize` items per call. Each item is leased to
 *       this caller to prevent double-spend if two flushers run in parallel.
 *       Failed items either re-queue (if attempts < maxAttempts) or are
 *       marked permanently failed.
 *     security: [{ Nip98Auth: [] }]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200:
 *         description: Flush summary
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/FlushSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/queue/flush', requireNostrAuth, strictLimiter, body(flushSchema), flush);

router.post('/queue', requireNostrAuth, body(enqueueSchema), enqueue);
router.get ('/queue', requireNostrAuth, list);

/**
 * @swagger
 * /payments/queue/{id}:
 *   delete:
 *     tags: [Payments]
 *     summary: Cancel one of my queued payments
 *     security: [{ Nip98Auth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Cancelled
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/QueuedPayment' } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/queue/:id', requireNostrAuth, cancel);

module.exports = router;
