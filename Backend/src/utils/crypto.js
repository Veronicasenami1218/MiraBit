/**
 * src/utils/crypto.js – Cryptographic Utility Helpers
 *
 * Thin wrappers around Node.js built-in crypto module.
 * Used for generating random IDs, hashing, and HMAC operations.
 */

'use strict';

const crypto = require('crypto');

/**
 * Generate a cryptographically secure random hex string.
 * @param {number} [bytes=32] – number of random bytes
 * @returns {string} hex string of length bytes * 2
 */
const randomHex = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

/**
 * SHA-256 hash of a string or Buffer.
 * @param {string|Buffer} data
 * @returns {string} hex digest
 */
const sha256 = (data) =>
  crypto.createHash('sha256').update(data).digest('hex');

/**
 * HMAC-SHA256 – used for signing webhook payloads, etc.
 * @param {string} secret
 * @param {string} data
 * @returns {string} hex digest
 */
const hmacSha256 = (secret, data) =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

/**
 * Constant-time string comparison to prevent timing attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
const safeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still perform comparison to avoid timing leaks via length
    crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * Generate a random alphanumeric invoice reference (for display purposes).
 * @param {number} [length=12]
 * @returns {string}
 */
const generateRef = (length = 12) => {
  const chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes  = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
};

module.exports = { randomHex, sha256, hmacSha256, safeCompare, generateRef };
