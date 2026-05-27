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
router.get('/relays', getRelayStatus);
router.get('/profile/:pubkey', getProfile);

router.post('/event',
  requireNostrAuth,
  body(publishEventSchema),
  publishEvent
);

router.post('/nwc/request',
  requireNostrAuth,
  body(nwcRequestSchema),
  handleNwcRequest
);

module.exports = router;
