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
const { ExchangeRate } = require('../models');

// ── In-memory rate cache (fast hot path) ──────────────────────────────────────
const cache = {
  data:      null,
  updatedAt: 0,
};

const TTL_MS = (config.conversion.cacheTtlSeconds || 60) * 1000;

/**
 * Warm the in-memory cache from the persisted ExchangeRate document, if any.
 * Useful right after a server restart so the very first request doesn't
 * trigger a CoinGecko fetch when fresh data is already in Mongo.
 */
const hydrateCacheFromDb = async () => {
  try {
    const doc = await ExchangeRate.findOne({ key: 'latest' }).lean();
    if (doc && doc.rates) {
      cache.data = {
        BTC_USD:   doc.rates.BTC_USD,
        BTC_NGN:   doc.rates.BTC_NGN,
        USDT_USD:  doc.rates.USDT_USD,
        USDT_NGN:  doc.rates.USDT_NGN,
        fetchedAt: doc.fetchedAt.toISOString(),
      };
      cache.updatedAt = doc.fetchedAt.getTime();
      logger.info('conversion: hydrated rate cache from MongoDB');
    }
  } catch (err) {
    logger.warn(`conversion: cache hydration skipped – ${err.message}`);
  }
};

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

    // Persist asynchronously – don't block the response on a DB write
    ExchangeRate.updateOne(
      { key: 'latest' },
      {
        $set: {
          rates: {
            BTC_USD:  rates.BTC_USD,
            BTC_NGN:  rates.BTC_NGN,
            USDT_USD: rates.USDT_USD,
            USDT_NGN: rates.USDT_NGN,
          },
          source:    'coingecko',
          fetchedAt: new Date(rates.fetchedAt),
        },
      },
      { upsert: true }
    ).catch((err) => logger.warn(`conversion: failed to persist rates – ${err.message}`));

    return { ...rates, cached: false };
  } catch (err) {
    logger.error('conversion: failed to fetch rates –', err.message);
    if (cache.data) {
      logger.warn('conversion: returning stale cached rates');
      return { ...cache.data, cached: true, stale: true };
    }
    // Last-ditch: try the persisted snapshot before giving up
    try {
      const doc = await ExchangeRate.findOne({ key: 'latest' }).lean();
      if (doc) {
        logger.warn('conversion: serving rates from persisted snapshot');
        return {
          BTC_USD:   doc.rates.BTC_USD,
          BTC_NGN:   doc.rates.BTC_NGN,
          USDT_USD:  doc.rates.USDT_USD,
          USDT_NGN:  doc.rates.USDT_NGN,
          fetchedAt: doc.fetchedAt.toISOString(),
          cached:    true,
          stale:     true,
        };
      }
    } catch (_) { /* swallow */ }
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

/**
 * Return rates in the exact shape the React frontend expects.
 *
 *   { BTC_USD: number, USD_NGN: number, updatedAt: number (ms), isStale: boolean }
 *
 * `isStale` is true when the rates were served from the in-memory or
 * persisted cache after a fresh upstream fetch failed.
 *
 * @returns {Promise<{BTC_USD:number, USD_NGN:number, updatedAt:number, isStale:boolean}>}
 */
const getRatesForFrontend = async () => {
  const r = await getAllRates();
  return {
    BTC_USD:   r.BTC_USD,
    USD_NGN:   r.BTC_NGN / r.BTC_USD, // derive NGN per USD from BTC pairs
    updatedAt: new Date(r.fetchedAt).getTime(),
    isStale:   Boolean(r.stale),
  };
};

module.exports = { getAllRates, getRate, convert, hydrateCacheFromDb, getRatesForFrontend };
