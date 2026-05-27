/**
 * src/controllers/conversion.controller.js – Currency Conversion
 *
 * Handles BTC ↔ Naira ↔ USDT exchange rate lookups and conversions.
 * Rates are cached (TTL configurable via RATE_CACHE_TTL_SECONDS).
 */

'use strict';

const conversionService = require('../services/conversion.service');
const { ok, badRequest } = require('../utils/response');
const logger = require('../utils/logger');

/** Supported currency codes */
const SUPPORTED_CURRENCIES = ['BTC', 'NGN', 'USDT', 'USD'];

/**
 * GET /conversion/rates
 * Returns current exchange rates for all supported pairs.
 */
const getRates = async (req, res, next) => {
  try {
    const rates = await conversionService.getAllRates();
    return ok(res, 'Exchange rates retrieved', rates);
  } catch (err) {
    logger.error('getRates error:', err);
    next(err);
  }
};

/**
 * GET /conversion/rates/fe
 * Returns rates in the exact shape the React frontend `useRates` hook expects:
 *   { BTC_USD, USD_NGN, updatedAt, isStale }
 */
const getRatesForFrontend = async (req, res, next) => {
  try {
    const rates = await conversionService.getRatesForFrontend();
    return ok(res, 'Exchange rates (frontend shape)', rates);
  } catch (err) {
    logger.error('getRatesForFrontend error:', err);
    next(err);
  }
};

/**
 * GET /conversion/rate?from=BTC&to=NGN
 * Get the current exchange rate for a specific pair.
 */
const getRate = async (req, res, next) => {
  try {
    const { from = 'BTC', to = 'NGN' } = req.query;
    const fromUpper = from.toUpperCase();
    const toUpper   = to.toUpperCase();

    if (!SUPPORTED_CURRENCIES.includes(fromUpper) || !SUPPORTED_CURRENCIES.includes(toUpper)) {
      return badRequest(res, `Unsupported currency pair: ${from}/${to}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`);
    }

    if (fromUpper === toUpper) {
      return ok(res, 'Same currency – rate is 1', { from: fromUpper, to: toUpper, rate: 1 });
    }

    const rate = await conversionService.getRate(fromUpper, toUpper);
    return ok(res, `Rate for ${fromUpper}/${toUpper}`, rate);
  } catch (err) {
    logger.error('getRate error:', err);
    next(err);
  }
};

/**
 * POST /conversion/convert
 * Convert an amount from one currency to another.
 * Body: { amount: number, from: string, to: string }
 */
const convert = async (req, res, next) => {
  try {
    const { amount, from, to } = req.body;
    const fromUpper = from.toUpperCase();
    const toUpper   = to.toUpperCase();

    if (!SUPPORTED_CURRENCIES.includes(fromUpper) || !SUPPORTED_CURRENCIES.includes(toUpper)) {
      return badRequest(res, `Unsupported currency pair: ${from}/${to}`);
    }

    if (amount <= 0) {
      return badRequest(res, 'Amount must be greater than 0');
    }

    const result = await conversionService.convert({ amount, from: fromUpper, to: toUpper });
    return ok(res, 'Conversion result', result);
  } catch (err) {
    logger.error('convert error:', err);
    next(err);
  }
};

/**
 * GET /conversion/btc/sats?amount=0.001
 * Convert BTC to satoshis.
 */
const btcToSats = (req, res) => {
  const { amount } = req.query;
  const btc = parseFloat(amount);

  if (isNaN(btc) || btc < 0) {
    return badRequest(res, 'Invalid BTC amount');
  }

  const sats = Math.round(btc * 1e8);
  return ok(res, 'BTC to satoshis', { btc, sats });
};

/**
 * GET /conversion/sats/btc?amount=100000
 * Convert satoshis to BTC.
 */
const satsToBtc = (req, res) => {
  const { amount } = req.query;
  const sats = parseInt(amount, 10);

  if (isNaN(sats) || sats < 0) {
    return badRequest(res, 'Invalid satoshi amount');
  }

  const btc = sats / 1e8;
  return ok(res, 'Satoshis to BTC', { sats, btc });
};

module.exports = { getRates, getRatesForFrontend, getRate, convert, btcToSats, satsToBtc };
