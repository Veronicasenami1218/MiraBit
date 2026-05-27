/**
 * src/utils/logger.js – Winston Logger
 *
 * Provides structured JSON logging in production and
 * colorised console logging in development.
 */

'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

const logDir  = process.env.LOG_DIR || './logs';
const logLevel = process.env.LOG_LEVEL || 'debug';

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors, json } = format;

// ── Console format (human-readable in dev) ───────────────────────────────────
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    stack
      ? `[${ts}] ${level}: ${message}\n${stack}`
      : `[${ts}] ${level}: ${message}`
  )
);

// ── File format (structured JSON for production) ─────────────────────────────
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: logLevel,
  defaultMeta: { service: 'mirabit-backend' },
  transports: [
    // Error-only file
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level:    'error',
      format:   fileFormat,
    }),
    // Combined log
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      format:   fileFormat,
    }),
  ],
});

// Add colorised console in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({ format: consoleFormat }));
}

// Convenience: add http level (used by morgan)
logger.http = (msg) => logger.log('http', msg);

module.exports = logger;
