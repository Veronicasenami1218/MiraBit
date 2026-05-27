/**
 * tests/globalTeardown.js – runs ONCE after all tests
 *
 * Stops the in-memory MongoDB instance started by globalSetup.js.
 */

'use strict';

module.exports = async () => {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
    delete global.__MONGOD__;
  }
};
