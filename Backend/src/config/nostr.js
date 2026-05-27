/**
 * src/config/nostr.js – Nostr Configuration Helper
 *
 * Manages relay list and backend keypair configuration.
 * The backend uses a dedicated Nostr identity (npub/nsec) for:
 *   - NIP-98 HTTP auth verification
 *   - Publishing wallet event notifications to relays
 *   - Subscribing to user DMs (NIP-04) if needed
 */

'use strict';

const config = require('./index');

/** Well-known public relays used as fallback */
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
];

/**
 * Returns the list of configured relay URLs.
 * Falls back to DEFAULT_RELAYS if none are configured.
 * @returns {string[]}
 */
const getRelays = () => {
  const relays = config.nostr.relays;
  return relays.length ? relays : DEFAULT_RELAYS;
};

/**
 * Returns the backend Nostr private key (hex).
 * In production this MUST be set via NOSTR_PRIVATE_KEY env var.
 * @returns {string}
 */
const getPrivateKey = () => {
  const key = config.nostr.privateKey;
  if (!key && config.nodeEnv === 'production') {
    throw new Error('Nostr: NOSTR_PRIVATE_KEY is required in production.');
  }
  return key;
};

/**
 * Supported Nostr event kinds used by MiraBit
 */
const NOSTR_KINDS = {
  METADATA:        0,   // NIP-01 profile metadata
  TEXT_NOTE:       1,   // NIP-01 short text note
  ENCRYPTED_DM:    4,   // NIP-04 encrypted direct messages
  HTTP_AUTH:   27235,   // NIP-98 HTTP authentication
  WALLET_CONNECT: 23194, // NIP-47 Nostr Wallet Connect request
  WALLET_RESPONSE: 23195, // NIP-47 Nostr Wallet Connect response
};

module.exports = { getRelays, getPrivateKey, NOSTR_KINDS };
