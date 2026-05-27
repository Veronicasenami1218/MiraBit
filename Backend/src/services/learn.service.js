/**
 * src/services/learn.service.js – Lesson catalogue + progress tracker
 *
 * Quiz answers are verified server-side so the reward cannot be claimed
 * by a malicious client without picking the correct option.
 *
 * Each lesson can only be completed (and rewarded) ONCE per pubkey.
 */

'use strict';

const { LESSONS }     = require('../data/lessons');
const { LearnProgress } = require('../models');
const walletService   = require('./wallet.service');
const logger          = require('../utils/logger');

/**
 * Return the full lesson catalogue (without revealing answerIndex).
 * The frontend doesn't need the answer to render – only the server does.
 */
const listLessons = () =>
  LESSONS.map(({ answerIndex, ...rest }) => rest); // strip answerIndex

/**
 * Get a user's progress (auto-creates document on first call).
 *
 * @param {string} pubkey
 */
const getProgress = async (pubkey) => {
  const normalized = pubkey.toLowerCase();
  const doc = await LearnProgress.findOneAndUpdate(
    { pubkey: normalized },
    { $setOnInsert: { pubkey: normalized } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.toJSON();
};

/**
 * Mark a lesson complete after verifying the quiz answer, and credit
 * the configured BTC reward to the wallet.
 *
 * Idempotent: completing the same lesson twice will return the original
 * progress without re-paying the reward.
 *
 * @param {object} args
 * @param {string} args.pubkey
 * @param {string} args.lessonId
 * @param {number} args.answerIndex – the option the user selected
 * @returns {Promise<{ progress, alreadyCompleted, lesson, awardedBtc, transaction? }>}
 */
const completeLesson = async ({ pubkey, lessonId, answerIndex }) => {
  const normalized = pubkey.toLowerCase();

  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) {
    const err = new Error(`Unknown lesson id: ${lessonId}`);
    err.status = 404;
    throw err;
  }

  // Verify the answer server-side
  if (Number(answerIndex) !== lesson.answerIndex) {
    const err = new Error('Incorrect answer');
    err.status = 400;
    err.explanation = lesson.explanation;
    err.correctIndex = lesson.answerIndex;
    throw err;
  }

  // Atomic add-to-set + bump earnedBtc only if the lesson was NOT in completed
  // Two-step: first read to detect "already completed" idempotently
  const current = await LearnProgress.findOne({ pubkey: normalized });

  if (current && current.completed.includes(lessonId)) {
    return {
      progress:          current.toJSON(),
      alreadyCompleted:  true,
      lesson:            { id: lesson.id, title: lesson.title, explanation: lesson.explanation },
      awardedBtc:        0,
    };
  }

  // Pay the reward via the wallet service (also logs a learn-reward transaction)
  const { transaction } = await walletService.reward({
    pubkey:    normalized,
    amountBtc: lesson.rewardBtc,
    note:      `Lesson reward: ${lesson.title}`,
  });

  const updated = await LearnProgress.findOneAndUpdate(
    { pubkey: normalized },
    {
      $addToSet: { completed: lessonId },
      $inc:      { earnedBtc: lesson.rewardBtc },
      $set:      { lastCompletedAt: new Date() },
      $setOnInsert: { pubkey: normalized },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  logger.info(`learn: ${normalized} completed ${lessonId} (+${lesson.rewardBtc} BTC)`);

  return {
    progress:         updated.toJSON(),
    alreadyCompleted: false,
    lesson:           { id: lesson.id, title: lesson.title, explanation: lesson.explanation },
    awardedBtc:       lesson.rewardBtc,
    transaction,
  };
};

module.exports = { listLessons, getProgress, completeLesson };
