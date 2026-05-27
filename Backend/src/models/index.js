/**
 * src/models/index.js – Mongoose Model Aggregator
 *
 * Single import point so other modules can do:
 *   const { Wallet, Transaction, ExchangeRate } = require('../models');
 */

'use strict';

module.exports = {
  Wallet:       require('./wallet.model'),
  Transaction:  require('./transaction.model'),
  ExchangeRate: require('./exchangeRate.model'),
};
