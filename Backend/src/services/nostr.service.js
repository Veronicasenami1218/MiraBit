/**
 * src/services/nostr.service.js – Nostr Protocol Service
 *
 * Manages WebSocket connections to Nostr relays and provides methods for:
 *  - Publishing events (NIP-01)
 *  - Fetching profile metadata (NIP-01, kind 0)
 *  - Relay health monitoring
 *  - NIP-47 Nostr Wallet Connect (NWC) request handling
 *
 * Uses the `nostr-tools` npm package (WebSocket via the `ws` package).
 */

'use strict';

const { SimplePool, finalizeEvent, getPublicKey, nip04 } = require('nostr-tools');
const WebSocket = require('ws');
const config    = require('../config');
const { getRelays, getPrivateKey, NOSTR_KINDS } = require('../config/nostr');
const { isValidEvent } = require('../utils/nostr.utils');
const logger    = require('../utils/logger');

// Polyfill WebSocket for nostr-tools in Node.js
global.WebSocket = WebSocket;

/** Singleton SimplePool instance */
let pool = null;

/**
 * Initialise the relay pool and connect to configured relays.
 * Called once at startup.
 */
const init = async () => {
  pool = new SimplePool();
  const relays = getRelays();
  logger.info(`Nostr: connecting to ${relays.length} relays:`, relays);

  // Verify relay connectivity (non-blocking)
  relays.forEach((url) => {
    try {
      const ws = new WebSocket(url);
      ws.once('open',  () => { logger.debug(`Nostr relay open: ${url}`); ws.close(); });
      ws.once('error', (err) => logger.warn(`Nostr relay error [${url}]: ${err.message}`));
    } catch (err) {
      logger.warn(`Nostr: failed to probe relay ${url}: ${err.message}`);
    }
  });

  logger.info('✅ Nostr relay pool initialised');
  return pool;
};

/**
 * Get current relay connection status.
 * @returns {Promise<object[]>}
 */
const getRelayStatus = async () => {
  const relays = getRelays();
  return relays.map((url) => ({ url, status: 'configured' }));
};

/**
 * Publish a pre-signed Nostr event to all configured relays.
 * @param {object} event – fully signed Nostr event
 * @returns {Promise<object>}
 */
const publishEvent = async (event) => {
  if (!pool) await init();

  if (!isValidEvent(event)) {
    throw new Error('Cannot publish: event has invalid signature or ID.');
  }

  const relays = getRelays();
  logger.info(`Publishing event kind ${event.kind} to ${relays.length} relays`);

  try {
    await Promise.any(pool.publish(relays, event));
    return { published: true, eventId: event.id, relayCount: relays.length };
  } catch {
    logger.warn('Event publish: no relay confirmed receipt');
    return { published: false, eventId: event.id, relayCount: relays.length };
  }
};

/**
 * Fetch NIP-01 profile metadata (kind 0) for a pubkey.
 * @param {string} pubkey – hex pubkey
 * @returns {Promise<object|null>}
 */
const fetchProfile = async (pubkey) => {
  if (!pool) await init();

  const relays = getRelays();
  logger.debug(`Fetching profile for ${pubkey}`);

  try {
    const event = await pool.get(relays, { kinds: [NOSTR_KINDS.METADATA], authors: [pubkey] });
    if (!event) return null;

    const metadata = JSON.parse(event.content);
    return {
      pubkey,
      name:        metadata.name        || null,
      displayName: metadata.display_name || metadata.displayName || null,
      about:       metadata.about       || null,
      picture:     metadata.picture     || null,
      nip05:       metadata.nip05       || null,
      lud16:       metadata.lud16       || null, // Lightning address
      createdAt:   new Date(event.created_at * 1000).toISOString(),
    };
  } catch (err) {
    logger.warn(`fetchProfile error for ${pubkey}: ${err.message}`);
    return null;
  }
};

/**
 * Sign and publish an event using the backend's private key.
 * @param {object} eventTemplate – unsigned event (without id/sig/pubkey)
 * @returns {Promise<object>} published signed event
 */
const publishSignedEvent = async (eventTemplate) => {
  if (!pool) await init();

  const privateKey = getPrivateKey();
  if (!privateKey) throw new Error('Backend Nostr private key not configured.');

  const privKeyBytes = Buffer.from(privateKey, 'hex');
  const signedEvent  = finalizeEvent(eventTemplate, privKeyBytes);

  return publishEvent(signedEvent);
};

/**
 * Handle a NIP-47 Nostr Wallet Connect request (kind 23194).
 * Decrypts the command, routes it to lightning service, and
 * returns the response event for the caller to publish.
 *
 * @param {object} nwcEvent – kind 23194 Nostr event
 * @returns {Promise<object>} response payload
 */
const handleNwcRequest = async (nwcEvent) => {
  const privateKey = getPrivateKey();
  if (!privateKey) throw new Error('Backend Nostr private key not configured for NWC.');

  logger.info(`NWC request from pubkey: ${nwcEvent.pubkey}`);

  // Decrypt the NIP-04 encrypted content
  let requestPayload;
  try {
    const decrypted = await nip04.decrypt(privateKey, nwcEvent.pubkey, nwcEvent.content);
    requestPayload  = JSON.parse(decrypted);
  } catch (err) {
    throw new Error(`NWC: failed to decrypt request – ${err.message}`);
  }

  const { method, params } = requestPayload;
  logger.info(`NWC method: ${method}`, { params });

  // Route NWC methods to lightning service
  let resultPayload;
  const lightningService = require('./lightning.service');

  switch (method) {
    case 'pay_invoice': {
      const payment = await lightningService.payInvoice({
        invoice:     params.invoice,
        payerPubkey: nwcEvent.pubkey,
      });
      resultPayload = { preimage: payment.paymentHash };
      break;
    }
    case 'make_invoice': {
      const invoice = await lightningService.createInvoice({
        amountSats:    params.amount,
        description:   params.description || 'NWC payment',
        expirySeconds: params.expiry || 3600,
      });
      resultPayload = { invoice: invoice.invoice };
      break;
    }
    case 'get_balance': {
      const info = await lightningService.getNodeInfo();
      resultPayload = { balance: info.balanceSats };
      break;
    }
    default:
      throw new Error(`NWC: unsupported method "${method}"`);
  }

  return {
    method,
    result:      resultPayload,
    processedAt: new Date().toISOString(),
  };
};

module.exports = { init, getRelayStatus, publishEvent, fetchProfile, publishSignedEvent, handleNwcRequest };
