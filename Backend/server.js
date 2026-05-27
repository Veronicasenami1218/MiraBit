/**
 * server.js – MiraBit Backend Entry Point
 *
 * Boots the HTTP server, opens the MongoDB connection,
 * and performs graceful shutdown of both on signal.
 * All Express configuration lives in src/app.js.
 */

'use strict';

require('dotenv').config();

const http = require('http');
const app  = require('./src/app');
const logger = require('./src/utils/logger');
const { connectDatabase, disconnectDatabase } = require('./src/config/database');
const conversionService = require('./src/services/conversion.service');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// ── Start ────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDatabase();
    // Warm the exchange-rate cache from the persisted snapshot (best-effort)
    await conversionService.hydrateCacheFromDb().catch(() => {});

    server.listen(PORT, () => {
      logger.info(`🚀 MiraBit backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      logger.info(`📡 API base: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
    });
  } catch (err) {
    logger.error('Fatal startup error – cannot continue:', err);
    process.exit(1);
  }
};

start();

// ── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received – shutting down gracefully…`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDatabase();
    process.exit(0);
  });

  // Force-kill after 10 seconds if connections remain open
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled Rejection / Exception Guards ───────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = server; // exported for test suites
