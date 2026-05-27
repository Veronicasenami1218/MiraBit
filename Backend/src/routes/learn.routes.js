/**
 * src/routes/learn.routes.js
 *
 * GET  /api/v1/learn/lessons   – public lesson catalogue
 * GET  /api/v1/learn/progress  – my progress  (NIP-98 auth)
 * POST /api/v1/learn/complete  – complete a lesson + claim reward (NIP-98 auth)
 */

'use strict';

const { Router } = require('express');
const Joi = require('joi');

const { listLessons, getProgress, completeLesson } = require('../controllers/learn.controller');
const { requireNostrAuth } = require('../middleware/auth.middleware');
const { body }             = require('../middleware/validator');

const router = Router();

const completeSchema = Joi.object({
  lessonId:    Joi.string().min(1).max(100).required(),
  answerIndex: Joi.number().integer().min(0).max(10).required(),
});

router.get ('/lessons',  listLessons);
router.get ('/progress', requireNostrAuth, getProgress);
router.post('/complete', requireNostrAuth, body(completeSchema), completeLesson);

module.exports = router;
