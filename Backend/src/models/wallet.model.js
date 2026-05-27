/**
 * src/models/wallet.model.js – Wallet Mongoose Model
 *
 * One document per Nostr pubkey. Stores cached balance figures
 * (live balances come from Breez SDK, this is the persistent shadow).
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

    // Cached balance (sats) – refreshed from Breez on every getBalance() call
    lightningBalanceSats: { type: Number, default: 0, min: 0 },
    onchainBalanceSats:   { type: Number, default: 0, min: 0 },
    pendingSats:          { type: Number, default: 0, min: 0 },

    // Local preferences (used by frontend)
    preferredCurrency: {
      type: String,
      enum: ['NGN', 'USD', 'USDT', 'BTC'],
      default: 'NGN',
    },

    // Soft-disable a wallet without deleting it
    isActive: { type: Boolean, default: true },

    lastSyncedAt: { type: Date, default: null },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
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
