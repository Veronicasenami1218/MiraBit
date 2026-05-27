/**
 * src/models/transaction.model.js – Lightning Transaction Log
 *
 * Persists every send/receive attempt so the frontend can render fast,
 * paginated history without hitting Breez SDK on every page load.
 * Also enables the README's "Offline Savings Mode" / sync feature.
 */

'use strict';

const { Schema, model } = require('mongoose');

const TransactionSchema = new Schema(
  {
    // Owning wallet (Nostr pubkey – denormalised for fast lookup)
    pubkey: {
      type:     String,
      required: true,
      lowercase: true,
      index:    true,
    },

    // Lightning payment hash (unique per payment when known)
    paymentHash: {
      type:    String,
      index:   true,
      sparse:  true,
    },

    // Local reference (returned to client even before payment hash exists)
    reference: { type: String, index: true },

    direction: {
      type:     String,
      enum:     ['incoming', 'outgoing'],
      required: true,
    },

    type: {
      type: String,
      enum: ['invoice', 'lnurl', 'onchain', 'nwc'],
      default: 'invoice',
    },

    status: {
      type:    String,
      enum:    ['pending', 'complete', 'failed', 'expired'],
      default: 'pending',
      index:   true,
    },

    amountSats: { type: Number, required: true, min: 0 },
    feeSats:    { type: Number, default: 0, min: 0 },

    // BOLT-11 or LNURL string (long, but useful for debugging)
    invoice:     { type: String, default: null },
    description: { type: String, default: null, maxlength: 500 },

    // Counterparty pubkey, when known (e.g. NWC client)
    counterpartyPubkey: { type: String, default: null },

    // Currency conversion snapshot at time of payment
    rateSnapshot: {
      currency:  { type: String, default: null }, // e.g. "NGN"
      rate:      { type: Number, default: null }, // 1 BTC = ? <currency>
      fiatValue: { type: Number, default: null },
    },

    // Free-form metadata bucket (extra Breez fields, NWC method, etc.)
    metadata: { type: Schema.Types.Mixed, default: {} },

    settledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// Compound index for the most common query: "wallet history, newest first"
TransactionSchema.index({ pubkey: 1, createdAt: -1 });

module.exports = model('Transaction', TransactionSchema);
