/**
 * src/controllers/wallet.controller.js – Wallet Management
 *
 * Handles wallet creation, balance retrieval, and transaction history.
 * All routes that mutate state require NIP-98 Nostr authentication.
 */

'use strict';

const walletService = require('../services/wallet.service');
const { ok, created, notFound, serverError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * GET /wallet/:pubkey
 * Retrieve wallet info for a given Nostr pubkey.
 */
const getWallet = async (req, res, next) => {
  try {
    const { pubkey } = req.params;
    const wallet = await walletService.getWalletByPubkey(pubkey);

    if (!wallet) {
      return notFound(res, `Wallet not found for pubkey: ${pubkey}`);
    }

    return ok(res, 'Wallet retrieved successfully', wallet);
  } catch (err) {
    logger.error('getWallet error:', err);
    next(err);
  }
};

/**
 * POST /wallet
 * Create or initialise a wallet for a Nostr pubkey.
 * Requires NIP-98 auth – pubkey is taken from req.nostrPubkey.
 */
const createWallet = async (req, res, next) => {
  try {
    const pubkey = req.nostrPubkey;
    const wallet = await walletService.createWallet(pubkey);

    return created(res, 'Wallet created successfully', wallet);
  } catch (err) {
    logger.error('createWallet error:', err);
    next(err);
  }
};

/**
 * GET /wallet/:pubkey/balance
 * Get the current Lightning + on-chain balance.
 */
const getBalance = async (req, res, next) => {
  try {
    const { pubkey } = req.params;
    const balance = await walletService.getBalance(pubkey);

    return ok(res, 'Balance retrieved', balance);
  } catch (err) {
    logger.error('getBalance error:', err);
    next(err);
  }
};

/**
 * GET /wallet/:pubkey/transactions
 * Paginated transaction history.
 */
const getTransactions = async (req, res, next) => {
  try {
    const { pubkey }     = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await walletService.getTransactions(pubkey, {
      page:  parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
    });

    return ok(res, 'Transactions retrieved', result.transactions, {
      page:    result.page,
      limit:   result.limit,
      total:   result.total,
      hasMore: result.hasMore,
    });
  } catch (err) {
    logger.error('getTransactions error:', err);
    next(err);
  }
};

module.exports = { getWallet, createWallet, getBalance, getTransactions };
