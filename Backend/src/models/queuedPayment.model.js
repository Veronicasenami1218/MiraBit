/**
 * src/models/queuedPayment.model.js – Offline Payment Queue
 *
 * Persists payments the user submitted while offline so they can be
 * settled when connectivity returns — even if the client device is
 * wiped, the queue survives on the server.
 *
 * Lifecycle:
 *   queued      → user submitted while offline
 *   processing  → flush job picked it up (locked with `lockToken`)
 *   completed   → Lightning payment succeeded
 *   failed      → permanent failure (insufficient funds, invalid invoice,
 *                 attempts exhausted, etc.)
 *   cancelled   → user explicitly cancelled before settle
 *
 * The `lockToken` + `lockedUntil` fields implement a soft lease so two
 * concurrent flushers cannot double-pay the same invoice.
 */

'use strict';

const { Schema, model } = require('mongoose');

const QP_STATUSES = ['queued', 'processing', 'completed', 'failed', 'cancelled'];

const QueuedPaymentSchema = new Schema(
  {
    pubkey: {
      type:      String,
      required:  true,
      lowercase: true,
      index:     true,
    },

    status: {
      type:    String,
      enum:    QP_STATUSES,
      default: 'queued',
      index:   true,
    },

    // The destination – BOLT-11 invoice, LNURL, on-chain address, or @handle
    recipient: { type: String, required: true, trim: true, maxlength: 2000 },

    // Resolved details (populated when known)
    recipientType: {
      type: String,
      enum: ['invoice', 'lnurl', 'onchain', 'handle', 'unknown'],
      default: 'unknown',
    },

    amount:         { type: Number, required: true, min: 0 },
    sourceCurrency: { type: String, enum: ['BTC', 'NGN', 'USDT'], required: true },
    amountSats:     { type: Number, default: null, min: 0 },

    note: { type: String, default: null, maxlength: 500 },

    // Snapshot of the rates at queue time (used at settle time so the user
    // pays the BTC equivalent of what they originally agreed to)
    rateSnapshot: {
      BTC_USD:   { type: Number, default: null },
      USD_NGN:   { type: Number, default: null },
      fetchedAt: { type: Date,   default: null },
    },

    // Optimistic concurrency lease (prevents double-spend on parallel flush)
    lockToken:   { type: String, default: null },
    lockedUntil: { type: Date,   default: null },

    attempts:     { type: Number, default: 0 },
    maxAttempts:  { type: Number, default: 5 },
    lastError:    { type: String, default: null },
    lastAttemptedAt: { type: Date, default: null },

    // Cross-references once settled
    paymentHash:  { type: String, default: null },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },

    settledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        // never leak internal lock info
        delete ret.lockToken;
        delete ret.lockedUntil;
        return ret;
      },
    },
  }
);

// Used by the flusher to find work in FIFO order
QueuedPaymentSchema.index({ pubkey: 1, status: 1, createdAt: 1 });

const QueuedPaymentModel = model('QueuedPayment', QueuedPaymentSchema);
QueuedPaymentModel.QP_STATUSES = QP_STATUSES;

module.exports = QueuedPaymentModel;
