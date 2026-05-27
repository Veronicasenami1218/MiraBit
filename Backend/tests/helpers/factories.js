/**
 * tests/helpers/factories.js – Minimal builders for test data
 */

'use strict';

const { Wallet, SavingsGoal, Transaction, QueuedPayment } = require('../../src/models');

async function createWalletDoc(pubkey, balances = { BTC: 0.01, NGN: 100000, USDT: 50 }) {
  return Wallet.create({
    pubkey: pubkey.toLowerCase(),
    balances,
  });
}

async function createGoalDoc(pubkey, overrides = {}) {
  return SavingsGoal.create({
    pubkey: pubkey.toLowerCase(),
    name:   overrides.name           || 'Test Goal',
    emoji:  overrides.emoji          || '🎯',
    target: overrides.target         || 1000,
    targetCurrency: overrides.targetCurrency || 'NGN',
    savedBtc: overrides.savedBtc     || 0,
  });
}

async function createTxDoc(pubkey, overrides = {}) {
  return Transaction.create({
    pubkey:       pubkey.toLowerCase(),
    type:         overrides.type         || 'receive',
    status:       overrides.status       || 'completed',
    fromCurrency: overrides.fromCurrency || null,
    fromAmount:   overrides.fromAmount   || 0,
    toCurrency:   overrides.toCurrency   || 'NGN',
    toAmount:     overrides.toAmount     || 1000,
    note:         overrides.note         || 'Test tx',
    settledAt:    new Date(),
  });
}

async function createQueuedPayment(pubkey, overrides = {}) {
  return QueuedPayment.create({
    pubkey:         pubkey.toLowerCase(),
    status:         overrides.status         || 'queued',
    recipient:      overrides.recipient      || 'lnbc100n1mockinvoice',
    recipientType:  overrides.recipientType  || 'invoice',
    amount:         overrides.amount         || 0.0001,
    sourceCurrency: overrides.sourceCurrency || 'BTC',
    amountSats:     overrides.amountSats     ?? 10000,
    ...overrides,
  });
}

module.exports = { createWalletDoc, createGoalDoc, createTxDoc, createQueuedPayment };
