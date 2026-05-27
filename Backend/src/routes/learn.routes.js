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

/**
 * @swagger
 * /learn/lessons:
 *   get:
 *     tags: [Learn]
 *     summary: Public lesson catalogue (answerIndex stripped)
 *     responses:
 *       200:
 *         description: All lessons
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data: { type: array, items: { $ref: '#/components/schemas/Lesson' } }
 */
router.get('/lessons', listLessons);

/**
 * @swagger
 * /learn/progress:
 *   get:
 *     tags: [Learn]
 *     summary: My lesson progress
 *     security: [{ Nip98Auth: [] }]
 *     responses:
 *       200:
 *         description: Progress doc (auto-created if first call)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/LearnProgress' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/progress', requireNostrAuth, getProgress);

/**
 * @swagger
 * /learn/complete:
 *   post:
 *     tags: [Learn]
 *     summary: Submit a quiz answer, credit reward if correct (idempotent)
 *     description: Server-side verifies the answer. First-time correct answers credit the reward; repeat completes return the existing progress with `awardedBtc=0`.
 *     security: [{ Nip98Auth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonId, answerIndex]
 *             properties:
 *               lessonId:    { type: string, example: 'what-is-bitcoin' }
 *               answerIndex: { type: integer, minimum: 0, maximum: 10 }
 *     responses:
 *       200:
 *         description: Completion result
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         progress:         { $ref: '#/components/schemas/LearnProgress' }
 *                         alreadyCompleted: { type: boolean }
 *                         awardedBtc:       { type: number }
 *                         lesson:
 *                           type: object
 *                           properties:
 *                             id:          { type: string }
 *                             title:       { type: string }
 *                             explanation: { type: string }
 *                         transaction: { $ref: '#/components/schemas/Transaction', nullable: true }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/complete', requireNostrAuth, body(completeSchema), completeLesson);

module.exports = router;
