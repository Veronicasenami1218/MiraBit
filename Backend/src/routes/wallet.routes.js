/**
 * src/routes/wallet.routes.js
 *
 * Read endpoints (no auth):
 *   GET    /api/v1/wallet/:pubkey
 *   GET    /api/v1/wallet/:pubkey/balance
 *   GET    /api/v1/wallet/:pubkey/transactions?page=&limit=&type=
 *
 * Mutating endpoints (NIP-98 auth, must match :pubkey):
 *   POST   /api/v1/wallet                        – create wallet for req.nostrPubkey
 *   POST   /api/v1/wallet/:pubkey/deposit        – top up native currency
 *   POST   /api/v1/wallet/:pubkey/convert        – BTC<->NGN<->USDT
 *   POST   /api/v1/wallet/:pubkey/save-to-btc    – save native → BTC
 *   POST   /api/v1/wallet/:pubkey/reward         – credit BTC reward
 */

'use strict';

const { Router } = require('express');
const Joi = require('joi');

const {
  getWallet, createWallet, getBalance, getTransactions,
  deposit, convertFunds, saveToBtc, reward,
} = require('../controllers/wallet.controller');

const { requireNostrAuth } = require('../middleware/auth.middleware');
const { body, query }      = require('../middleware/validator');

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────────────────
const CURRENCY = Joi.string().valid('BTC', 'NGN', 'USDT');
const TX_TYPE  = Joi.string().valid('save', 'convert', 'pay', 'receive', 'learn-reward', 'all');

const paginationSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type:  TX_TYPE.optional(),
});

const depositSchema = Joi.object({
  currency: CURRENCY.required(),
  amount:   Joi.number().positive().required(),
  note:     Joi.string().max(500).optional(),
});

const convertSchema = Joi.object({
  fromCurrency: CURRENCY.required(),
  toCurrency:   CURRENCY.required(),
  amount:       Joi.number().positive().required(),
});

const saveSchema = Joi.object({
  sourceCurrency: CURRENCY.required(),
  amount:         Joi.number().positive().required(),
  goalId:         Joi.string().hex().length(24).optional(),
});

const rewardSchema = Joi.object({
  amountBtc: Joi.number().positive().max(1).required(), // hard cap 1 BTC per reward
  note:      Joi.string().max(500).optional(),
});

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /wallet/{pubkey}:
 *   get:
 *     tags: [Wallet]
 *     summary: Get wallet info by pubkey
 *     parameters:
 *       - $ref: '#/components/parameters/PubkeyParam'
 *     responses:
 *       200:
 *         description: Wallet found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/Wallet' } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:pubkey', getWallet);

/**
 * @swagger
 * /wallet/{pubkey}/balance:
 *   get:
 *     tags: [Wallet]
 *     summary: Get current wallet balances (multi-currency + Lightning shadow)
 *     parameters:
 *       - $ref: '#/components/parameters/PubkeyParam'
 *     responses:
 *       200:
 *         description: Balance snapshot
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/WalletBalance' } }
 */
router.get('/:pubkey/balance', getBalance);

/**
 * @swagger
 * /wallet/{pubkey}/transactions:
 *   get:
 *     tags: [Wallet]
 *     summary: Get paginated transaction history
 *     parameters:
 *       - $ref: '#/components/parameters/PubkeyParam'
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [save, convert, pay, receive, learn-reward, all] }
 *     responses:
 *       200:
 *         description: Transaction list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data: { type: array, items: { $ref: '#/components/schemas/Transaction' } }
 *                     meta:
 *                       type: object
 *                       properties:
 *                         page: { type: integer }
 *                         limit: { type: integer }
 *                         total: { type: integer }
 *                         hasMore: { type: boolean }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:pubkey/transactions', query(paginationSchema), getTransactions);

/**
 * @swagger
 * /wallet:
 *   post:
 *     tags: [Wallet]
 *     summary: Create a wallet for the authenticated pubkey (idempotent)
 *     security: [{ Nip98Auth: [] }]
 *     responses:
 *       201:
 *         description: Wallet created (or returned if already existed)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/Wallet' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/', requireNostrAuth, createWallet);

/**
 * @swagger
 * /wallet/{pubkey}/deposit:
 *   post:
 *     tags: [Wallet]
 *     summary: Top up wallet with native currency
 *     security: [{ Nip98Auth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PubkeyParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currency, amount]
 *             properties:
 *               currency: { $ref: '#/components/schemas/Currency' }
 *               amount:   { type: number, minimum: 0.00000001 }
 *               note:     { type: string, maxLength: 500 }
 *     responses:
 *       201:
 *         description: Deposit recorded, balance updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         wallet:      { $ref: '#/components/schemas/Wallet' }
 *                         transaction: { $ref: '#/components/schemas/Transaction' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/:pubkey/deposit', requireNostrAuth, body(depositSchema), deposit);

/**
 * @swagger
 * /wallet/{pubkey}/convert:
 *   post:
 *     tags: [Wallet]
 *     summary: Convert wallet funds between BTC, NGN, and USDT
 *     security: [{ Nip98Auth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PubkeyParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromCurrency, toCurrency, amount]
 *             properties:
 *               fromCurrency: { $ref: '#/components/schemas/Currency' }
 *               toCurrency:   { $ref: '#/components/schemas/Currency' }
 *               amount:       { type: number, minimum: 0.00000001 }
 *     responses:
 *       200:
 *         description: Conversion executed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         wallet:      { $ref: '#/components/schemas/Wallet' }
 *                         transaction: { $ref: '#/components/schemas/Transaction' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/:pubkey/convert', requireNostrAuth, body(convertSchema), convertFunds);

/**
 * @swagger
 * /wallet/{pubkey}/save-to-btc:
 *   post:
 *     tags: [Wallet]
 *     summary: Save funds (any currency) into BTC, optionally toward a goal
 *     security: [{ Nip98Auth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PubkeyParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sourceCurrency, amount]
 *             properties:
 *               sourceCurrency: { $ref: '#/components/schemas/Currency' }
 *               amount:         { type: number, minimum: 0.00000001 }
 *               goalId:         { type: string, pattern: '^[0-9a-f]{24}$' }
 *     responses:
 *       201:
 *         description: Funds saved to BTC; goal counter bumped if goalId provided
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         wallet:      { $ref: '#/components/schemas/Wallet' }
 *                         transaction: { $ref: '#/components/schemas/Transaction' }
 *                         btcCredited: { type: number }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/:pubkey/save-to-btc', requireNostrAuth, body(saveSchema), saveToBtc);

/**
 * @swagger
 * /wallet/{pubkey}/reward:
 *   post:
 *     tags: [Wallet]
 *     summary: Credit a BTC reward (typically from completing a learning quiz)
 *     security: [{ Nip98Auth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PubkeyParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amountBtc]
 *             properties:
 *               amountBtc: { type: number, minimum: 0.00000001, maximum: 1 }
 *               note:      { type: string, maxLength: 500 }
 *     responses:
 *       201:
 *         description: Reward credited
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         wallet:      { $ref: '#/components/schemas/Wallet' }
 *                         transaction: { $ref: '#/components/schemas/Transaction' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/:pubkey/reward', requireNostrAuth, body(rewardSchema), reward);

module.exports = router;
