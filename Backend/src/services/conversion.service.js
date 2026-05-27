/**
 * src/services/conversion.service.js – Currency Conversion Service
 *
 * Provides BTC ↔ NGN ↔ USDT ↔ USD exchange rates via CoinGecko API.
 * Results are cached in-memory with a configurable TTL to avoid
 * hitting rate limits on free-tier API keys.
 *
 * CoinGecko free API: https://www.coingecko.com/en/api/documentation
 */

'use strict';

const https  = require('https');
const config = require('../config');
const logger = require('../utils/logger');

// ── In-memory rate cache ───────────────────────────────────────────────────────
const cache = {
  data:      null,
  updatedAt: 0,
};

const TTL_MS = (config.conversion.cacheTtlSeconds || 60) * 1000;

/**
 * Lightweight HTTPS GET helper (no extra dependency).
 * @param {string} url
 * @returns {Promise<object>}
 */
const httpsGet = (url) =>
  new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });

/**
 * Fetch fresh rates from CoinGecko.
 * Returns: { BTC_USD, BTC_NGN, USDT_USD, USDT_NGN }
 * @returns {Promise<object>}
 */
const fetchRatesFromApi = async () => {
  const baseUrl = config.conversion.coingeckoApiUrl;
  const apiKey  = config.conversion.coingeckoApiKey;
  const keyParam = apiKey ? `&x_cg_demo_api_key=${apiKey}` : '';

  const url = `${baseUrl}/simple/price?ids=bitcoin,tether&vs_currencies=usd,ngn${keyParam}`;

  logger.debug(`Fetching rates from CoinGecko: ${url}`);

  const data = await httpsGet(url);

  if (!data.bitcoin || !data.tether) {
    throw new Error('CoinGecko response missing expected fields');
  }

  return {
    BTC_USD:  data.bitcoin.usd,
    BTC_NGN:  data.bitcoin.ngn,
    USDT_USD: data.tether.usd,
    USDT_NGN: data.tether.ngn,
    fetchedAt: new Date().toISOString(),
  };
};

/**
 * Get all exchange rates (uses cache when fresh).
 * @returns {Promise<object>}
 */
const getAllRates = async () => {
  const now = Date.now();
  if (cache.data && now - cache.updatedAt < TTL_MS) {
    logger.debug('conversion: serving rates from cache');
    return { ...cache.data, cached: true };
  }

  try {
    const rates = await fetchRatesFromApi();
    cache.data      = rates;
    cache.updatedAt = now;
    return { ...rates, cached: false };
  } catch (err) {
    logger.error('conversion: failed to fetch rates –', err.message);
    if (cache.data) {
      logger.warn('conversion: returning stale cached rates');
      return { ...cache.data, cached: true, stale: true };
    }
    throw new Error('Exchange rate data unavailable. Try again shortly.');
  }
};

/**
 * Get the exchange rate between two currencies.
 * @param {string} from – 'BTC' | 'NGN' | 'USDT' | 'USD'
 * @param {string} to   – 'BTC' | 'NGN' | 'USDT' | 'USD'
 * @returns {Promise<{ from, to, rate, fetchedAt }>}
 */
const getRate = async (from, to) => {
  const rates = await getAllRates();

  const lookup = {
    BTC:  { USD: rates.BTC_USD,  NGN: rates.BTC_NGN },
    USDT: { USD: rates.USDT_USD, NGN: rates.USDT_NGN },
    USD:  { BTC: 1 / rates.BTC_USD, NGN: rates.BTC_NGN / rates.BTC_USD },
    NGN:  { BTC: 1 / rates.BTC_NGN, USD: rates.BTC_USD / rates.BTC_NGN },
  };

  const rate = lookup[from]?.[to];
  if (rate === undefined) {
    throw new Error(`No rate available for pair ${from}/${to}`);
  }

  return { from, to, rate, fetchedAt: rates.fetchedAt };
};

/**
 * Convert an amount from one currency to another.
 * @param {{ amount: number, from: string, to: string }} params
 * @returns {Promise<object>}
 */
const convert = async ({ amount, from, to }) => {
  const { rate, fetchedAt } = await getRate(from, to);
  const result = amount * rate;

  return {
    from,
    to,
    inputAmount:  amount,
    outputAmount: parseFloat(result.toFixed(8)),
    rate,
    fetchedAt,
    convertedAt:  new Date().toISOString(),
  };
};

module.exports = { getAllRates, getRate, convert };
