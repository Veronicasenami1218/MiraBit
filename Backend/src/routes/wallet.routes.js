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
 *   POST   /api/v1/wallet/:pubkey/convert        – BTC↔NGN↔USDT
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
router.get('/:pubkey',              getWallet);
router.get('/:pubkey/balance',      getBalance);
router.get('/:pubkey/transactions', query(paginationSchema), getTransactions);

router.post('/',                          requireNostrAuth, createWallet);
router.post('/:pubkey/deposit',           requireNostrAuth, body(depositSchema), deposit);
router.post('/:pubkey/convert',           requireNostrAuth, body(convertSchema), convertFunds);
router.post('/:pubkey/save-to-btc',       requireNostrAuth, body(saveSchema),    saveToBtc);
router.post('/:pubkey/reward',            requireNostrAuth, body(rewardSchema),  reward);

module.exports = router;
