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

/**
 * @swagger
 * /user/preferences:
 *   get:
 *     tags: [User]
 *     summary: Get my preferences (auto-creates with defaults on first call)
 *     security: [{ Nip98Auth: [] }]
 *     responses:
 *       200:
 *         description: Preferences
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/UserPreferences' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   put:
 *     tags: [User]
 *     summary: Update my preferences (partial)
 *     security: [{ Nip98Auth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserPreferences' }
 *     responses:
 *       200:
 *         description: Updated preferences
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties: { data: { $ref: '#/components/schemas/UserPreferences' } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/preferences', requireNostrAuth, getPreferences);
router.put('/preferences', requireNostrAuth, body(updatePrefsSchema), updatePreferences);

/**
 * @swagger
 * /user/account/reset:
 *   post:
 *     tags: [User]
 *     summary: Wipe all server-side data for the authenticated user
 *     description: |
 *       Hard-deletes wallet, transactions, savings goals, learn progress,
 *       queued payments, and preferences. The Nostr identity (keypair)
 *       lives entirely client-side and is untouched.
 *     security: [{ Nip98Auth: [] }]
 *     responses:
 *       200:
 *         description: Summary of deleted documents
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         wallets:        { type: integer }
 *                         transactions:   { type: integer }
 *                         savingsGoals:   { type: integer }
 *                         learnProgress:  { type: integer }
 *                         queuedPayments: { type: integer }
 *                         preferences:    { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/account/reset', requireNostrAuth, resetAccount);

module.exports = router;
