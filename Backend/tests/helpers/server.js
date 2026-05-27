/**
 * tests/helpers/server.js – Spin up the Express app on a known ephemeral port
 *
 * Returns:
 *   - server:   http.Server (already listening)
 *   - baseUrl:  e.g. "http://127.0.0.1:54321"
 *   - request:  supertest agent bound to baseUrl (so generated NIP-98
 *               URLs match server.req.protocol://host)
 *   - signed:   shortcut that signs a NIP-98 header for a given keypair
 *               and method+path, then returns a chainable supertest req.
 *   - close():  shut everything down
 */

'use strict';

const http      = require('http');
const supertest = require('supertest');
const app       = require('../../src/app');
const { buildAuthHeader } = require('./auth');

async function startTestServer() {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl  = `http://127.0.0.1:${port}`;

  const request = supertest(baseUrl);

  /**
   * Sign-and-send a request.
   *
   * @param {Uint8Array} sk     – signer's secret key
   * @param {string}     method – HTTP method
   * @param {string}     path   – path including leading slash (e.g. "/api/v1/wallet")
   * @param {object}     [body] – JSON body (optional)
   * @returns {Test} supertest request chain
   */
  function signed(sk, method, path, body) {
    const fullUrl = `${baseUrl}${path}`;
    const header  = buildAuthHeader(sk, method, fullUrl);
    const m       = method.toLowerCase();
    let req       = request[m](path).set('Authorization', header);
    if (body !== undefined) req = req.send(body);
    return req;
  }

  async function close() {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }

  return { server, baseUrl, request, signed, close };
}

module.exports = { startTestServer };
