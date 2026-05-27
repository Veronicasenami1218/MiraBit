/**
 * src/routes/wallet.routes.js
 *
 * GET  /api/v1/wallet/:pubkey              – get wallet info
 * POST /api/v1/wallet                      – create wallet (NIP-98 auth required)
 * GET  /api/v1/wallet/:pubkey/balance      – get balance
 * GET  /api/v1/wallet/:pubkey/transactions – get transaction history
 */

'use strict';

const { Router } = require('express');
const Joi = require('joi');

const { getWallet, createWallet, getBalance, getTransactions } = require('../controllers/wallet.controller');
const { requireNostrAuth } = require('../middleware/auth.middleware');
const { body, query }      = require('../middleware/validator');

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────────────────
const paginationSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// ── Routes ─────────────────────────────────────────────────────────────────────
router.get('/:pubkey',              getWallet);
router.post('/', requireNostrAuth,  createWallet);
router.get('/:pubkey/balance',      getBalance);
router.get('/:pubkey/transactions', query(paginationSchema), getTransactions);

module.exports = router;
