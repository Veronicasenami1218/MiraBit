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

router.get   ('/goals',     requireNostrAuth, listGoals);
router.post  ('/goals',     requireNostrAuth, body(createGoalSchema), createGoal);
router.patch ('/goals/:id', requireNostrAuth, body(updateGoalSchema), updateGoal);
router.delete('/goals/:id', requireNostrAuth, deleteGoal);

module.exports = router;
