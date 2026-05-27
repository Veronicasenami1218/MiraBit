/**
 * src/utils/response.js – Standardised API Response Helpers
 *
 * All controllers use these helpers to ensure a consistent
 * response envelope across every endpoint.
 *
 * Success envelope:
 *   { success: true, message, data, meta }
 *
 * Error envelope:
 *   { success: false, message, error, code }
 */

'use strict';

/**
 * Send a 200 OK success response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {*} data
 * @param {object} [meta] – pagination or extra metadata
 */
const ok = (res, message, data = null, meta = null) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(200).json(body);
};

/**
 * Send a 201 Created response.
 */
const created = (res, message, data = null) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(201).json(body);
};

/**
 * Send a 400 Bad Request response.
 */
const badRequest = (res, message, error = null) => {
  const body = { success: false, message };
  if (error !== null) body.error = error;
  return res.status(400).json(body);
};

/**
 * Send a 401 Unauthorised response.
 */
const unauthorized = (res, message = 'Unauthorized') => {
  return res.status(401).json({ success: false, message });
};

/**
 * Send a 403 Forbidden response.
 */
const forbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({ success: false, message });
};

/**
 * Send a 404 Not Found response.
 */
const notFound = (res, message = 'Resource not found') => {
  return res.status(404).json({ success: false, message });
};

/**
 * Send a 422 Unprocessable Entity (validation errors).
 */
const validationError = (res, message, errors = null) => {
  const body = { success: false, message };
  if (errors !== null) body.errors = errors;
  return res.status(422).json(body);
};

/**
 * Send a 429 Too Many Requests response.
 */
const tooManyRequests = (res, message = 'Too many requests – please try again later') => {
  return res.status(429).json({ success: false, message });
};

/**
 * Send a 500 Internal Server Error response.
 */
const serverError = (res, message = 'Internal server error') => {
  return res.status(500).json({ success: false, message });
};

module.exports = {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  tooManyRequests,
  serverError,
};
