/**
 * src/services/breez.service.js – Breez SDK Liquid Integration
 *
 * Wraps the @breeztech/breez-sdk-liquid Node.js bindings.
 * Provides a singleton SDK instance that is initialised once at startup
 * and shared across all lightning/wallet operations.
 *
 * Docs: https://sdk-doc-liquid.breez.technology/
 * NPM:  https://www.npmjs.com/package/@breeztech/breez-sdk-liquid
 *
 * NOTE: The Breez SDK uses native bindings that must be compiled for
 * the target platform. Run `npm install` to trigger the post-install
 * build step before using this service.
 */

'use strict';

const logger = require('../utils/logger');
const { getBreezConfig, validateBreezConfig } = require('../config/breez');

let sdk = null;        // Singleton SDK instance
let isInitialised = false;

/**
 * Load the Breez SDK module lazily so the server can start
 * even if the native bindings are not yet compiled.
 */
const loadSdk = () => {
  try {
    return require('@breeztech/breez-sdk-liquid');
  } catch (err) {
    logger.warn('Breez SDK not available. Install @breeztech/breez-sdk-liquid and ensure native bindings compile.');
    logger.warn(err.message);
    return null;
  }
};

/**
 * Initialise the Breez SDK.
 * Should be called once at application startup (not on every request).
 *
 * @returns {Promise<object|null>} SDK instance or null if unavailable
 */
const init = async () => {
  if (isInitialised) return sdk;

  try {
    validateBreezConfig();
  } catch (err) {
    logger.warn(`Breez SDK skipped: ${err.message}`);
    return null;
  }

  const BreezSdk = loadSdk();
  if (!BreezSdk) return null;

  try {
    const config = getBreezConfig();
    logger.info('Initialising Breez SDK Liquid…');

    sdk = await BreezSdk.connect({
      config: {
        network:    config.network === 'mainnet'
                      ? BreezSdk.LiquidNetwork.MAINNET
                      : BreezSdk.LiquidNetwork.TESTNET,
        workingDir: config.workingDir,
      },
      mnemonic: config.mnemonic,
    });

    // Register event listener for payment updates
    sdk.addEventListener((event) => {
      logger.info('Breez SDK event:', { type: event.type });
    });

    isInitialised = true;
    logger.info('✅ Breez SDK Liquid initialised successfully');
    return sdk;
  } catch (err) {
    logger.error('Breez SDK initialisation failed:', err.message);
    return null;
  }
};

/**
 * Get the current SDK instance.
 * Returns null if not initialised (server can still serve non-Lightning routes).
 * @returns {object|null}
 */
const getInstance = () => sdk;

/**
 * Get wallet info from the Breez SDK.
 * @returns {Promise<object>}
 */
const getWalletInfo = async () => {
  const instance = getInstance();
  if (!instance) throw new Error('Breez SDK is not initialised.');
  return instance.getInfo();
};

/**
 * Prepare and send a Lightning payment.
 * @param {object} params
 * @param {string} params.invoice  – BOLT-11 invoice string
 * @param {number} [params.amountSats] – required for 0-amount invoices
 * @returns {Promise<object>} payment result
 */
const sendPayment = async ({ invoice, amountSats }) => {
  const instance = getInstance();
  if (!instance) throw new Error('Breez SDK is not initialised.');

  const prepareResponse = await instance.prepareSendPayment({
    destination: invoice,
    ...(amountSats ? { amountSat: amountSats } : {}),
  });

  logger.info('Breez: sending payment', { feeSat: prepareResponse.feesSat });
  return instance.sendPayment({ prepareResponse });
};

/**
 * Create a Lightning invoice (receive payment).
 * @param {object} params
 * @param {number} params.amountSats
 * @param {string} params.description
 * @param {number} params.expirySeconds
 * @returns {Promise<object>} invoice details including bolt11 string
 */
const receivePayment = async ({ amountSats, description, expirySeconds }) => {
  const instance = getInstance();
  if (!instance) throw new Error('Breez SDK is not initialised.');

  const prepareResponse = await instance.prepareReceivePayment({
    paymentMethod: 'lightning',
    amountSat:     amountSats,
  });

  logger.info('Breez: creating invoice', { amountSats, feeSat: prepareResponse.feesSat });

  return instance.receivePayment({
    prepareResponse,
    description,
  });
};

/**
 * List payment history from the SDK.
 * @returns {Promise<object[]>}
 */
const listPayments = async () => {
  const instance = getInstance();
  if (!instance) throw new Error('Breez SDK is not initialised.');
  return instance.listPayments({});
};

/**
 * Disconnect the SDK cleanly (call during graceful shutdown).
 */
const disconnect = async () => {
  if (sdk && isInitialised) {
    try {
      await sdk.disconnect();
      logger.info('Breez SDK disconnected.');
    } catch (err) {
      logger.warn('Breez SDK disconnect error:', err.message);
    } finally {
      sdk = null;
      isInitialised = false;
    }
  }
};

module.exports = { init, getInstance, getWalletInfo, sendPayment, receivePayment, listPayments, disconnect };
