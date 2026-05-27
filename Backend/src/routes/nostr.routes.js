/**
 * src/routes/nostr.routes.js
 *
 * GET  /api/v1/nostr/relays         – relay connection status
 * GET  /api/v1/nostr/profile/:pubkey – fetch NIP-01 profile
 * POST /api/v1/nostr/event           – publish event (auth required)
 * POST /api/v1/nostr/nwc/request     – handle NIP-47 NWC request (auth required)
 */

'use strict';

const { Router } = require('express');
const Joi = require('joi');

const {
  getRelayStatus,
  getProfile,
  publishEvent,
  handleNwcRequest,
} = require('../controllers/nostr.controller');

const { requireNostrAuth } = require('../middleware/auth.middleware');
const { body }             = require('../middleware/validator');

const router = Router();

// ── Validation Schemas ─────────────────────────────────────────────────────────
const publishEventSchema = Joi.object({
  event: Joi.object({
    id:         Joi.string().hex().length(64).required(),
    pubkey:     Joi.string().hex().length(64).required(),
    created_at: Joi.number().integer().required(),
    kind:       Joi.number().integer().min(0).required(),
    tags:       Joi.array().items(Joi.array()).default([]),
    content:    Joi.string().allow('').required(),
    sig:        Joi.string().hex().length(128).required(),
  }).required(),
});

const nwcRequestSchema = Joi.object({
  event: Joi.object({
    id:         Joi.string().hex().length(64).required(),
    pubkey:     Joi.string().hex().length(64).required(),
    created_at: Joi.number().integer().required(),
    kind:       Joi.number().valid(23194).required(),
    tags:       Joi.array().items(Joi.array()).default([]),
    content:    Joi.string().required(),
    sig:        Joi.string().hex().length(128).required(),
  }).required(),
});

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /nostr/relays:
 *   get:
 *     tags: [Nostr]
 *     summary: List configured relays and their statuses
 *     responses:
 *       200: { description: Relay list }
 */
router.get('/relays', getRelayStatus);

/**
 * @swagger
 * /nostr/profile/{pubkey}:
 *   get:
 *     tags: [Nostr]
 *     summary: Fetch NIP-01 profile metadata (kind 0) for a pubkey
 *     parameters:
 *       - $ref: '#/components/parameters/PubkeyParam'
 *     responses:
 *       200: { description: Profile metadata }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/profile/:pubkey', getProfile);

/**
 * @swagger
 * /nostr/event:
 *   post:
 *     tags: [Nostr]
 *     summary: Publish a pre-signed Nostr event to configured relays
 *     security: [{ Nip98Auth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event]
 *             properties:
 *               event:
 *                 type: object
 *                 required: [id, pubkey, created_at, kind, content, sig]
 *                 properties:
 *                   id:         { type: string, pattern: '^[0-9a-f]{64}$' }
 *                   pubkey:     { type: string, pattern: '^[0-9a-f]{64}$' }
 *                   created_at: { type: integer }
 *                   kind:       { type: integer, minimum: 0 }
 *                   tags:       { type: array }
 *                   content:    { type: string }
 *                   sig:        { type: string, pattern: '^[0-9a-f]{128}$' }
 *     responses:
 *       200: { description: Publish result }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/event',
  requireNostrAuth,
  body(publishEventSchema),
  publishEvent
);

/**
 * @swagger
 * /nostr/nwc/request:
 *   post:
 *     tags: [Nostr]
 *     summary: Handle a NIP-47 Nostr Wallet Connect (NWC) request (kind 23194)
 *     security: [{ Nip98Auth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event]
 *             properties:
 *               event:
 *                 type: object
 *                 description: 'A NIP-47 request event (kind 23194)'
 *     responses:
 *       200: { description: NWC response payload }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/nwc/request',
  requireNostrAuth,
  body(nwcRequestSchema),
  handleNwcRequest
);

module.exports = router;
