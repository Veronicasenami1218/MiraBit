/**
 * src/services/lightning.service.js – Lightning Network Business Logic
 *
 * Orchestrates all Lightning payment operations by delegating to
 * breez.service.js for SDK calls. Adds business rules, validation,
 * and structured response shaping on top of the raw SDK responses.
 */

'use strict';

const breezService = require('./breez.service');
const { generateRef } = require('../utils/crypto');
const { Transaction } = require('../models');
const logger = require('../utils/logger');

/**
 * Persist a transaction document. Failures are logged but never thrown –
 * a logging hiccup must not cause a successful Lightning payment to error out.
 *
 * @param {object} data – Transaction fields
 * @returns {Promise<object|null>}
 */
const logTransaction = async (data) => {
  try {
    const doc = await Transaction.create(data);
    return doc.toJSON();
  } catch (err) {
    logger.error(`logTransaction failed: ${err.message}`, { data });
    return null;
  }
};

/**
 * Create a Lightning invoice for receiving a payment.
 *
 * @param {object} params
 * @param {number} params.amountSats
 * @param {string} params.description
 * @param {number} params.expirySeconds
 * @returns {Promise<object>}
 */
const createInvoice = async ({ amountSats, description, expirySeconds, payeePubkey }) => {
  logger.info(`Creating invoice: ${amountSats} sats – "${description}"`);

  const result    = await breezService.receivePayment({ amountSats, description, expirySeconds });
  const reference = generateRef();

  // Log as a pending incoming transaction (status flips to "complete" when paid)
  if (payeePubkey) {
    await logTransaction({
      pubkey:      payeePubkey.toLowerCase(),
      reference,
      direction:   'incoming',
      type:        'invoice',
      status:      'pending',
      amountSats,
      description,
      invoice:     result.destination,
    });
  }

  return {
    invoice:       result.destination,
    amountSats,
    description,
    expirySeconds,
    reference,
    createdAt:     new Date().toISOString(),
  };
};

/**
 * Pay a Lightning invoice.
 *
 * @param {object} params
 * @param {string} params.invoice     – BOLT-11 string
 * @param {number} [params.amountSats] – for 0-amount invoices
 * @param {string} params.payerPubkey  – NIP-98 verified pubkey
 * @returns {Promise<object>}
 */
const payInvoice = async ({ invoice, amountSats, payerPubkey }) => {
  logger.info(`Paying invoice – payer: ${payerPubkey}`);

  const result = await breezService.sendPayment({ invoice, amountSats });

  const payment = {
    paymentHash:  result.payment?.paymentHash || result.paymentHash,
    amountSats:   result.payment?.amountSat   || amountSats,
    feeSats:      result.payment?.feesSat      || 0,
    status:       result.payment?.status       || 'complete',
    payerPubkey,
    paidAt:       new Date().toISOString(),
  };

  if (payerPubkey) {
    await logTransaction({
      pubkey:      payerPubkey.toLowerCase(),
      paymentHash: payment.paymentHash,
      direction:   'outgoing',
      type:        'invoice',
      status:      payment.status,
      amountSats:  payment.amountSats,
      feeSats:     payment.feeSats,
      invoice,
      settledAt:   payment.status === 'complete' ? new Date() : null,
    });
  }

  return payment;
};

/**
 * Look up a payment by its hash.
 *
 * @param {string} paymentHash
 * @returns {Promise<object|null>}
 */
const getPaymentStatus = async (paymentHash) => {
  const payments = await breezService.listPayments();
  const match = payments.find(
    (p) => p.paymentHash === paymentHash || p.id === paymentHash
  );

  if (!match) return null;

  return {
    paymentHash: match.paymentHash,
    amountSats:  match.amountSat,
    feeSats:     match.feesSat,
    status:      match.status,
    timestamp:   match.timestamp
      ? new Date(match.timestamp * 1000).toISOString()
      : null,
  };
};

/**
 * Resolve and pay an LNURL-pay link.
 *
 * @param {object} params
 * @param {string} params.lnurl
 * @param {number} params.amountSats
 * @param {string} params.payerPubkey
 * @returns {Promise<object>}
 */
const lnurlPay = async ({ lnurl, amountSats, payerPubkey }) => {
  logger.info(`LNURL pay – ${amountSats} sats – payer: ${payerPubkey}`);

  // Breez SDK handles LNURL resolution internally when passed as destination
  const result = await breezService.sendPayment({ invoice: lnurl, amountSats });

  const payment = {
    lnurl,
    amountSats,
    feeSats:     result.payment?.feesSat || 0,
    status:      result.payment?.status  || 'complete',
    payerPubkey,
    paidAt:      new Date().toISOString(),
  };

  if (payerPubkey) {
    await logTransaction({
      pubkey:      payerPubkey.toLowerCase(),
      paymentHash: result.payment?.paymentHash || null,
      direction:   'outgoing',
      type:        'lnurl',
      status:      payment.status,
      amountSats:  payment.amountSats,
      feeSats:     payment.feeSats,
      invoice:     lnurl,
      settledAt:   payment.status === 'complete' ? new Date() : null,
    });
  }

  return payment;
};

/**
 * Get Lightning node information (balance, pubkey, etc.).
 * @returns {Promise<object>}
 */
const getNodeInfo = async () => {
  const info = await breezService.getWalletInfo();
  return {
    balanceSats:  info.balanceSat,
    pendingSats:  info.pendingSendSat,
    onchainSats:  info.onchainBalanceSat ?? 0,
    pubkey:       info.pubkey ?? null,
    network:      info.network,
    retrievedAt:  new Date().toISOString(),
  };
};

module.exports = { createInvoice, payInvoice, getPaymentStatus, lnurlPay, getNodeInfo };
