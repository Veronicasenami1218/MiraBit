/**
 * Unit: Swagger spec assembles correctly and contains the expected paths.
 */

'use strict';

const spec = require('../../src/docs/swagger');

describe('swagger spec', () => {
  test('is a valid OpenAPI 3.0 object', () => {
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('MiraBit Backend API');
    expect(Array.isArray(spec.tags)).toBe(true);
  });

  test('defines NIP-98 security scheme', () => {
    expect(spec.components.securitySchemes.Nip98Auth).toBeDefined();
  });

  test('reusable schemas are present', () => {
    const required = [
      'SuccessEnvelope', 'ErrorEnvelope',
      'Currency', 'TxType', 'TxStatus',
      'Wallet', 'WalletBalance', 'Transaction',
      'Rates', 'SavingsGoal', 'Lesson', 'LearnProgress',
      'UserPreferences', 'QueuedPayment', 'FlushSummary',
    ];
    for (const name of required) {
      expect(spec.components.schemas[name]).toBeDefined();
    }
  });

  test('every documented endpoint is present', () => {
    const paths = Object.keys(spec.paths);
    const mustHave = [
      '/health', '/health/detailed',
      '/wallet', '/wallet/{pubkey}', '/wallet/{pubkey}/balance',
      '/wallet/{pubkey}/transactions', '/wallet/{pubkey}/deposit',
      '/wallet/{pubkey}/convert', '/wallet/{pubkey}/save-to-btc',
      '/wallet/{pubkey}/reward',
      '/conversion/rates', '/conversion/rates/fe', '/conversion/rate',
      '/conversion/convert', '/conversion/btc/sats', '/conversion/sats/btc',
      '/savings/goals', '/savings/goals/{id}',
      '/learn/lessons', '/learn/progress', '/learn/complete',
      '/user/preferences', '/user/account/reset',
      '/payments/queue', '/payments/queue/flush', '/payments/queue/{id}',
      '/lightning/node/info', '/lightning/invoice', '/lightning/pay',
      '/lightning/lnurl/pay', '/lightning/payment/{paymentHash}',
      '/nostr/relays', '/nostr/profile/{pubkey}', '/nostr/event', '/nostr/nwc/request',
    ];
    for (const p of mustHave) {
      expect(paths).toContain(p);
    }
  });

  test('wallet POST routes require Nip98Auth', () => {
    const protectedOps = [
      ['/wallet', 'post'],
      ['/wallet/{pubkey}/deposit', 'post'],
      ['/wallet/{pubkey}/convert', 'post'],
      ['/wallet/{pubkey}/save-to-btc', 'post'],
      ['/wallet/{pubkey}/reward', 'post'],
    ];
    for (const [p, m] of protectedOps) {
      const op = spec.paths[p][m];
      expect(op).toBeDefined();
      expect(op.security).toEqual([{ Nip98Auth: [] }]);
    }
  });
});
