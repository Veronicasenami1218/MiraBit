/**
 * Unit tests for src/utils/nostr.utils.js
 *
 * Focus: validateNip98Token covers happy path, all rejection reasons,
 * and tamper-resistance.
 */

'use strict';

const { generateSecretKey, getPublicKey, finalizeEvent } = require('nostr-tools');
const {
  validateNip98Token,
  hexToNpub,
  decodeBech32,
  isValidEvent,
  getHexPubKey,
} = require('../../src/utils/nostr.utils');

function buildHeader(sk, method, url, opts = {}) {
  const event = finalizeEvent(
    {
      kind:       opts.kind ?? 27235,
      content:    '',
      tags: [
        ['u', opts.url ?? url],
        ['method', (opts.method ?? method).toUpperCase()],
      ],
      created_at: opts.created_at ?? Math.floor(Date.now() / 1000),
    },
    sk
  );
  return `Nostr ${Buffer.from(JSON.stringify(event)).toString('base64')}`;
}

describe('utils/nostr.utils', () => {
  let sk, pk;
  beforeAll(() => { sk = generateSecretKey(); pk = getPublicKey(sk); });

  describe('key helpers', () => {
    test('getHexPubKey derives pubkey from secret', () => {
      expect(getHexPubKey(sk)).toBe(pk);
    });

    test('hexToNpub + decodeBech32 round-trip', () => {
      const npub = hexToNpub(pk);
      expect(npub).toMatch(/^npub1/);
      const decoded = decodeBech32(npub);
      expect(decoded.type).toBe('npub');
      expect(decoded.data).toBe(pk);
    });

    test('isValidEvent passes for properly signed event', () => {
      const ev = finalizeEvent(
        { kind: 1, content: 'hi', tags: [], created_at: Math.floor(Date.now() / 1000) },
        sk
      );
      expect(isValidEvent(ev)).toBe(true);
    });

    test('isValidEvent rejects garbage', () => {
      expect(isValidEvent({ kind: 1, sig: 'no' })).toBe(false);
    });
  });

  describe('validateNip98Token', () => {
    const URL = 'http://127.0.0.1:5000/api/v1/wallet';

    test('valid signed event passes', () => {
      const hdr = buildHeader(sk, 'POST', URL);
      const out = validateNip98Token(hdr, URL, 'POST');
      expect(out.valid).toBe(true);
      expect(out.pubkey).toBe(pk);
    });

    test('missing header fails', () => {
      const out = validateNip98Token(undefined, URL, 'POST');
      expect(out.valid).toBe(false);
      expect(out.reason).toMatch(/Missing|malformed/i);
    });

    test('malformed header fails', () => {
      const out = validateNip98Token('Bearer abc', URL, 'POST');
      expect(out.valid).toBe(false);
    });

    test('wrong kind fails', () => {
      const hdr = buildHeader(sk, 'POST', URL, { kind: 1 });
      const out = validateNip98Token(hdr, URL, 'POST');
      expect(out.valid).toBe(false);
      expect(out.reason).toMatch(/kind/i);
    });

    test('stale created_at fails', () => {
      const old = Math.floor(Date.now() / 1000) - 9999;
      const hdr = buildHeader(sk, 'POST', URL, { created_at: old });
      const out = validateNip98Token(hdr, URL, 'POST');
      expect(out.valid).toBe(false);
      expect(out.reason).toMatch(/drift/i);
    });

    test('URL mismatch fails', () => {
      const hdr = buildHeader(sk, 'POST', URL, { url: 'http://other' });
      const out = validateNip98Token(hdr, URL, 'POST');
      expect(out.valid).toBe(false);
      expect(out.reason).toMatch(/URL/i);
    });

    test('method mismatch fails', () => {
      const hdr = buildHeader(sk, 'POST', URL, { method: 'GET' });
      const out = validateNip98Token(hdr, URL, 'POST');
      expect(out.valid).toBe(false);
      expect(out.reason).toMatch(/[Mm]ethod/);
    });

    test('tampered signature fails', () => {
      const ev = finalizeEvent(
        {
          kind: 27235,
          content: '',
          tags: [['u', URL], ['method', 'POST']],
          created_at: Math.floor(Date.now() / 1000),
        },
        sk
      );
      ev.sig = '0'.repeat(128); // wipe signature
      const hdr = `Nostr ${Buffer.from(JSON.stringify(ev)).toString('base64')}`;
      const out = validateNip98Token(hdr, URL, 'POST');
      expect(out.valid).toBe(false);
    });
  });
});
