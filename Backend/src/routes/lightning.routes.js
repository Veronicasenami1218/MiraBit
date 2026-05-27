/**
 * src/routes/lightning.routes.js
 *
 * GET  /api/v1/lightning/node/info            – node info
 * POST /api/v1/lightning/invoice              – create receive invoice
 * POST /api/v1/lightning/pay                  – pay invoice (auth required)
 * GET  /api/v1/lightning/payment/:paymentHash – payment status
 * POST /api/v1/lightning/lnurl/pay            – LNURL-pay (auth required)
 */

'use strict';

const { Router } = require('express');
const Joi = require('joi');

const {
  createInvoice,
  payInvoice,
  getPaymentStatus,
  lnurlPay,
  getNodeInfo,
} = require('../controllers/lightning.controller');

const { requireNostrAuth } = require('../middleware/auth.middleware');
const { strictLimiter }    = require('../middleware/rateLimiter');
const { body }             = require('../middleware/validator');

const router = Router();

// ── Validation Schemas ─────────────────────────────────────────────────────────
const createInvoiceSchema = Joi.object({
  amountSats:    Joi.number().integer().min(1).max(100_000_000).required(),
  description:   Joi.string().max(256).default('MiraBit payment'),
  expirySeconds: Joi.number().integer().min(60).max(86_400).default(3_600),
});

const payInvoiceSchema = Joi.object({
  invoice:    Joi.string().pattern(/^(lnbc|lntb|lnbcrt)\d/).required()
                .messages({ 'string.pattern.base': 'Invalid BOLT-11 invoice' }),
  amountSats: Joi.number().integer().min(1).optional(), // required for 0-amount invoices
});

const lnurlPaySchema = Joi.object({
  lnurl:      Joi.string().required(),
  amountSats: Joi.number().integer().min(1).required(),
});

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /lightning/node/info:
 *   get:
 *     tags: [Lightning]
 *     summary: Get Lightning node info (balance, pubkey, network)
 *     responses:
 *       200: { description: Node info }
 */
router.get('/node/info', getNodeInfo);

/**
 * @swagger
 * /lightning/invoice:
 *   post:
 *     tags: [Lightning]
 *     summary: Create a BOLT-11 receive invoice
 *     security: [{ Nip98Auth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amountSats]
 *             properties:
 *               amountSats:    { type: integer, minimum: 1, maximum: 100000000 }
 *               description:   { type: string, maxLength: 256, default: 'MiraBit payment' }
 *               expirySeconds: { type: integer, minimum: 60, maximum: 86400, default: 3600 }
 *     responses:
 *       201:
 *         description: Invoice created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         invoice:       { type: string, example: 'lnbc1...' }
 *                         amountSats:    { type: integer }
 *                         description:   { type: string }
 *                         expirySeconds: { type: integer }
 *                         reference:     { type: string }
 *                         createdAt:     { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/invoice',
  requireNostrAuth,
  body(createInvoiceSchema),
  createInvoice
);

/**
 * @swagger
 * /lightning/pay:
 *   post:
 *     tags: [Lightning]
 *     summary: Pay a BOLT-11 invoice
 *     security: [{ Nip98Auth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoice]
 *             properties:
 *               invoice:    { type: string, example: 'lnbc1...' }
 *               amountSats: { type: integer, description: 'Required for 0-amount invoices' }
 *     responses:
 *       200: { description: Payment sent }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/pay',
  requireNostrAuth,
  strictLimiter,
  body(payInvoiceSchema),
  payInvoice
);

/**
 * @swagger
 * /lightning/payment/{paymentHash}:
 *   get:
 *     tags: [Lightning]
 *     summary: Look up a payment by its hash
 *     parameters:
 *       - in: path
 *         name: paymentHash
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payment record }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/payment/:paymentHash', getPaymentStatus);

/**
 * @swagger
 * /lightning/lnurl/pay:
 *   post:
 *     tags: [Lightning]
 *     summary: Resolve and pay an LNURL-pay link
 *     security: [{ Nip98Auth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lnurl, amountSats]
 *             properties:
 *               lnurl:      { type: string }
 *               amountSats: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Payment sent }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/lnurl/pay',
  requireNostrAuth,
  strictLimiter,
  body(lnurlPaySchema),
  lnurlPay
);

module.exports = router;
