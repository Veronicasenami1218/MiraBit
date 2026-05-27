/**
 * src/controllers/learn.controller.js – Learning page endpoints
 *
 * Lessons are public (no auth) – they're educational content.
 * Progress reads/writes require NIP-98 auth so each user only sees
 * and modifies their own progress.
 */

'use strict';

const learnService = require('../services/learn.service');
const { ok, badRequest, notFound } = require('../utils/response');
const logger = require('../utils/logger');

// ── GET /learn/lessons (public) ──────────────────────────────────────────────
const listLessons = (req, res) => {
  const lessons = learnService.listLessons();
  return ok(res, 'Lessons retrieved', lessons);
};

// ── GET /learn/progress (auth) ───────────────────────────────────────────────
const getProgress = async (req, res, next) => {
  try {
    const progress = await learnService.getProgress(req.nostrPubkey);
    return ok(res, 'Progress retrieved', progress);
  } catch (err) { logger.error('getProgress error:', err); next(err); }
};

// ── POST /learn/complete (auth) ──────────────────────────────────────────────
// Body: { lessonId: string, answerIndex: number }
const completeLesson = async (req, res, next) => {
  try {
    const { lessonId, answerIndex } = req.body;
    const result = await learnService.completeLesson({
      pubkey: req.nostrPubkey, lessonId, answerIndex,
    });
    return ok(res, result.alreadyCompleted ? 'Lesson already completed' : 'Lesson completed', result);
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    if (err.status === 400) {
      return badRequest(res, err.message, {
        explanation:  err.explanation,
        correctIndex: err.correctIndex,
      });
    }
    logger.error('completeLesson error:', err);
    next(err);
  }
};

module.exports = { listLessons, getProgress, completeLesson };
