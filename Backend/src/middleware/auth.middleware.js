/**
 * src/middleware/auth.middleware.js – Nostr NIP-98 HTTP Authentication
 *
 * Implements NIP-98 (https://github.com/nostr-protocol/nips/blob/master/98.md)
 * for authenticating HTTP requests using signed Nostr events.
 *
 * Usage:
 *   router.post('/send', requireNostrAuth, lightningController.sendPayment);
 *
 * The client must include:
 *   Authorization: Nostr <base64(JSON.stringify(signedEvent))>
 *
 * The signed event must be kind 27235 with:
 *   - tag ["u", "<full request URL>"]
 *   - tag ["method", "<HTTP METHOD>"]
 *   - created_at within 60 seconds of server time
 */

'use strict';

const { validateNip98Token } = require('../utils/nostr.utils');
const { unauthorized }       = require('../utils/response');
const logger                 = require('../utils/logger');

/**
 * Middleware: require a valid NIP-98 Authorization header.
 * Attaches req.nostrPubkey on success.
 */
const requireNostrAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    // Reconstruct the full request URL the client signed
    const protocol   = req.protocol;
    const host       = req.get('host');
    const requestUrl = `${protocol}://${host}${req.originalUrl}`;

    const result = validateNip98Token(authHeader, requestUrl, req.method);

    if (!result.valid) {
      logger.warn(`NIP-98 auth failed [${req.ip}]: ${result.reason}`);
      return unauthorized(res, `Authentication failed: ${result.reason}`);
    }

    // Attach the verified public key to the request for downstream use
    req.nostrPubkey = result.pubkey;
    logger.debug(`NIP-98 auth OK – pubkey: ${result.pubkey}`);

    next();
  } catch (err) {
    logger.error('requireNostrAuth middleware error:', err);
    next(err);
  }
};

/**
 * Optional auth: attaches nostrPubkey if a valid header is present,
 * but does NOT block the request if absent.
 */
const optionalNostrAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();

  const protocol   = req.protocol;
  const host       = req.get('host');
  const requestUrl = `${protocol}://${host}${req.originalUrl}`;

  const result = validateNip98Token(authHeader, requestUrl, req.method);
  if (result.valid) {
    req.nostrPubkey = result.pubkey;
  }
  next();
};

module.exports = { requireNostrAuth, optionalNostrAuth };
