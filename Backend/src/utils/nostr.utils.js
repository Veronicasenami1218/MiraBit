/**
 * src/utils/nostr.utils.js – Nostr Protocol Utility Helpers
 *
 * Provides helpers for:
 *  - Key derivation / conversion (hex ↔ npub/nsec bech32)
 *  - Event ID computation (SHA-256 of canonical serialisation)
 *  - Event signature verification (Schnorr via nostr-tools)
 *  - NIP-98 HTTP Auth token validation
 *
 * Reference: https://github.com/nostr-protocol/nostr
 */

'use strict';

const { verifyEvent, getPublicKey, nip19 } = require('nostr-tools');
const { sha256 } = require('./crypto');
const logger = require('./logger');

/**
 * Derive the hex public key from a hex private key.
 * @param {string} hexPrivKey
 * @returns {string} hex public key
 */
const getHexPubKey = (hexPrivKey) => {
  try {
    return getPublicKey(hexPrivKey);
  } catch (err) {
    logger.error('nostr.utils: failed to derive pubkey', err);
    throw new Error('Invalid Nostr private key.');
  }
};

/**
 * Convert a hex public key to bech32 npub format.
 * @param {string} hexPubKey
 * @returns {string} npub…
 */
const hexToNpub = (hexPubKey) => nip19.npubEncode(hexPubKey);

/**
 * Convert a hex private key to bech32 nsec format.
 * @param {string} hexPrivKey
 * @returns {string} nsec…
 */
const hexToNsec = (hexPrivKey) => nip19.nsecEncode(hexPrivKey);

/**
 * Decode an npub/nsec bech32 string back to hex.
 * @param {string} bech32 – npub or nsec string
 * @returns {{ type: string, data: string }}
 */
const decodeBech32 = (bech32) => nip19.decode(bech32);

/**
 * Verify a Nostr event's signature and ID.
 * @param {object} event – full Nostr event object
 * @returns {boolean}
 */
const isValidEvent = (event) => {
  try {
    return verifyEvent(event);
  } catch {
    return false;
  }
};

/**
 * Validate a NIP-98 HTTP Auth event.
 *
 * A valid NIP-98 token must be a base64-encoded Nostr event where:
 *  - kind === 27235
 *  - has a "u" tag matching the request URL
 *  - has a "method" tag matching the HTTP method
 *  - created_at is within ±60 seconds of now
 *  - signature is valid
 *
 * @param {string} authHeader   – value of the Authorization header (Bearer <base64>)
 * @param {string} requestUrl   – full URL of the request
 * @param {string} method       – HTTP method (uppercase)
 * @returns {{ valid: boolean, pubkey?: string, reason?: string }}
 */
const validateNip98Token = (authHeader, requestUrl, method) => {
  try {
    if (!authHeader || !authHeader.startsWith('Nostr ')) {
      return { valid: false, reason: 'Missing or malformed Authorization header (expected: Nostr <base64>)' };
    }

    const base64 = authHeader.slice(6).trim();
    const event  = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

    // 1. Kind check
    if (event.kind !== 27235) {
      return { valid: false, reason: `Invalid event kind: ${event.kind} (expected 27235)` };
    }

    // 2. Timestamp check (±60 seconds)
    const now   = Math.floor(Date.now() / 1000);
    const drift = Math.abs(now - event.created_at);
    if (drift > 60) {
      return { valid: false, reason: `Event timestamp drift too large: ${drift}s` };
    }

    // 3. Tag checks
    const tags = event.tags || [];
    const uTag      = tags.find((t) => t[0] === 'u');
    const methodTag = tags.find((t) => t[0] === 'method');

    if (!uTag || uTag[1] !== requestUrl) {
      return { valid: false, reason: `URL mismatch: expected ${requestUrl}, got ${uTag?.[1]}` };
    }
    if (!methodTag || methodTag[1].toUpperCase() !== method.toUpperCase()) {
      return { valid: false, reason: `Method mismatch: expected ${method}, got ${methodTag?.[1]}` };
    }

    // 4. Signature verification
    if (!isValidEvent(event)) {
      return { valid: false, reason: 'Invalid event signature' };
    }

    return { valid: true, pubkey: event.pubkey };
  } catch (err) {
    logger.warn('NIP-98 validation error:', err.message);
    return { valid: false, reason: 'Failed to parse NIP-98 token' };
  }
};

module.exports = {
  getHexPubKey,
  hexToNpub,
  hexToNsec,
  decodeBech32,
  isValidEvent,
  validateNip98Token,
};
