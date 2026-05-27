/**
 * src/routes/user.routes.js
 *
 * GET    /api/v1/user/preferences      – returns AppConfig for req.nostrPubkey
 * PUT    /api/v1/user/preferences      – partial update of preferences
 * POST   /api/v1/user/account/reset    – wipe all server-side data for the user
 *
 * All endpoints require NIP-98 auth.
 */

'use strict';

const { Router } = require('express');
const Joi = require('joi');

const { getPreferences, updatePreferences, resetAccount } = require('../controllers/user.controller');
const { requireNostrAuth } = require('../middleware/auth.middleware');
const { body }             = require('../middleware/validator');

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────────────────
const relaySchema = Joi.object({
  url:   Joi.string().uri({ scheme: ['ws', 'wss'] }).required(),
  read:  Joi.boolean().default(true),
  write: Joi.boolean().default(true),
});

const updatePrefsSchema = Joi.object({
  theme:                 Joi.string().valid('dark', 'light', 'system').optional(),
  displayCurrency:       Joi.string().valid('NGN', 'USD', 'USDT', 'BTC').optional(),
  useAppBlossomServers:  Joi.boolean().optional(),
  simulatedOffline:      Joi.boolean().optional(),
  relayMetadata: Joi.object({
    relays:    Joi.array().items(relaySchema).max(50).required(),
    updatedAt: Joi.number().integer().min(0).default(() => Date.now()),
  }).optional(),
  blossomServerMetadata: Joi.object({
    servers:   Joi.array().items(Joi.string().uri({ scheme: ['http', 'https'] })).max(20).required(),
    updatedAt: Joi.number().integer().min(0).default(() => Date.now()),
  }).optional(),
}).min(1);

// ── Routes ─────────────────────────────────────────────────────────────────────
router.get ('/preferences',     requireNostrAuth, getPreferences);
router.put ('/preferences',     requireNostrAuth, body(updatePrefsSchema), updatePreferences);
router.post('/account/reset',   requireNostrAuth, resetAccount);

module.exports = router;
