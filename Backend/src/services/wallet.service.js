/**
 * src/services/wallet.service.js – Wallet Management Service
 *
 * Manages the lifecycle of user wallets identified by their Nostr pubkey.
 * Persistence is backed by MongoDB Atlas (Wallet + Transaction models).
 */

'use strict';

const { Wallet, Transaction } = require('../models');
const breezService = require('./breez.service');
const logger       = require('../utils/logger');

/**
 * Create a new wallet record for a Nostr pubkey.
 * Idempotent – if a wallet already exists it is returned as-is.
 *
 * @param {string} pubkey – hex Nostr public key
 * @returns {Promise<object>} wallet record (POJO)
 */
const createWallet = async (pubkey) => {
  const normalized = pubkey.toLowerCase();

  let wallet = await Wallet.findOne({ pubkey: normalized });
  if (wallet) {
    logger.info(`Wallet already exists for pubkey: ${normalized}`);
    return wallet.toJSON();
  }

  wallet = await Wallet.create({
    pubkey: normalized,
    lightningBalanceSats: 0,
    onchainBalanceSats:   0,
    pendingSats:          0,
  });

  logger.info(`Wallet created for pubkey: ${normalized}`);
  return wallet.toJSON();
};

/**
 * Retrieve wallet information for a given Nostr pubkey.
 *
 * @param {string} pubkey
 * @returns {Promise<object|null>}
 */
const getWalletByPubkey = async (pubkey) => {
  const wallet = await Wallet.findOne({ pubkey: pubkey.toLowerCase() });
  return wallet ? wallet.toJSON() : null;
};

/**
 * Get the current balance for a wallet.
 * Fetches live data from Breez SDK when reachable, otherwise falls
 * back to the most recently persisted snapshot.
 *
 * @param {string} pubkey
 * @returns {Promise<object>}
 */
const getBalance = async (pubkey) => {
  const normalized = pubkey.toLowerCase();
  const wallet     = await Wallet.findOne({ pubkey: normalized });

  try {
    const info = await breezService.getWalletInfo();

    const balance = {
      pubkey: normalized,
      lightningBalanceSats: info.balanceSat        || 0,
      onchainBalanceSats:   info.onchainBalanceSat ?? 0,
      pendingSats:          info.pendingSendSat    || 0,
      retrievedAt:          new Date().toISOString(),
    };

    // Persist the fresh snapshot (upsert to handle first-time callers)
    await Wallet.updateOne(
      { pubkey: normalized },
      {
        $set: {
          lightningBalanceSats: balance.lightningBalanceSats,
          onchainBalanceSats:   balance.onchainBalanceSats,
          pendingSats:          balance.pendingSats,
          lastSyncedAt:         new Date(),
        },
        $setOnInsert: { pubkey: normalized },
      },
      { upsert: true }
    );

    return balance;
  } catch (err) {
    logger.warn(`getBalance: Breez SDK unavailable – ${err.message}`);
    // Fall back to cached document
    return {
      pubkey: normalized,
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
 * Prefers the persisted Transaction collection (fast, supports offline).
 * If the collection is empty for this pubkey, it falls back to Breez SDK
 * and back-fills the database for next time.
 *
 * @param {string} pubkey
 * @param {{ page: number, limit: number }} options
 * @returns {Promise<object>}
 */
const getTransactions = async (pubkey, { page = 1, limit = 20 } = {}) => {
  const normalized = pubkey.toLowerCase();
  const skip       = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Transaction.find({ pubkey: normalized })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments({ pubkey: normalized }),
  ]);

  // If we have nothing stored, try to backfill from Breez SDK
  if (total === 0) {
    try {
      const allPayments = await breezService.listPayments();
      if (allPayments.length > 0) {
        const rows = allPayments.map((p) => ({
          pubkey:      normalized,
          paymentHash: p.paymentHash || p.id,
          direction:   p.paymentType === 'send' ? 'outgoing' : 'incoming',
          status:      p.status || 'complete',
          amountSats:  p.amountSat || 0,
          feeSats:     p.feesSat   || 0,
          description: p.description || null,
          settledAt:   p.timestamp ? new Date(p.timestamp * 1000) : null,
        }));
        // insertMany with ordered:false so duplicates don't blow up the whole batch
        await Transaction.insertMany(rows, { ordered: false }).catch(() => {});
      }
      return getTransactions(pubkey, { page, limit }); // re-query
    } catch (err) {
      logger.warn(`getTransactions backfill failed: ${err.message}`);
    }
  }

  return {
    transactions: docs.map((t) => ({
      id:          t._id.toString(),
      paymentHash: t.paymentHash,
      reference:   t.reference,
      amountSats:  t.amountSats,
      feeSats:     t.feeSats,
      direction:   t.direction,
      status:      t.status,
      description: t.description,
      timestamp:   t.settledAt ? t.settledAt.toISOString() : t.createdAt.toISOString(),
    })),
    page,
    limit,
    total,
    hasMore: skip + docs.length < total,
  };
};

module.exports = { createWallet, getWalletByPubkey, getBalance, getTransactions };
