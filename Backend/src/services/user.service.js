/**
 * src/services/user.service.js – User Preferences & Account Management
 *
 * Persists per-user app settings (theme, displayCurrency, relay/blossom
 * metadata) and provides a hard-reset endpoint that wipes a user's data
 * from MongoDB (wallet, transactions, savings goals, learn progress,
 * queued payments, preferences).
 *
 * Notes:
 *  - "Account reset" only clears MongoDB-side state. The user's Nostr
 *    identity (keypair) lives entirely on the client and is untouched.
 *  - Lightning funds, if any, are NOT swept anywhere – the user must
 *    withdraw before resetting.
 */

'use strict';

const {
  UserPreferences,
  Wallet,
  Transaction,
  SavingsGoal,
  LearnProgress,
  QueuedPayment,
} = require('../models');
const logger = require('../utils/logger');

/**
 * Get the preferences document for a user. Auto-creates with defaults
 * if it does not yet exist so the FE always gets a populated response.
 *
 * @param {string} pubkey
 * @returns {Promise<object>}
 */
const getPreferences = async (pubkey) => {
  const normalized = pubkey.toLowerCase();
  const doc = await UserPreferences.findOneAndUpdate(
    { pubkey: normalized },
    { $setOnInsert: { pubkey: normalized } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.toJSON();
};

/**
 * Patch a user's preferences. Only whitelisted fields are accepted –
 * everything else is silently ignored (the validator middleware will
 * already have stripped them, but we belt-and-brace here too).
 *
 * @param {string} pubkey
 * @param {object} patch – partial AppConfig
 * @returns {Promise<object>}
 */
const updatePreferences = async (pubkey, patch) => {
  const normalized = pubkey.toLowerCase();

  const allowed = [
    'theme',
    'displayCurrency',
    'useAppBlossomServers',
    'simulatedOffline',
    'relayMetadata',
    'blossomServerMetadata',
  ];

  const update = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) update[key] = patch[key];
  }

  const doc = await UserPreferences.findOneAndUpdate(
    { pubkey: normalized },
    { $set: update, $setOnInsert: { pubkey: normalized } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  logger.info(`preferences updated for ${normalized}: ${Object.keys(update).join(', ') || '(no-op)'}`);
  return doc.toJSON();
};

/**
 * Hard-delete every MongoDB document associated with this pubkey.
 *
 * Returns a summary of how many docs were removed per collection so the
 * frontend can show an honest "we wiped X items" confirmation.
 *
 * @param {string} pubkey
 * @returns {Promise<object>}
 */
const resetAccount = async (pubkey) => {
  const normalized = pubkey.toLowerCase();
  const filter     = { pubkey: normalized };

  const [w, t, g, l, q, p] = await Promise.all([
    Wallet.deleteMany(filter),
    Transaction.deleteMany(filter),
    SavingsGoal.deleteMany(filter),
    LearnProgress.deleteMany(filter),
    QueuedPayment.deleteMany(filter),
    UserPreferences.deleteMany(filter),
  ]);

  const summary = {
    wallets:        w.deletedCount,
    transactions:   t.deletedCount,
    savingsGoals:   g.deletedCount,
    learnProgress:  l.deletedCount,
    queuedPayments: q.deletedCount,
    preferences:    p.deletedCount,
  };

  logger.warn(`Account reset for ${normalized}: ${JSON.stringify(summary)}`);
  return summary;
};

module.exports = { getPreferences, updatePreferences, resetAccount };
