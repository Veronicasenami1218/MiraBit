/**
 * tests/helpers/mocks.js – call this in any test file's top-level scope
 * BEFORE requiring the app, to install service mocks.
 *
 *     require('./helpers/mocks').install();
 *     const { startTestServer } = require('./helpers/server');
 *
 * What gets mocked:
 *   - src/services/breez.service     – no real LN calls
 *   - src/services/conversion.service – fixed deterministic rates
 *   - src/services/nostr.service      – no real relay sockets
 */

'use strict';

function install() {
  jest.mock('../../src/services/breez.service', () =>
    require('../__mocks__/breez.service')
  );

  jest.mock('../../src/services/conversion.service', () => {
    // Fixed test rates: 1 BTC = $50,000, 1 USD = ₦1,500
    const RATES = {
      BTC_USD:   50_000,
      BTC_NGN:   75_000_000,
      USDT_USD:  1,
      USDT_NGN:  1_500,
      fetchedAt: new Date().toISOString(),
    };
    const getAllRates = jest.fn(async () => ({ ...RATES, cached: false }));
    const getRatesForFrontend = jest.fn(async () => ({
      BTC_USD:   RATES.BTC_USD,
      USD_NGN:   RATES.BTC_NGN / RATES.BTC_USD, // 1500
      updatedAt: Date.now(),
      isStale:   false,
    }));
    const getRate = jest.fn(async (from, to) => {
      const lookup = {
        BTC:  { USD: RATES.BTC_USD,  NGN: RATES.BTC_NGN, USDT: RATES.BTC_USD },
        USDT: { USD: 1, NGN: RATES.USDT_NGN, BTC: 1 / RATES.BTC_USD },
        USD:  { BTC: 1 / RATES.BTC_USD, NGN: 1500, USDT: 1 },
        NGN:  { BTC: 1 / RATES.BTC_NGN, USD: 1 / 1500, USDT: 1 / 1500 },
      };
      const rate = lookup[from]?.[to];
      if (rate === undefined) throw new Error(`No rate for ${from}/${to}`);
      return { from, to, rate, fetchedAt: RATES.fetchedAt };
    });
    const convert = jest.fn(async ({ amount, from, to }) => {
      const { rate } = await getRate(from, to);
      return {
        from, to, inputAmount: amount,
        outputAmount: parseFloat((amount * rate).toFixed(8)),
        rate, fetchedAt: RATES.fetchedAt,
        convertedAt: new Date().toISOString(),
      };
    });
    return {
      getAllRates,
      getRatesForFrontend,
      getRate,
      convert,
      hydrateCacheFromDb: jest.fn(async () => undefined),
    };
  });

  jest.mock('../../src/services/nostr.service', () => ({
    init:               jest.fn(async () => undefined),
    getRelayStatus:     jest.fn(async () => []),
    publishEvent:       jest.fn(async () => ({ published: true, eventId: 'mock', relayCount: 0 })),
    fetchProfile:       jest.fn(async () => null),
    publishSignedEvent: jest.fn(async () => ({ published: true })),
    handleNwcRequest:   jest.fn(async () => ({ method: 'noop', result: {} })),
  }));
}

module.exports = { install };
