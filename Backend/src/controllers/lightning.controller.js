/**
 * src/controllers/lightning.controller.js – Lightning Network Payments
 *
 * Handles:
 *  - BOLT-11 invoice creation (receive payments)
 *  - Invoice payment (send payments) – requires NIP-98 auth
 *  - Payment status lookup
 *  - LNURL support (future)
 */

'use strict';

const lightningService = require('../services/lightning.service');
const { ok, created, badRequest, notFound } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * POST /lightning/invoice
 * Create a Lightning invoice (receive payment).
 * Body: { amountSats: number, description?: string, expirySeconds?: number }
 */
const createInvoice = async (req, res, next) => {
  try {
    const { amountSats, description = 'MiraBit payment', expirySeconds = 3600 } = req.body;

    const invoice = await lightningService.createInvoice({
      amountSats,
      description,
      expirySeconds,
    });

    return created(res, 'Invoice created', invoice);
  } catch (err) {
    logger.error('createInvoice error:', err);
    next(err);
  }
};

/**
 * POST /lightning/pay
 * Pay a Lightning invoice. Requires NIP-98 auth.
 * Body: { invoice: string (BOLT-11), amountSats?: number (for 0-amount invoices) }
 */
const payInvoice = async (req, res, next) => {
  try {
    const { invoice, amountSats } = req.body;

    const result = await lightningService.payInvoice({
      invoice,
      amountSats,
      payerPubkey: req.nostrPubkey,
    });

    return ok(res, 'Payment sent successfully', result);
  } catch (err) {
    // Surface payment-specific errors clearly to the client
    if (err.message?.includes('insufficient')) {
      return badRequest(res, 'Insufficient balance to complete payment');
    }
    logger.error('payInvoice error:', err);
    next(err);
  }
};

/**
 * GET /lightning/payment/:paymentHash
 * Get the status of a payment by its hash.
 */
const getPaymentStatus = async (req, res, next) => {
  try {
    const { paymentHash } = req.params;
    const status = await lightningService.getPaymentStatus(paymentHash);

    if (!status) {
      return notFound(res, 'Payment not found');
    }

    return ok(res, 'Payment status retrieved', status);
  } catch (err) {
    logger.error('getPaymentStatus error:', err);
    next(err);
  }
};

/**
 * POST /lightning/lnurl/pay
 * Resolve and pay an LNURL-pay link.
 * Body: { lnurl: string, amountSats: number }
 */
const lnurlPay = async (req, res, next) => {
  try {
    const { lnurl, amountSats } = req.body;
    const result = await lightningService.lnurlPay({ lnurl, amountSats, payerPubkey: req.nostrPubkey });

    return ok(res, 'LNURL payment sent', result);
  } catch (err) {
    logger.error('lnurlPay error:', err);
    next(err);
  }
};

/**
 * GET /lightning/node/info
 * Return connected Lightning node information (useful for debugging).
 */
const getNodeInfo = async (req, res, next) => {
  try {
    const info = await lightningService.getNodeInfo();
    return ok(res, 'Node info retrieved', info);
  } catch (err) {
    logger.error('getNodeInfo error:', err);
    next(err);
  }
};

module.exports = { createInvoice, payInvoice, getPaymentStatus, lnurlPay, getNodeInfo };
