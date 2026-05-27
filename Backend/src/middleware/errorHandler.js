/**
 * src/middleware/errorHandler.js – Global Express Error Handler
 *
 * Catches all errors forwarded via next(err) and returns a
 * consistent JSON error response. Must be registered LAST
 * in the Express middleware chain (after all routes).
 */

'use strict';

const logger   = require('../utils/logger');
const { serverError, badRequest, unauthorized, forbidden, validationError } = require('../utils/response');

/**
 * Normalise Joi or other validation library errors into
 * a flat array of { field, message } objects.
 */
const formatJoiError = (err) =>
  err.details.map((d) => ({
    field:   d.path.join('.'),
    message: d.message.replace(/['"]/g, ''),
  }));

/**
 * Global error-handling middleware.
 * @param {Error} err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log every error
  logger.error(`[${req.method}] ${req.originalUrl} – ${err.message}`, {
    stack:  err.stack,
    status: err.statusCode || err.status || 500,
    body:   req.body,
  });

  // ── Joi Validation Error ───────────────────────────────────────────────────
  if (err.isJoi || err.name === 'ValidationError') {
    return validationError(res, 'Validation failed', formatJoiError(err));
  }

  // ── JWT / Auth Errors ──────────────────────────────────────────────────────
  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    return unauthorized(res, err.message || 'Unauthorized');
  }

  // ── Forbidden ─────────────────────────────────────────────────────────────
  if (err.statusCode === 403) {
    return forbidden(res, err.message || 'Forbidden');
  }

  // ── Bad Request ───────────────────────────────────────────────────────────
  if (err.statusCode === 400 || err.type === 'entity.parse.failed') {
    return badRequest(res, err.message || 'Bad request');
  }

  // ── CORS Error ────────────────────────────────────────────────────────────
  if (err.message && err.message.startsWith('CORS policy')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // ── Default: 500 Internal Server Error ───────────────────────────────────
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  return serverError(res, message);
};

module.exports = errorHandler;
