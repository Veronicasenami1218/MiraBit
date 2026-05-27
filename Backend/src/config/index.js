/**
 * src/config/index.js – Centralised Application Configuration
 *
 * Reads from process.env (populated by dotenv in server.js).
 * All other modules import config from here – never from process.env directly.
 */

'use strict';

const config = {
  // ── App ─────────────────────────────────────────────────────────────────
  nodeEnv:        process.env.NODE_ENV        || 'development',
  port:           parseInt(process.env.PORT, 10) || 5000,
  apiVersion:     process.env.API_VERSION     || 'v1',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
                    .split(',')
                    .map((o) => o.trim()),

  // ── Breez SDK ────────────────────────────────────────────────────────────
  breez: {
    apiKey:     process.env.BREEZ_API_KEY      || '',
    mnemonic:   process.env.BREEZ_MNEMONIC     || '',
    workingDir: process.env.BREEZ_WORKING_DIR  || './breez_data',
  },

  // ── Nostr ────────────────────────────────────────────────────────────────
  nostr: {
    privateKey: process.env.NOSTR_PRIVATE_KEY || '',
    relays:     (process.env.NOSTR_RELAYS || 'wss://relay.damus.io')
                  .split(',')
                  .map((r) => r.trim()),
  },

  // ── Currency Conversion ───────────────────────────────────────────────────
  conversion: {
    coingeckoApiUrl: process.env.COINGECKO_API_URL      || 'https://api.coingecko.com/api/v3',
    coingeckoApiKey: process.env.COINGECKO_API_KEY      || '',
    cacheTtlSeconds: parseInt(process.env.RATE_CACHE_TTL_SECONDS, 10) || 60,
  },

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  rateLimit: {
    windowMs:    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)       || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)    || 100,
  },

  // ── Logging ───────────────────────────────────────────────────────────────
  logging: {
    level:  process.env.LOG_LEVEL || 'debug',
    logDir: process.env.LOG_DIR   || './logs',
  },
};

// Warn about missing critical secrets at startup
const criticalKeys = ['breez.apiKey', 'nostr.privateKey'];
criticalKeys.forEach((keyPath) => {
  const value = keyPath.split('.').reduce((obj, k) => obj?.[k], config);
  if (!value && config.nodeEnv === 'production') {
    console.warn(`[config] WARNING: ${keyPath} is not set in production!`);
  }
});

module.exports = config;
