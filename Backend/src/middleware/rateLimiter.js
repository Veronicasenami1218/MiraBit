/**
 * src/middleware/rateLimiter.js – Express Rate Limiters
 *
 * Provides multiple limiters with different thresholds:
 *  - apiLimiter      : general API calls (100 req / 15 min)
 *  - strictLimiter   : sensitive endpoints like payment send (10 req / 15 min)
 *  - authLimiter     : Nostr auth verification (30 req / 15 min)
 */

'use strict';

const rateLimit = require('express-rate-limit');
const config    = require('../config');

const { windowMs, maxRequests } = config.rateLimit;

// ── General API Limiter ───────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs,
  max:     maxRequests,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many requests from this IP – please try again later.',
  },
  skip: () => config.nodeEnv === 'test',
});

// ── Strict Limiter (payments, invoice creation) ───────────────────────────────
const strictLimiter = rateLimit({
  windowMs,
  max:     10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Payment rate limit exceeded – please slow down.',
  },
  skip: () => config.nodeEnv === 'test',
});

// ── Auth / Identity Limiter ───────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs,
  max:     30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Authentication rate limit exceeded.',
  },
  skip: () => config.nodeEnv === 'test',
});

module.exports = { apiLimiter, strictLimiter, authLimiter };
