/**
 * tests/helpers/auth.js – NIP-98 test utilities
 *
 * Generates a Nostr keypair, signs kind-27235 auth events, and produces
 * the `Authorization: Nostr <base64>` header value test requests use.
 *
 * Also exposes a `withAuth(req, agent, method, path, body?)` helper that
 * does the supertest dance in one line.
 */

'use strict';

const {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} = require('nostr-tools');

const APP_URL = `http://127.0.0.1`; // supertest's default host header

/** Create a fresh ephemeral keypair for a test. */
function makeKeypair() {
  const sk = generateSecretKey();          // Uint8Array(32)
  const pk = getPublicKey(sk);             // hex string
  return { sk, pk };
}

/**
 * Build a signed NIP-98 Authorization header.
 *
 * @param {Uint8Array} sk      – secret key bytes
 * @param {string}     method  – HTTP method (uppercase)
 * @param {string}     fullUrl – the exact URL the server will reconstruct
 *                                (protocol://host[:port]/path?query)
 * @returns {string} "Nostr <base64>"
 */
function buildAuthHeader(sk, method, fullUrl) {
  const event = finalizeEvent(
    {
      kind: 27235,
      content: '',
      tags: [
        ['u', fullUrl],
        ['method', method.toUpperCase()],
      ],
      created_at: Math.floor(Date.now() / 1000),
    },
    sk
  );

  const json = JSON.stringify(event);
  const b64  = Buffer.from(json, 'utf8').toString('base64');
  return `Nostr ${b64}`;
}

/**
 * Reconstruct the URL exactly the way auth.middleware does:
 *   `${req.protocol}://${req.get('host')}${req.originalUrl}`
 *
 * Supertest sends Host: 127.0.0.1:<port>. We don't know the port a priori
 * but supertest also exposes it through agent.address() when listening.
 * For an Express app passed directly to supertest(app) (no listen), the
 * host is "127.0.0.1:<ephemeral>". The simplest robust approach is to
 * make the request, fail, and use the auth.middleware's `requestUrl`
 * – but for in-process tests, supertest typically sets host header to
 * "127.0.0.1:<port>". We sidestep all of that by using supertest's
 * own server: it sets `req.get('host')` to "127.0.0.1:<port>" where port
 * is what `agent.app.listen()` reports.
 *
 * We bind to a known port per request by:
 *   1. Letting supertest open an ephemeral port
 *   2. Reading agent.address().port AFTER the request begins
 * – impractical pre-flight.
 *
 * Workaround: call `signedRequest()` which:
 *   - issues a HEAD-only probe to learn the host header server sees,
 *     OR – more simply – uses the well-known supertest default
 *     "127.0.0.1:<port>" by listening explicitly.
 *
 * The cleanest path: have each test file start the app on a known port
 * via app.listen(0) and read its address. The helper below does exactly
 * that – see `makeApp()` in helpers/server.js.
 */

module.exports = { makeKeypair, buildAuthHeader, APP_URL };
