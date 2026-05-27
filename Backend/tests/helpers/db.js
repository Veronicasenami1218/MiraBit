/**
 * tests/helpers/db.js – Mongoose connection + per-test cleanup
 *
 * Each test file that touches the DB calls `connectTestDb()` in
 * beforeAll and `disconnectTestDb()` in afterAll. `clearTestDb()`
 * in afterEach gives every test a clean slate.
 */

'use strict';

const mongoose = require('mongoose');

/** Open the connection (idempotent across files in the same process). */
async function connectTestDb() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || 'mirabit-test',
    serverSelectionTimeoutMS: 5_000,
  });
}

/** Drop every collection so the next test starts clean. */
async function clearTestDb() {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}))
  );
}

/** Close the connection. */
async function disconnectTestDb() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
}

module.exports = { connectTestDb, clearTestDb, disconnectTestDb };
