/**
 * src/services/wallet.service.js – Wallet Management Service
 *
 * Manages the lifecycle of user wallets identified by their Nostr pubkey.
 * In this version wallets are stored in an in-memory Map.
 *
 * TODO: Replace with a database (PostgreSQL / SQLite) for production.
 *       Each wallet record should be encrypted at rest.
 */

'use strict';

const breezService = require('./breez.service');
const { randomHex } = require('../utils/crypto');
const logger = require('../utils/logger');

/**
 * In-memory wallet store.
 * Key: nostrPubkey (hex string)
 * Value: WalletRecord
 *
 * @type {Map<string, object>}
 */
const walletStore = new Map();

/**
 * Create a new wallet record for a Nostr pubkey.
 * If a wallet already exists for this pubkey, returns the existing one.
 *
 * @param {string} pubkey – hex Nostr public key
 * @returns {Promise<object>} wallet record
 */
const createWallet = async (pubkey) => {
  if (walletStore.has(pubkey)) {
    logger.info(`Wallet already exists for pubkey: ${pubkey}`);
    return walletStore.get(pubkey);
  }

  const wallet = {
    id:         randomHex(16),
    pubkey,
    createdAt:  new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
    // Balance fields – populated from Breez SDK when available
    lightningBalanceSats: 0,
    onchainBalanceSats:   0,
    pendingSats:          0,
  };

  walletStore.set(pubkey, wallet);
  logger.info(`Wallet created for pubkey: ${pubkey}`);
  return wallet;
};

/**
 * Retrieve wallet information for a given Nostr pubkey.
 *
 * @param {string} pubkey
 * @returns {Promise<object|null>}
 */
const getWalletByPubkey = async (pubkey) => {
  return walletStore.get(pubkey) || null;
};

/**
 * Get the current balance for a wallet.
 * Fetches live data from Breez SDK if available.
 *
 * @param {string} pubkey
 * @returns {Promise<object>}
 */
const getBalance = async (pubkey) => {
  const wallet = walletStore.get(pubkey);

  // Attempt to fetch live balance from Breez SDK
  try {
    const info = await breezService.getWalletInfo();
    const balance = {
      pubkey,
      lightningBalanceSats: info.balanceSat      || 0,
      onchainBalanceSats:   info.onchainBalanceSat ?? 0,
      pendingSats:          info.pendingSendSat   || 0,
      retrievedAt:          new Date().toISOString(),
    };

    // Update stored record
    if (wallet) {
      wallet.lightningBalanceSats = balance.lightningBalanceSats;
      wallet.onchainBalanceSats   = balance.onchainBalanceSats;
      wallet.pendingSats          = balance.pendingSats;
      wallet.updatedAt            = balance.retrievedAt;
    }

    return balance;
  } catch (err) {
    logger.warn(`getBalance: Breez SDK unavailable – ${err.message}`);
    // Return cached balance if SDK is offline
    return {
      pubkey,
      lightningBalanceSats: wallet?.lightningBalanceSats || 0,
      onchainBalanceSats:   wallet?.onchainBalanceSats   || 0,
      pendingSats:          wallet?.pendingSats           || 0,
      retrievedAt:          new Date().toISOString(),
      note:                 'Live balance unavailable – showing cached values',
    };
  }
};

/**
 * Get paginated transaction history for a wallet.
 *
 * @param {string} pubkey
 * @param {{ page: number, limit: number }} options
 * @returns {Promise<object>}
 */
const getTransactions = async (pubkey, { page = 1, limit = 20 } = {}) => {
  let allPayments = [];

  try {
    allPayments = await breezService.listPayments();
  } catch (err) {
    logger.warn(`getTransactions: Breez unavailable – ${err.message}`);
  }

  const total  = allPayments.length;
  const offset = (page - 1) * limit;
  const slice  = allPayments.slice(offset, offset + limit);

  return {
    transactions: slice.map((p) => ({
      paymentHash: p.paymentHash || p.id,
      amountSats:  p.amountSat,
      feeSats:     p.feesSat,
      direction:   p.paymentType === 'send' ? 'outgoing' : 'incoming',
      status:      p.status,
      description: p.description || null,
      timestamp:   p.timestamp
        ? new Date(p.timestamp * 1000).toISOString()
        : null,
    })),
    page,
    limit,
    total,
    hasMore: offset + slice.length < total,
  };
};

module.exports = { createWallet, getWalletByPubkey, getBalance, getTransactions };
