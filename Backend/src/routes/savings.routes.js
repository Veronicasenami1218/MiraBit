/**
 * src/routes/savings.routes.js
 *
 * GET    /api/v1/savings/goals       – list my goals
 * POST   /api/v1/savings/goals       – create a new goal
 * PATCH  /api/v1/savings/goals/:id   – update a goal I own
 * DELETE /api/v1/savings/goals/:id   – delete a goal I own
 *
 * All endpoints require NIP-98 auth.
 */

'use strict';

const { Router } = require('express');
const Joi = require('joi');

const { listGoals, createGoal, updateGoal, deleteGoal } = require('../controllers/savings.controller');
const { requireNostrAuth } = require('../middleware/auth.middleware');
const { body }             = require('../middleware/validator');

const router = Router();

const CURRENCY = Joi.string().valid('BTC', 'NGN', 'USDT');

const createGoalSchema = Joi.object({
  name:           Joi.string().min(1).max(100).required(),
  emoji:          Joi.string().max(8).default('⭐'),
  target:         Joi.number().positive().required(),
  targetCurrency: CURRENCY.required(),
});

const updateGoalSchema = Joi.object({
  name:       Joi.string().min(1).max(100).optional(),
  emoji:      Joi.string().max(8).optional(),
  target:     Joi.number().positive().optional(),
  savedBtc:   Joi.number().min(0).optional(),
  isAchieved: Joi.boolean().optional(),
}).min(1);

/**
 * @swagger
 * /savings/goals:
 *   get:
 *     tags: [Savings]
 *     summary: List my savings goals (newest first)
 *     security: [{ Nip98Auth: [] }]
 *     responses:
 *       200:
 *         description: Goal list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data: { type: array, items: { $ref: '#/components/schemas/SavingsGoal' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     tags: [Savings]
 *     summary: Create a new savings goal
 *     security: [{ Nip98Auth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, target, targetCurrency]
 *             properties:
 *               name:           { type: string, minLength: 1, maxLength: 100 }
 *               emoji:          { type: string, maxLength: 8 }
 *               target:         { type: number, minimum: 0.00000001 }
 *               targetCurrency: { $ref: '#/components/schemas/Currency' }
 *     responses:
 *       201:
 *         description: Goal created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/SavingsGoal' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get ('/goals', requireNostrAuth, listGoals);
router.post('/goals', requireNostrAuth, body(createGoalSchema), createGoal);

/**
 * @swagger
 * /savings/goals/{id}:
 *   patch:
 *     tags: [Savings]
 *     summary: Update a goal I own
 *     security: [{ Nip98Auth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:       { type: string, maxLength: 100 }
 *               emoji:      { type: string, maxLength: 8 }
 *               target:     { type: number, minimum: 0.00000001 }
 *               savedBtc:   { type: number, minimum: 0 }
 *               isAchieved: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated goal
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/SavingsGoal' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Savings]
 *     summary: Delete a goal I own
 *     security: [{ Nip98Auth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties: { id: { type: string } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch ('/goals/:id', requireNostrAuth, body(updateGoalSchema), updateGoal);
router.delete('/goals/:id', requireNostrAuth, deleteGoal);

module.exports = router;
