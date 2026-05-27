/**
 * src/controllers/wallet.controller.js – Wallet Management
 *
 * Handles wallet creation, balance retrieval, transaction history,
 * deposits, conversions, savings, and rewards.
 *
 * Mutating endpoints require NIP-98 auth – the pubkey is taken from
 * req.nostrPubkey (set by requireNostrAuth middleware).
 */

'use strict';

const walletService = require('../services/wallet.service');
const { ok, created, notFound, badRequest, forbidden } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Guard that returns true if the authenticated pubkey is allowed to
 * mutate the wallet identified by `pubkey` in the URL. We require an
 * exact match – a user can only touch their own wallet.
 */
const assertSelf = (req, res, pubkey) => {
  if (req.nostrPubkey && req.nostrPubkey.toLowerCase() === pubkey.toLowerCase()) {
    return true;
  }
  forbidden(res, 'You may only modify your own wallet');
  return false;
};

// ── GET /wallet/:pubkey ──────────────────────────────────────────────────────
const getWallet = async (req, res, next) => {
  try {
    const wallet = await walletService.getWalletByPubkey(req.params.pubkey);
    if (!wallet) return notFound(res, `Wallet not found for pubkey: ${req.params.pubkey}`);
    return ok(res, 'Wallet retrieved successfully', wallet);
  } catch (err) { logger.error('getWallet error:', err); next(err); }
};

// ── POST /wallet ─────────────────────────────────────────────────────────────
const createWallet = async (req, res, next) => {
  try {
    const wallet = await walletService.createWallet(req.nostrPubkey);
    return created(res, 'Wallet created successfully', wallet);
  } catch (err) { logger.error('createWallet error:', err); next(err); }
};

// ── GET /wallet/:pubkey/balance ──────────────────────────────────────────────
const getBalance = async (req, res, next) => {
  try {
    const balance = await walletService.getBalance(req.params.pubkey);
    return ok(res, 'Balance retrieved', balance);
  } catch (err) { logger.error('getBalance error:', err); next(err); }
};

// ── GET /wallet/:pubkey/transactions ─────────────────────────────────────────
const getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const result = await walletService.getTransactions(req.params.pubkey, {
      page:  parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      type:  type || null,
    });
    return ok(res, 'Transactions retrieved', result.transactions, {
      page:    result.page,
      limit:   result.limit,
      total:   result.total,
      hasMore: result.hasMore,
    });
  } catch (err) { logger.error('getTransactions error:', err); next(err); }
};

// ── POST /wallet/:pubkey/deposit ─────────────────────────────────────────────
// Body: { currency: 'BTC'|'NGN'|'USDT', amount: number, note?: string }
const deposit = async (req, res, next) => {
  try {
    if (!assertSelf(req, res, req.params.pubkey)) return;
    const { currency, amount, note } = req.body;
    const result = await walletService.deposit({
      pubkey: req.params.pubkey, currency, amount, note,
    });
    return created(res, 'Deposit successful', result);
  } catch (err) {
    logger.error('deposit error:', err);
    if (/Insufficient|must be/i.test(err.message)) return badRequest(res, err.message);
    next(err);
  }
};

// ── POST /wallet/:pubkey/convert ─────────────────────────────────────────────
// Body: { fromCurrency, toCurrency, amount }
const convertFunds = async (req, res, next) => {
  try {
    if (!assertSelf(req, res, req.params.pubkey)) return;
    const { fromCurrency, toCurrency, amount } = req.body;
    const result = await walletService.convertFunds({
      pubkey: req.params.pubkey, fromCurrency, toCurrency, amount,
    });
    return ok(res, 'Funds converted', result);
  } catch (err) {
    logger.error('convertFunds error:', err);
    if (/Insufficient|must|differ/i.test(err.message)) return badRequest(res, err.message);
    next(err);
  }
};

// ── POST /wallet/:pubkey/save-to-btc ─────────────────────────────────────────
// Body: { sourceCurrency: 'BTC'|'NGN'|'USDT', amount: number, goalId?: string }
const saveToBtc = async (req, res, next) => {
  try {
    if (!assertSelf(req, res, req.params.pubkey)) return;
    const { sourceCurrency, amount, goalId } = req.body;
    const result = await walletService.saveToBtc({
      pubkey: req.params.pubkey, sourceCurrency, amount, goalId,
    });
    return created(res, 'Saved to BTC', result);
  } catch (err) {
    logger.error('saveToBtc error:', err);
    if (/Insufficient|must/i.test(err.message)) return badRequest(res, err.message);
    next(err);
  }
};

// ── POST /wallet/:pubkey/reward ──────────────────────────────────────────────
// Body: { amountBtc: number, note?: string }
// In production this should be called server-to-server only, after a
// quiz answer is verified. Exposed via authenticated endpoint here; the
// Learn flow uses it through learn.service so the client never calls
// it directly with arbitrary amounts.
const reward = async (req, res, next) => {
  try {
    if (!assertSelf(req, res, req.params.pubkey)) return;
    const { amountBtc, note } = req.body;
    const result = await walletService.reward({
      pubkey: req.params.pubkey, amountBtc, note,
    });
    return created(res, 'Reward credited', result);
  } catch (err) {
    logger.error('reward error:', err);
    if (/must/i.test(err.message)) return badRequest(res, err.message);
    next(err);
  }
};

module.exports = {
  getWallet, createWallet, getBalance, getTransactions,
  deposit, convertFunds, saveToBtc, reward,
};
