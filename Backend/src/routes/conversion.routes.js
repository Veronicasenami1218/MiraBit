/**
 * src/routes/conversion.routes.js
 *
 * GET  /api/v1/conversion/rates       – all rates snapshot
 * GET  /api/v1/conversion/rate        – specific pair (?from=BTC&to=NGN)
 * POST /api/v1/conversion/convert     – convert amount
 * GET  /api/v1/conversion/btc/sats    – BTC → satoshis (?amount=0.001)
 * GET  /api/v1/conversion/sats/btc    – satoshis → BTC (?amount=100000)
 */

'use strict';

const { Router } = require('express');
const Joi = require('joi');

const {
  getRates,
  getRate,
  convert,
  btcToSats,
  satsToBtc,
} = require('../controllers/conversion.controller');

const { body } = require('../middleware/validator');

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────────────────
const convertSchema = Joi.object({
  amount: Joi.number().positive().required(),
  from:   Joi.string().uppercase().valid('BTC', 'NGN', 'USDT', 'USD').required(),
  to:     Joi.string().uppercase().valid('BTC', 'NGN', 'USDT', 'USD').required(),
});

// ── Routes ─────────────────────────────────────────────────────────────────────
router.get('/rates',    getRates);
router.get('/rate',     getRate);
router.post('/convert', body(convertSchema), convert);
router.get('/btc/sats', btcToSats);
router.get('/sats/btc', satsToBtc);

module.exports = router;
