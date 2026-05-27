/**
 * src/services/wallet.service.js – Wallet Management Service
 *
 * Manages the lifecycle of user wallets identified by their Nostr pubkey.
 * Persistence is backed by MongoDB (Wallet + Transaction models).
 *
 * Public surface (mirrors what the React frontend's `useWallet` hook does):
 *   createWallet, getWalletByPubkey, getBalance, getTransactions,
 *   deposit, convertFunds, saveToBtc, reward
 *
 * Every mutating operation:
 *   1. Snapshots current FX rates (for an auditable history)
 *   2. Atomically adjusts Wallet.balances with $inc
 *   3. Inserts a Transaction row in the FE-friendly shape
 */

'use strict';

const { Wallet, Transaction } = require('../models');
const breezService    = require('./breez.service');
const conversionService = require('./conversion.service');
const savingsService  = require('./savings.service');
const logger          = require('../utils/logger');

// ── Internals ────────────────────────────────────────────────────────────────

/**
 * Ensure a Wallet document exists for the given pubkey, returning it.
 * @param {string} pubkey – normalised (lowercase) hex pubkey
 */
const ensureWallet = async (pubkey) => {
  const doc = await Wallet.findOneAndUpdate(
    { pubkey },
    { $setOnInsert: { pubkey } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc;
};

/**
 * Snapshot the latest rates for transaction provenance. Safe to call
 * even when the rates API is offline – returns nulls in that case.
 */
const snapshotRates = async () => {
  try {
    const r = await conversionService.getRatesForFrontend();
    return { BTC_USD: r.BTC_USD, USD_NGN: r.USD_NGN, fetchedAt: new Date(r.updatedAt) };
  } catch (err) {
    logger.warn(`wallet.snapshotRates: rates unavailable – ${err.message}`);
    return { BTC_USD: null, USD_NGN: null, fetchedAt: null };
  }
};

/**
 * Compute how much of `toCurrency` you get for `amount` of `fromCurrency`.
 * Uses the conversion service. Falls back to throwing if rates unavailable.
 */
const convertAmount = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  const result = await conversionService.convert({
    amount,
    from: fromCurrency,
    to:   toCurrency,
  });
  return result.outputAmount;
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new wallet record for a Nostr pubkey.
 * Idempotent – if a wallet already exists it is returned as-is.
 */
const createWallet = async (pubkey) => {
  const normalized = pubkey.toLowerCase();
  const wallet     = await ensureWallet(normalized);
  return wallet.toJSON();
};

/**
 * Retrieve wallet information for a given Nostr pubkey.
 */
const getWalletByPubkey = async (pubkey) => {
  const wallet = await Wallet.findOne({ pubkey: pubkey.toLowerCase() });
  return wallet ? wallet.toJSON() : null;
};

/**
 * Get the current balance for a wallet.
 *
 * Returns BOTH the user-facing fiat balances (frontend shape:
 * { BTC, NGN, USDT }) AND the cached Lightning balance from Breez.
 */
const getBalance = async (pubkey) => {
  const normalized = pubkey.toLowerCase();
  const wallet     = await ensureWallet(normalized);

  // Try to refresh Lightning balance from Breez (best-effort)
  try {
    const info = await breezService.getWalletInfo();
    wallet.lightningBalanceSats = info.balanceSat        || 0;
    wallet.onchainBalanceSats   = info.onchainBalanceSat ?? 0;
    wallet.pendingSats          = info.pendingSendSat    || 0;
    wallet.lastSyncedAt         = new Date();
    await wallet.save();
  } catch (err) {
    logger.warn(`getBalance: Breez SDK unavailable – ${err.message}`);
  }

  return {
    pubkey: normalized,
    // FE-facing shape:
    balances: {
      BTC:  wallet.balances.BTC,
      NGN:  wallet.balances.NGN,
      USDT: wallet.balances.USDT,
    },
    // Lightning shadow (for advanced views / debugging):
    lightningBalanceSats: wallet.lightningBalanceSats,
    onchainBalanceSats:   wallet.onchainBalanceSats,
    pendingSats:          wallet.pendingSats,
    retrievedAt:          new Date().toISOString(),
  };
};

/**
 * Get paginated transaction history for a wallet.
 * Output already matches the FE `Transaction` interface (via toJSON).
 *
 * @param {string} pubkey
 * @param {{ page?: number, limit?: number, type?: string }} options
 */
const getTransactions = async (pubkey, { page = 1, limit = 20, type = null } = {}) => {
  const normalized = pubkey.toLowerCase();
  const skip       = (page - 1) * limit;

  const filter = { pubkey: normalized };
  if (type && type !== 'all') filter.type = type;

  const [docs, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return {
    transactions: docs.map((d) => d.toJSON()),
    page,
    limit,
    total,
    hasMore: skip + docs.length < total,
  };
};

/**
 * Top-up a wallet with native currency (NGN, USDT, or BTC).
 * In a real production system this would be triggered by a verified
 * payment-rail webhook – here we expose it as a direct API for the
 * demo flow the frontend already implements.
 *
 * @param {object} args
 * @param {string} args.pubkey
 * @param {('BTC'|'NGN'|'USDT')} args.currency
 * @param {number} args.amount
 * @param {string} [args.note]
 */
const deposit = async ({ pubkey, currency, amount, note }) => {
  const normalized = pubkey.toLowerCase();
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  const rates  = await snapshotRates();
  const wallet = await Wallet.findOneAndUpdate(
    { pubkey: normalized },
    { $inc: { [`balances.${currency}`]: amount }, $setOnInsert: { pubkey: normalized } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const tx = await Transaction.create({
    pubkey:       normalized,
    type:         'receive',
    status:       'completed',
    fromCurrency: null,
    fromAmount:   0,
    toCurrency:   currency,
    toAmount:     amount,
    note:         note || `Top-up ${amount} ${currency}`,
    rateSnapshot: rates,
    settledAt:    new Date(),
  });

  logger.info(`deposit: +${amount} ${currency} for ${normalized}`);
  return { wallet: wallet.toJSON(), transaction: tx.toJSON() };
};

/**
 * Convert one currency to another inside the wallet.
 * Debits fromCurrency, credits toCurrency (computed via rates).
 *
 * @param {object} args
 * @param {string} args.pubkey
 * @param {('BTC'|'NGN'|'USDT')} args.fromCurrency
 * @param {('BTC'|'NGN'|'USDT')} args.toCurrency
 * @param {number} args.amount – amount of fromCurrency to convert
 */
const convertFunds = async ({ pubkey, fromCurrency, toCurrency, amount }) => {
  const normalized = pubkey.toLowerCase();
  if (amount <= 0) throw new Error('Amount must be greater than zero');
  if (fromCurrency === toCurrency) throw new Error('Source and destination currencies must differ');

  const wallet = await ensureWallet(normalized);
  if ((wallet.balances[fromCurrency] || 0) < amount) {
    throw new Error(`Insufficient ${fromCurrency} balance`);
  }

  const toAmount = await convertAmount(amount, fromCurrency, toCurrency);
  const rates    = await snapshotRates();

  // Atomic dual-update on the same document
  const updated = await Wallet.findOneAndUpdate(
    {
      pubkey: normalized,
      [`balances.${fromCurrency}`]: { $gte: amount }, // safety: still enough
    },
    {
      $inc: {
        [`balances.${fromCurrency}`]: -amount,
        [`balances.${toCurrency}`]:    toAmount,
      },
    },
    { new: true }
  );

  if (!updated) throw new Error(`Insufficient ${fromCurrency} balance (race)`);

  const tx = await Transaction.create({
    pubkey:       normalized,
    type:         'convert',
    status:       'completed',
    fromCurrency,
    fromAmount:   amount,
    toCurrency,
    toAmount,
    note:         `Converted ${amount} ${fromCurrency} → ${toAmount} ${toCurrency}`,
    rateSnapshot: rates,
    settledAt:    new Date(),
  });

  logger.info(`convert: ${amount} ${fromCurrency} → ${toAmount} ${toCurrency} for ${normalized}`);
  return { wallet: updated.toJSON(), transaction: tx.toJSON() };
};

/**
 * Save native funds INTO BTC. Debits sourceCurrency, credits BTC.
 * Functionally a convert into BTC, but logged as type='save' so the
 * Savings page and ActivityPage can filter on it.
 *
 * @param {object} args
 * @param {string} args.pubkey
 * @param {('BTC'|'NGN'|'USDT')} args.sourceCurrency
 * @param {number} args.amount
 * @param {string} [args.goalId] – optional SavingsGoal._id this save targets
 */
const saveToBtc = async ({ pubkey, sourceCurrency, amount, goalId }) => {
  const normalized = pubkey.toLowerCase();
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  const wallet = await ensureWallet(normalized);

  let btcDelta;
  if (sourceCurrency === 'BTC') {
    // Saving BTC directly is a no-op (already BTC) – just record the intent
    if ((wallet.balances.BTC || 0) < amount) throw new Error('Insufficient BTC balance');
    btcDelta = 0;
  } else {
    if ((wallet.balances[sourceCurrency] || 0) < amount) {
      throw new Error(`Insufficient ${sourceCurrency} balance`);
    }
    btcDelta = await convertAmount(amount, sourceCurrency, 'BTC');
  }

  const rates = await snapshotRates();

  const updated = await Wallet.findOneAndUpdate(
    {
      pubkey: normalized,
      [`balances.${sourceCurrency}`]: { $gte: amount },
    },
    sourceCurrency === 'BTC'
      ? { $set: { lastSyncedAt: new Date() } } // BTC→BTC: no balance change
      : { $inc: { [`balances.${sourceCurrency}`]: -amount, 'balances.BTC': btcDelta } },
    { new: true }
  );

  if (!updated) throw new Error(`Insufficient ${sourceCurrency} balance (race)`);

  const tx = await Transaction.create({
    pubkey:       normalized,
    type:         'save',
    status:       'completed',
    fromCurrency: sourceCurrency,
    fromAmount:   amount,
    toCurrency:   'BTC',
    toAmount:     sourceCurrency === 'BTC' ? amount : btcDelta,
    note:         goalId ? `Saved towards goal ${goalId}` : `Saved ${amount} ${sourceCurrency} to BTC`,
    rateSnapshot: rates,
    metadata:     goalId ? { goalId } : {},
    settledAt:    new Date(),
  });

  logger.info(`save: ${amount} ${sourceCurrency} → ${tx.toAmount} BTC for ${normalized}`);

  // If a goalId was supplied, bump the goal's savedBtc counter (best-effort)
  if (goalId) {
    try {
      await savingsService.incrementSaved(normalized, goalId, tx.toAmount);
    } catch (err) {
      logger.warn(`save: could not increment goal ${goalId} – ${err.message}`);
    }
  }

  return {
    wallet:      updated.toJSON(),
    transaction: tx.toJSON(),
    btcCredited: sourceCurrency === 'BTC' ? amount : btcDelta,
  };
};

/**
 * Credit a BTC reward (e.g. from completing a learning quiz).
 *
 * @param {object} args
 * @param {string} args.pubkey
 * @param {number} args.amountBtc
 * @param {string} [args.note]
 */
const reward = async ({ pubkey, amountBtc, note }) => {
  const normalized = pubkey.toLowerCase();
  if (amountBtc <= 0) throw new Error('Reward amount must be greater than zero');

  const rates = await snapshotRates();

  const wallet = await Wallet.findOneAndUpdate(
    { pubkey: normalized },
    { $inc: { 'balances.BTC': amountBtc }, $setOnInsert: { pubkey: normalized } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const tx = await Transaction.create({
    pubkey:       normalized,
    type:         'learn-reward',
    status:       'completed',
    fromCurrency: null,
    fromAmount:   0,
    toCurrency:   'BTC',
    toAmount:     amountBtc,
    note:         note || 'Learning reward',
    rateSnapshot: rates,
    settledAt:    new Date(),
  });

  logger.info(`reward: +${amountBtc} BTC for ${normalized}`);
  return { wallet: wallet.toJSON(), transaction: tx.toJSON() };
};

module.exports = {
  createWallet,
  getWalletByPubkey,
  getBalance,
  getTransactions,
  deposit,
  convertFunds,
  saveToBtc,
  reward,
};
