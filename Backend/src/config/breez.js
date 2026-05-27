/**
 * src/config/breez.js – Breez SDK Configuration Helper
 *
 * Constructs the ConnectRequest / config object expected by
 * @breeztech/breez-sdk-liquid. Import this in breez.service.js.
 *
 * Docs: https://sdk-doc-liquid.breez.technology/
 */

'use strict';

const config = require('./index');

/**
 * Returns the Breez SDK connect configuration.
 * @returns {object} ConnectRequest-compatible config
 */
const getBreezConfig = () => ({
  mnemonic:   config.breez.mnemonic,
  workingDir: config.breez.workingDir,

  // Use mainnet in production, regtest/testnet in dev
  network: config.nodeEnv === 'production' ? 'mainnet' : 'testnet',

  // Breez API key – required for Greenlight node registration
  apiKey: config.breez.apiKey,
});

/**
 * Validates that the minimum required Breez config is present.
 * Throws an error if any required field is missing.
 */
const validateBreezConfig = () => {
  const { mnemonic, apiKey } = config.breez;

  if (!mnemonic || mnemonic.split(' ').length < 12) {
    throw new Error('Breez SDK: BREEZ_MNEMONIC must be a valid 12/24-word BIP-39 mnemonic.');
  }
  if (!apiKey) {
    throw new Error('Breez SDK: BREEZ_API_KEY is required. Get one at https://breez.technology');
  }
};

module.exports = { getBreezConfig, validateBreezConfig };
