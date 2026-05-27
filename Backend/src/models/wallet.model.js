/**
 * src/models/wallet.model.js – Wallet Mongoose Model
 *
 * One document per Nostr pubkey. Stores:
 *  - Multi-currency balances (BTC, NGN, USDT) — these are the
 *    user-facing balances the React frontend reads/writes.
 *  - Cached Lightning balance figures from the Breez SDK (sats).
 */

'use strict';

const { Schema, model } = require('mongoose');

const WalletSchema = new Schema(
  {
    // Nostr hex pubkey – the canonical user identifier
    pubkey: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
      lowercase: true,
      match:    [/^[0-9a-f]{64}$/i, 'pubkey must be a 64-char hex string'],
    },

    // Optional display fields (synced from Nostr profile, kind 0)
    displayName: { type: String, default: null },
    nip05:       { type: String, default: null },
    lud16:       { type: String, default: null }, // Lightning address

    // ── User-facing multi-currency balances ──────────────────────────────
    // (these mirror the frontend's `Wallet { BTC, NGN, USDT }` shape)
    balances: {
      BTC:  { type: Number, default: 0, min: 0 },
      NGN:  { type: Number, default: 0, min: 0 },
      USDT: { type: Number, default: 0, min: 0 },
    },

    // ── Lightning shadow (cached from Breez SDK, in sats) ────────────────
    lightningBalanceSats: { type: Number, default: 0, min: 0 },
    onchainBalanceSats:   { type: Number, default: 0, min: 0 },
    pendingSats:          { type: Number, default: 0, min: 0 },

    preferredCurrency: {
      type: String,
      enum: ['NGN', 'USD', 'USDT', 'BTC'],
      default: 'NGN',
    },

    isActive:     { type: Boolean, default: true },
    lastSyncedAt: { type: Date, default: null },
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

module.exports = model('Wallet', WalletSchema);
