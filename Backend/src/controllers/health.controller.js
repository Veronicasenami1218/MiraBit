/**
 * src/controllers/health.controller.js – Health & Status Endpoints
 */

'use strict';

const { ok } = require('../utils/response');
const { getDatabaseStatus } = require('../config/database');
const logger  = require('../utils/logger');

/**
 * GET /health
 * Basic liveness probe – returns 200 immediately.
 */
const ping = (req, res) => {
  return ok(res, 'MiraBit backend is alive', {
    status:      'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp:   new Date().toISOString(),
    version:     process.env.npm_package_version || '1.0.0',
  });
};

/**
 * GET /health/detailed
 * Readiness probe – checks internal service availability.
 */
const detailed = async (req, res, next) => {
  try {
    const checks = {
      api:      { status: 'ok' },
      database: getDatabaseStatus(),
      breez:    { status: 'unchecked', note: 'Initialize SDK to check' },
      nostr:    { status: 'unchecked', note: 'Relay connection checked at startup' },
      uptime:   `${Math.floor(process.uptime())}s`,
      memory:   process.memoryUsage(),
    };

    logger.debug('Health detailed check performed');
    return ok(res, 'Service health check', checks);
  } catch (err) {
    next(err);
  }
};

module.exports = { ping, detailed };
