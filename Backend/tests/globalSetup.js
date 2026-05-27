/**
 * tests/globalSetup.js – runs ONCE before all tests
 *
 * Strategy: if MONGODB_URI is already set in the environment, use it
 * (CI, dev with local mongod). Otherwise spin up mongodb-memory-server.
 *
 * Either way, the test database is wiped before each test via the
 * per-file `clearTestDb()` helper, so suites stay isolated.
 */

'use strict';

const DB_NAME = 'mirabit-test';

module.exports = async () => {
  process.env.NODE_ENV    = 'test';
  process.env.LOG_LEVEL   = 'silent'; // silence logger during tests (winston: levels above 'error')
  process.env.API_VERSION = 'v1';
  process.env.MONGODB_DB_NAME = DB_NAME;

  // 1. Prefer an existing URI (e.g. local mongod on :27017, or Atlas in CI)
  if (process.env.TEST_MONGODB_URI) {
    process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;
    return;
  }

  // 2. Try the conventional local mongod on 127.0.0.1:27017
  const net = require('net');
  const localReachable = await new Promise((resolve) => {
    const sock = net.createConnection({ host: '127.0.0.1', port: 27017 });
    sock.once('connect', () => { sock.end(); resolve(true); });
    sock.once('error',   () => resolve(false));
    setTimeout(() => { try { sock.destroy(); } catch (_) {} resolve(false); }, 500);
  });

  if (localReachable) {
    process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${DB_NAME}`;
    return;
  }

  // 3. Fall back to in-process MongoMemoryServer (downloads binary on first run)
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create({ instance: { dbName: DB_NAME } });
  global.__MONGOD__ = mongod;
  process.env.MONGODB_URI = mongod.getUri();
};
