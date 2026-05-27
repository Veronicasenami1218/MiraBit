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
router.get('/node/info', getNodeInfo);

router.post('/invoice',
  requireNostrAuth,
  body(createInvoiceSchema),
  createInvoice
);

router.post('/pay',
  requireNostrAuth,
  strictLimiter,
  body(payInvoiceSchema),
  payInvoice
);

router.get('/payment/:paymentHash', getPaymentStatus);

router.post('/lnurl/pay',
  requireNostrAuth,
  strictLimiter,
  body(lnurlPaySchema),
  lnurlPay
);

module.exports = router;
