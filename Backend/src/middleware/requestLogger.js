/**
 * src/middleware/requestLogger.js – Structured Per-Request Logger
 *
 * Logs a structured entry for every request including:
 *  - method, url, status code, response time
 *  - Nostr pubkey (if authenticated)
 *  - Scrubs sensitive fields from body before logging
 */

'use strict';

const logger = require('../utils/logger');

/** Fields that should never appear in logs */
const SENSITIVE_FIELDS = new Set(['mnemonic', 'privateKey', 'password', 'secret', 'apiKey']);

/**
 * Recursively redact sensitive keys from an object.
 */
const redact = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      SENSITIVE_FIELDS.has(k) ? [k, '[REDACTED]'] : [k, redact(v)]
    )
  );
};

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error'
                   : res.statusCode >= 400 ? 'warn'
                   : 'info';

    logger[logLevel](`${req.method} ${req.originalUrl}`, {
      statusCode:  res.statusCode,
      durationMs:  duration,
      ip:          req.ip,
      nostrPubkey: req.nostrPubkey || undefined,
      userAgent:   req.headers['user-agent'],
      body:        req.method !== 'GET' ? redact(req.body) : undefined,
    });
  });

  next();
};

module.exports = requestLogger;
