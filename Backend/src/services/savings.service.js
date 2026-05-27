/**
 * src/services/savings.service.js – Savings Goals Service
 *
 * Each goal is scoped to a single Nostr pubkey. Mirrors the FE
 * `Goal` shape so the React components can be wired with zero changes.
 */

'use strict';

const { SavingsGoal } = require('../models');
const logger = require('../utils/logger');

/**
 * List all goals for a pubkey, newest first.
 */
const listGoals = async (pubkey) => {
  const docs = await SavingsGoal.find({ pubkey: pubkey.toLowerCase() })
    .sort({ createdAt: -1 });
  return docs.map((d) => d.toJSON());
};

/**
 * Create a new goal.
 */
const createGoal = async ({ pubkey, name, emoji, target, targetCurrency }) => {
  const doc = await SavingsGoal.create({
    pubkey: pubkey.toLowerCase(),
    name,
    emoji,
    target,
    targetCurrency,
    savedBtc: 0,
  });
  logger.info(`goal created for ${pubkey}: ${name}`);
  return doc.toJSON();
};

/**
 * Patch a goal. Only the owner may modify, enforced by querying on pubkey.
 *
 * Allowed fields: name, emoji, target, savedBtc, isAchieved
 * (savedBtc can be incremented from the wallet save-to-btc flow,
 *  or set explicitly here for offline edits)
 */
const updateGoal = async (pubkey, goalId, patch) => {
  const allowed = ['name', 'emoji', 'target', 'savedBtc', 'isAchieved'];
  const update  = {};
  for (const k of allowed) if (patch[k] !== undefined) update[k] = patch[k];

  // Auto-mark achieved when savedBtc reaches/exceeds target (when target is in BTC)
  const doc = await SavingsGoal.findOneAndUpdate(
    { _id: goalId, pubkey: pubkey.toLowerCase() },
    { $set: update },
    { new: true }
  );
  return doc ? doc.toJSON() : null;
};

/**
 * Add to a goal's BTC savings counter (called from wallet.save-to-btc when
 * a goalId is provided).
 */
const incrementSaved = async (pubkey, goalId, btcDelta) => {
  const doc = await SavingsGoal.findOneAndUpdate(
    { _id: goalId, pubkey: pubkey.toLowerCase() },
    { $inc: { savedBtc: btcDelta } },
    { new: true }
  );
  return doc ? doc.toJSON() : null;
};

/**
 * Permanently delete a goal.
 */
const deleteGoal = async (pubkey, goalId) => {
  const result = await SavingsGoal.deleteOne({
    _id: goalId,
    pubkey: pubkey.toLowerCase(),
  });
  return result.deletedCount > 0;
};

module.exports = { listGoals, createGoal, updateGoal, incrementSaved, deleteGoal };
