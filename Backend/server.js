/**
 * server.js – MiraBit Backend Entry Point
 *
 * Boots the HTTP server and performs graceful shutdown.
 * All Express configuration lives in src/app.js.
 */

'use strict';

require('dotenv').config();

const http = require('http');
const app  = require('./src/app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// ── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  logger.info(`🚀 MiraBit backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  logger.info(`📡 API base: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
});

// ── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received – shutting down gracefully…`);
  server.close(() => {
    logger.info('HTTP server closed.');
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
