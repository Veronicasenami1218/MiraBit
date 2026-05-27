/**
 * src/routes/conversion.routes.js
 *
 * GET  /api/v1/conversion/rates       – all rates snapshot (legacy shape)
 * GET  /api/v1/conversion/rates/fe    – frontend shape { BTC_USD, USD_NGN, updatedAt, isStale }
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
  getRatesForFrontend,
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

/**
 * @swagger
 * /conversion/rates:
 *   get:
 *     tags: [Conversion]
 *     summary: Get all exchange rates (legacy/admin shape)
 *     responses:
 *       200:
 *         description: Rate snapshot
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         BTC_USD:   { type: number }
 *                         BTC_NGN:   { type: number }
 *                         USDT_USD:  { type: number }
 *                         USDT_NGN:  { type: number }
 *                         fetchedAt: { type: string, format: date-time }
 *                         cached:    { type: boolean }
 *                         stale:     { type: boolean }
 */
router.get('/rates', getRates);

/**
 * @swagger
 * /conversion/rates/fe:
 *   get:
 *     tags: [Conversion]
 *     summary: Rates in the frontend's expected shape
 *     description: Returns `{ BTC_USD, USD_NGN, updatedAt, isStale }` — matches the React `useRates()` interface.
 *     responses:
 *       200:
 *         description: Frontend-shaped rates
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/Rates' } }
 */
router.get('/rates/fe', getRatesForFrontend);

/**
 * @swagger
 * /conversion/rate:
 *   get:
 *     tags: [Conversion]
 *     summary: Get a specific pair's rate
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, enum: [BTC, NGN, USDT, USD] }
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, enum: [BTC, NGN, USDT, USD] }
 *     responses:
 *       200:
 *         description: Rate
 *       400: { $ref: '#/components/responses/BadRequest' }
 */
router.get('/rate', getRate);

/**
 * @swagger
 * /conversion/convert:
 *   post:
 *     tags: [Conversion]
 *     summary: Convert an amount between currencies (read-only calculation)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, from, to]
 *             properties:
 *               amount: { type: number, minimum: 0.00000001 }
 *               from:   { type: string, enum: [BTC, NGN, USDT, USD] }
 *               to:     { type: string, enum: [BTC, NGN, USDT, USD] }
 *     responses:
 *       200:
 *         description: Conversion result (does not affect wallet)
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/convert', body(convertSchema), convert);

/**
 * @swagger
 * /conversion/btc/sats:
 *   get:
 *     tags: [Conversion]
 *     summary: BTC → satoshis (utility, no rates needed)
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         schema: { type: number, minimum: 0 }
 *     responses:
 *       200: { description: Result }
 */
router.get('/btc/sats', btcToSats);

/**
 * @swagger
 * /conversion/sats/btc:
 *   get:
 *     tags: [Conversion]
 *     summary: Satoshis → BTC (utility, no rates needed)
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         schema: { type: integer, minimum: 0 }
 *     responses:
 *       200: { description: Result }
 */
router.get('/sats/btc', satsToBtc);

module.exports = router;
