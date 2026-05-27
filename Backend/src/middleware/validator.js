/**
 * src/middleware/validator.js – Joi Request Validation Factory
 *
 * Creates reusable validation middleware from Joi schemas.
 *
 * Usage:
 *   const { body } = require('../middleware/validator');
 *   router.post('/invoice', body(createInvoiceSchema), controller.createInvoice);
 */

'use strict';

const Joi = require('joi');
const { validationError } = require('../utils/response');

/**
 * Validate request body against a Joi schema.
 * @param {Joi.Schema} schema
 * @returns {import('express').RequestHandler}
 */
const body = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field:   d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return validationError(res, 'Request body validation failed', errors);
  }

  req.body = value; // use the sanitised + coerced value
  next();
};

/**
 * Validate request query parameters against a Joi schema.
 * @param {Joi.Schema} schema
 * @returns {import('express').RequestHandler}
 */
const query = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field:   d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return validationError(res, 'Query parameter validation failed', errors);
  }

  req.query = value;
  next();
};

/**
 * Validate route params against a Joi schema.
 * @param {Joi.Schema} schema
 * @returns {import('express').RequestHandler}
 */
const params = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field:   d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return validationError(res, 'URL parameter validation failed', errors);
  }

  req.params = value;
  next();
};

// ── Common reusable schemas ───────────────────────────────────────────────────

/** Hex-encoded Nostr pubkey (64 chars) */
const nostrPubkeySchema = Joi.string().hex().length(64).required();

/** Lightning Network BOLT-11 invoice */
const bolt11Schema = Joi.string().pattern(/^(lnbc|lntb|lnbcrt)\d/).required()
  .messages({ 'string.pattern.base': 'Invalid BOLT-11 Lightning invoice' });

/** Satoshi amount */
const satAmountSchema = Joi.number().integer().min(1).max(100_000_000).required()
  .messages({ 'number.max': 'Amount cannot exceed 1 BTC (100,000,000 sats)' });

module.exports = { body, query, params, nostrPubkeySchema, bolt11Schema, satAmountSchema };
