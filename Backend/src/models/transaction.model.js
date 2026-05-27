/**
 * src/models/transaction.model.js – User Transaction Log
 *
 * Records every wallet-affecting action so the frontend can render fast,
 * paginated history without re-hitting Breez. Also enables the offline-queue
 * "settle on reconnect" feature (see queuedPayment.model.js).
 *
 * Type values mirror the FE's TxType:
 *   "save" | "convert" | "pay" | "receive" | "learn-reward"
 */

'use strict';

const { Schema, model } = require('mongoose');

const TX_TYPES    = ['save', 'convert', 'pay', 'receive', 'learn-reward'];
const TX_STATUSES = ['completed', 'pending', 'queued', 'failed', 'expired'];
const CURRENCIES  = ['BTC', 'NGN', 'USDT'];

const TransactionSchema = new Schema(
  {
    pubkey: {
      type:     String,
      required: true,
      lowercase: true,
      index:    true,
    },

    type:   { type: String, enum: TX_TYPES, required: true },
    status: { type: String, enum: TX_STATUSES, default: 'completed', index: true },

    // FE shape: fromCurrency may be null for "receive" / "learn-reward"
    fromCurrency: { type: String, enum: [...CURRENCIES, null], default: null },
    fromAmount:   { type: Number, default: 0, min: 0 },
    toCurrency:   { type: String, enum: CURRENCIES, required: true },
    toAmount:     { type: Number, required: true, min: 0 },

    note:         { type: String, default: null, maxlength: 500 },
    counterparty: { type: String, default: null },

    // Lightning-specific (only set when type === 'pay' or 'receive' through LN)
    paymentHash:    { type: String, default: null, index: true, sparse: true },
    invoice:        { type: String, default: null },
    feeSats:        { type: Number, default: 0, min: 0 },

    // Currency-rate snapshot at execution time
    rateSnapshot: {
      BTC_USD:  { type: Number, default: null },
      USD_NGN:  { type: Number, default: null },
      fetchedAt: { type: Date, default: null },
    },

    metadata: { type: Schema.Types.Mixed, default: {} },

    settledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      // Return shape matches the FE `Transaction` interface
      transform: (_doc, ret) => ({
        id:            ret._id.toString(),
        type:          ret.type,
        status:        ret.status,
        fromCurrency:  ret.fromCurrency,
        fromAmount:    ret.fromAmount,
        toCurrency:    ret.toCurrency,
        toAmount:      ret.toAmount,
        note:          ret.note || undefined,
        counterparty:  ret.counterparty || undefined,
        createdAt:     ret.createdAt instanceof Date ? ret.createdAt.getTime() : ret.createdAt,
      }),
    },
  }
);

// Fast history queries: "wallet history, newest first"
TransactionSchema.index({ pubkey: 1, createdAt: -1 });

const TransactionModel = model('Transaction', TransactionSchema);

// Expose enums for validators
TransactionModel.TX_TYPES    = TX_TYPES;
TransactionModel.TX_STATUSES = TX_STATUSES;
TransactionModel.CURRENCIES  = CURRENCIES;

module.exports = TransactionModel;
