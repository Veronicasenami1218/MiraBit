/**
 * tests/__mocks__/breez.service.js – Test mock of the Breez SDK wrapper
 *
 * Lets every test default to "Breez is offline" (so wallet.service falls
 * back to cached data). Tests that need success can override with
 * `breezService.sendPayment.mockResolvedValueOnce(...)`.
 */

'use strict';

const sendPayment = jest.fn(async ({ invoice, amountSats }) => ({
  payment: {
    paymentHash: 'mock_hash_' + Math.random().toString(36).slice(2, 10),
    amountSat:   amountSats || 1000,
    feesSat:     1,
    status:      'complete',
  },
}));

const receivePayment = jest.fn(async ({ amountSats }) => ({
  destination: `lnbc${amountSats}n1mockinvoice`,
}));

const getWalletInfo = jest.fn(async () => {
  throw new Error('Breez SDK not configured in tests');
});

const listPayments = jest.fn(async () => []);

module.exports = {
  init:           jest.fn(async () => null),
  getInstance:    jest.fn(() => null),
  getWalletInfo,
  sendPayment,
  receivePayment,
  listPayments,
  disconnect:     jest.fn(async () => undefined),
};
