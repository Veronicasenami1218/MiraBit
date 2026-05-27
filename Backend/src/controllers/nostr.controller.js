/**
 * src/controllers/nostr.controller.js – Nostr Event & Identity Endpoints
 *
 * Handles:
 *  - Relay connection status
 *  - Publishing events on behalf of the backend identity
 *  - NIP-47 Nostr Wallet Connect (NWC) request handling
 *  - Profile metadata lookup
 */

'use strict';

const nostrService = require('../services/nostr.service');
const { ok, created, badRequest, notFound } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * GET /nostr/relays
 * Returns current relay connection status.
 */
const getRelayStatus = async (req, res, next) => {
  try {
    const relays = await nostrService.getRelayStatus();
    return ok(res, 'Relay status', relays);
  } catch (err) {
    logger.error('getRelayStatus error:', err);
    next(err);
  }
};

/**
 * GET /nostr/profile/:pubkey
 * Fetch NIP-01 profile metadata (kind 0) for a pubkey.
 */
const getProfile = async (req, res, next) => {
  try {
    const { pubkey } = req.params;
    const profile = await nostrService.fetchProfile(pubkey);

    if (!profile) {
      return notFound(res, 'Nostr profile not found');
    }

    return ok(res, 'Profile retrieved', profile);
  } catch (err) {
    logger.error('getProfile error:', err);
    next(err);
  }
};

/**
 * POST /nostr/event
 * Publish a signed Nostr event to connected relays.
 * Requires NIP-98 auth. The signed event is in the request body.
 * Body: { event: NostrEvent }
 */
const publishEvent = async (req, res, next) => {
  try {
    const { event } = req.body;

    if (!event || typeof event !== 'object') {
      return badRequest(res, 'Request body must contain a valid "event" object');
    }

    const result = await nostrService.publishEvent(event);
    return created(res, 'Event published to relays', result);
  } catch (err) {
    logger.error('publishEvent error:', err);
    next(err);
  }
};

/**
 * POST /nostr/nwc/request
 * Handle an incoming NIP-47 Nostr Wallet Connect request.
 * The NWC client encrypts a wallet command and the backend processes it.
 * Body: { event: NostrEvent (kind 23194) }
 */
const handleNwcRequest = async (req, res, next) => {
  try {
    const { event } = req.body;

    if (!event || event.kind !== 23194) {
      return badRequest(res, 'Invalid NWC request: expected a kind 23194 event');
    }

    const response = await nostrService.handleNwcRequest(event);
    return ok(res, 'NWC request processed', response);
  } catch (err) {
    logger.error('handleNwcRequest error:', err);
    next(err);
  }
};

module.exports = { getRelayStatus, getProfile, publishEvent, handleNwcRequest };
